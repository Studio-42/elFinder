"use strict";
/**
 * @class  elFinder command "resize"
 * Open dialog to resize image
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.resize = function() {

	this.updateOnSelect = false;
	
	this.getstate = function() {
		var sel = this.fm.selectedFiles();
		return !this._disabled && sel.length == 1 && sel[0].read && sel[0].write && sel[0].mime.indexOf('image/') !== -1 ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			files = this.files(hashes),
			dfrd  = $.Deferred(),
			
			open = function(file, id) {
				var dialog   = $('<div class="elfinder-dialog-resize"/>'),
					input    = '<input type="text" size="5"/>',
					row      = '<div class="elfinder-resize-row"/>',
					label    = '<div class="elfinder-resize-label"/>',
					control  = $('<div class="elfinder-resize-control"/>'),
					preview  = $('<div class="elfinder-resize-preview"/>'),
					spinner  = $('<div class="elfinder-resize-spinner">'+fm.i18n('ntfloadimg')+'</div>'),
					rhandle  = $('<div class="elfinder-resize-handle"/>'),
					rhandlec = $('<div class="elfinder-resize-handle"/>'),
					uiresize = $('<div class="elfinder-resize-uiresize"/>'),
					uicrop   = $('<div class="elfinder-resize-uicrop"/>'),
					uibuttonset = '<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>',
					uibutton    = '<div class="ui-state-default elfinder-button"/>',
					uiseparator = '<span class="ui-widget-content elfinder-toolbar-button-separator"/>',
					uirotate    = $('<div class="elfinder-resize-rotate"/>'),
					uideg270    = $(uibutton).attr('title',fm.i18n('rotate-cw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-l"/>')
						.click(function(){
							rdegree = rdegree - 90;
							rotateImg(rdegree);
						})),
					uideg90     = $(uibutton).attr('title',fm.i18n('rotate-ccw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-r"/>')
						.click(function(){
							rdegree = rdegree + 90;
							rotateImg(rdegree);
						})),
					uiprop   = $('<span />'),
					reset    = $('<div class="ui-state-default ui-corner-all elfinder-resize-reset"><span class="ui-icon ui-icon-arrowreturnthick-1-w"/></div>'),
					uitype   = $('<div class="elfinder-resize-type"><div class="elfinder-resize-label">'+fm.i18n('mode')+'</div></div>')
						.append('<input type="radio" name="type" id="type-resize" value="resize" checked="checked" /><label for="type-resize">'+fm.i18n('resize')+'</label>')
						.append('<input type="radio" name="type" id="type-crop"   value="crop"/><label for="type-crop">'+fm.i18n('crop')+'</label>')
						.append('<input type="radio" name="type" id="type-rotate" value="rotate"/><label for="type-rotate">'+fm.i18n('rotate')+'</label>'),
					type    = $('input', uitype)
						.change(function() {
							//uiresize.add(uicrop).toggle();
							resetView();
							resizable(true);
							croppable(true);
							// TODO rotateable
							rotateable(true);

							var val = $('input:checked', uitype).val();
							if (val == 'resize') {
								resizable();
							}
							else if (val == 'crop') {
								croppable();
							}
							else if (val == 'rotate') {
								rotateable();
							}
						}),
					constr  = $('<input type="checkbox" checked="checked"/>')
						.change(function() {
							cratio = !!constr.prop('checked');
							resize.fixHeight();
							resizable(true);
							resizable();
						}),
					width   = $(input)
						.change(function() {
							var w = parseInt(width.val()),
								h = parseInt(cratio ? w/ratio : height.val());

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								height.val(h);
							}
						}),
					height  = $(input)
						.change(function() {
							var h = parseInt(height.val()),
								w = parseInt(cratio ? h*ratio : width.val());

							if (w > 0 && h > 0) {
								resize.updateView(w, h);
								width.val(w);
							}
						}),
					pointX  = $(input),
					pointY  = $(input),
					offsetX = $(input),
					offsetY = $(input),
					degree = $('<input type="text" size="3" maxlength="3" value="0" />')
						.change(function() {
							rotateImg();
						}),
					ratio   = 1,
					prop    = 1,
					owidth  = 0,
					oheight = 0,
					cratio  = true,
					pwidth  = 0,
					pheight = 0,
					rwidth  = 0,
					rheight = 0,
					rdegree = 0,
					img     = $('<img/>')
						.load(function() {
							spinner.remove();
							
							owidth  = img.width();
							oheight = img.height();
							ratio   = owidth/oheight;
							resize.updateView(owidth, oheight);

							rhandle.append(img.show()).show();
							width.val(owidth);
							height.val(oheight);
							
							var r_scale = Math.min(pwidth, pheight) / Math.sqrt(Math.pow(owidth, 2) + Math.pow(oheight, 2));
							rwidth = owidth * r_scale;
							rheight = oheight * r_scale;
							
							control.find('input,select').removeAttr('disabled')
								.filter(':text').keydown(function(e) {
									var c = e.keyCode, mode, i;
									
									mode = $('input:checked', uitype).val();
									
									e.stopPropagation();
								
									if ((c >= 37 && c <= 40) 
									|| c == $.ui.keyCode.BACKSPACE 
									|| c == $.ui.keyCode.DELETE 
									|| (c == 65 && (e.ctrlKey||e.metaKey))
									|| c == 27) {
										return;
									}
								
									if (c == 9) {
										i = $(this).parent()[e.shiftKey ? 'prev' : 'next']('.elfinder-resize-row').children(':text');

										if (i.length) {
											i.focus()
										}
									}
								
									if (c == 13) {
										save()
										return;
									}
								
									if (c < 48 || c > 57) {
										e.preventDefault();
									}
								})
								.filter(':first').focus();
								
							resizable();
							
							reset.hover(function() { reset.toggleClass('ui-state-hover'); }).click(resetView);
							
						})
						.error(function() {
							spinner.text('Unable to load image').css('background', 'transparent');
						}),
					imgc = $('<img/>'),
					imgr = $('<img/>'),
					resetView = function() {
						width.val(owidth);
						height.val(oheight);
						resize.updateView(owidth, oheight);
					},
					resize = {
						update : function() {
							width.val(parseInt(img.width()/prop));
							height.val(parseInt(img.height()/prop))
						},
						
						updateView : function(w, h) {
							if (ratio >= 1 && w > pwidth) {
								img.width(pwidth).height(Math.ceil(img.width()/ratio));
							} else if (h > pheight) {
								img.height(pheight).width(Math.ceil(img.height()*ratio));
							} else if (w <= pwidth && h <= pheight) {
								img.width(w).height(h)
							}

							prop = img.width()/w;
							uiprop.text('1 : '+(1/prop).toFixed(2))
							resize.updateHandle();
						},
						
						updateHandle : function() {
							rhandle.width(img.width()).height(img.height());
						},
						fixWidth : function() {
							var w, h;
							if (cratio) {
								h = height.val();
								h = parseInt(h*ratio);
								resize.updateView(w, h);
								width.val(w);
							}
						},
						fixHeight : function() {
							var w, h;
							if (cratio) {
								w = width.val();
								h = parseInt(w/ratio);
								resize.updateView(w, h);
								height.val(h);
							}
						}
					},
					crop = {
						update : function() {
							offsetX.val(parseInt(rhandlec.width()/prop));
							offsetY.val(parseInt(rhandlec.height()/prop));
							pointX.val(parseInt((rhandlec.offset().left-imgc.offset().left)/prop));
							pointY.val(parseInt((rhandlec.offset().top-imgc.offset().top)/prop));
						}
					},
					resizable = function(destroy) {
						if ($.fn.resizable) {
							if (destroy) {
								rhandle.resizable('destroy');
								rhandle.hide();
								uiresize.hide();
							}
							else {
								uiresize.show();
								rhandle.show();
								rhandle.resizable({
									alsoResize  : img,
									aspectRatio : cratio,
									resize      : resize.update,
									stop        : resize.fixHeight
								});
							}
						}
					},
					croppable = function(destroy) {
						if ($.fn.draggable && $.fn.resizable) {
							if (destroy) {
								rhandlec.resizable('destroy');
								rhandlec.draggable('destroy');
								rhandlec.hide();
								imgc.hide();
								uicrop.hide();
							}
							else {
								uicrop.show();
								imgc.show()
									.width(img.width())
									.height(img.height());

								rhandlec.show()
									.css('position', 'absolute')
									.width(imgc.width())
									.height(imgc.height())
									.offset(imgc.offset())
									.resizable({
										containment : imgc,
										resize      : crop.update
									})
									.draggable({
										containment : imgc,
										drag        : crop.update
									});
								crop.update();
							}
						}
					},
					rotateable = function(destroy) {
						if (true) {
							if (destroy) {
								imgr.hide();
								uirotate.hide();
							}
							else {
								uirotate.show();
								imgr.show()
									.width(rwidth)
									.height(rheight)
									.css('margin-top', (pheight-rheight)/2 + 'px')
									.css('margin-left', (pwidth-rwidth)/2 + 'px');

							}
						}
					},
					rotateImg = function(value) {
						if (typeof value == 'undefined') {
							rdegree = value = parseInt(degree.val());
						}
						imgr.rotate({duration:500, animateTo:value});
						value = value % 360;
						if (value < 0) {
							value += 360;
						}
						degree.val(parseInt(value));
					},
					save = function() {
						var w, h, x, y, d;
						var mode = $('input:checked', uitype).val();
						
						width.add(height).change();
						
						if (mode == 'resize') {
							w = parseInt(width.val()) || 0;
							h = parseInt(height.val()) || 0;
						} else if (mode == 'crop') {
							w = parseInt(offsetX.val()) || 0;
							h = parseInt(offsetY.val()) || 0;
							x = parseInt(pointX.val()) || 0;
							y = parseInt(pointY.val()) || 0;
						} else if (mode = 'rotate') {
							w = owidth;
							h = oheight;
							d = parseInt(degree.val()) || 0;
							if (d < 0 || d > 360) {
								return fm.error('Invalid rotate degree');
							}
							if (d == 0 || d == 360) {
								return fm.error('Image dose not rotated');
							}
						}
						
						if (mode != 'rotate') {

							if (w <= 0 || h <= 0) {
								return fm.error('Invalid image size');
							}
							
							if (w == owidth && h == oheight) {
								return fm.error('Image size not changed');
							}

						}
						
						dialog.elfinderdialog('close');
						
						fm.request({
							data : {
								cmd    : 'resize',
								target : file.hash,
								width  : w,
								height : h,
								x      : x,
								y      : y,
								degree : d,
								mode   : mode
							},
							notify : {type : 'resize', cnt : 1}
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function() {
							dfrd.resolve();
						});
						
					},
					buttons = {},
					hline   = 'elfinder-resize-handle-hline',
					vline   = 'elfinder-resize-handle-vline',
					rpoint  = 'elfinder-resize-handle-point',
					src     = fm.url(file.hash)
					;
					
					
				uiresize.append($(row).append($(label).text(fm.i18n('width'))).append(width).append(reset))
					.append($(row).append($(label).text(fm.i18n('height'))).append(height))
					.append($(row).append($('<label/>').text(fm.i18n('aspectRatio')).prepend(constr)))
					.append($(row).append(fm.i18n('scale')+' ').append(uiprop));
				
				uicrop.append($(row).append($(label).text('X')).append(pointX))
					.append($(row).append($(label).text('Y')).append(pointY))
					.append($(row).append($(label).text(fm.i18n('width'))).append(offsetX))
					.append($(row).append($(label).text(fm.i18n('height'))).append(offsetY));
				
				uirotate.append($(row)
					.append($(label).text(fm.i18n('rotate')))
					.append($('<div style="float:left">')
						.append(degree)
						.append($('<span/>').text(fm.i18n('degree')))
					).append($(uibuttonset).append(uideg270).append($(uiseparator)).append(uideg90))
				);
				
				dialog.append(uitype);

				control.append($(row))
					.append(uiresize)
					.append(uicrop.hide())
					.append(uirotate.hide())
					.find('input,select').attr('disabled', 'disabled');
				
				rhandle.append('<div class="'+hline+' '+hline+'-top"/>')
					.append('<div class="'+hline+' '+hline+'-bottom"/>')
					.append('<div class="'+vline+' '+vline+'-left"/>')
					.append('<div class="'+vline+' '+vline+'-right"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-e"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-se"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-s"/>')
					
				preview.append(spinner).append(rhandle.hide()).append(img.hide());

				rhandlec.append('<div class="'+hline+' '+hline+'-top"/>')
					.append('<div class="'+hline+' '+hline+'-bottom"/>')
					.append('<div class="'+vline+' '+vline+'-left"/>')
					.append('<div class="'+vline+' '+vline+'-right"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-e"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-se"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-s"/>')

				preview.append(rhandlec.hide()).append(imgc.hide());
				
				preview.append(imgr.hide());
					
				dialog.append(preview).append(control);
				
				buttons[fm.i18n('btnCancel')] = function() { dialog.elfinderdialog('close'); };
				buttons[fm.i18n('btnApply')] = save;
				
				fm.dialog(dialog, {
					title          : file.name,
					width          : 650,
					resizable      : false,
					destroyOnClose : true,
					buttons        : buttons,
					open           : function() { preview.zIndex(1+$(this).parent().zIndex()); }
				}).attr('id', id);
				
				reset.css('left', width.position().left + width.width() + 12);
				
				pwidth  = preview.width()  - (rhandle.outerWidth()  - rhandle.width());
				pheight = preview.height() - (rhandle.outerHeight() - rhandle.height());
				
				img.attr('src', src + (src.indexOf('?') === -1 ? '?' : '&')+'_='+Math.random());
				imgc.attr('src', img.attr('src'));
				imgr.attr('src', img.attr('src'));
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
		
		open(files[0], id)
			
		return dfrd;
	}

}
