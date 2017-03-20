"use strict";
/**
 * @class  elFinder command "resize"
 * Open dialog to resize image
 *
 * @author Dmitry (dio) Levashov
 * @author Alexey Sukhotin
 * @author Naoki Sawada
 * @author Sergio Jovani
 **/
elFinder.prototype.commands.resize = function() {

	this.updateOnSelect = false;
	
	this.getstate = function() {
		var sel = this.fm.selectedFiles();
		return sel.length == 1 && sel[0].read && sel[0].write && sel[0].mime.indexOf('image/') !== -1 ? 0 : -1;
	};
	
	this.resizeRequest = function(data, file, dfrd) {
		var fm   = this.fm,
			file = file || fm.file(data.target),
			src  = file? fm.openUrl(file.hash) : null,
			tmb  = file? file.tmb : null,
			enabled = fm.isCommandEnabled('resize', data.target);
		
		if (enabled && (! file || (file && file.read && file.write && file.mime.indexOf('image/') !== -1 ))) {
			return fm.request({
				data : $.extend(data, {
					cmd : 'resize'
				}),
				notify : {type : 'resize', cnt : 1},
				prepare : function(data) {
					var newfile;
					if (data) {
						if (data.added && data.added.length && data.added[0].tmb) {
							newfile = data.added[0];
						} else if (data.changed && data.changed.length && data.changed[0].tmb) {
							newfile = data.changed[0];
						}
						if (newfile) {
							file = newfile;
							src = fm.openUrl(file.hash);
							if (file.tmb && file.tmb != '1' && (file.tmb === tmb)) {
								file.tmb = '';
								return;
							}
						}
					}
					tmb = '';
				}
			})
			.fail(function(error) {
				if (dfrd) {
					dfrd.reject(error);
				}
			})
			.done(function() {
				var url = (file.url != '1')? fm.url(file.hash) : '';
				
				// need tmb reload
				if (tmb) {
					fm.one('resizedone', function() {
						fm.reloadContents(fm.tmb(file).url).done(function() {
							fm.trigger('tmbreload', {files: [ {hash: file.hash, tmb: tmb} ]});
						});
					});
				}
				
				fm.reloadContents(src);
				if (url && url !== src) {
					fm.reloadContents(url);
				}
				
				dfrd && dfrd.resolve();
			});
		} else {
			var error;
			
			if (file) {
				if (file.mime.indexOf('image/') === -1) {
					error = ['errResize', file.name, 'errUsupportType'];
				} else {
					error = ['errResize', file.name, 'errPerm'];
				}
			} else {
				error = ['errResize', data.target, 'errPerm'];
			}
			
			if (dfrd) {
				dfrd.reject(error);
			} else {
				fm.error(error);
			}
			return $.Deferred().reject(error);
		}
	}
	
	this.exec = function(hashes) {
		var self  = this,
			fm    = this.fm,
			files = this.files(hashes),
			dfrd  = $.Deferred(),
			api2  = (fm.api > 1),
			dialogWidth = 650,
			fmnode = fm.getUI(),
			ctrgrup = $().controlgroup? 'controlgroup' : 'buttonset',
			grid8Def = typeof this.options.grid8px === 'undefind' || this.options.grid8px !== 'disable'? true : false,
			
			open = function(file, id) {
				var isJpeg   = (file.mime === 'image/jpeg'),
					dialog   = $('<div class="elfinder-dialog-resize '+fm.res('class', 'editing')+'"/>'),
					input    = '<input type="text" size="5"/>',
					row      = '<div class="elfinder-resize-row"/>',
					label    = '<div class="elfinder-resize-label"/>',
					control  = $('<div class="elfinder-resize-control"/>')
						.on('focus', 'input[type=text]', function() {
							$(this).select();
						}),
					preview  = $('<div class="elfinder-resize-preview"/>')
						.on('touchmove', function(e) {
							e.stopPropagation();
							e.preventDefault();
						}),
					spinner  = $('<div class="elfinder-resize-spinner">'+fm.i18n('ntfloadimg')+'</div>'),
					rhandle  = $('<div class="elfinder-resize-handle touch-punch"/>'),
					rhandlec = $('<div class="elfinder-resize-handle touch-punch"/>'),
					uiresize = $('<div class="elfinder-resize-uiresize"/>'),
					uicrop   = $('<div class="elfinder-resize-uicrop"/>'),
					uirotate = $('<div class="elfinder-resize-rotate"/>'),
					uideg270 = $('<button/>').attr('title',fm.i18n('rotate-cw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-l"/>')),
					uideg90  = $('<button/>').attr('title',fm.i18n('rotate-ccw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-r"/>')),
					uiprop   = $('<span />'),
					reset    = $('<button class="elfinder-resize-reset">').text(fm.i18n('reset'))
						.on('click', function() {
							resetView();
						})
						.button({
							icons: {
								primary: 'ui-icon-arrowrefresh-1-n'
							},
							text: false
						}),
					uitype   = $('<div class="elfinder-resize-type"/>')
						.append('<input class="" type="radio" name="type" id="'+id+'-resize" value="resize" checked="checked" /><label for="'+id+'-resize">'+fm.i18n('resize')+'</label>',
						'<input class="api2" type="radio" name="type" id="'+id+'-crop" value="crop" /><label class="api2" for="'+id+'-crop">'+fm.i18n('crop')+'</label>',
						'<input class="api2" type="radio" name="type" id="'+id+'-rotate" value="rotate" /><label class="api2" for="'+id+'-rotate">'+fm.i18n('rotate')+'</label>'),
					mode     = 'resize',
					type     = uitype[ctrgrup]()[ctrgrup]('disable').find('input')
						.change(function() {
							mode = $(this).val();
							
							resetView();
							resizable(true);
							croppable(true);
							rotateable(true);
							
							if (mode == 'resize') {
								uiresize.show();
								uirotate.hide();
								uicrop.hide();
								resizable();
								isJpeg && grid8px.insertAfter(uiresize.find('.elfinder-resize-grid8'));
							}
							else if (mode == 'crop') {
								uirotate.hide();
								uiresize.hide();
								uicrop.show();
								croppable();
								isJpeg && grid8px.insertAfter(uicrop.find('.elfinder-resize-grid8'));
							} else if (mode == 'rotate') {
								uiresize.hide();
								uicrop.hide();
								uirotate.show();
								rotateable();
							}
						}),
					width   = $(input)
						.change(function() {
							var w = parseInt(width.val()),
								h = parseInt(cratio ? Math.round(w/ratio) : height.val());

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								height.val(h);
							}
						}),
					height  = $(input)
						.change(function() {
							var h = parseInt(height.val()),
								w = parseInt(cratio ? Math.round(h*ratio) : width.val());

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								width.val(w);
							}
						}),
					pointX  = $(input).change(function(){crop.updateView();}),
					pointY  = $(input).change(function(){crop.updateView();}),
					offsetX = $(input).change(function(){crop.updateView('w');}),
					offsetY = $(input).change(function(){crop.updateView('h');}),
					quality = isJpeg && api2?
						$(input).val(fm.option('jpgQuality'))
							.addClass('quality')
							.on('blur', function(){
								var q = Math.min(100, Math.max(1, parseInt(this.value)));
								dialog.find('input.quality').val(q);
							})
						: null,
					degree = $('<input type="text" size="3" maxlength="3" value="0" />')
						.change(function() {
							rotate.update();
						}),
					uidegslider = $('<div class="elfinder-resize-rotate-slider touch-punch"/>')
						.slider({
							min: 0,
							max: 360,
							value: degree.val(),
							animate: true,
							change: function(event, ui) {
								if (ui.value != uidegslider.slider('value')) {
									rotate.update(ui.value);
								}
							},
							slide: function(event, ui) {
								rotate.update(ui.value, false);
							}
						}).find('.ui-slider-handle')
							.addClass('elfinder-tabstop')
							.off('keydown')
							.on('keydown', function(e) {
								if (e.keyCode == $.ui.keyCode.LEFT || e.keyCode == $.ui.keyCode.RIGHT) {
									e.stopPropagation();
									e.preventDefault();
									rotate.update(Number(degree.val()) + (e.keyCode == $.ui.keyCode.RIGHT? 1 : -1), false);
								}
							})
						.end(),
					pickcanv,
					pickctx,
					pickc = {},
					pick = function(e) {
						var color, r, g, b, h, s, l;

						try {
							color = pickc[Math.round(e.offsetX)][Math.round(e.offsetY)];
						} catch(e) {}
						if (!color) return;

						r = color[0]; g = color[1]; b = color[2];
						h = color[3]; s = color[4]; l = color[5];

						setbg(r, g, b, (e.type === 'click'));
					},
					palpick = function(e) {
						setbg($(this).css('backgroundColor'), '', '', (e.type === 'click'));
					},
					setbg = function(r, g, b, off) {
						var s, m, cc;
						if (typeof r === 'string') {
							g = '';
							if (r && (s = $('<span>').css('backgroundColor', r).css('backgroundColor')) && (m = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i))) {
								r = Number(m[1]);
								g = Number(m[2]);
								b = Number(m[3]);
							}
						}
						cc = (g === '')? r : '#' + getColorCode(r, g, b);
						bg.val(cc).css({ backgroundColor: cc, backgroundImage: 'none', color: (r+g+b < 384? '#fff' : '#000') });
						preview.css('backgroundColor', cc);
						if (off) {
							imgr.off('.picker').removeClass('elfinder-resize-picking');
							pallet.off('.picker').removeClass('elfinder-resize-picking');
						}
					},
					getColorCode = function(r, g, b) {
						return $.map([r,g,b], function(c){return ('0'+parseInt(c).toString(16)).slice(-2);}).join('');
					},
					picker = $('<button>').text(fm.i18n('colorPicker'))
					.on('click', function() { 
						imgr.on('mousemove.picker click.picker', pick).addClass('elfinder-resize-picking');
						pallet.on('mousemove.picker click.picker', 'span', palpick).addClass('elfinder-resize-picking');
					})
					.button({
						icons: {
							primary: 'ui-icon-pin-s'
						},
						text: false
					}),
					reseter = $('<button>').text(fm.i18n('reset'))
						.on('click', function() { 
							setbg('', '', '', true);
						})
						.button({
							icons: {
								primary: 'ui-icon-arrowrefresh-1-n'
							},
							text: false
						}),
					bg = $('<input class="elfinder-resize-bg" type="text">')
						.on('focus', function() {
							$(this).attr('style', '');
						})
						.on('blur', function() {
							setbg($(this).val());
						}),
					pallet  = $('<div class="elfinder-resize-pallet">').on('click', 'span', function() {
						setbg($(this).css('backgroundColor'));
					}),
					ratio   = 1,
					prop    = 1,
					owidth  = 0,
					oheight = 0,
					cratio  = true,
					cratioc = false,
					pwidth  = 0,
					pheight = 0,
					rwidth  = 0,
					rheight = 0,
					rdegree = 0,
					grid8   = isJpeg? grid8Def : false,
					constr  = $('<button>').html(fm.i18n('aspectRatio'))
						.on('click', function() {
							cratio = ! cratio;
							constr.button('option', {
								icons : { primary: cratio? 'ui-icon-locked' : 'ui-icon-unlocked'}
							});
							resize.fixHeight();
							rhandle.resizable('option', 'aspectRatio', cratio).data('uiResizable')._aspectRatio = cratio;
						})
						.button({
							icons : {
								primary: cratio? 'ui-icon-locked' : 'ui-icon-unlocked'
							},
							text: false
						}),
					constrc = $('<button>').html(fm.i18n('aspectRatio'))
						.on('click', function() {
							cratioc = ! cratioc;
							constrc.button('option', {
								icons : { primary: cratioc? 'ui-icon-locked' : 'ui-icon-unlocked'}
							});
							rhandlec.resizable('option', 'aspectRatio', cratioc).data('uiResizable')._aspectRatio = cratioc;
						})
						.button({
							icons : {
								primary: cratioc? 'ui-icon-locked' : 'ui-icon-unlocked'
							},
							text: false
						}),
					grid8px = $('<button>').html(fm.i18n(grid8? 'enabled' : 'disabled')).toggleClass('ui-state-active', grid8)
						.on('click', function() {
							grid8 = ! grid8;
							grid8px.html(fm.i18n(grid8? 'enabled' : 'disabled')).toggleClass('ui-state-active', grid8);
							if (grid8) {
								width.val(round(width.val()));
								height.val(round(height.val()));
								offsetX.val(round(offsetX.val()));
								offsetY.val(round(offsetY.val()));
								pointX.val(round(pointX.val()));
								pointY.val(round(pointY.val()));
								if (uiresize.is(':visible')) {
									resize.updateView(width.val(), height.val());
								} else if (uicrop.is(':visible')) {
									crop.updateView();
								}
							}
						})
						.button(),
					setuprimg = function() {
						var r_scale;
						r_scale = Math.min(pwidth, pheight) / Math.sqrt(Math.pow(owidth, 2) + Math.pow(oheight, 2));
						rwidth = Math.ceil(owidth * r_scale);
						rheight = Math.ceil(oheight * r_scale);
						imgr.width(rwidth)
							.height(rheight)
							.css('margin-top', (pheight-rheight)/2 + 'px')
							.css('margin-left', (pwidth-rwidth)/2 + 'px');
						if (imgr.is(':visible') && bg.is(':visible')) {
							if (file.mime !== 'image/png') {
								preview.css('backgroundColor', bg.val());
								setTimeout(function() {
									if (pickcanv && pickcanv.width !== rwidth) {
										setColorData();
									}
								}, 0);
							} else {
								bg.parent().hide();
								pallet.hide()
							}
						}
					},
					setupimg = function() {
						resize.updateView(owidth, oheight);
						setuprimg();
						basec
							.width(img.width())
							.height(img.height());
						imgc
							.width(img.width())
							.height(img.height());
						crop.updateView();
					},
					setColorData = function() {
						if (pickctx) {
							var n, w, h, r, g, b, a, s, l, hsl, hue,
								data, scale, tx1, tx2, ty1, ty2, rgb,
								domi = {},
								domic = [],
								domiv, palc,
								rgbToHsl = function (r, g, b) {
									var h, s, l,
										max = Math.max(Math.max(r, g), b),
										min = Math.min(Math.min(r, g), b);
		
									// Hue, 0 ~ 359
									if (max === min) {
										h = 0;
									} else if (r === max) {
										h = ((g - b) / (max - min) * 60 + 360) % 360;
									} else if (g === max) {
										h = (b - r) / (max - min) * 60 + 120;
									} else if (b === max) {
										h = (r - g) / (max - min) * 60 + 240;
									}
									// Saturation, 0 ~ 1
									s = (max - min) / max;
									// Lightness, 0 ~ 1
									l = (r *  0.3 + g * 0.59 + b * 0.11) / 255;
		
									return [h, s, l, 'hsl'];
								};
							
							calc:
							try {
								w = pickcanv.width = imgr.width();
								h = pickcanv.height = imgr.height();
								scale = w / owidth;
								pickctx.scale(scale, scale);
								pickctx.drawImage(imgr.get(0), 0, 0);
			
								data = pickctx.getImageData(0, 0, w, h).data;
			
								// Range to detect the dominant color
								tx1 = w * .1;
								tx2 = w * .9;
								ty1 = h * .1;
								ty2 = h * .9;
			
								for (var y = 0; y < h - 1; y++) {
									for (var x = 0; x < w - 1; x++) {
										n = x * 4 + y * w * 4;
										// RGB
										r = data[n]; g = data[n + 1]; b = data[n + 2]; a = data[n + 3];
										// check alpha ch
										if (a !== 255) {
											bg.parent().hide();
											pallet.hide();
											break calc;
										}
										// HSL
										hsl = rgbToHsl(r, g, b);
										hue = Math.round(hsl[0]); s = Math.round(hsl[1] * 100); l = Math.round(hsl[2] * 100);
										if (! pickc[x]) {
											pickc[x] = {};
										}
										// set pickc
										pickc[x][y] = [r, g, b, hue, s, l];
										// detect the dominant color
										if ((x < tx1 || x > tx2) && (y < ty1 || y > ty2)) {
											rgb = r + ',' + g + ',' + b;
											if (! domi[rgb]) {
												domi[rgb] = 1;
											} else {
												++domi[rgb];
											}
										}
									}
								}
								
								if (! pallet.children(':first').length) {
									palc = 1;
									$.each(domi, function(c, v) {
										domic.push({c: c, v: v});
									});
									$.each(domic.sort(function(a, b) {
										return (a.v > b.v)? -1 : 1;
									}), function() {
										if (this.v < 2 || palc > 10) {
											return false;
										}
										pallet.append($('<span style="width:20px;height:20px;display:inline-block;background-color:rgb('+this.c+');">'));
										++palc;
									});
								}
							} catch(e) {
								picker.hide();
								pallet.hide();
							}
						}
					},
					setupPicker = function() {
						try {
							pickcanv = document.createElement('canvas');
							pickctx = pickcanv.getContext('2d');
						} catch(e) {
							picker.hide();
							pallet.hide();
						}
					},
					img     = $('<img/>')
						.on('load', function() {
							owidth  = img.get(0).width || img.width();
							oheight = img.get(0).height || img.height();
							
							dMinBtn.show();

							var r_scale, inputFirst,
								imgRatio = oheight / owidth;
							
							if (imgRatio < 1 && preview.height() > preview.width() * imgRatio) {
								preview.height(preview.width() * imgRatio);
							}
							
							if (preview.height() > img.height() + 20) {
								preview.height(img.height() + 20);
							}
							
							pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
							
							spinner.remove();
							
							ratio   = owidth/oheight;

							rhandle.append(img.show()).show();
							width.val(owidth);
							height.val(oheight);

							setupPicker();
							setupimg();
							
							uitype[ctrgrup]('enable');
							inputFirst = control.find('input,select').prop('disabled', false)
								.filter(':text').on('keydown', function(e) {
									if (e.keyCode == $.ui.keyCode.ENTER) {
										e.stopPropagation();
										e.preventDefault();
										fm.confirm({
											title  : $('input:checked', uitype).val(),
											text   : 'confirmReq',
											accept : {
												label    : 'btnApply',
												callback : function() {  
													save();
												}
											},
											cancel : {
												label    : 'btnCancel',
												callback : function(){
													$(this).focus();
												}
											}
										});
										return;
									}
								})
								.on('keyup', function() {
									var $this = $(this);
									if (! $this.hasClass('elfinder-resize-bg')) {
										setTimeout(function() {
											$this.val($this.val().replace(/[^0-9]/g, ''));
										}, 10);
									}
								})
								.filter(':first');
								
							!fm.UA.Mobile && inputFirst.focus();
							resizable();
						})
						.on('error', function() {
							spinner.text('Unable to load image').css('background', 'transparent');
						}),
					basec = $('<div/>'),
					imgc = $('<img/>'),
					coverc = $('<div/>'),
					imgr = $('<img class="elfinder-resize-imgrotate" />'),
					round = function(v, max) {
						v = grid8? Math.round(v/8)*8 : Math.round(v);
						v = Math.max(0, v);
						if (max && v > max) {
							v = grid8? Math.floor(max/8)*8 : max;
						}
						return v;
					},
					resetView = function() {
						width.val(owidth);
						height.val(oheight);
						resize.updateView(owidth, oheight);
						pointX.val(0);
						pointY.val(0);
						offsetX.val(owidth);
						offsetY.val(oheight);
						crop.updateView();
					},
					resize = {
						update : function() {
							width.val(round(img.width()/prop));
							height.val(round(img.height()/prop));
						},
						
						updateView : function(w, h) {
							if (w > pwidth || h > pheight) {
								if (w / pwidth > h / pheight) {
									prop = pwidth / w;
									img.width(pwidth).height(Math.ceil(h*prop));
								} else {
									prop = pheight / h;
									img.height(pheight).width(Math.ceil(w*prop));
								}
							} else {
								img.width(w).height(h);
							}
							
							prop = img.width()/w;
							uiprop.text('1 : '+(1/prop).toFixed(2));
							resize.updateHandle();
						},
						
						updateHandle : function() {
							rhandle.width(img.width()).height(img.height());
						},
						fixHeight : function() {
							var w, h;
							if (cratio) {
								w = width.val();
								h = round(w/ratio);
								resize.updateView(w, h);
								height.val(h);
							}
						}
					},
					crop = {
						update : function(change) {
							pointX.val(round(((rhandlec.data('x')||rhandlec.position().left))/prop, owidth));
							pointY.val(round(((rhandlec.data('y')||rhandlec.position().top))/prop, oheight));
							if (change !== 'xy') {
								offsetX.val(round((rhandlec.data('w')||rhandlec.width())/prop, owidth - pointX.val()));
								offsetY.val(round((rhandlec.data('h')||rhandlec.height())/prop, oheight - pointY.val()));
							}
						},
						updateView : function(change) {
							var r, x, y, w, h;
							
							pointX.val(round(pointX.val(), owidth - (grid8? 8 : 1)));
							pointY.val(round(pointY.val(), oheight - (grid8? 8 : 1)));
							offsetX.val(round(offsetX.val(), owidth - pointX.val()));
							offsetY.val(round(offsetY.val(), oheight - pointY.val()));
							
							if (cratioc) {
								r = coverc.width() / coverc.height();
								if (change === 'w') {
									offsetY.val(round(parseInt(offsetX.val()) / r));
								} else if (change === 'h') {
									offsetX.val(round(parseInt(offsetY.val()) * r));
								}
							}
							x = Math.round(parseInt(pointX.val()) * prop);
							y = Math.round(parseInt(pointY.val()) * prop);
							if (change !== 'xy') {
								w = Math.round(parseInt(offsetX.val()) * prop);
								h = Math.round(parseInt(offsetY.val()) * prop);
							} else {
								w = rhandlec.data('w');
								h = rhandlec.data('h');
							}
							rhandlec.data({x: x, y: y, w: w, h: h})
								.width(w)
								.height(h)
								.css({left: x, top: y});
							coverc.width(w)
								.height(h);
						},
						resize_update : function(e, ui) {
							rhandlec.data({x: ui.position.left, y: ui.position.top, w: ui.size.width, h: ui.size.height});
							crop.update();
							crop.updateView();
						},
						drag_update : function(e, ui) {
							rhandlec.data({x: ui.position.left, y: ui.position.top});
							crop.update('xy');
						}
					},
					rotate = {
						mouseStartAngle : 0,
						imageStartAngle : 0,
						imageBeingRotated : false,
							
						update : function(value, animate) {
							if (typeof value == 'undefined') {
								rdegree = value = parseInt(degree.val());
							}
							if (typeof animate == 'undefined') {
								animate = true;
							}
							if (! animate || fm.UA.Opera || fm.UA.ltIE8) {
								imgr.rotate(value);
							} else {
								imgr.animate({rotate: value + 'deg'});
							}
							value = value % 360;
							if (value < 0) {
								value += 360;
							}
							degree.val(parseInt(value));

							uidegslider.slider('value', degree.val());
						},
						
						execute : function ( e ) {
							
							if ( !rotate.imageBeingRotated ) return;
							
							var imageCentre = rotate.getCenter( imgr );
							var mouseXFromCentre = e.pageX - imageCentre[0];
							var mouseYFromCentre = e.pageY - imageCentre[1];
							var mouseAngle = Math.atan2( mouseYFromCentre, mouseXFromCentre );
							
							var rotateAngle = mouseAngle - rotate.mouseStartAngle + rotate.imageStartAngle;
							rotateAngle = Math.round(parseFloat(rotateAngle) * 180 / Math.PI);
							
							if ( e.shiftKey ) {
								rotateAngle = Math.round((rotateAngle + 6)/15) * 15;
							}
							
							imgr.rotate(rotateAngle);
							
							rotateAngle = rotateAngle % 360;
							if (rotateAngle < 0) {
								rotateAngle += 360;
							}
							degree.val(rotateAngle);

							uidegslider.slider('value', degree.val());
							
							return false;
						},
						
						start : function ( e ) {
							
							rotate.imageBeingRotated = true;
							
							var imageCentre = rotate.getCenter( imgr );
							var mouseStartXFromCentre = e.pageX - imageCentre[0];
							var mouseStartYFromCentre = e.pageY - imageCentre[1];
							rotate.mouseStartAngle = Math.atan2( mouseStartYFromCentre, mouseStartXFromCentre );
							
							rotate.imageStartAngle = parseFloat(imgr.rotate()) * Math.PI / 180.0;
							
							$(document).mousemove( rotate.execute );
							
							return false;
						},
							
						stop : function ( e ) {
							
							if ( !rotate.imageBeingRotated ) return;
							
							$(document).unbind( 'mousemove' , rotate.execute);
							
							setTimeout( function() { rotate.imageBeingRotated = false; }, 10 );
							return false;
						},
						
						getCenter : function ( image ) {
							
							var currentRotation = imgr.rotate();
							imgr.rotate(0);
							
							var imageOffset = imgr.offset();
							var imageCentreX = imageOffset.left + imgr.width() / 2;
							var imageCentreY = imageOffset.top + imgr.height() / 2;
							
							imgr.rotate(currentRotation);
							
							return Array( imageCentreX, imageCentreY );
						}
					},
					resizable = function(destroy) {
						if ($.fn.resizable) {
							if (destroy) {
								rhandle.filter(':ui-resizable').resizable('destroy');
								rhandle.hide();
							}
							else {
								rhandle.show();
								rhandle.resizable({
									alsoResize  : img,
									aspectRatio : cratio,
									resize      : resize.update,
									stop        : resize.fixHeight
								});
								dinit();
							}
						}
					},
					croppable = function(destroy) {
						if ($.fn.draggable && $.fn.resizable) {
							if (destroy) {
								rhandlec.filter(':ui-resizable').resizable('destroy')
									.filter(':ui-draggable').draggable('destroy');
								basec.hide();
							}
							else {
								basec.show();
								
								rhandlec
									.resizable({
										containment : basec,
										aspectRatio : cratioc,
										resize      : crop.resize_update,
										handles     : 'all'
									})
									.draggable({
										handle      : coverc,
										containment : imgc,
										drag        : crop.drag_update,
										stop        : function() { crop.updateView('xy'); }
									});
								
								dinit();
								crop.update();
							}
						}
					},
					rotateable = function(destroy) {
						if ($.fn.draggable && $.fn.resizable) {
							if (destroy) {
								imgr.hide();
							}
							else {
								imgr.show();
								dinit();

							}
						}
					},
					save = function() {
						var w, h, x, y, d, q, b = '';
						
						if (mode == 'resize') {
							w = parseInt(width.val()) || 0;
							h = parseInt(height.val()) || 0;
						} else if (mode == 'crop') {
							w = parseInt(offsetX.val()) || 0;
							h = parseInt(offsetY.val()) || 0;
							x = parseInt(pointX.val()) || 0;
							y = parseInt(pointY.val()) || 0;
						} else if (mode == 'rotate') {
							w = owidth;
							h = oheight;
							d = parseInt(degree.val()) || 0;
							if (d < 0 || d > 360) {
								return fm.error('Invalid rotate degree');
							}
							if (d == 0 || d == 360) {
								return fm.error('errResizeNoChange');
							}
							b = bg.val();
						}
						q = quality? parseInt(quality.val()) : 0;
						
						if (mode != 'rotate') {

							if (w <= 0 || h <= 0) {
								return fm.error('Invalid image size');
							}
							
							if (w == owidth && h == oheight) {
								return fm.error('errResizeNoChange');
							}

						}
						
						dialog.elfinderdialog('close');
						
						self.resizeRequest({
							target : file.hash,
							width  : w,
							height : h,
							x      : x,
							y      : y,
							degree : d,
							quality: q,
							bg     : b,
							mode   : mode
						}, file, dfrd);
					},
					buttons = {},
					hline   = 'elfinder-resize-handle-hline',
					vline   = 'elfinder-resize-handle-vline',
					rpoint  = 'elfinder-resize-handle-point',
					src     = fm.openUrl(file.hash, fm.isCORS? true : false),
					dinit   = function() {
						if (base.hasClass('elfinder-dialog-minimized')) {
							return;
						}
						var dw,
							winH  = $(window).height(),
							winW  = $(window).width(),
							ctrW  = dialog.find('div.elfinder-resize-control').width(),
							prvW  = preview.width(),
							baseW = base.width();
						
						base.width(Math.min(dialogWidth, winW - 30));
						preview.attr('style', '');
						if (owidth && oheight) {
							pwidth  = preview.width()  - (rhandle.outerWidth()  - rhandle.width());
							pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
							resize.updateView(owidth, oheight);
						}
						prvW  = preview.width(),
						
						dw = dialog.width() - 20;
						if (prvW > dw) {
							preview.width(dw);
						} else if ((dw - prvW) < ctrW) {
							if (winW > winH) {
								preview.width(dw - ctrW - 20);
							} else {
								preview.css({ float: 'none', marginLeft: 'auto', marginRight: 'auto'});
							}
						}
						pwidth  = preview.width()  - (rhandle.outerWidth()  - rhandle.width());
						if (fmnode.hasClass('elfinder-fullscreen')) {
							if (base.height() > winH) {
								winH -= 2;
								preview.height(winH - base.height() + preview.height());
								base.css('top', 0 - fmnode.offset().top);
							}
						} else {
							winH -= 30;
							(preview.height() > winH) && preview.height(winH);
						}
						pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
						if (owidth && oheight) {
							setupimg();
						}
						if (img.height() && preview.height() > img.height() + 20) {
							preview.height(img.height() + 20);
							pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
							setuprimg();
						}
					},
					dMinBtn, base;
				
				if (fm.isCORS) {
					img.attr('crossorigin', 'use-credentials');
					imgc.attr('crossorigin', 'use-credentials');
					imgr.attr('crossorigin', 'use-credentials');
				}
				imgr.mousedown( rotate.start );
				$(document).mouseup( rotate.stop );
					
				uiresize.append(
					$(row).append($(label).text(fm.i18n('width')), width),
					$(row).append($(label).text(fm.i18n('height')), height, $('<div class="elfinder-resize-whctrls">').append(constr, reset)),
					(quality? $(row).append($(label).text(fm.i18n('quality')), quality, $('<span/>').text(' (1-100)')) : $()),
					(isJpeg? $(row).append($(label).text(fm.i18n('8pxgrid')).addClass('elfinder-resize-grid8'), grid8px) : $()),
					$(row).append($(label).text(fm.i18n('scale')), uiprop)
				);

				if (api2) {
					uicrop.append(
						$(row).append($(label).text('X'), pointX),
						$(row).append($(label).text('Y')).append(pointY),
						$(row).append($(label).text(fm.i18n('width')), offsetX),
						$(row).append($(label).text(fm.i18n('height')), offsetY, $('<div class="elfinder-resize-whctrls">').append(constrc, reset.clone(true))),
						(quality? $(row).append($(label).text(fm.i18n('quality')), quality.clone(true), $('<span/>').text(' (1-100)')) : $()),
						(isJpeg? $(row).append($(label).text(fm.i18n('8pxgrid')).addClass('elfinder-resize-grid8')) : $())
					);
					
					uirotate.append(
						$(row).addClass('elfinder-resize-degree').append(
							$(label).text(fm.i18n('rotate')),
							degree,
							$('<span/>').text(fm.i18n('degree')),
							$('<div/>').append(uideg270, uideg90)[ctrgrup]()
						),
						$(row).css('height', '20px').append(uidegslider),
						(quality? $(row).addClass('elfinder-resize-quality').append(
							$(label).text(fm.i18n('quality')),
							quality.clone(true),
							$('<span/>').text(' (1-100)')) : $()
						),
						$(row).append($(label).text(fm.i18n('bgcolor')), bg, picker, reseter),
						$(row).css('height', '20px').append(pallet)
					);
					uideg270.on('click', function() {
						rdegree = rdegree - 90;
						rotate.update(rdegree);
					});
					uideg90.on('click', function(){
						rdegree = rdegree + 90;
						rotate.update(rdegree);
					});
				}
				
				dialog.append(uitype).on('resize', function(e){
					e.stopPropagation();
				});

				if (api2) {
					control.append($(row), uiresize, uicrop.hide(), uirotate.hide());
				} else {
					control.append($(row), uiresize);
				}
				
				rhandle.append('<div class="'+hline+' '+hline+'-top"/>',
					'<div class="'+hline+' '+hline+'-bottom"/>',
					'<div class="'+vline+' '+vline+'-left"/>',
					'<div class="'+vline+' '+vline+'-right"/>',
					'<div class="'+rpoint+' '+rpoint+'-e"/>',
					'<div class="'+rpoint+' '+rpoint+'-se"/>',
					'<div class="'+rpoint+' '+rpoint+'-s"/>');
					
				preview.append(spinner).append(rhandle.hide()).append(img.hide());

				if (api2) {
					rhandlec.css('position', 'absolute')
						.append('<div class="'+hline+' '+hline+'-top"/>',
						'<div class="'+hline+' '+hline+'-bottom"/>',
						'<div class="'+vline+' '+vline+'-left"/>',
						'<div class="'+vline+' '+vline+'-right"/>',
						'<div class="'+rpoint+' '+rpoint+'-n"/>',
						'<div class="'+rpoint+' '+rpoint+'-e"/>',
						'<div class="'+rpoint+' '+rpoint+'-s"/>',
						'<div class="'+rpoint+' '+rpoint+'-w"/>',
						'<div class="'+rpoint+' '+rpoint+'-ne"/>',
						'<div class="'+rpoint+' '+rpoint+'-se"/>',
						'<div class="'+rpoint+' '+rpoint+'-sw"/>',
						'<div class="'+rpoint+' '+rpoint+'-nw"/>');

					preview.append(basec.css('position', 'absolute').hide().append(imgc, rhandlec.append(coverc)));
					
					preview.append(imgr.hide());
				}
				
				preview.css('overflow', 'hidden');
				
				dialog.append(preview, control);
				
				buttons[fm.i18n('btnApply')] = save;
				buttons[fm.i18n('btnCancel')] = function() { dialog.elfinderdialog('close'); };
				
				dialog.find('input,button').addClass('elfinder-tabstop');
				
				base = fm.dialog(dialog, {
					title          : fm.escape(file.name),
					width          : dialogWidth,
					resizable      : false,
					buttons        : buttons,
					open           : function() {
						dMinBtn = base.find('.ui-dialog-titlebar .elfinder-titlebar-minimize').hide();
						fm.bind('resize', dinit);
						img.attr('src', src + (src.indexOf('?') === -1 ? '?' : '&')+'_='+Math.random());
						imgc.attr('src', img.attr('src'));
						imgr.attr('src', img.attr('src'));
					},
					close          : function() {
						fm.unbind('resize', dinit);
						$(this).elfinderdialog('destroy');
					},
					resize         : function(e, data) {
						if (data && data.minimize === 'off') {
							dinit();
						}
					}
				}).attr('id', id).parent();
				
				// for IE < 9 dialog mising at open second+ time.
				if (fm.UA.ltIE8) {
					$('.elfinder-dialog').css('filter', '');
				}
				
				coverc.css({ 'opacity': 0.2, 'background-color': '#fff', 'position': 'absolute'}),
				rhandlec.css('cursor', 'move');
				rhandlec.find('.elfinder-resize-handle-point').css({
					'background-color' : '#fff',
					'opacity': 0.5,
					'border-color':'#000'
				});

				if (! api2) {
					uitype.find('.api2').remove();
				}
				
				control.find('input,select').prop('disabled', true);

			},
			
			id, dialog
			;
			

		if (!files.length || files[0].mime.indexOf('image/') === -1) {
			return dfrd.reject();
		}
		
		id = 'resize-'+fm.namespace+'-'+files[0].hash;
		dialog = fm.getUI().find('#'+id);
		
		if (dialog.length) {
			dialog.elfinderdialog('toTop');
			return dfrd.resolve();
		}
		
		open(files[0], id);
			
		return dfrd;
	};

};

