"use strict";
/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts, fm) {
	var dialog;
	
	if (typeof(opts) == 'string' && (dialog = this.closest('.ui-dialog')).length) {
		if (opts == 'open') {
			dialog.css('display') == 'none' && dialog.fadeIn(120, function() {
				dialog.trigger('open');
			});
		} else if (opts == 'close' || opts == 'destroy') {
			dialog.stop(true);
			dialog.css('display') != 'none' && dialog.hide().trigger('close');
			opts == 'destroy' && dialog.remove();
		} else if (opts == 'toTop') {
			dialog.trigger('totop');
		} else if (opts == 'posInit') {
			dialog.trigger('posinit');
		} else if (opts == 'tabstopsInit') {
			dialog.trigger('tabstopsInit');
		}
	}
	
	opts = $.extend({}, $.fn.elfinderdialog.defaults, opts);
	
	if (opts.allowMinimize) {
		if (opts.allowMinimize === 'auto') {
			opts.allowMinimize = this.find('textarea,input').length? true : false; 
		}
	}
	if (opts.allowMaximize && ! fm) {
		opts.allowMaximize = false;
	}
	
	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			parent     = self.parent(),
			clactive   = 'elfinder-dialog-active',
			cldialog   = 'elfinder-dialog',
			clnotify   = 'elfinder-dialog-notify',
			clhover    = 'ui-state-hover',
			cltabstop  = 'elfinder-tabstop',
			cl1stfocus = 'elfinder-focus',
			id         = parseInt(Math.random()*1000000),
			overlay    = parent.children('.elfinder-overlay'),
			titlebar   = $('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">'+opts.title+'</div>'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class=" ui-helper-clearfix ui-dialog-buttonpane ui-widget-content"/>')
				.append(buttonset),
			btnWidth   = 0,
			platformWin = (window.navigator.platform.indexOf('Win') != -1),
			tabstops   = $(),
			tabstopsInit = function() {
				tabstops = dialog.find('.'+cltabstop);
				if (tabstops.length) {
					tabstops.attr('tabindex', '-1');
					if (! tabstops.filter('.'+cl1stfocus).length) {
						buttonset.children('.'+cltabstop+':'+(platformWin? 'first' : 'last')).addClass(cl1stfocus);
					}
				}
			},
			tabstopNext = function(cur) {
				var elms = tabstops.filter(':visible'),
					node = cur? null : elms.filter('.'+cl1stfocus+':first');
					
				if (! node || ! node.length) {
					node = elms.first();
				}
				if (cur) {
					$.each(elms, function(i, elm) {
						if (elm === cur && elms[i+1]) {
							node = elms.eq(i+1);
							return false;
						}
					});
				}
				return node;
			},
			tabstopPrev = function(cur) {
				var elms = tabstops.filter(':visible'),
					node = elms.last();
				$.each(elms, function(i, elm) {
					if (elm === cur && elms[i-1]) {
						node = elms.eq(i-1);
						return false;
					}
				});
				return node;
			},
			
			dialog = $('<div class="ui-front ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable std42-dialog touch-punch '+cldialog+' '+opts.cssClass+'"/>')
				.hide()
				.append(self)
				.appendTo(parent)
				.draggable({
					handle : '.ui-dialog-titlebar',
					containment : 'document',
					stop : function(e, ui){
						dialog.css({height : opts.height});
						self.data('draged', true);
					}
				})
				.css({
					width  : opts.width,
					height : opts.height
				})
				.on('mousedown', function(e) {
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
					
					fm && ! fm.UA.Mobile && tabstopNext().focus();
					
					if (opts.closeOnEscape) {
						$(document).on('keyup.'+id, function(e) {
							if (e.keyCode == $.ui.keyCode.ESCAPE && dialog.hasClass(clactive)) {
								self.elfinderdialog('close');
							}
						})
					}
				})
				.on('close', function() {
					var dialogs;
					
					if (opts.closeOnEscape) {
						$(document).off('keyup.'+id);
					}
					
					if (opts.allowMaximize) {
						fm.toggleMaximize(dialog, false);
					}
					
					dialog.data('modal') && overlay.elfinderoverlay('hide');

					if (typeof(opts.close) == 'function') {
						$.proxy(opts.close, self[0])();
					} else if (opts.destroyOnClose) {
						dialog.hide().remove();
					}
					
					// get focus to next dialog
					dialogs = parent.find('.elfinder-dialog:visible');
					if (dialogs.length) {
						dialogs.find(':last').trigger('totop');
					} else {
						setTimeout(function() {
							// return focus to parent
							parent.mousedown().click();
						}, 20);
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
					if (! css && ! dialog.data('resizing')) {
						css = {
							top  : Math.max(0, parseInt((parent.height() - dialog.outerHeight())/2 - 42))+'px',
							left : Math.max(0, parseInt((parent.width() - dialog.outerWidth())/2))+'px'
						};
					}
					css && dialog.css(css);
				})
				.on('resize', function(e, data) {
					if (typeof(opts.resize) === 'function') {
						$.proxy(opts.resize, self[0])(e, data);
					}
				})
				.on('tabstopsInit', tabstopsInit)
				.on('focus', '.'+cltabstop, function() {
					$(this).addClass(clhover).parent('label').addClass(clhover);
					this.id && $(this).parent().find('label[for='+this.id+']').addClass(clhover);
				})
				.on('blur', '.'+cltabstop, function() {
					$(this).removeClass(clhover).parent('label').removeClass(clhover);
					this.id && $(this).parent().find('label[for='+this.id+']').removeClass(clhover);
				})
				.on('mouseenter mouseleave', '.'+cltabstop, function(e) {
					var $this = $(this);
					if (opts.btnHoverFocus) {
						if (e.type == 'mouseenter') {
							$this.focus();
						}
					} else {
						$this.toggleClass(clhover, e.type == 'mouseenter');
					}
				})
				.on('keydown', '.'+cltabstop, function(e) {
					var $this = $(this);
					if ($this.is(':focus')) {
						e.stopPropagation();
						if (e.keyCode == $.ui.keyCode.ENTER) {
							e.preventDefault();
							$this.click();
						}  else if ((e.keyCode == $.ui.keyCode.TAB && e.shiftKey) || e.keyCode == $.ui.keyCode.LEFT || e.keyCode == $.ui.keyCode.UP) {
							if ($this.is('input:text') && (!(e.ctrlKey || e.metaKey) && e.keyCode == $.ui.keyCode.LEFT)) {
								return;
							}
							if ($this.is('select') && e.keyCode != $.ui.keyCode.TAB) {
								return;
							}
							if ($this.is('textarea') && !(e.ctrlKey || e.metaKey)) {
								return;
							}
							e.preventDefault();
							tabstopPrev(this).focus();
						}  else if (e.keyCode == $.ui.keyCode.TAB || e.keyCode == $.ui.keyCode.RIGHT || e.keyCode == $.ui.keyCode.DOWN) {
							if ($this.is('input:text') && (!(e.ctrlKey || e.metaKey) && e.keyCode == $.ui.keyCode.RIGHT)) {
								return;
							}
							if ($this.is('select') && e.keyCode != $.ui.keyCode.TAB) {
								return;
							}
							if ($this.is('textarea') && !(e.ctrlKey || e.metaKey)) {
								return;
							}
							e.preventDefault();
							tabstopNext(this).focus();
						}
					}
				})
				.data({modal: opts.modal})
			;
		
		dialog.trigger('posinit');

		dialog.prepend(
			titlebar.prepend($('<span class="ui-widget-header ui-dialog-titlebar-close ui-corner-all"><span class="ui-icon ui-icon-closethick"/></span>')
				.on('mousedown', function(e) {
					e.preventDefault();
					self.elfinderdialog('close');
				}))
		);
		
		if (opts.allowMinimize) {
			titlebar.append($('<span class="ui-widget-header ui-dialog-titlebar-close ui-corner-all elfinder-titlebar-minimize"><span class="ui-icon ui-icon-minusthick"/></span>')
				.on('mousedown', function(e) {
					var $this = $(this),
						base = titlebar.parent(),
						pos;
					
					if (typeof $this.data('style') !== 'undefined') {
						pos = base.position();
						base.attr('style', $this.data('style')).css(pos);
						$this.removeData('style').children('span.ui-icon').removeClass('ui-icon-plusthick').addClass('ui-icon-minusthick');
						titlebar.children('.elfinder-titlebar-full').show();
						base.children('.ui-widget-content').slideDown('fast', function() {
							dialog.trigger('resize', { minimize: false });
						});
					} else {
						$this.data('style', base.attr('style') || '');
						$this.children('span.ui-icon').removeClass('ui-icon-minusthick').addClass('ui-icon-plusthick');
						titlebar.children('.elfinder-titlebar-full').hide();
						base.children('.ui-widget-content').slideUp('fast', function() {
							base.width('auto').height('auto');
							dialog.trigger('resize', { minimize: true });
						});
					}
				})
			);
		}
		
		if (opts.allowMaximize) {
			dialog.on('resize', function(e, data) {
				var full, elm;
				if (data && data.maximize) {
					elm = titlebar.find('.elfinder-titlebar-full');
					full = (data.maximize === 'on');
					elm.children('span.ui-icon').toggleClass('ui-icon-minusthick', full);
					if (full) {
						try {
							dialog.resizable('disable').draggable('disable');
						} catch(e) {}
						if (typeof elm.data('style') === 'undefined') {
							elm.data('style', self.attr('style') || '');
						}
						self.css('width', '100%').css('height', dialog.height() - dialog.children('.ui-dialog-titlebar').outerHeight(true) - buttonpane.outerHeight(true));
					} else {
						self.attr('style', elm.data('style'));
						elm.removeData('style');
						try {
							dialog.resizable('enable').draggable('enable');
						} catch(e) {}
					}
					titlebar.children('.elfinder-titlebar-minimize')[full? 'hide' : 'show']();
				}
			});
			titlebar.append($('<span class="ui-widget-header ui-dialog-titlebar-close ui-corner-all elfinder-titlebar-full"><span class="ui-icon ui-icon-arrowthick-2-se-nw"/></span>')
				.on('mousedown', function(e) {
					fm.toggleMaximize(dialog);
				})
			);
		}
		
		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only '+cltabstop+'"><span class="ui-button-text">'+name+'</span></button>')
				.on('click', $.proxy(cb, self[0]));
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
					alsoResize : this,
					start      : function() {
						if (dialog.data('resizing') !== true && dialog.data('resizing')) {
							clearTimeout(dialog.data('resizing'));
						}
						dialog.data('resizing', true);
					},
					stop       : function() {
						dialog.data('resizing', setTimeout(function() {
							dialog.data('resizing', false);
						}, 200));
					}
				});
		} 
			
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
			
		tabstopsInit();
		
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
	minHeight : 110,
	allowMinimize : 'auto',
	allowMaximize : false
};
