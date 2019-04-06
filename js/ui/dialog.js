/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts, fm) {
	"use strict";
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
				Object.assign(restoreStyle, opts);
				dialog.css(opts).trigger('resize');
				if (dialog.data('hasResizable') && (dialog.resizable('option', 'maxWidth') < opts.maxWidth || dialog.resizable('option', 'maxHeight') < opts.maxHeight)) {
					dialog.resizable('option', opts);
				}
			}
		},
		syncFunc    = function(e) {
			var dialog = e.data;
			syncTm && cancelAnimationFrame(syncTm);
			syncTm = requestAnimationFrame(function() {
				var opts, offset;
				if (syncSize.enabled) {
					fitSize(dialog);
				}
			});
		},
		checkEditing = function() {
			var cldialog = 'elfinder-dialog',
				dialogs = elfNode.children('.' + cldialog + '.' + fm.res('class', 'editing') + ':visible');
			fm[dialogs.length? 'disable' : 'enable']();
		},
		propagationEvents = {},
		syncTm, dialog, elfNode, restoreStyle;
	
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
			if (opts === 'open') {
				if (dialog.css('display') === 'none') {
					// Need dialog.show() and hide() to detect elements size in open() callbacks
					dialog.trigger('posinit').show().trigger('open').hide();
					dialog.fadeIn(120, function() {
						fm.trigger('dialogopened', {dialog: dialog});
					});
				}
			} else if (opts === 'close' || opts === 'destroy') {
				dialog.stop(true);
				if (dialog.is(':visible') || elfNode.is(':hidden')) {
					dialog.trigger('close');
					fm.trigger('dialogclosed', {dialog: dialog});
				}
				if (opts === 'destroy') {
					dialog.remove();
					fm.trigger('dialogremoved', {dialog: dialog});
				}
			} else if (opts === 'toTop') {
				dialog.trigger('totop');
				fm.trigger('dialogtotoped', {dialog: dialog});
			} else if (opts === 'posInit') {
				dialog.trigger('posinit');
				fm.trigger('dialogposinited', {dialog: dialog});
			} else if (opts === 'tabstopsInit') {
				dialog.trigger('tabstopsInit');
				fm.trigger('dialogtabstopsinited', {dialog: dialog});
			} else if (opts === 'checkEditing') {
				checkEditing();
			}
		}
		return this;
	}
	
	opts = Object.assign({}, $.fn.elfinderdialog.defaults, opts);
	
	if (opts.allowMinimize && opts.allowMinimize === 'auto') {
		opts.allowMinimize = this.find('textarea,input').length? true : false; 
	}
	opts.openMaximized = opts.allowMinimize && opts.openMaximized;
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

	propagationEvents = fm.arrayFlip(opts.propagationEvents, true);
	
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
			titlebar   = $('<div class="ui-dialog-titlebar ui-widget-header ui-corner-top ui-helper-clearfix"><span class="elfinder-dialog-title">'+opts.title+'</span></div>'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class=" ui-helper-clearfix ui-dialog-buttonpane ui-widget-content"/>')
				.append(buttonset),
			btnWidth   = 0,
			btnCnt     = 0,
			tabstops   = $(),
			evCover    = $('<div style="width:100%;height:100%;position:absolute;top:0px;left:0px;"/>').hide(),
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
				var elms = tabstops.filter(':visible:enabled'),
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
				var elms = tabstops.filter(':visible:enabled'),
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
				});
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
								dialog.trigger('resize', {init: true});
							}
						});
						titlebar.prepend($('<span class="ui-widget-header ui-corner-all elfinder-titlebar-button elfinder-titlebar-full"><span class="ui-icon ui-icon-plusthick"/></span>')
							.on('mousedown', function(e) {
								var elm = $(this);
								e.preventDefault();
								e.stopPropagation();
								if (!dialog.hasClass('elfinder-maximized') && typeof elm.data('style') === 'undefined') {
									self.height(self.height());
									elm.data('style', self.attr('style') || '');
								}
								fm.toggleMaximize(dialog);
								typeof(opts.maximize) === 'function' && opts.maximize.call(self[0]);
							})
						);
					}
					
				},
				minimize: function() {
					var btn, mnode, doffset;
					if (opts.allowMinimize) {
						btn = $('<span class="ui-widget-header ui-corner-all elfinder-titlebar-button elfinder-titlebar-minimize"><span class="ui-icon ui-icon-minusthick"/></span>')
							.on('mousedown', function(e) {
								var $this = $(this),
									tray = fm.getUI('bottomtray'),
									dumStyle = { width: 70, height: 24 },
									dum = $('<div/>').css(dumStyle).addClass(dialog.get(0).className + ' elfinder-dialog-minimized'),
									pos = {};
								
								e.preventDefault();
								e.stopPropagation();
								if (!dialog.data('minimized')) {
									// minimize
									doffset = dialog.data('minimized', true).position();
									mnode = dialog.clone().on('mousedown', function() {
										$this.trigger('mousedown');
									}).removeClass('ui-draggable ui-resizable elfinder-frontmost');
									tray.append(dum);
									Object.assign(pos, dum.offset(), dumStyle);
									dum.remove();
									mnode.height(dialog.height()).children('.ui-dialog-content:first').empty();
									fm.toHide(dialog.before(mnode));
									mnode.children('.ui-dialog-content:first,.ui-dialog-buttonpane,.ui-resizable-handle').remove();
									mnode.find('.elfinder-titlebar-minimize,.elfinder-titlebar-full').remove();
									mnode.find('.ui-dialog-titlebar-close').on('mousedown', function(e) {
										e.stopPropagation();
										e.preventDefault();
										mnode.remove();
										dialog.show();
										self.elfinderdialog('close');
									});
									mnode.animate(pos, function() {
										mnode.attr('style', '')
										.css({ maxWidth: dialog.width() })
										.addClass('elfinder-dialog-minimized')
										.appendTo(tray);
										checkEditing();
										typeof(opts.minimize) === 'function' && opts.minimize.call(self[0]);
									});
								} else {
									//restore
									dialog.removeData('minimized').before(mnode.css(Object.assign({'position': 'absolute'}, mnode.offset())));
									fm.toFront(mnode);
									mnode.animate(Object.assign({ width: dialog.width(), height: dialog.height() }, doffset), function() {
										dialog.show();
										fm.toFront(dialog);
										mnode.remove();
										posCheck();
										checkEditing();
										dialog.trigger('resize', {init: true});
										typeof(opts.minimize) === 'function' && opts.minimize.call(self[0]);
									});
								}
							});
						titlebar.on('dblclick', function(e) {
							$(this).children('.elfinder-titlebar-minimize').trigger('mousedown');
						}).prepend(btn);
						dialog.on('togleminimize', function() {
							btn.trigger('mousedown');
						});
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
					start : function() {
						evCover.show();
					},
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
						evCover.hide();
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
				.on('touchstart touchmove touchend click dblclick mouseup mouseenter mouseleave mouseout mouseover mousemove', function(e) {
					// stopPropagation of user action events
					!propagationEvents[e.type] && e.stopPropagation();
				})
				.on('mousedown', function(e) {
					!propagationEvents[e.type] && e.stopPropagation();
					requestAnimationFrame(function() {
						if (dialog.is(':visible') && !dialog.hasClass('elfinder-frontmost')) {
							toFocusNode = $(':focus');
							if (!toFocusNode.length) {
								toFocusNode = void(0);
							}
							dialog.trigger('totop');
						}
					});
				})
				.on('open', function() {
					dialog.data('margin-y', self.outerHeight(true) - self.height());
					if (syncSize.enabled) {
						if (opts.height && opts.height !== 'auto') {
							dialog.trigger('resize', {init: true});
						}
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
					
					opts.openMaximized && fm.toggleMaximize(dialog);

					fm.trigger('dialogopen', {dialog: dialog});

					typeof(opts.open) == 'function' && $.proxy(opts.open, self[0])();
					
					if (opts.closeOnEscape) {
						$(document).on('keydown.'+id, function(e) {
							if (e.keyCode == $.ui.keyCode.ESCAPE && dialog.hasClass('elfinder-frontmost')) {
								self.elfinderdialog('close');
							}
						});
					}
					dialog.hasClass(fm.res('class', 'editing')) && checkEditing();
				})
				.on('close', function(e) {
					var dialogs, dfd;
					
					if (opts.beforeclose && typeof opts.beforeclose === 'function') {
						dfd = opts.beforeclose();
						if (!dfd || !dfd.promise) {
							dfd = !dfd? $.Deferred().reject() : $.Deferred().resolve();
						}
					} else {
						dfd = $.Deferred().resolve();
					}
					
					dfd.done(function() {
						syncSize.enabled && elfNode.off('resize.'+fm.namespace, syncFunc);
						
						if (opts.closeOnEscape) {
							$(document).off('keyup.'+id);
						}
						
						if (opts.allowMaximize) {
							fm.toggleMaximize(dialog, false);
						}
						
						fm.toHide(dialog);
						dialog.data('modal') && fm.getUI('overlay').elfinderoverlay('hide');
						
						if (typeof(opts.close) == 'function') {
							$.proxy(opts.close, self[0])();
						}
						if (opts.destroyOnClose && dialog.parent().length) {
							dialog.hide().remove();
						}
						
						// get focus to next dialog
						dialogs = elfNode.children('.'+cldialog+':visible');
						
						dialog.hasClass(fm.res('class', 'editing')) && checkEditing();
					});
				})
				.on('totop frontmost', function() {
					var s = fm.storage('autoFocusDialog');
					
					dialog.data('focusOnMouseOver', s? (s > 0) : fm.options.uiOptions.dialog.focusOnMouseOver);
					
					if (dialog.data('minimized')) {
						titlebar.children('.elfinder-titlebar-minimize').trigger('mousedown');
					}
					
					if (!dialog.data('modal') && fm.getUI('overlay').is(':visible')) {
						fm.getUI('overlay').before(dialog);
					} else {
						fm.toFront(dialog);
					}
					elfNode.children('.'+cldialog+':not(.'+clmodal+')').removeClass(clactive);
					dialog.addClass(clactive);

					! fm.UA.Mobile && (toFocusNode || tabstopNext()).trigger('focus');

					toFocusNode = void(0);
				})
				.on('posinit', function() {
					var css = opts.position,
						nodeOffset, minTop, minLeft, outerSize, win, winSize, nodeFull;
					if (dialog.hasClass('elfinder-maximized')) {
						return;
					}
					if (! css && ! dialog.data('resizing')) {
						nodeFull = elfNode.hasClass('elfinder-fullscreen') || fm.options.enableAlways;
						dialog.css(nodeFull? {
							maxWidth  : '100%',
							maxHeight : '100%',
							overflow   : 'auto'
						} : restoreStyle);
						if (fm.UA.Mobile && !nodeFull && dialog.data('rotated') === fm.UA.Rotated) {
							return;
						}
						dialog.data('rotated', fm.UA.Rotated);
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
						};
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
					var oh = 0, init = data && data.init, h, minH, maxH;
					if ((data && (data.minimize || data.maxmize)) || dialog.data('minimized')) {
						return;
					}
					e.stopPropagation();
					e.preventDefault();
					dialog.children('.ui-widget-header,.ui-dialog-buttonpane').each(function() {
						oh += $(this).outerHeight(true);
					});
					if (!init && syncSize.enabled && !e.originalEvent && !dialog.hasClass('elfinder-maximized')) {
						h = dialog.height();
						minH = dialog.css('min-height') || h;
						maxH = dialog.css('max-height') || h;
						if (minH.match(/%/)) {
							minH = Math.floor((parseInt(minH) / 100) * dialog.parent().height());
						} else {
							minH = parseInt(minH);
						}
						if (maxH.match(/%/)) {
							maxH = Math.floor((parseInt(maxH) / 100) * dialog.parent().height());
						} else {
							maxH = parseInt(maxH);
						}
						h = Math.min(syncSize.defaultSize.height, Math.max(maxH, minH) - oh - dialog.data('margin-y'));
					} else {
						h = dialog.height() - oh - dialog.data('margin-y');
					}
					self.height(h);
					if (init) {
						return;
					}
					posCheck();
					minH = self.height();
					minH = (h < minH)? (minH + oh + dialog.data('margin-y')) : opts.minHeight;
					dialog.css('min-height', minH);
					dialog.data('hasResizable') && dialog.resizable('option', { minHeight: minH });
					if (typeof(opts.resize) === 'function') {
						$.proxy(opts.resize, self[0])(e, data);
					}
				})
				.on('tabstopsInit', tabstopsInit)
				.on('focus', '.'+cltabstop, function() {
					$(this).addClass(clhover).parent('label').addClass(clhover);
					this.id && $(this).parent().find('label[for='+this.id+']').addClass(clhover);
				})
				.on('click', 'select.'+cltabstop, function() {
					var node = $(this);
					node.data('keepFocus')? node.removeData('keepFocus') : node.data('keepFocus', true);
				})
				.on('blur', '.'+cltabstop, function() {
					$(this).removeClass(clhover).removeData('keepFocus').parent('label').removeClass(clhover);
					this.id && $(this).parent().find('label[for='+this.id+']').removeClass(clhover);
				})
				.on('mouseenter mouseleave', '.'+cltabstop+',label', function(e) {
					var $this = $(this), labelfor;
					if (this.nodeName === 'LABEL') {
						if (!$this.children('.'+cltabstop).length && (!(labelfor = $this.attr('for')) || !$('#'+labelfor).hasClass(cltabstop))) {
							return;
						}
					}
					if (opts.btnHoverFocus && dialog.data('focusOnMouseOver')) {
						if (e.type === 'mouseenter' && ! $(':focus').data('keepFocus')) {
							$this.trigger('focus');
						}
					} else {
						$this.toggleClass(clhover, e.type == 'mouseenter');
					}
				})
				.on('keydown', '.'+cltabstop, function(e) {
					var $this = $(this),
						esc, move, moveTo;
					if ($this.is(':focus')) {
						esc = e.keyCode === $.ui.keyCode.ESCAPE;
						if (e.keyCode === $.ui.keyCode.ENTER) {
							e.preventDefault();
							$this.trigger('click');
						}  else if (((e.keyCode === $.ui.keyCode.TAB) && e.shiftKey) || e.keyCode === $.ui.keyCode.LEFT || e.keyCode == $.ui.keyCode.UP) {
							move = 'prev';
						}  else if (e.keyCode === $.ui.keyCode.TAB || e.keyCode == $.ui.keyCode.RIGHT || e.keyCode == $.ui.keyCode.DOWN) {
							move = 'next';
						}
						if (move
								&&
							(
								($this.is('textarea') && !(e.ctrlKey || e.metaKey))
									||
								($this.is('select,span.ui-slider-handle') && e.keyCode !== $.ui.keyCode.TAB)
									||
								($this.is('input:not(:checkbox,:radio)') && (!(e.ctrlKey || e.metaKey) && e.keyCode === $.ui.keyCode[move === 'prev'? 'LEFT':'RIGHT']))
							)
						) {
							e.stopPropagation();
							return;
						}
						if (!esc) {
							e.stopPropagation();
						} else if ($this.is('input:not(:checkbox,:radio),textarea')) {
							if ($this.val() !== '') {
								$this.val('');
								e.stopPropagation();
							}
						}
						if (move) {
							e.preventDefault();
							(move === 'prev'? tabstopPrev : tabstopNext)(this).trigger('focus');
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
			maxSize, toFocusNode;
		
		dialog.prepend(titlebar);

		makeHeaderBtn();

		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only '
					+'elfinder-btncnt-'+(btnCnt++)+' '
					+cltabstop
					+'"><span class="ui-button-text">'+name+'</span></button>')
				.on('click', $.proxy(cb, self[0]));
			if (cb._cssClass) {
				button.addClass(cb._cssClass);
			}
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
		
		dialog.append(evCover);
		
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
			maxWidth  : dialog.css('max-width'),
			maxHeight : dialog.css('max-height'),
			overflow   : dialog.css('overflow')
		};
		
		if (opts.resizable) {
			dialog.resizable({
				minWidth   : opts.minWidth,
				minHeight  : opts.minHeight,
				maxWidth   : opts.maxWidth,
				maxHeight  : opts.maxHeight,
				start      : function() {
					evCover.show();
					if (dialog.data('resizing') !== true && dialog.data('resizing')) {
						clearTimeout(dialog.data('resizing'));
					}
					dialog.data('resizing', true);
				},
				stop       : function(e, ui) {
					evCover.hide();
					dialog.data('resizing', setTimeout(function() {
						dialog.data('resizing', false);
					}, 200));
					if (syncSize.enabled) {
						syncSize.defaultSize = { width: self.width(), height: self.height() };
					}
				}
			}).data('hasResizable', true);
		} 
		
		numberToTel();
		
		tabstopsInit();
		
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
		
		if (opts.autoOpen) {
			if (opts.open) {
				requestAnimationFrame(function() {
					self.elfinderdialog('open');
				});
			} else {
				self.elfinderdialog('open');
			}
		}

		if (opts.resize) {
			fm.bind('themechange', function() {
				setTimeout(function() {
					dialog.data('margin-y', self.outerHeight(true) - self.height());
					dialog.trigger('resize', {init: true});
				}, 300);
			});
		}
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
	openMaximized : false,
	headerBtnPos : 'auto',
	headerBtnOrder : 'auto',
	optimizeNumber : true,
	propagationEvents : ['mousemove', 'mouseup']
};
