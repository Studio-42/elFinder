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
	"use strict";
	var fm = this.fm,
		losslessRotate = 0,
		getBounceBox = function(w, h, theta) {
			var srcPts = [
					{x: w/2, y: h/2},
					{x: -w/2, y: h/2},
					{x: -w/2, y: -h/2},
					{x: w/2, y: -h/2}
				],
				dstPts = [],
				min = {x: Number.MAX_VALUE, y: Number.MAX_VALUE},
				max = {x: Number.MIN_VALUE, y: Number.MIN_VALUE};
			$.each(srcPts, function(i, srcPt){
				dstPts.push({
					x: srcPt.x * Math.cos(theta) - srcPt.y * Math.sin(theta),
					y: srcPt.x * Math.sin(theta) + srcPt.y * Math.cos(theta)
				});
			});
			$.each(dstPts, function(i, pt) {
				min.x = Math.min(min.x, pt.x);
				min.y = Math.min(min.y, pt.y);
				max.x = Math.max(max.x, pt.x);
				max.y = Math.max(max.y, pt.y);
			});
			return {
				width: max.x - min.x, height: max.y - min.y
			};
		};
	
	this.updateOnSelect = false;
	
	this.getstate = function() {
		var sel = fm.selectedFiles();
		return sel.length == 1 && sel[0].read && sel[0].write && sel[0].mime.indexOf('image/') !== -1 ? 0 : -1;
	};
	
	this.resizeRequest = function(data, f, dfrd) {
		var file = f || fm.file(data.target),
			tmb  = file? file.tmb : null,
			enabled = fm.isCommandEnabled('resize', data.target);
		
		if (enabled && (! file || (file && file.read && file.write && file.mime.indexOf('image/') !== -1 ))) {
			return fm.request({
				data : Object.assign(data, {
					cmd : 'resize'
				}),
				notify : {type : 'resize', cnt : 1}
			})
			.fail(function(error) {
				if (dfrd) {
					dfrd.reject(error);
				}
			})
			.done(function() {
				if (data.quality) {
					fm.storage('jpgQuality', data.quality === fm.option('jpgQuality')? null : data.quality);
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
	};
	
	this.exec = function(hashes) {
		var self  = this,
			files = this.files(hashes),
			dfrd  = $.Deferred(),
			api2  = (fm.api > 1),
			options = this.options,
			dialogWidth = 650,
			fmnode = fm.getUI(),
			ctrgrup = $().controlgroup? 'controlgroup' : 'buttonset',
			grid8Def = typeof options.grid8px === 'undefined' || options.grid8px !== 'disable'? true : false,
			presetSize = Array.isArray(options.presetSize)? options.presetSize : [],
			clactive = 'elfinder-dialog-active',
			clsediting = fm.res('class', 'editing'),
			open = function(file, id, src) {
				var isJpeg   = (file.mime === 'image/jpeg'),
					dialog   = $('<div class="elfinder-resize-container"></div>'),
					input    = '<input type="number" class="ui-corner-all"/>',
					row      = '<div class="elfinder-resize-row"></div>',
					label    = '<div class="elfinder-resize-label"></div>',
					changeTm = null,
					operate  = false,
					opStart  = function() { operate = true; },
					opStop   = function() {
						if (operate) {
							operate = false;
							control.trigger('change');
						}
					},
					control  = $('<div class="elfinder-resize-control"></div>')
						.on('focus', 'input[type=text],input[type=number]', function() {
							$(this).trigger('select');
						})
						.on('change', function() {
							changeTm && cancelAnimationFrame(changeTm);
							changeTm = requestAnimationFrame(function() {
								var panel, quty, canvas, ctx, img, sx, sy, sw, sh, deg, theta, bb;
								if (sizeImg && ! operate && (canvas = sizeImg.data('canvas'))) {
									panel = control.children('div.elfinder-resize-control-panel:visible');
									quty = panel.find('input.elfinder-resize-quality');
									if (quty.is(':visible')) {
										ctx = sizeImg.data('ctx');
										img = sizeImg.get(0);
										if (panel.hasClass('elfinder-resize-uiresize')) {
											// resize
											sw = canvas.width = width.val();
											sh = canvas.height = height.val();
											ctx.drawImage(img, 0, 0, sw, sh);
										} else if (panel.hasClass('elfinder-resize-uicrop')) {
											// crop
											sx = pointX.val();
											sy = pointY.val();
											sw = offsetX.val();
											sh = offsetY.val();
											canvas.width = sw;
											canvas.height = sh;
											ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
										} else {
											// rotate
											deg = degree.val();
											theta = (degree.val() * Math.PI) / 180;
											bb = getBounceBox(owidth, oheight, theta);
											sw = canvas.width = bb.width;
											sh = canvas.height = bb.height;
											ctx.save();
											if (deg % 90 !== 0) {
												ctx.fillStyle = bg.val() || '#FFF';
												ctx.fillRect(0, 0, sw, sh);
											}
											ctx.translate(sw / 2, sh / 2);
											ctx.rotate(theta);
											ctx.drawImage(img, -img.width/2, -img.height/2, owidth, oheight);
											ctx.restore();
										}
										canvas.toBlob(function(blob) {
											if (blob) {
												size1 = blob.size;
												quty.next('span').text(' (' + fm.formatSize(blob.size) + ')');
											}
										}, 'image/jpeg', Math.max(Math.min(quty.val(), 100), 1) / 100);
									}
								}
							});
						})
						.on('mouseup', 'input', function(e) {
							$(e.target).trigger('change');
						}),
					preview  = $('<div class="elfinder-resize-preview"></div>')
						.on('touchmove', function(e) {
							if ($(e.target).hasClass('touch-punch')) {
								e.stopPropagation();
								e.preventDefault();
							}
						}),
					spinner  = $('<div class="elfinder-resize-loading">'+fm.i18n('ntfloadimg')+'</div>'),
					rhandle  = $('<div class="elfinder-resize-handle touch-punch"></div>'),
					rhandlec = $('<div class="elfinder-resize-handle touch-punch"></div>'),
					uiresize = $('<div class="elfinder-resize-uiresize elfinder-resize-control-panel"></div>'),
					uicrop   = $('<div class="elfinder-resize-uicrop elfinder-resize-control-panel"></div>'),
					uirotate = $('<div class="elfinder-resize-rotate elfinder-resize-control-panel"></div>'),
					uideg270 = $('<button></button>').attr('title',fm.i18n('rotate-cw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-l"></span>')),
					uideg90  = $('<button></button>').attr('title',fm.i18n('rotate-ccw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-r"></span>')),
					uiprop   = $('<span ></span>'),
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
					uitype   = $('<div class="elfinder-resize-type"></div>')
						.append('<input type="radio" name="type" id="'+id+'-resize" value="resize" checked="checked" /><label for="'+id+'-resize">'+fm.i18n('resize')+'</label>',
						'<input class="api2" type="radio" name="type" id="'+id+'-crop" value="crop" /><label class="api2" for="'+id+'-crop">'+fm.i18n('crop')+'</label>',
						'<input class="api2" type="radio" name="type" id="'+id+'-rotate" value="rotate" /><label class="api2" for="'+id+'-rotate">'+fm.i18n('rotate')+'</label>'),
					mode     = 'resize',
					type     = uitype[ctrgrup]()[ctrgrup]('disable').find('input')
						.on('change', function() {
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
						.on('change', function() {
							var w = round(parseInt(width.val())),
								h = round(cratio ? w/ratio : parseInt(height.val()));

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								width.val(w);
								height.val(h);
							}
						}).addClass('elfinder-focus'),
					height  = $(input)
						.on('change', function() {
							var h = round(parseInt(height.val())),
								w = round(cratio ? h*ratio : parseInt(width.val()));

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								width.val(w);
								height.val(h);
							}
						}),
					pointX  = $(input).on('change', function(){crop.updateView();}),
					pointY  = $(input).on('change', function(){crop.updateView();}),
					offsetX = $(input).on('change', function(){crop.updateView('w');}),
					offsetY = $(input).on('change', function(){crop.updateView('h');}),
					quality = isJpeg && api2?
						$(input).val(fm.storage('jpgQuality') > 0? fm.storage('jpgQuality') : fm.option('jpgQuality'))
							.addClass('elfinder-resize-quality')
							.attr('min', '1').attr('max', '100').attr('title', '1 - 100')
							.on('blur', function(){
								var q = Math.min(100, Math.max(1, parseInt(this.value)));
								control.find('input.elfinder-resize-quality').val(q);
							})
						: null,
					degree = $('<input type="number" class="ui-corner-all" maxlength="3" value="0" />')
						.on('change', function() {
							rotate.update();
						}),
					uidegslider = $('<div class="elfinder-resize-rotate-slider touch-punch"></div>')
						.slider({
							min: 0,
							max: 360,
							value: degree.val(),
							animate: true,
							start: opStart,
							stop: opStop,
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
					pickimg,
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
					bg = $('<input class="ui-corner-all elfinder-resize-bg" type="text">')
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
							setStep8();
						})
						.button(),
					setStep8 = function() {
						var step = grid8? 8 : 1;
						$.each([width, height, offsetX, offsetY, pointX, pointY], function() {
							this.attr('step', step);
						});
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
					},
					setuprimg = function() {
						var r_scale,
							fail = function() {
								bg.parent().hide();
								pallet.hide();
							};
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
								pickimg = $('<img>');
								if (fm.isCORS) {
									pickimg.attr('crossorigin', 'use-credentials');
								}
								pickimg.on('load', function() {
									if (pickcanv && pickcanv.width !== rwidth) {
										setColorData();
									}
								})
								.on('error', fail)
								.attr('src', canvSrc);
							} else {
								fail();
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
						jpgCalc();
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
								},
								rgbRound = function(c) {
									return Math.round(c / 8) * 8;
								};
							
							calc:
							try {
								w = pickcanv.width = imgr.width();
								h = pickcanv.height = imgr.height();
								scale = w / owidth;
								pickctx.scale(scale, scale);
								pickctx.drawImage(pickimg.get(0), 0, 0);
			
								data = pickctx.getImageData(0, 0, w, h).data;
			
								// Range to detect the dominant color
								tx1 = w * 0.1;
								tx2 = w * 0.9;
								ty1 = h * 0.1;
								ty2 = h * 0.9;
			
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
											rgb = rgbRound(r) + ',' + rgbRound(g) + ',' + rgbRound(b);
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
					setupPreset = function() {
						preset.on('click', 'span.elfinder-resize-preset', function() {
							var btn = $(this),
								w = btn.data('s')[0],
								h = btn.data('s')[1],
								r = owidth / oheight;
							btn.data('s', [h, w]).text(h + 'x' + w);
							if (owidth > w || oheight > h) {
								if (owidth <= w) {
									w = round(h * r);
								} else if (oheight <= h) {
									h = round(w / r);
								} else {
									if (owidth - w > oheight - h) {
										h = round(w / r);
									} else {
										w = round(h * r);
									}
								}
							} else {
								w = owidth;
								h = oheight;
							}
							width.val(w);
							height.val(h);
							resize.updateView(w, h);
							jpgCalc();
						});
						presetc.on('click', 'span.elfinder-resize-preset', function() {
							var btn = $(this),
								w = btn.data('s')[0],
								h = btn.data('s')[1],
								x = pointX.val(),
								y = pointY.val();
							
							btn.data('s', [h, w]).text(h + 'x' + w);
							if (owidth >= w && oheight >= h) {
								if (owidth - w - x < 0) {
									x = owidth - w;
								}
								if (oheight - h - y < 0) {
									y = oheight - h;
								}
								pointX.val(x);
								pointY.val(y);
								offsetX.val(w);
								offsetY.val(h);
								crop.updateView();
								jpgCalc();
							}
						});
						presetc.children('span.elfinder-resize-preset').each(function() {
							var btn = $(this),
								w = btn.data('s')[0],
								h = btn.data('s')[1];
							
							btn[(owidth >= w && oheight >= h)? 'show' : 'hide']();
						});
					},
					dimreq  = null,
					inited  = false,
					setdim  = function(dim) {
						var rfile = fm.file(file.hash);
						rfile.width = dim[0];
						rfile.height = dim[1];
					},
					init    = function() {
						var elm, memSize, r_scale, imgRatio;
						
						if (inited) {
							return;
						}
						inited = true;
						dimreq && dimreq.state && dimreq.state() === 'pending' && dimreq.reject();
						
						// check lossless rotete
						if (fm.api >= 2.1030) {
							if (losslessRotate === 0) {
								fm.request({
									data: {
										cmd    : 'resize',
										target : file.hash,
										degree : 0,
										mode   : 'rotate'
									},
									preventDefault : true
								}).done(function(data) {
									losslessRotate = data.losslessRotate? 1 : -1;
									if (losslessRotate === 1 && (degree.val() % 90 === 0)) {
										uirotate.children('div.elfinder-resize-quality').hide();
									}
								}).fail(function() {
									losslessRotate = -1;
								});
							}
						} else {
							losslessRotate = -1;
						}
						
						elm = img.get(0);
						memSize = file.width && file.height? {w: file.width, h: file.height} : (elm.naturalWidth? null : {w: img.width(), h: img.height()});
					
						memSize && img.removeAttr('width').removeAttr('height');
						
						owidth  = file.width || elm.naturalWidth || elm.width || img.width();
						oheight = file.height || elm.naturalHeight || elm.height || img.height();
						if (!file.width || !file.height) {
							setdim([owidth, oheight]);
						}
						
						memSize && img.width(memSize.w).height(memSize.h);
						
						dMinBtn.show();
	
						imgRatio = oheight / owidth;
						
						if (imgRatio < 1 && preview.height() > preview.width() * imgRatio) {
							preview.height(preview.width() * imgRatio);
						}
						
						if (preview.height() > img.height() + 20) {
							preview.height(img.height() + 20);
						}
						
						pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
						
						spinner.remove();
						
						ratio = owidth/oheight;
	
						rhandle.append(img.show()).show();
						width.val(owidth);
						height.val(oheight);
	
						setupPicker();
						setupPreset();
						setupimg();
						
						uitype[ctrgrup]('enable');
						control.find('input,select').prop('disabled', false)
							.filter(':text').on('keydown', function(e) {
								var cOpts;
								if (e.keyCode == $.ui.keyCode.ENTER) {
									e.stopPropagation();
									e.preventDefault();
									cOpts = {
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
												$(this).trigger('focus');
											}
										}
									};
										
									if (useSaveAs) {
										cOpts['buttons'] = [{
											label    : 'btnSaveAs',
											callback : function() {
												requestAnimationFrame(saveAs);
											}
										}];
									}
									fm.confirm(cOpts);
									return;
								}
							})
							.on('keyup', function() {
								var $this = $(this);
								if (! $this.hasClass('elfinder-resize-bg')) {
									requestAnimationFrame(function() {
										$this.val($this.val().replace(/[^0-9]/g, ''));
									});
								}
							})
							.filter(':first');
						
						setStep8();
						!fm.UA.Mobile && width.trigger('focus');
						resizable();
					},
					img     = $('<img/>')
						.on('load', init)
						.on('error', function() {
							spinner.html(fm.i18n('ntfsmth')).css('background', 'transparent');
						}),
					basec = $('<div></div>'),
					imgc = $('<img/>'),
					coverc = $('<div></div>'),
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
						jpgCalc();
					},
					resize = {
						update : function() {
							width.val(round(img.width()/prop));
							height.val(round(img.height()/prop));
							jpgCalc();
						},
						
						updateView : function(w, h) {
							if (w > pwidth || h > pheight) {
								if (w / pwidth > h / pheight) {
									prop = pwidth / w;
									img.width(pwidth).height(round(h*prop));
								} else {
									prop = pheight / h;
									img.height(pheight).width(round(w*prop));
								}
							} else {
								img.width(round(w)).height(round(h));
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
							jpgCalc();
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
						
						setQuality : function() {
							uirotate.children('div.elfinder-resize-quality')[(losslessRotate > 0 && (degree.val() % 90) === 0)? 'hide' : 'show']();
						},
						
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
							
							rotate.setQuality();
						},
						
						execute : function ( e ) {
							
							if ( !rotate.imageBeingRotated ) return;
							
							var imageCentre = rotate.getCenter( imgr );
							var ev = e.originalEvent.touches? e.originalEvent.touches[0] : e;
							var mouseXFromCentre = ev.pageX - imageCentre[0];
							var mouseYFromCentre = ev.pageY - imageCentre[1];
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
							
							rotate.setQuality();
							
							return false;
						},
						
						start : function ( e ) {
							if (imgr.hasClass('elfinder-resize-picking')) {
								return;
							}
							
							opStart();
							rotate.imageBeingRotated = true;
							
							var imageCentre = rotate.getCenter( imgr );
							var ev = e.originalEvent.touches? e.originalEvent.touches[0] : e;
							var mouseStartXFromCentre = ev.pageX - imageCentre[0];
							var mouseStartYFromCentre = ev.pageY - imageCentre[1];
							rotate.mouseStartAngle = Math.atan2( mouseStartYFromCentre, mouseStartXFromCentre );
							
							rotate.imageStartAngle = parseFloat(imgr.rotate()) * Math.PI / 180.0;
							
							$(document).on('mousemove', rotate.execute);
							imgr.on('touchmove', rotate.execute);
							
							return false;
						},
							
						stop : function ( e ) {
							
							if ( !rotate.imageBeingRotated ) return;
							
							$(document).off('mousemove', rotate.execute);
							imgr.off('touchmove', rotate.execute);
							
							requestAnimationFrame(function() { rotate.imageBeingRotated = false; });
							opStop();
							
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
								start       : opStart,
								stop        : function(e) {
									resize.fixHeight;
									resize.updateView(width.val(), height.val());
									opStop();
								}
							});
							dinit();
						}
					},
					croppable = function(destroy) {
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
									start       : opStart,
									stop        : opStop,
									handles     : 'all'
								})
								.draggable({
									handle      : coverc,
									containment : imgc,
									drag        : crop.drag_update,
									start       : opStart,
									stop        : function() {
										crop.updateView('xy');
										opStop();
									}
								});
							
							dinit();
							crop.update();
						}
					},
					rotateable = function(destroy) {
						if (destroy) {
							imgr.hide();
						}
						else {
							imgr.show();
							dinit();
						}
					},
					checkVals = function() {
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
								fm.error('Invalid rotate degree');
								return false;
							}
							if (d == 0 || d == 360) {
								fm.error('errResizeNoChange');
								return false;
							}
							b = bg.val();
						}
						q = quality? parseInt(quality.val()) : 0;
						
						if (mode != 'rotate') {
							if (w <= 0 || h <= 0) {
								fm.error('Invalid image size');
								return false;
							}
							if (w == owidth && h == oheight && parseInt(size0 / 1000) === parseInt(size1/1000)) {
								fm.error('errResizeNoChange');
								return false;
							}
						}
						
						return {w: w, h: h, x: x, y: y, d: d, q: q, b: b};
					},
					save = function() {
						var vals;
						
						if (vals = checkVals()) {
							dialog.elfinderdialog('close');
							self.resizeRequest({
								target : file.hash,
								width  : vals.w,
								height : vals.h,
								x      : vals.x,
								y      : vals.y,
								degree : vals.d,
								quality: vals.q,
								bg     : vals.b,
								mode   : mode
							}, file, dfrd);
						}
					},
					saveAs = function() {
						var fail = function() {
								dialogs.addClass(clsediting).fadeIn(function() {
									base.addClass(clactive);
								});
								fm.disable();
							},
							make = function() {
								self.mime = file.mime;
								self.prefix = file.name.replace(/ \d+(\.[^.]+)?$/, '$1');
								self.requestCmd = 'mkfile';
								self.nextAction = {};
								self.data = {target : file.phash};
								$.proxy(fm.res('mixin', 'make'), self)()
									.done(function(data) {
										var hash, dfd;
										if (data.added && data.added.length) {
											hash = data.added[0].hash;
											dfd = fm.api < 2.1032? fm.url(file.hash, { async: true, temporary: true }) : null;
											$.when(dfd).done(function(url) {
												fm.request({
													options : {type : 'post'},
													data : {
														cmd     : 'put',
														target  : hash,
														encoding: dfd? 'scheme' : 'hash', 
														content : dfd? fm.convAbsUrl(url) : file.hash
													},
													notify : {type : 'copy', cnt : 1},
													syncOnFail : true
												})
												.fail(fail)
												.done(function(data) {
													data = fm.normalize(data);
													fm.updateCache(data);
													file = fm.file(hash);
													data.changed && data.changed.length && fm.change(data);
													base.show().find('.elfinder-dialog-title').html(fm.escape(file.name));
													save();
													dialogs.fadeIn();
												});
											}).fail(fail);
										} else {
											fail();
										}
									})
									.fail(fail)
									.always(function() {
										delete self.mime;
										delete self.prefix;
										delete self.nextAction;
										delete self.data;
									});
								fm.trigger('unselectfiles', { files: [ file.hash ] });
							},
							reqOpen = null,
							dialogs;
						
						if (checkVals()) {
							dialogs = fmnode.children('.' + self.dialogClass + ':visible').removeClass(clsediting).fadeOut();
							base.removeClass(clactive);
							fm.enable();
							if (fm.searchStatus.state < 2 && file.phash !== fm.cwd().hash) {
								reqOpen = fm.exec('open', [file.phash], {thash: file.phash});
							}
							
							$.when([reqOpen]).done(function() {
								reqOpen? fm.one('cwdrender', make) : make();
							}).fail(fail);
						}
					},
					buttons = {},
					hline   = 'elfinder-resize-handle-hline',
					vline   = 'elfinder-resize-handle-vline',
					rpoint  = 'elfinder-resize-handle-point',
					canvSrc = src,
					sizeImg = quality? $('<img>').attr('crossorigin', fm.isCORS? 'use-credentials' : '').attr('src', canvSrc).on('load', function() {
						try {
							var canv = document.createElement('canvas');
							sizeImg.data('canvas', canv).data('ctx', canv.getContext('2d'));
							jpgCalc();
						} catch(e) {
							sizeImg.removeData('canvas').removeData('ctx');
						}
					}) : null,
					jpgCalc = function() {
						control.find('input.elfinder-resize-quality:visible').trigger('change');
					},
					dinit   = function(e) {
						if (base.hasClass('elfinder-dialog-minimized') || base.is(':hidden')) {
							return;
						}
						
						preset.hide();
						presetc.hide();
						
						var win   = fm.options.dialogContained? fmnode : $(window),
							winH  = win.height(),
							winW  = win.width(),
							presW = 'auto',
							presIn = true,
							dw, ctrW, prvW;
						
						base.width(Math.min(dialogWidth, winW - 30));
						preview.attr('style', '');
						if (owidth && oheight) {
							pwidth  = preview.width()  - (rhandle.outerWidth()  - rhandle.width());
							pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
							resize.updateView(owidth, oheight);
						}
						ctrW  = dialog.find('div.elfinder-resize-control').width();
						prvW  = preview.width();
						
						dw = dialog.width() - 20;
						if (prvW > dw) {
							preview.width(dw);
							presIn = false;
						} else if ((dw - prvW) < ctrW) {
							if (winW > winH) {
								preview.width(dw - ctrW - 20);
							} else {
								preview.css({ float: 'none', marginLeft: 'auto', marginRight: 'auto'});
								presIn = false;
							}
						}
						if (presIn) {
							presW = ctrW;
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
						
						preset.css('width', presW).show();
						presetc.css('width', presW).show();
						if (!presetc.children('span.elfinder-resize-preset:visible').length) {
							presetc.hide();
						}
						dialog.elfinderdialog('posInit');
					},
					preset = (function() {
						var sets = $('<fieldset class="elfinder-resize-preset-container">').append($('<legend>').html(fm.i18n('presets'))).css('box-sizing', 'border-box').hide(),
							hasC;
						$.each(presetSize, function(i, s) {
							if (s.length === 2) {
								hasC = true;
								sets.append($('<span class="elfinder-resize-preset"></span>')
									.data('s', s)
									.text(s[0]+'x'+s[1])
									.button()
								);
							}
						});
						if (!hasC) {
							return $();
						} else {
							return sets;
						}
					})(),
					presetc = preset.clone(true),
					useSaveAs = fm.uploadMimeCheck(file.mime, file.phash),
					dMinBtn, base;
				
				size0 = size1 = file.size;
				uiresize.append(
					$(row).append($(label).text(fm.i18n('width')), width),
					$(row).append($(label).text(fm.i18n('height')), height, $('<div class="elfinder-resize-whctrls">').append(constr, reset)),
					(quality? $(row).append($(label).text(fm.i18n('quality')), quality, $('<span></span>')) : $()),
					(isJpeg? $(row).append($(label).text(fm.i18n('8pxgrid')).addClass('elfinder-resize-grid8'), grid8px) : $()),
					$(row).append($(label).text(fm.i18n('scale')), uiprop),
					$(row).append(preset)
				);

				if (api2) {
					uicrop.append(
						$(row).append($(label).text('X'), pointX),
						$(row).append($(label).text('Y')).append(pointY),
						$(row).append($(label).text(fm.i18n('width')), offsetX),
						$(row).append($(label).text(fm.i18n('height')), offsetY, $('<div class="elfinder-resize-whctrls">').append(constrc, reset.clone(true))),
						(quality? $(row).append($(label).text(fm.i18n('quality')), quality.clone(true), $('<span></span>')) : $()),
						(isJpeg? $(row).append($(label).text(fm.i18n('8pxgrid')).addClass('elfinder-resize-grid8')) : $()),
						$(row).append(presetc)
					);
					
					uirotate.append(
						$(row).addClass('elfinder-resize-degree').append(
							$(label).text(fm.i18n('rotate')),
							degree,
							$('<span></span>').text(fm.i18n('degree')),
							$('<div></div>').append(uideg270, uideg90)[ctrgrup]()
						),
						$(row).css('height', '20px').append(uidegslider),
						((quality)? $(row)[losslessRotate < 1? 'show' : 'hide']().addClass('elfinder-resize-quality').append(
							$(label).text(fm.i18n('quality')),
							quality.clone(true),
							$('<span></span>')) : $()
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
					control.append(/*$(row), */uiresize, uicrop.hide(), uirotate.hide());
				} else {
					control.append(/*$(row), */uiresize);
				}
				
				rhandle.append('<div class="'+hline+' '+hline+'-top"></div>',
					'<div class="'+hline+' '+hline+'-bottom"></div>',
					'<div class="'+vline+' '+vline+'-left"></div>',
					'<div class="'+vline+' '+vline+'-right"></div>',
					'<div class="'+rpoint+' '+rpoint+'-e"></div>',
					'<div class="'+rpoint+' '+rpoint+'-se"></div>',
					'<div class="'+rpoint+' '+rpoint+'-s"></div>');
					
				preview.append(spinner).append(rhandle.hide()).append(img.hide());

				if (api2) {
					rhandlec.css('position', 'absolute')
						.append('<div class="'+hline+' '+hline+'-top"></div>',
						'<div class="'+hline+' '+hline+'-bottom"></div>',
						'<div class="'+vline+' '+vline+'-left"></div>',
						'<div class="'+vline+' '+vline+'-right"></div>',
						'<div class="'+rpoint+' '+rpoint+'-n"></div>',
						'<div class="'+rpoint+' '+rpoint+'-e"></div>',
						'<div class="'+rpoint+' '+rpoint+'-s"></div>',
						'<div class="'+rpoint+' '+rpoint+'-w"></div>',
						'<div class="'+rpoint+' '+rpoint+'-ne"></div>',
						'<div class="'+rpoint+' '+rpoint+'-se"></div>',
						'<div class="'+rpoint+' '+rpoint+'-sw"></div>',
						'<div class="'+rpoint+' '+rpoint+'-nw"></div>');

					preview.append(basec.css('position', 'absolute').hide().append(imgc, rhandlec.append(coverc)));
					
					preview.append(imgr.hide());
				}
				
				preview.css('overflow', 'hidden');
				
				dialog.append(preview, control);
				
				buttons[fm.i18n('btnApply')] = save;
				if (useSaveAs) {
					buttons[fm.i18n('btnSaveAs')] = function() { requestAnimationFrame(saveAs); };
				}
				buttons[fm.i18n('btnCancel')] = function() { dialog.elfinderdialog('close'); };
				
				dialog.find('input,button').addClass('elfinder-tabstop');
				
				base = self.fmDialog(dialog, {
					title          : fm.escape(file.name),
					width          : dialogWidth,
					resizable      : false,
					buttons        : buttons,
					open           : function() {
						var doDimReq = function(force) {
								dimreq = fm.request({
									data : {cmd : 'dim', target : file.hash, substitute : substituteImg? 400 : ''},
									preventDefault : true
								})
								.done(function(data) {
									if (!data.url && needPng) {
										dialog.elfinderdialog('close');
										fm.error(['errOpen', file.name]);
									} else {
										if (data.dim) {
											var dim = data.dim.split('x');
											file.width = dim[0];
											file.height = dim[1];
											setdim(dim);
											if (data.url) {
												img.attr('src', data.url);
												imgc.attr('src', data.url);
												imgr.attr('src', data.url);
											}
											return init();
										}
									}
								});
							},
							needPng = !{'image/jpeg':true,'image/png':true,'image/gif':true,}[file.mime],
							substituteImg = fm.option('substituteImg', file.hash) && (needPng || file.size > options.dimSubImgSize)? true : false,
							hasSize = (file.width && file.height)? true : false;
						dMinBtn = base.find('.ui-dialog-titlebar .elfinder-titlebar-minimize').hide();
						fm.bind('resize', dinit);
						img.attr('src', src).one('error.dimreq', function() {
							doDimReq(true);
						});
						imgc.attr('src', src);
						imgr.attr('src', src);
						if (api2) {
							imgr.on('mousedown touchstart', rotate.start)
								.on('touchend', rotate.stop);
							base.on('mouseup', rotate.stop);
						}
						if (hasSize && !substituteImg) {
							return init();
						}
						if (file.size > (options.getDimThreshold || 0)) {
							img.off('error.dimreq');
							doDimReq();
						} else if (hasSize) {
							return init();
						}
					},
					close          : function() {
						if (api2) {
							imgr.off('mousedown touchstart', rotate.start)
								.off('touchend', rotate.stop);
							$(document).off('mouseup', rotate.stop);
						}
						fm.unbind('resize', dinit);
						$(this).elfinderdialog('destroy');
					},
					resize         : function(e, data) {
						if (data && data.minimize === 'off') {
							dinit();
						}
					}
				}).attr('id', id).closest('.ui-dialog').addClass(clsediting);
				
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
				control.find('input.elfinder-resize-quality')
					.next('span').addClass('elfinder-resize-jpgsize').attr('title', fm.i18n('roughFileSize'));

			},
			
			id, dialog, size0, size1
			;
			

		if (!files.length || files[0].mime.indexOf('image/') === -1) {
			return dfrd.reject();
		}
		
		id = 'resize-'+fm.namespace+'-'+files[0].hash;
		dialog = fmnode.find('#'+id);
		
		if (dialog.length) {
			dialog.elfinderdialog('toTop');
			return dfrd.resolve();
		}
		
		
		fm.openUrl(files[0].hash, 'sameorigin', function(src) {
			open(files[0], id, src);
		});
			
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
		var r;
		if (typeof val == 'undefined') {
			if (!!window.opera) {
				r = this.css('transform').match(/rotate\((.*?)\)/);
				return  ( r && r[1])?
					Math.round(parseFloat(r[1]) * 180 / Math.PI) : 0;
			} else {
				r = this.css('transform').match(/rotate\((.*?)\)/);
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

			radian = rotate * Math.PI / 180;
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
