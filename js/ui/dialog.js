"use strict";
/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts, fm) {
	var platformWin = (window.navigator.platform.indexOf('Win') != -1),
		delta       = {},
		syncSize    = { enabled: false, width: false, height: false, defaultSize: null },
		fitSize     = function(dialog) {
			var opts, node;
			if (syncSize.enabled) {
				node = fm.options.dialogContained? elfNode : $(window);
				opts = {
					maxWidth : syncSize.width?  node.width() - delta.width  : null,
					maxHeight: syncSize.height? node.height() - delta.height : null
				};
				dialog.css(opts).trigger('resize');
				if (dialog.data('hasResizable') && (dialog.resizable('option', 'maxWidth') < opts.maxWidth || dialog.resizable('option', 'maxHeight') < opts.maxHeight)) {
					dialog.resizable('option', opts);
				}
			}
		},
		syncFunc    = function(e) {
			var dialog = e.data;
			syncTm && clearTimeout(syncTm);
			syncTm = setTimeout(function() {
				var opts, prevH, offset;
				if (syncSize.enabled) {
					prevH = dialog.height();
					if (prevH !== dialog.height()) {
						offset = dialog.offset();
						window.scrollTo(offset.top, offset.left);
					}
					fitSize(dialog);
				}
			}, 50);
		},
		syncTm, dialog, elfNode;
	
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
	
	opts = Object.assign({}, $.fn.elfinderdialog.defaults, opts);
	
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
	
	if (fm.options.dialogContained) {
		syncSize.width = syncSize.height = syncSize.enabled = true;
	} else {
		syncSize.width = (opts.maxWidth === 'window');
		syncSize.height = (opts.maxHeight === 'window');
		if (syncSize.width || syncSize.height) {
			syncSize.enabled = true;
		}
	}
	
	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			clactive   = 'elfinder-dialog-active',
			cldialog   = 'elfinder-dialog',
			clnotify   = 'elfinder-dialog-notify',
			clhover    = 'ui-state-hover',
			cltabstop  = 'elfinder-tabstop',
			cl1stfocus = 'elfinder-focus',
			clmodal    = 'elfinder-dialog-modal',
			id         = parseInt(Math.random()*1000000),
			titlebar   = $('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix"><span class="elfinder-dialog-title">'+opts.title+'</span></div>'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class=" ui-helper-clearfix ui-dialog-buttonpane ui-widget-content"/>')
				.append(buttonset),
			btnWidth   = 0,
			btnCnt     = 0,
			tabstops   = $(),
			numberToTel = function() {
				if (opts.optimizeNumber) {
					dialog.find('input[type=number]').each(function() {
						$(this).attr('inputmode', 'numeric');
						$(this).attr('pattern', '[0-9]*');
					});
				}
			},
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
							e.preventDefault();
							e.stopPropagation();
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
									posCheck();
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
									w;
								
								e.preventDefault();
								e.stopPropagation();
								if (typeof $this.data('style') !== 'undefined') {
									dialog.trigger('beforedommove')
										.appendTo(elfNode)
										.trigger('dommove')
										.attr('style', $this.data('style'))
										.removeClass('elfinder-dialog-minimized')
										.off('mousedown.minimize');
									posCheck();
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
									dialog.children('.ui-widget-content:first').slideUp(200, function() {
										dialog.children('.ui-widget-content').hide().end()
											.trigger('resize', { minimize: 'on' })
											.attr('style', '').css({ maxWidth: w })
											.addClass('elfinder-dialog-minimized')
											.one('mousedown.minimize', function(e) {
												$this.trigger('mousedown');
											})
											.trigger('beforedommove')
											.appendTo(fm.getUI('bottomtray'))
											.trigger('dommove');
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
					containment : fm.options.dialogContained? elfNode : null,
					handle : '.ui-dialog-titlebar',
					drag : function(e, ui) {
						var top = ui.offset.top,
							left = ui.offset.left;
						if (top < 0) {
							ui.position.top = ui.position.top - top;
						}
						if (left < 0) {
							ui.position.left = ui.position.left - left;
						}
						if (fm.options.dialogContained) {
							ui.position.top < 0 && (ui.position.top = 0);
							ui.position.left < 0 && (ui.position.left = 0);
						}
					},
					stop : function(e, ui) {
						dialog.css({height : opts.height});
						self.data('draged', true);
					}
				})
				.css({
					width     : opts.width,
					height    : opts.height,
					minWidth  : opts.minWidth,
					minHeight : opts.minHeight,
					maxWidth  : opts.maxWidth,
					maxHeight : opts.maxHeight
				})
				.on('touchstart touchmove touchend', function(e) {
					// stopPropagation of touch events
					e.stopPropagation();
				})
				.on('mousedown', function(e) {
					if (! dialog.hasClass('ui-front')) {
						setTimeout(function() {
							dialog.is(':visible:not(.elfinder-dialog-minimized)') && dialog.trigger('totop');
						}, 10);
					}
				})
				.on('open', function() {
					var d = $(this);

					if (syncSize.enabled) {
						if (!syncSize.defaultSize) {
							syncSize.defaultSize = { width: self.width(), height: self.height() };
						}
						fitSize(dialog);
						dialog.trigger('resize').trigger('posinit');
						elfNode.on('resize.'+fm.namespace, dialog, syncFunc);
					}
					
					if (!dialog.hasClass(clnotify)) {
						elfNode.children('.'+cldialog+':visible:not(.'+clnotify+')').each(function() {
							var d     = $(this),
								top   = parseInt(d.css('top')),
								left  = parseInt(d.css('left')),
								_top  = parseInt(dialog.css('top')),
								_left = parseInt(dialog.css('left')),
								ct    = Math.abs(top - _top) < 10,
								cl    = Math.abs(left - _left) < 10;

							if (d[0] != dialog[0] && (ct || cl)) {
								dialog.css({
									top  : ct ? (top + 10) : _top,
									left : cl ? (left + 10) : _left
								});
							}
						});
					} 
					
					if (dialog.data('modal')) {
						dialog.addClass(clmodal);
						fm.getUI('overlay').elfinderoverlay('show');
					}
					
					dialog.trigger('totop');
					
					typeof(opts.open) == 'function' && $.proxy(opts.open, self[0])();
					
					fm.UA.Mobile && tabstopNext().focus();
					
					if (opts.closeOnEscape) {
						$(document).on('keyup.'+id, function(e) {
							if (e.keyCode == $.ui.keyCode.ESCAPE && dialog.hasClass(clactive)) {
								self.elfinderdialog('close');
							}
						});
					}
				})
				.on('close', function() {
					var dialogs;
					
					syncSize.enabled && elfNode.off('resize.'+fm.namespace, syncFunc);
					
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
					var s = fm.storage('autoFocusDialog');
					
					dialog.data('focusOnMouseOver', s? (s > 0) : fm.options.uiOptions.dialog.focusOnMouseOver);
					
					if (dialog.hasClass('elfinder-dialog-minimized')) {
						titlebar.children('.elfinder-titlebar-minimize').trigger('mousedown');
					}
					
					if (!dialog.data('modal') && fm.getUI('overlay').is(':visible')) {
						fm.getUI('overlay').before(dialog);
					} else {
						fm.toFront(dialog);
					}
					elfNode.children('.'+cldialog+':not(.'+clmodal+')').removeClass(clactive+' ui-front');
					dialog.addClass(clactive+' ui-front');

					! fm.UA.Mobile && tabstopNext().focus();
				})
				.on('posinit', function() {
					var css = opts.position,
						nodeOffset, minTop, minLeft, outerSize, win, winSize, nodeFull;
					if (dialog.hasClass('elfinder-maximized')) {
						return;
					}
					if (! css && ! dialog.data('resizing')) {
						nodeFull = elfNode.hasClass('elfinder-fullscreen');
						dialog.css(nodeFull? {
							'max-width'  : '100%',
							'max-height' : '100%',
							'overflow'   : 'auto'
						} : restoreStyle);
						if (fm.UA.Mobile && !nodeFull && rotated === fm.UA.Rotated) {
							return;
						}
						rotated = fm.UA.Rotated;
						win = $(window);
						nodeOffset = elfNode.offset();
						outerSize = {
							width : dialog.outerWidth(true),
							height: dialog.outerHeight(true)
						};
						outerSize.right = nodeOffset.left + outerSize.width;
						outerSize.bottom = nodeOffset.top + outerSize.height;
						winSize = {
							scrLeft: win.scrollLeft(),
							scrTop : win.scrollTop(),
							width  : win.width(),
							height : win.height()
						}
						winSize.right = winSize.scrLeft + winSize.width;
						winSize.bottom = winSize.scrTop + winSize.height;
						
						if (fm.options.dialogContained || nodeFull) {
							minTop = 0;
							minLeft = 0;
						} else {
							minTop = nodeOffset.top * -1 + winSize.scrTop;
							minLeft = nodeOffset.left * -1 + winSize.scrLeft;
						}
						css = {
							top  : outerSize.height >= winSize.height? minTop  : Math.max(minTop, parseInt((elfNode.height() - outerSize.height)/2 - 42)),
							left : outerSize.width  >= winSize.width ? minLeft : Math.max(minLeft, parseInt((elfNode.width() - outerSize.width)/2))
						};
						if (outerSize.right + css.left > winSize.right) {
							css.left = Math.max(minLeft, winSize.right - outerSize.right);
						}
						if (outerSize.bottom + css.top > winSize.bottom) {
							css.top = Math.max(minTop, winSize.bottom - outerSize.bottom);
						}
					}
					if (opts.absolute) {
						css.position = 'absolute';
					}
					css && dialog.css(css);
				})
				.on('resize', function(e, data) {
					var oh = 0, h, minH;
					if ((data && (data.minimize || data.maxmize)) || dialog.hasClass('elfinder-dialog-minimized')) {
						return;
					}
					e.stopPropagation();
					e.preventDefault();
					dialog.children('.ui-widget-header,.ui-dialog-buttonpane').each(function() {
						oh += $(this).outerHeight(true);
					});
					if (syncSize.enabled && !e.originalEvent && !dialog.hasClass('elfinder-maximized')) {
						h = Math.min(syncSize.defaultSize.height, Math.max(parseInt(dialog.css('max-height')), parseInt(dialog.css('min-height'))) - oh - dialog.data('margin-y'));
					} else {
						h = dialog.height() - oh - dialog.data('margin-y');
					}
					self.height(h);
					posCheck();
					setTimeout(function() { // Firefox need setTimeout to get new height value
						minH = self.height();
						minH = (h < minH)? (minH + oh + dialog.data('margin-y')) : opts.minHeight;
						dialog.css('min-height', minH);
						dialog.data('hasResizable') && dialog.resizable('option', { minHeight: minH });
					}, 0);
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
					$(this).removeClass(clhover).removeData('keepFocus').parent('label').removeClass(clhover);
					this.id && $(this).parent().find('label[for='+this.id+']').removeClass(clhover);
				})
				.on('mouseenter mouseleave', '.'+cltabstop, function(e) {
					var $this = $(this);
					if (opts.btnHoverFocus && dialog.data('focusOnMouseOver')) {
						if (e.type == 'mouseenter' && ! $(':focus').data('keepFocus')) {
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
				.data({modal: opts.modal}),
			posCheck = function() {
				var node = fm.getUI(),
					pos;
				if (node.hasClass('elfinder-fullscreen')) {
					pos = dialog.position();
					dialog.css('top', Math.max(Math.min(Math.max(pos.top, 0), node.height() - 100), 0));
					dialog.css('left', Math.max(Math.min(Math.max(pos.left, 0), node.width() - 200), 0));
				}
			},
			maxSize, rotated, restoreStyle;
		
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
		
		if (syncSize.enabled) {
			delta.width = dialog.outerWidth(true) - dialog.width() + ((dialog.outerWidth() - dialog.width()) / 2);
			delta.height = dialog.outerHeight(true) - dialog.height() + ((dialog.outerHeight() - dialog.height()) / 2);
		}
		
		if (fm.options.dialogContained) {
			maxSize = {
				maxWidth: elfNode.width() - delta.width,
				maxHeight: elfNode.height() - delta.height
			};
			opts.maxWidth = opts.maxWidth? Math.min(maxSize.maxWidth, opts.maxWidth) : maxSize.maxWidth;
			opts.maxHeight = opts.maxHeight? Math.min(maxSize.maxHeight, opts.maxHeight) : maxSize.maxHeight;
			dialog.css(maxSize);
		}
		
		restoreStyle = {
			'max-width'  : dialog.css('max-width'),
			'max-height' : dialog.css('max-height'),
			'overflow'   : dialog.css('overflow')
		};
		
		dialog.trigger('posinit').data('margin-y', self.outerHeight(true) - self.height());
		
		if (opts.resizable) {
			dialog.resizable({
				minWidth   : opts.minWidth,
				minHeight  : opts.minHeight,
				maxWidth   : opts.maxWidth,
				maxHeight  : opts.maxHeight,
				start      : function() {
					if (dialog.data('resizing') !== true && dialog.data('resizing')) {
						clearTimeout(dialog.data('resizing'));
					}
					dialog.data('resizing', true);
				},
				stop       : function(e, ui) {
					dialog.data('resizing', setTimeout(function() {
						dialog.data('resizing', false);
					}, 200));
					if (syncSize.enabled) {
						syncSize.defaultSize = { width: self.width(), height: self.height() };
					}
				}
			}).data('hasResizable', true);
		} 
		
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
		
		numberToTel();
		
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
	minHeight : 70,
	maxWidth  : null,
	maxHeight : null,
	allowMinimize : 'auto',
	allowMaximize : false,
	headerBtnPos : 'auto',
	headerBtnOrder : 'auto',
	optimizeNumber : true
};