(function ($) {
	
	var findProperty = function (styleObject, styleArgs) {
		var i = 0 ;
		for( i in styleArgs) {
	        if (typeof styleObject[styleArgs[i]] != 'undefined') 
	        	return styleArgs[i];
		}
		styleObject[styleArgs[i]] = '';
	    return styleArgs[i];
	};
	
	$.cssHooks.rotate = {
		get: function(elem, computed, extra) {
			return $(elem).rotate();
		},
		set: function(elem, value) {
			$(elem).rotate(value);
			return value;
		}
	};
	$.cssHooks.transform = {
		get: function(elem, computed, extra) {
			var name = findProperty( elem.style , 
				['WebkitTransform', 'MozTransform', 'OTransform' , 'msTransform' , 'transform'] );
			return elem.style[name];
		},
		set: function(elem, value) {
			var name = findProperty( elem.style , 
				['WebkitTransform', 'MozTransform', 'OTransform' , 'msTransform' , 'transform'] );
			elem.style[name] = value;
			return value;
		}
	};
	
	$.fn.rotate = function(val) {
		if (typeof val == 'undefined') {
			if (!!window.opera) {
				var r = this.css('transform').match(/rotate\((.*?)\)/);
				return  ( r && r[1])?
					Math.round(parseFloat(r[1]) * 180 / Math.PI) : 0;
			} else {
				var r = this.css('transform').match(/rotate\((.*?)\)/);
				return  ( r && r[1])? parseInt(r[1]) : 0;
			}
		}
		this.css('transform', 
			this.css('transform').replace(/none|rotate\(.*?\)/, '') + 'rotate(' + parseInt(val) + 'deg)');
		return this;
	};

	$.fx.step.rotate  = function(fx) {
		if ( fx.state == 0 ) {
			fx.start = $(fx.elem).rotate();
			fx.now = fx.start;
		}
		$(fx.elem).rotate(fx.now);
	};

	if (typeof window.addEventListener == "undefined" && typeof document.getElementsByClassName == "undefined") { // IE & IE<9
		var GetAbsoluteXY = function(element) {
			var pnode = element;
			var x = pnode.offsetLeft;
			var y = pnode.offsetTop;
			
			while ( pnode.offsetParent ) {
				pnode = pnode.offsetParent;
				if (pnode != document.body && pnode.currentStyle['position'] != 'static') {
					break;
				}
				if (pnode != document.body && pnode != document.documentElement) {
					x -= pnode.scrollLeft;
					y -= pnode.scrollTop;
				}
				x += pnode.offsetLeft;
				y += pnode.offsetTop;
			}
			
			return { x: x, y: y };
		};
		
		var StaticToAbsolute = function (element) {
			if ( element.currentStyle['position'] != 'static') {
				return ;
			}

			var xy = GetAbsoluteXY(element);
			element.style.position = 'absolute' ;
			element.style.left = xy.x + 'px';
			element.style.top = xy.y + 'px';
		};

		var IETransform = function(element,transform){

			var r;
			var m11 = 1;
			var m12 = 1;
			var m21 = 1;
			var m22 = 1;

			if (typeof element.style['msTransform'] != 'undefined'){
				return true;
			}

			StaticToAbsolute(element);

			r = transform.match(/rotate\((.*?)\)/);
			var rotate =  ( r && r[1])	?	parseInt(r[1])	:	0;

			rotate = rotate % 360;
			if (rotate < 0) rotate = 360 + rotate;

			var radian= rotate * Math.PI / 180;
			var cosX =Math.cos(radian);
			var sinY =Math.sin(radian);

			m11 *= cosX;
			m12 *= -sinY;
			m21 *= sinY;
			m22 *= cosX;

			element.style.filter =  (element.style.filter || '').replace(/progid:DXImageTransform\.Microsoft\.Matrix\([^)]*\)/, "" ) +
				("progid:DXImageTransform.Microsoft.Matrix(" + 
					 "M11=" + m11 + 
					",M12=" + m12 + 
					",M21=" + m21 + 
					",M22=" + m22 + 
					",FilterType='bilinear',sizingMethod='auto expand')") 
				;

	  		var ow = parseInt(element.style.width || element.width || 0 );
	  		var oh = parseInt(element.style.height || element.height || 0 );

			var radian = rotate * Math.PI / 180;
			var absCosX =Math.abs(Math.cos(radian));
			var absSinY =Math.abs(Math.sin(radian));

			var dx = (ow - (ow * absCosX + oh * absSinY)) / 2;
			var dy = (oh - (ow * absSinY + oh * absCosX)) / 2;

			element.style.marginLeft = Math.floor(dx) + "px";
			element.style.marginTop  = Math.floor(dy) + "px";

			return(true);
		};
		
		var transform_set = $.cssHooks.transform.set;
		$.cssHooks.transform.set = function(elem, value) {
			transform_set.apply(this, [elem, value] );
			IETransform(elem,value);
			return value;
		};
	}

})(jQuery);
