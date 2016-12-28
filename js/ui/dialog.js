"use strict";
/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts, fm) {
	var platformWin = (window.navigator.platform.indexOf('Win') != -1),
		dialog, elfNode;
	
	if (fm && fm.ui) {
		elfNode = fm.getUI();
	} else {
		elfNode = this.closest('.elfinder');
		if (! fm) {
			fm = elfNode.elfinder('instance');
		}
	}
	
	if (typeof opts  === 'string') {
		if ((dialog = this.closest('.ui-dialog')).length) {
			if (opts == 'open') {
				dialog.css('display') == 'none' && dialog.fadeIn(120, function() {
					dialog.trigger('open');
				});
			} else if (opts == 'close' || opts == 'destroy') {
				dialog.stop(true);
				(dialog.is(':visible') || elfNode.is(':hidden')) && dialog.hide().trigger('close');
				opts == 'destroy' && dialog.remove();
			} else if (opts == 'toTop') {
				dialog.trigger('totop');
			} else if (opts == 'posInit') {
				dialog.trigger('posinit');
			} else if (opts == 'tabstopsInit') {
				dialog.trigger('tabstopsInit');
			}
		}
		return this;
	}
	
	opts = $.extend({}, $.fn.elfinderdialog.defaults, opts);
	
	if (opts.allowMinimize && opts.allowMinimize === 'auto') {
		opts.allowMinimize = this.find('textarea,input').length? true : false; 
	}
	if (opts.headerBtnPos && opts.headerBtnPos === 'auto') {
		opts.headerBtnPos = platformWin? 'right' : 'left';
	}
	if (opts.headerBtnOrder && opts.headerBtnOrder === 'auto') {
		opts.headerBtnOrder = platformWin? 'close:maximize:minimize' : 'close:minimize:maximize';
	}
	
	if (opts.modal && opts.allowMinimize) {
		opts.allowMinimize = false;
	}
	
	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			clactive   = 'elfinder-dialog-active',
			cldialog   = 'elfinder-dialog',
			clnotify   = 'elfinder-dialog-notify',
			clhover    = 'ui-state-hover',
			cltabstop  = 'elfinder-tabstop',
			cl1stfocus = 'elfinder-focus',
			id         = parseInt(Math.random()*1000000),
			titlebar   = $('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix"><span class="elfinder-dialog-title">'+opts.title+'</span></div>'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class=" ui-helper-clearfix ui-dialog-buttonpane ui-widget-content"/>')
				.append(buttonset),
			btnWidth   = 0,
			btnCnt     = 0,
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
			makeHeaderBtn = function() {
				$.each(opts.headerBtnOrder.split(':').reverse(), function(i, v) {
					headerBtns[v] && headerBtns[v]();
				})
				if (platformWin) {
					titlebar.children('.elfinder-titlebar-button').addClass('elfinder-titlebar-button-right');
				}
			},
			headerBtns = {
				close: function() {
					titlebar.prepend($('<span class="ui-widget-header ui-dialog-titlebar-close ui-corner-all elfinder-titlebar-button"><span class="ui-icon ui-icon-closethick"/></span>')
						.on('mousedown', function(e) {
							e.preventDefault();
							e.stopPropagation();
							self.elfinderdialog('close');
						})
					);
				},
				maximize: function() {
					if (opts.allowMaximize) {
						dialog.on('resize', function(e, data) {
							var full, elm;
							if (data && data.maximize) {
								elm = titlebar.find('.elfinder-titlebar-full');
								full = (data.maximize === 'on');
								elm.children('span.ui-icon')
									.toggleClass('ui-icon-plusthick', ! full)
									.toggleClass('ui-icon-arrowreturnthick-1-s', full);
								if (full) {
									try {
										dialog.hasClass('ui-draggable') && dialog.draggable('disable');
										dialog.hasClass('ui-resizable') && dialog.resizable('disable');
									} catch(e) {}
									if (typeof elm.data('style') === 'undefined') {
										self.height(self.height());
										elm.data('style', self.attr('style') || '');
									}
									self.css('width', '100%').css('height', dialog.height() - dialog.children('.ui-dialog-titlebar').outerHeight(true) - buttonpane.outerHeight(true));
								} else {
									self.attr('style', elm.data('style'));
									elm.removeData('style');
									try {
										dialog.hasClass('ui-draggable') && dialog.draggable('enable');
										dialog.hasClass('ui-resizable') && dialog.resizable('enable');
									} catch(e) {}
								}
								dialog.trigger('resize');
							}
						});
						titlebar.prepend($('<span class="ui-widget-header ui-corner-all elfinder-titlebar-button elfinder-titlebar-full"><span class="ui-icon ui-icon-plusthick"/></span>')
							.on('mousedown', function(e) {
								e.preventDefault();
								e.stopPropagation();
								fm.toggleMaximize(dialog);
							})
						);
					}
					
				},
				minimize: function() {
					if (opts.allowMinimize) {
						titlebar.on('dblclick', function(e) {
								$(this).children('.elfinder-titlebar-minimize').trigger('mousedown');
							})
							.prepend($('<span class="ui-widget-header ui-corner-all elfinder-titlebar-button elfinder-titlebar-minimize"><span class="ui-icon ui-icon-minusthick"/></span>')
							.on('mousedown', function(e) {
								var $this = $(this),
									pos, w;
								
								e.preventDefault();
								e.stopPropagation();
								if (typeof $this.data('style') !== 'undefined') {
									elfNode.append(dialog);
									dialog.attr('style', $this.data('style'))
										.removeClass('elfinder-dialog-minimized')
										.off('mousedown.minimize');
									$this.removeData('style').show();
									titlebar.children('.elfinder-titlebar-full').show();
									dialog.children('.ui-widget-content').slideDown('fast', function() {
										var eData;
										if (this === dialog.children('.ui-widget-content:first').get(0)) {
											if (dialog.find('.'+fm.res('class', 'editing'))) {
												fm.disable();
											}
											eData = { minimize: 'off' };
											if (! dialog.hasClass('elfinder-maximized')) {
												try {
													dialog.hasClass('ui-draggable') && dialog.draggable('enable');
													dialog.hasClass('ui-resizable') && dialog.resizable('enable');
												} catch(e) {}
											} else {
												eData.maximize = 'on';
											}
											dialog.trigger('resize', eData);
										}
									});
								} else {
									try {
										dialog.hasClass('ui-draggable') && dialog.draggable('disable');
										dialog.hasClass('ui-resizable') && dialog.resizable('disable');
									} catch(e) {}
									$this.data('style', dialog.attr('style') || '').hide();
									titlebar.children('.elfinder-titlebar-full').hide();
									w = dialog.width();
									dialog.children('.ui-widget-content').slideUp('fast', function() {
										if (this === dialog.children('.ui-widget-content:first').get(0)) {
											dialog.trigger('resize', { minimize: 'on' });
											dialog.attr('style', '').css({ maxWidth: w})
												.addClass('elfinder-dialog-minimized')
												.one('mousedown.minimize', function(e) {
													$this.trigger('mousedown');
												})
												.appendTo(fm.getUI('bottomtray'));
										}
									});
								}
							})
						);
					}
				}
			},
			dialog = $('<div class="ui-front ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable std42-dialog touch-punch '+cldialog+' '+opts.cssClass+'"/>')
				.hide()
				.append(self)
				.appendTo(elfNode)
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
					if (! dialog.hasClass('ui-front')) {
						setTimeout(function() {
							dialog.is(':visible:not(.elfinder-dialog-minimized)') && dialog.trigger('totop');
						}, 10);
					}
				})
				.on('open', function() {
					var d           = $(this),
						maxWinWidth = (d.outerWidth() > elfNode.width()-10)? elfNode.width()-10 : null;
					
					maxWinWidth && d.css({width: maxWinWidth, left: '5px'});

					if (!dialog.hasClass(clnotify)) {
						elfNode.children('.'+cldialog+':visible:not(.'+clnotify+')').each(function() {
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
					
					dialog.data('modal') && fm.getUI('overlay').elfinderoverlay('show');
					
					dialog.trigger('totop');
					
					typeof(opts.open) == 'function' && $.proxy(opts.open, self[0])();
					
					fm.UA.Mobile && tabstopNext().focus();
					
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
					
					dialog.data('modal') && fm.getUI('overlay').elfinderoverlay('hide');

					if (typeof(opts.close) == 'function') {
						$.proxy(opts.close, self[0])();
					} else if (opts.destroyOnClose) {
						dialog.hide().remove();
					}
					
					// get focus to next dialog
					dialogs = elfNode.children('.'+cldialog+':visible');
					if (dialogs.length) {
						dialogs.filter(':last').trigger('totop');
					} else {
						setTimeout(function() {
							// return focus to elfNode
							fm.enable();
						}, 20);
					}
				})
				.on('totop', function() {
					if (dialog.hasClass('elfinder-dialog-minimized')) {
						titlebar.children('.elfinder-titlebar-minimize').trigger('mousedown');
					}
					
					fm.toFront(dialog);
					elfNode.children('.'+cldialog).removeClass(clactive+' ui-front');
					dialog.addClass(clactive+' ui-front');

					! fm.UA.Mobile && tabstopNext().focus();
				})
				.on('posinit', function() {
					var css = opts.position;
					if (! css && ! dialog.data('resizing')) {
						css = {
							top  : Math.max(0, parseInt((elfNode.height() - dialog.outerHeight())/2 - 42))+'px',
							left : Math.max(0, parseInt((elfNode.width() - dialog.outerWidth())/2))+'px'
						};
					}
					if (opts.absolute) {
						css.position = 'absolute';
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
		
		dialog.prepend(titlebar);

		makeHeaderBtn();

		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only '
					+'elfinder-btncnt-'+(btnCnt++)+' '
					+cltabstop
					+'"><span class="ui-button-text">'+name+'</span></button>')
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
		
		dialog.trigger('posinit').data('margin-y', self.outerHeight(true) - self.height());
		
		if (opts.resizable && $.fn.resizable) {
			dialog.resizable({
				minWidth   : opts.minWidth,
				minHeight  : opts.minHeight,
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
				},
				resize     : function(e, ui) {
					var oh = 0;
					dialog.children('.ui-widget-header,.ui-dialog-buttonpane').each(function() {
						oh += $(this).outerHeight(true);
					});
					self.height(ui.size.height - oh - dialog.data('margin-y'));
					dialog.trigger('resize');
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
	absolute  : false,
	width     : 320,
	height    : 'auto',
	minWidth  : 200,
	minHeight : 110,
	allowMinimize : 'auto',
	allowMaximize : false,
	headerBtnPos : 'auto',
	headerBtnOrder : 'auto'
};
