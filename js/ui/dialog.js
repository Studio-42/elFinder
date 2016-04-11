"use strict";
/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts) {
	var dialog;
	
	if (typeof(opts) == 'string' && (dialog = this.closest('.ui-dialog')).length) {
		if (opts == 'open') {
			dialog.css('display') == 'none' && dialog.fadeIn(120, function() {
				dialog.trigger('open');
			});
		} else if (opts == 'close') {
			dialog.css('display') != 'none' && dialog.hide().trigger('close');
		} else if (opts == 'destroy') {
			dialog.hide().remove();
		} else if (opts == 'toTop') {
			dialog.trigger('totop');
		} else if (opts == 'posInit') {
			dialog.trigger('posinit');
		}
	}
	
	opts = $.extend({}, $.fn.elfinderdialog.defaults, opts);

	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			parent     = self.parent(),
			clactive   = 'elfinder-dialog-active',
			cldialog   = 'elfinder-dialog',
			clnotify   = 'elfinder-dialog-notify',
			clhover    = 'ui-state-hover',
			id         = parseInt(Math.random()*1000000),
			overlay    = parent.children('.elfinder-overlay'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class=" ui-helper-clearfix ui-dialog-buttonpane ui-widget-content"/>')
				.append(buttonset),
			btnWidth   = 0,
			platformWin = (window.navigator.platform.indexOf('Win') != -1),
			
			dialog = $('<div class="ui-front ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable std42-dialog  '+cldialog+' '+opts.cssClass+'"/>')
				.hide()
				.append(self)
				.appendTo(parent)
				.draggable({
					handle : '.ui-dialog-titlebar',
					containment : 'document',
					stop : function(e, ui){
						dialog.css({height : opts.height});
					}
				})
				.css({
					width  : opts.width,
					height : opts.height
				})
				.mousedown(function(e) {
					setTimeout(function() {
						dialog.is(':visible') && dialog.trigger('totop');
					}, 10);
				})
				.on('open', function() {
					var d = $(this),
					maxWinWidth = (d.outerWidth() > parent.width()-10)? parent.width()-10 : null;
					
					maxWinWidth && d.css({width: maxWinWidth, left: '5px'});

					if (!dialog.hasClass(clnotify)) {
						
						parent.find('.'+cldialog+':visible').not('.'+clnotify).each(function() {
							var d     = $(this),
								top   = parseInt(d.css('top')),
								left  = parseInt(d.css('left')),
								_top  = parseInt(dialog.css('top')),
								_left = parseInt(dialog.css('left'))
								;

							if (d[0] != dialog[0] && (top == _top || left == _left)) {
								dialog.css({
									top  : (top+(maxWinWidth? 15 : 10))+'px',
									left : (maxWinWidth? 5 : left+10)+'px'
								});
							}
						});
					} 
					
					dialog.trigger('totop');
					
					dialog.data('modal') && overlay.elfinderoverlay('show');
					
					typeof(opts.open) == 'function' && $.proxy(opts.open, self[0])();
				})
				.on('close', function() {
					var dialogs = parent.find('.elfinder-dialog:visible');

					dialog.data('modal') && overlay.elfinderoverlay('hide');
					// get focus to next dialog
					if (dialogs.length) {
						dialogs.find(':last').trigger('totop');
					} else {
						// return focus to parent
						parent.mousedown().click();
					}
					if (typeof(opts.close) == 'function') {
						setTimeout(function() {
							$.proxy(opts.close, self[0])();
						}, 10);
					} else if (opts.destroyOnClose) {
						dialog.hide().remove();
					}
				})
				.on('totop', function() {
					parent.find('.'+cldialog+':visible').removeClass(clactive+' ui-front');
					dialog.addClass(clactive+' ui-front');

					if (!dialog.find('input,textarea').length) {
						dialog.find('.ui-button:'+(platformWin? 'first':'last')).focus().end().find(':text:first').focus();
					}
				})
				.on('posinit', function() {
					var css = opts.position;
					if (!css) {
						css = {
							top  : Math.max(0, parseInt((parent.height() - dialog.outerHeight())/2 - 42))+'px',
							left : Math.max(0, parseInt((parent.width() - dialog.outerWidth())/2))+'px'
						};
					}
					dialog.css(css);
				})
				.data({modal: opts.modal})
			;
		
		dialog.trigger('posinit');

		if (opts.closeOnEscape) {
			$(document).on('keyup.'+id, function(e) {
				if (e.keyCode == $.ui.keyCode.ESCAPE && dialog.hasClass(clactive)) {
					self.elfinderdialog('close');
					$(document).off('keyup.'+id);
				}
			})
		}
		dialog.prepend(
			$('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">'+opts.title+'</div>')
				.prepend($('<a href="#" class="ui-dialog-titlebar-close ui-corner-all"><span class="ui-icon ui-icon-closethick"/></a>')
					.mousedown(function(e) {
						e.preventDefault();
						self.elfinderdialog('close');
					}))

		);
		
		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+name+'</span></button>')
				.click($.proxy(cb, self[0]))
				.hover(function(e) { 
					if (opts.btnHoverFocus) {
						$(this)[e.type == 'mouseenter' ? 'focus' : 'blur']();
					} else {
						$(this).toggleClass(clhover, e.type == 'mouseenter');
					}
				})
				.focus(function() { $(this).addClass(clhover) })
				.blur(function() { $(this).removeClass(clhover) })
				.keydown(function(e) { 
					var next;
					e.stopPropagation();
					if (e.keyCode == $.ui.keyCode.ENTER) {
						e.preventDefault();
						$(this).click();
					}  else if (e.keyCode == $.ui.keyCode.TAB || e.keyCode == $.ui.keyCode.RIGHT) {
						e.preventDefault();
						next = $(this).next('.ui-button');
						next.length ? next.focus() : $(this).parent().children('.ui-button:first').focus();
					}  else if (e.keyCode == $.ui.keyCode.LEFT) {
						e.preventDefault();
						next = $(this).prev('.ui-button');
						next.length ? next.focus() : $(this).parent().children('.ui-button:last').focus()
					}
				})
			if (platformWin) {
				buttonset.append(button);
			} else {
				buttonset.prepend(button);
			}
		});
		
		if (buttonset.children().length) {
			dialog.append(buttonpane);
			
			dialog.show();
			buttonpane.find('button').each(function(i, btn) {
				btnWidth += $(btn).outerWidth(true);
			});
			dialog.hide();
			btnWidth += 20;
			
			if (dialog.width() < btnWidth) {
				dialog.width(btnWidth);
			}
		}
		
		if (opts.resizable && $.fn.resizable) {
			dialog.resizable({
					minWidth   : opts.minWidth,
					minHeight  : opts.minHeight,
					alsoResize : this
				});
		} 
			
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
			
		opts.autoOpen && self.elfinderdialog('open');

	});
	
	return this;
};

$.fn.elfinderdialog.defaults = {
	cssClass  : '',
	title     : '',
	modal     : false,
	resizable : true,
	autoOpen  : true,
	closeOnEscape : true,
	destroyOnClose : false,
	buttons   : {},
	btnHoverFocus : true,
	position  : null,
	width     : 320,
	height    : 'auto',
	minWidth  : 200,
	minHeight : 110
};
