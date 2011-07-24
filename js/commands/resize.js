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
		return this.fm.selected().length == 1 && this.fm.selectedFiles()[0].mime.indexOf('image/') !== -1 ? 0 : -1;
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
					spinner  = $('<div class="elfinder-resize-spinner">'+fm.i18n('Loading image')+'</div>'),
					rhandle  = $('<div class="elfinder-resize-handle"/>'),
					uiresize = $('<div class="elfinder-resize-uiresize"/>'),
					uicrop   = $('<div class="elfinder-resize-uicrop"/>'),
					uiprop   = $('<span />'),
					reset    = $('<div class="ui-state-default ui-corner-all elfinder-resize-reset"><span class="ui-icon ui-icon-arrowreturnthick-1-w"/></div>'),
					type     = $('<select><option value="resize">'+fm.i18n('resize')+'</option><option value="crop">'+fm.i18n('crop')+'</option></select>')
						.change(function() {
							uiresize.add(uicrop).toggle();
							resetView();
							if (type.val() == 'resize') {
								resizable();
							} else if ($.fn.resizable){
								rhandle.resizable('destroy')
							}
						}),
					constr  = $('<input type="checkbox" checked="checked"/>')
						.change(function() {
							cratio = !!constr.prop('checked');
							resize.fixHeight();
							resizable(true);
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
					ratio   = 1,
					prop    = 1,
					owidth  = 0,
					oheight = 0,
					cratio  = true,
					pwidth  = 0,
					pheight = 0,
					img     = $('<img/>')
						.load(function() {
							spinner.remove();
							
							owidth  = img.width();
							oheight = img.height();
							ratio   = (owidth/oheight).toFixed(2);
							resize.updateView(owidth, oheight);

							rhandle.append(img.show()).show();
							width.val(owidth);
							height.val(oheight);
							control.find('input,select').removeAttr('disabled')
								.filter(':text').keydown(function(e) {
									var c = e.keyCode, i;

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
							
							
							
							reset.hover(function() {
								reset.toggleClass('ui-state-hover');
							})
							.click(resetView);
							
						})
						.error(function() {
							spinner.text('Unable to load image').css('background', 'transparent');
						}),
						
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
					resizable = function(destroy) {
						if ($.fn.resizable) {
							destroy && rhandle.resizable('destroy');
							
							rhandle.resizable({
								alsoResize  : img,
								aspectRatio : cratio,
								resize      : resize.update,
								stop        : resize.fixHeight
							});
							// rhandle.append('<span class="ui-icon ui-icon ui-icon-grip-solid-vertical"/>')
							// rhandle.append('<span class="ui-icon ui-icon ui-icon-grip-solid-horizontal"/>')
						}
					},
					save = function() {
						var resize = type.val() == 'resize', w, h;
						
						if (resize) {
							w = parseInt(width.val()) || 0;
							h = parseInt(height.val()) || 0;
						} else {
							
						}
						
						if (w <= 0 || h <= 0) {
							return fm.error('Invalid image size');
						}
						
						if (w == owidth && h == oheight) {
							return fm.error('Image size not changed');
						}
						
						dialog.elfinderdialog('close');
						
						fm.request({
							data : {
								cmd    : 'resize',
								target : file.hash,
								width  : w,
								height : h,
								crop   : resize ? 0 : 1
							},
							notify : { type : 'resize', cnt : 1}
						})
						
					},
					buttons = {},
					hline = 'elfinder-resize-handle-hline',
					vline = 'elfinder-resize-handle-vline',
					rpoint = 'elfinder-resize-handle-point'
					;
					
					
				uiresize.append($(row).append($(label).text(fm.i18n('width'))).append(width).append(reset))
					.append($(row).append($(label).text(fm.i18n('height'))).append(height))
					.append($(row).append($('<label/>').text(fm.i18n('Scale proportionally')).prepend(constr)))
					.append($(row).append(fm.i18n('Proportion')+' ').append(uiprop));
				
				uicrop.append($(row).append($(label).text('X')).append(pointX))
					.append($(row).append($(label).text('Y')).append(pointY))
					.append($(row).append($(label).text(fm.i18n('width'))).append(offsetX))
					.append($(row).append($(label).text(fm.i18n('height'))).append(offsetY))
					
				control.append($(row).append(type))
					.append(uiresize)
					.append(uicrop.hide())
					.find('input,select').attr('disabled', 'disabled');
				
				rhandle.append('<div class="'+hline+' '+hline+'-top"/>')
					.append('<div class="'+hline+' '+hline+'-bottom"/>')
					.append('<div class="'+vline+' '+vline+'-left"/>')
					.append('<div class="'+vline+' '+vline+'-right"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-e"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-se"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-s"/>')
					
				preview.append(spinner).append(rhandle.hide()).append(img.hide());
					
				dialog.append(preview).append(control);
				
				buttons[fm.i18n('Resize')] = save;
				buttons[fm.i18n('Cancel')] = function() { dialog.elfinderdialog('close'); }
				
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

				img.attr('src', fm.url(file.hash));
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