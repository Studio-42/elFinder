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
							rotate.update(rdegree);
						})),
					uideg90     = $(uibutton).attr('title',fm.i18n('rotate-ccw')).append($('<span class="elfinder-button-icon elfinder-button-icon-rotate-r"/>')
						.click(function(){
							rdegree = rdegree + 90;
							rotate.update(rdegree);
						})),
					uiprop   = $('<span />'),
					reset    = $('<div class="ui-state-default ui-corner-all elfinder-resize-reset"><span class="ui-icon ui-icon-arrowreturnthick-1-w"/></div>'),
					//uitype   = $('<div class="elfinder-resize-type"><div class="elfinder-resize-label">'+fm.i18n('mode')+'</div></div>')
					uitype   = $('<div class="elfinder-resize-type"/>')
						.append('<input type="radio" name="type" id="type-resize" value="resize" checked="checked" /><label for="type-resize">'+fm.i18n('resize')+'</label>')
						.append('<input type="radio" name="type" id="type-crop"   value="crop"/><label for="type-crop">'+fm.i18n('crop')+'</label>')
						.append('<input type="radio" name="type" id="type-rotate" value="rotate"/><label for="type-rotate">'+fm.i18n('rotate')+'</label>'),
					type     = $('input', uitype)
						.change(function() {
							var val = $('input:checked', uitype).val();
							
							resetView();
							resizable(true);
							croppable(true);
							rotateable(true);
							
							if (val == 'resize') {
								uiresize.show();
								uirotate.hide();
								uicrop.hide();
								resizable();
							}
							else if (val == 'crop') {
								uirotate.hide();
								uiresize.hide();
								uicrop.show();
								croppable();
							} else if (val == 'rotate') {
								uiresize.hide();
								uicrop.hide();
								uirotate.show();
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
							rotate.update();
						}),
					uidegslider = $('<div class="elfinder-resize-rotate-slider"/>')
						.slider({
							min: 0,
							max: 359,
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
							
							reset.hover(function() { reset.toggleClass('ui-state-hover'); }).click(resetView);
							
						})
						.error(function() {
							spinner.text('Unable to load image').css('background', 'transparent');
						}),
					basec = $('<div/>'),
					imgc = $('<img/>'),
					coverc = $('<div/>'),
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
							if (w > pwidth || h > pheight) {
								if (w / pwidth > h / pheight) {
									img.width(pwidth).height(Math.ceil(img.width()/ratio));
								} else {
									img.height(pheight).width(Math.ceil(img.height()*ratio));
								}
							} else {
								img.width(w).height(h);
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
						},
						resize_update : function() {
							crop.update();
							coverc.width(rhandlec.width());
							coverc.height(rhandlec.height());
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
							if (! animate || $.browser.opera || ($.browser.msie && parseInt($.browser.version) < 9)) {
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
								rhandle.resizable('destroy');
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
							}
						}
					},
					croppable = function(destroy) {
						if ($.fn.draggable && $.fn.resizable) {
							if (destroy) {
								rhandlec.resizable('destroy');
								rhandlec.draggable('destroy');
								basec.hide();
							}
							else {
								imgc
									.width(img.width())
									.height(img.height());
								
								coverc
									.width(img.width())
									.height(img.height());
								
								rhandlec
									.width(imgc.width())
									.height(imgc.height())
									.offset(imgc.offset())
									.resizable({
										containment : basec,
										resize      : crop.resize_update,
										handles     : 'all'
									})
									.draggable({
										handle      : rhandlec,
										containment : imgc,
										drag        : crop.update
									});
								
								basec.show()
									.width(img.width())
									.height(img.height());
								
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
								imgr.show()
									.width(rwidth)
									.height(rheight)
									.css('margin-top', (pheight-rheight)/2 + 'px')
									.css('margin-left', (pwidth-rwidth)/2 + 'px');

							}
						}
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
				
				imgr.mousedown( rotate.start );
				$(document).mouseup( rotate.stop );
					
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
					.append($('<div style="float:left; width: 130px;">')
						.append($('<div style="float:left;">')
							.append(degree)
							.append($('<span/>').text(fm.i18n('degree')))
						)
						.append($(uibuttonset).append(uideg270).append($(uiseparator)).append(uideg90))
					)
					.append(uidegslider)
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

				rhandlec.css('position', 'absolute')
					.append('<div class="'+hline+' '+hline+'-top"/>')
					.append('<div class="'+hline+' '+hline+'-bottom"/>')
					.append('<div class="'+vline+' '+vline+'-left"/>')
					.append('<div class="'+vline+' '+vline+'-right"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-n"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-e"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-s"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-w"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-ne"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-se"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-sw"/>')
					.append('<div class="'+rpoint+' '+rpoint+'-nw"/>')

				preview.append(basec.css('position', 'absolute').hide().append(imgc).append(rhandlec.append(coverc)));
				
				preview.append(imgr.hide());
				
				preview.css('overflow', 'hidden');
				
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
				
				// for IE < 9 dialog mising at open second+ time.
				if ($.browser.msie && parseInt($.browser.version) < 9) {
					$('.elfinder-dialog').css('filter', '');
				}
				
				reset.css('left', width.position().left + width.width() + 12);
				
				coverc.css({ 'opacity': 0.2, 'background-color': '#fff', 'position': 'absolute'}),
				rhandlec.css('cursor', 'move');
				rhandlec.find('.elfinder-resize-handle-point').css({
					'background-color' : '#fff',
					'opacity': 0.5,
					'border-color':'#000'
				});

				imgr.css('cursor', 'pointer');
				
				uitype.buttonset();
				
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
		
		open(files[0], id);
			
		return dfrd;
	}

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
			if ($.browser.opera) {
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

	if ($.browser.msie && parseInt($.browser.version) < 9) {
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
