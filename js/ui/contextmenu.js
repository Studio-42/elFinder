/**
 * @class  elFinder contextmenu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercontextmenu = function(fm) {
	"use strict";
	return this.each(function() {
		var self   = $(this),
			cmItem = 'elfinder-contextmenu-item',
			smItem = 'elfinder-contextsubmenu-item',
			exIcon = 'elfinder-contextmenu-extra-icon',
			cHover = fm.res('class', 'hover'),
			dragOpt = {
				distance: 8,
				start: function() {
					menu.data('drag', true).data('touching') && menu.find('.'+cHover).removeClass(cHover);
				},
				stop: function() {
					menu.data('draged', true).removeData('drag');
				}
			},
			menu = $(this).addClass('touch-punch ui-helper-reset ui-front ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction)
				.hide()
				.on('touchstart', function(e) {
					menu.data('touching', true).children().removeClass(cHover);
				})
				.on('touchend', function(e) {
					menu.removeData('touching');
				})
				.on('mouseenter mouseleave', '.'+cmItem, function(e) {
					$(this).toggleClass(cHover, (e.type === 'mouseenter' || (! menu.data('draged') && menu.data('submenuKeep'))? true : false));
					if (menu.data('draged') && menu.data('submenuKeep')) {
						menu.find('.elfinder-contextmenu-sub:visible').parent().addClass(cHover);
					}
				})
				.on('mouseenter mouseleave', '.'+exIcon, function(e) {
					$(this).parent().toggleClass(cHover, e.type === 'mouseleave');
				})
				.on('mouseenter mouseleave', '.'+cmItem+',.'+smItem, function(e) {
					var setIndex = function(target, sub) {
						$.each(sub? subnodes : nodes, function(i, n) {
							if (target[0] === n) {
								(sub? subnodes : nodes)._cur = i;
								if (sub) {
									subselected = target;
								} else {
									selected = target;
								}
								return false;
							}
						});
					};
					if (e.originalEvent) {
						var target = $(this),
							unHover = function() {
								if (selected && !selected.children('div.elfinder-contextmenu-sub:visible').length) {
									selected.removeClass(cHover);
								}
							};
						if (e.type === 'mouseenter') {
							// mouseenter
							if (target.hasClass(smItem)) {
								// submenu
								if (subselected) {
									subselected.removeClass(cHover);
								}
								if (selected) {
									subnodes = selected.find('div.'+smItem);
								}
								setIndex(target, true);
							} else {
								// menu
								unHover();
								setIndex(target);
							}
						} else {
							// mouseleave
							if (target.hasClass(smItem)) {
								//submenu
								subselected = null;
								subnodes = null;
							} else {
								// menu
								unHover();
								(function(sel) {
									setTimeout(function() {
										if (sel === selected) {
											selected = null;
										}
									}, 250);
								})(selected);
							}
						}
					}
				})
				.on('contextmenu', function(){return false;})
				.on('mouseup', function() {
					setTimeout(function() {
						menu.removeData('draged');
					}, 100);
				})
				.draggable(dragOpt),
			ltr = fm.direction === 'ltr',
			subpos = ltr? 'left' : 'right',
			types = Object.assign({}, fm.options.contextmenu),
			tpl     = '<div class="'+cmItem+'{className}"><span class="elfinder-button-icon {icon} elfinder-contextmenu-icon"{style}></span><span>{label}</span></div>',
			item = function(label, icon, callback, opts) {
				var className = '',
					style = '',
					iconClass = '',
					v, pos;
				if (opts) {
					if (opts.className) {
						className = ' ' + opts.className;
					}
					if (opts.iconClass) {
						iconClass = opts.iconClass;
						icon = '';
					}
					if (opts.iconImg) {
						v = opts.iconImg.split(/ +/);
						pos = v[1] && v[2]? fm.escape(v[1] + 'px ' + v[2] + 'px') : '';
						style = ' style="background:url(\''+fm.escape(v[0])+'\') '+(pos? pos : '0 0')+' no-repeat;'+(pos? '' : 'posbackground-size:contain;')+'"';
					}
				}
				return $(tpl.replace('{icon}', icon ? 'elfinder-button-icon-'+icon : (iconClass? iconClass : ''))
						.replace('{label}', label)
						.replace('{style}', style)
						.replace('{className}', className))
					.on('click', function(e) {
						e.stopPropagation();
						e.preventDefault();
						callback();
					});
			},
			urlIcon = function(iconUrl) {
				var v = iconUrl.split(/ +/),
					pos = v[1] && v[2]? (v[1] + 'px ' + v[2] + 'px') : '';
				return {
					backgroundImage: 'url("'+v[0]+'")',
					backgroundRepeat: 'no-repeat',
					backgroundPosition: pos? pos : '',
					backgroundSize: pos? '' : 'contain'
				};
			},
			base, cwd,
			nodes, selected, subnodes, subselected, autoSyncStop, subHoverTm,

			autoToggle = function() {
				var evTouchStart = 'touchstart.contextmenuAutoToggle';
				menu.data('hideTm') && clearTimeout(menu.data('hideTm'));
				if (menu.is(':visible')) {
					menu.on('touchstart', function(e) {
						if (e.originalEvent.touches.length > 1) {
							return;
						}
						menu.stop();
						fm.toFront(menu);
						menu.data('hideTm') && clearTimeout(menu.data('hideTm'));
					})
					.data('hideTm', setTimeout(function() {
						if (menu.is(':visible')) {
							cwd.find('.elfinder-cwd-file').off(evTouchStart);
							cwd.find('.elfinder-cwd-file.ui-selected')
							.one(evTouchStart, function(e) {
								if (e.originalEvent.touches.length > 1) {
									return;
								}
								var tgt = $(e.target);
								if (menu.first().length && !tgt.is('input:checkbox') && !tgt.hasClass('elfinder-cwd-select')) {
									e.stopPropagation();
									//e.preventDefault();
									open(e.originalEvent.touches[0].pageX, e.originalEvent.touches[0].pageY);
									cwd.data('longtap', true)
									tgt.one('touchend', function() {
										setTimeout(function() {
											cwd.removeData('longtap');
										}, 80);
									});
									return;
								}
								cwd.find('.elfinder-cwd-file').off(evTouchStart);
							})
							.one('unselect.'+fm.namespace, function() {
								cwd.find('.elfinder-cwd-file').off(evTouchStart);
							});
							menu.fadeOut({
								duration: 300,
								fail: function() {
									menu.css('opacity', '1').show();
								},
								done: function() {
									fm.toHide(menu);
								}
							});
						}
					}, 4500));
				}
			},
			
			keyEvts = function(e) {
				var code = e.keyCode,
					ESC = $.ui.keyCode.ESCAPE,
					ENT = $.ui.keyCode.ENTER,
					LEFT = $.ui.keyCode.LEFT,
					RIGHT = $.ui.keyCode.RIGHT,
					UP = $.ui.keyCode.UP,
					DOWN = $.ui.keyCode.DOWN,
					subent = fm.direction === 'ltr'? RIGHT : LEFT,
					sublev = subent === RIGHT? LEFT : RIGHT;
				
				if ($.inArray(code, [ESC, ENT, LEFT, RIGHT, UP, DOWN]) !== -1) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (code == ESC || code === sublev) {
						if (selected && subnodes && subselected) {
							subselected.trigger('mouseleave').trigger('submenuclose');
							selected.addClass(cHover);
							subnodes = null;
							subselected = null;
						} else {
							code == ESC && close();
						}
					} else if (code == UP || code == DOWN) {
						if (subnodes) {
							if (subselected) {
								subselected.trigger('mouseleave');
							}
							if (code == DOWN && (! subselected || subnodes.length <= ++subnodes._cur)) {
								subnodes._cur = 0;
							} else if (code == UP && (! subselected || --subnodes._cur < 0)) {
								subnodes._cur = subnodes.length - 1;
							}
							subselected = subnodes.eq(subnodes._cur).trigger('mouseenter');
						} else {
							subnodes = null;
							if (selected) {
								selected.trigger('mouseleave');
							}
							if (code == DOWN && (! selected || nodes.length <= ++nodes._cur)) {
								nodes._cur = 0;
							} else if (code == UP && (! selected || --nodes._cur < 0)) {
								nodes._cur = nodes.length - 1;
							}
							selected = nodes.eq(nodes._cur).addClass(cHover);
						}
					} else if (selected && (code == ENT || code === subent)) {
						if (selected.hasClass('elfinder-contextmenu-group')) {
							if (subselected) {
								code == ENT && subselected.click();
							} else {
								selected.trigger('mouseenter');
								subnodes = selected.find('div.'+smItem);
								subnodes._cur = 0;
								subselected = subnodes.first().addClass(cHover);
							}
						} else {
							code == ENT && selected.click();
						}
					}
				}
			},
			
			open = function(x, y, css) {
				var width      = menu.outerWidth(),
					height     = menu.outerHeight(),
					bstyle     = base.attr('style'),
					bpos       = base.offset(),
					bwidth     = base.width(),
					bheight    = base.height(),
					mw         = fm.UA.Mobile? 40 : 2,
					mh         = fm.UA.Mobile? 20 : 2,
					x          = x - (bpos? bpos.left : 0),
					y          = y - (bpos? bpos.top : 0),
					css        = Object.assign(css || {}, {
						top  : Math.max(0, y + mh + height < bheight ? y + mh : y - (y + height - bheight)),
						left : Math.max(0, (x < width + mw || x + mw + width < bwidth)? x + mw : x - mw - width),
						opacity : '1'
					}),
					evts;

				autoSyncStop = true;
				fm.autoSync('stop');
				base.width(bwidth);
				menu.stop().removeAttr('style').css(css);
				fm.toFront(menu);
				menu.show();
				base.attr('style', bstyle);
				
				css[subpos] = parseInt(menu.width());
				menu.find('.elfinder-contextmenu-sub').css(css);
				if (fm.UA.iOS) {
					$('div.elfinder div.overflow-scrolling-touch').css('-webkit-overflow-scrolling', 'auto');
				}
				
				selected = null;
				subnodes = null;
				subselected = null;
				$(document).on('keydown.' + fm.namespace, keyEvts);
				evts = $._data(document).events;
				if (evts && evts.keydown) {
					evts.keydown.unshift(evts.keydown.pop());
				}
				
				fm.UA.Mobile && autoToggle();
				
				requestAnimationFrame(function() {
					fm.getUI().one('click.' + fm.namespace, close);
				});
			},
			
			close = function() {
				fm.getUI().off('click.' + fm.namespace, close);
				$(document).off('keydown.' + fm.namespace, keyEvts);

				currentType = currentTargets = null;
				
				if (menu.is(':visible') || menu.children().length) {
					fm.toHide(menu.removeAttr('style').empty().removeData('submenuKeep'));
					try {
						if (! menu.draggable('instance')) {
							menu.draggable(dragOpt);
						}
					} catch(e) {
						if (! menu.hasClass('ui-draggable')) {
							menu.draggable(dragOpt);
						}
					}
					if (menu.data('prevNode')) {
						menu.data('prevNode').after(menu);
						menu.removeData('prevNode');
					}
					fm.trigger('closecontextmenu');
					if (fm.UA.iOS) {
						$('div.elfinder div.overflow-scrolling-touch').css('-webkit-overflow-scrolling', 'touch');
					}
				}
				
				autoSyncStop && fm.searchStatus.state < 1 && ! fm.searchStatus.ininc && fm.autoSync();
				autoSyncStop = false;
			},
			
			create = function(type, targets) {
				var sep    = false,
					insSep = false,
					disabled = [],
					isCwd = type === 'cwd',
					selcnt = 0,
					cmdMap;

				currentType = type;
				currentTargets = targets;
				
				// get current uiCmdMap option
				if (!(cmdMap = fm.option('uiCmdMap', isCwd? void(0) : targets[0]))) {
					cmdMap = {};
				}
				
				if (!isCwd) {
					disabled = fm.getDisabledCmds(targets);
				}
				
				selcnt = fm.selected().length;
				if (selcnt > 1) {
					menu.append('<div class="ui-corner-top ui-widget-header elfinder-contextmenu-header"><span>'
					 + fm.i18n('selectedItems', ''+selcnt)
					 + '</span></div>');
				}
				
				nodes = $();
				$.each(types[type]||[], function(i, name) {
					var cmd, cmdName, useMap, node, submenu, hover;
					
					if (name === '|') {
						if (sep) {
							insSep = true;
						}
						return;
					}
					
					if (cmdMap[name]) {
						cmdName = cmdMap[name];
						useMap = true;
					} else {
						cmdName = name;
					}
					cmd = fm.getCommand(cmdName);

					if (cmd && !isCwd && (!fm.searchStatus.state || !cmd.disableOnSearch)) {
						cmd.__disabled = cmd._disabled;
						cmd._disabled = !(cmd.alwaysEnabled || (fm._commands[cmdName] ? $.inArray(name, disabled) === -1 && (!useMap || !disabled[cmdName]) : false));
						$.each(cmd.linkedCmds, function(i, n) {
							var c;
							if (c = fm.getCommand(n)) {
								c.__disabled = c._disabled;
								c._disabled = !(c.alwaysEnabled || (fm._commands[n] ? !disabled[n] : false));
							}
						});
					}

					if (cmd && !cmd._disabled && cmd.getstate(targets) != -1) {
						if (cmd.variants) {
							if (!cmd.variants.length) {
								return;
							}
							node = item(cmd.title, cmd.className? cmd.className : cmd.name, function(){}, cmd.contextmenuOpts);
							
							submenu = $('<div class="ui-front ui-corner-all elfinder-contextmenu-sub"></div>')
								.hide()
								.css('max-height', fm.getUI().height() - 30)
								.appendTo(node.append('<span class="elfinder-contextmenu-arrow"></span>'));
							
							hover = function(show){
								if (! show) {
									submenu.hide();
								} else {
									var bstyle = base.attr('style');
									base.width(base.width());
									// top: '-1000px' to prevent visible scrollbar of window with the elFinder option `height: '100%'`
									submenu.css({ top: '-1000px', left: 'auto', right: 'auto' });
									var nodeOffset = node.offset(),
										nodeleft   = nodeOffset.left,
										nodetop    = nodeOffset.top,
										nodewidth  = node.outerWidth(),
										width      = submenu.outerWidth(true),
										height     = submenu.outerHeight(true),
										baseOffset = base.offset(),
										wwidth     = baseOffset.left + base.width(),
										wheight    = baseOffset.top + base.height(),
										cltr       = ltr, 
										x          = nodewidth,
										y, over;
	
									if (ltr) {
										over = (nodeleft + nodewidth + width) - wwidth;
										if (over > 10) {
											if (nodeleft > width - 5) {
												x = x - 5;
												cltr = false;
											} else {
												if (!fm.UA.Mobile) {
													x = nodewidth - over;
												}
											}
										}
									} else {
										over = width - nodeleft;
										if (over > 0) {
											if ((nodeleft + nodewidth + width - 15) < wwidth) {
												x = x - 5;
												cltr = true;
											} else {
												if (!fm.UA.Mobile) {
													x = nodewidth - over;
												}
											}
										}
									}
									over = (nodetop + 5 + height) - wheight;
									y = (over > 0 && nodetop < wheight)? 5 - over : (over > 0? 30 - height : 5);
	
									menu.find('.elfinder-contextmenu-sub:visible').hide();
									submenu.css({
										top : y,
										left : cltr? x : 'auto',
										right: cltr? 'auto' : x,
										overflowY: 'auto'
									}).show();
									base.attr('style', bstyle);
								}
							};
							
							node.addClass('elfinder-contextmenu-group')
								.on('mouseleave', '.elfinder-contextmenu-sub', function(e) {
									if (! menu.data('draged')) {
										menu.removeData('submenuKeep');
									}
								})
								.on('submenuclose', '.elfinder-contextmenu-sub', function(e) {
									hover(false);
								})
								.on('click', '.'+smItem, function(e){
									var opts, $this;
									e.stopPropagation();
									if (! menu.data('draged')) {
										$this = $(this);
										if (!cmd.keepContextmenu) {
											menu.hide();
										} else {
											$this.removeClass(cHover);
											node.addClass(cHover);
										}
										opts = $this.data('exec');
										if (typeof opts === 'undefined') {
											opts = {};
										}
										if (typeof opts === 'object') {
											opts._userAction = true;
											opts._currentType = type;
											opts._currentNode = $this;
										}
										!cmd.keepContextmenu && close();
										fm.exec(cmd.name, targets, opts);
									}
								})
								.on('touchend', function(e) {
									if (! menu.data('drag')) {
										hover(true);
										menu.data('submenuKeep', true);
									}
								})
								.on('mouseenter mouseleave', function(e){
									if (! menu.data('touching')) {
										if (node.data('timer')) {
											clearTimeout(node.data('timer'));
											node.removeData('timer');
										}
										if (!$(e.target).closest('.elfinder-contextmenu-sub', menu).length) {
											if (e.type === 'mouseleave') {
												if (! menu.data('submenuKeep')) {
													node.data('timer', setTimeout(function() {
														node.removeData('timer');
														hover(false);
													}, 250));
												}
											} else {
												node.data('timer', setTimeout(function() {
													node.removeData('timer');
													hover(true);
												}, nodes.find('div.elfinder-contextmenu-sub:visible').length? 250 : 0));
											}
										}
									}
								});
							
							$.each(cmd.variants, function(i, variant) {
								var item = variant === '|' ? '<div class="elfinder-contextmenu-separator"></div>' :
									$('<div class="'+cmItem+' '+smItem+'"><span>'+variant[1]+'</span></div>').data('exec', variant[0]),
									iconClass, icon;
								if (typeof variant[2] !== 'undefined') {
									icon = $('<span></span>').addClass('elfinder-button-icon elfinder-contextmenu-icon');
									if (! /\//.test(variant[2])) {
										icon.addClass('elfinder-button-icon-'+variant[2]);
									} else {
										icon.css(urlIcon(variant[2]));
									}
									item.prepend(icon).addClass(smItem+'-icon');
								}
								submenu.append(item);
							});
								
						} else {
							node = item(cmd.title, cmd.className? cmd.className : cmd.name, function() {
								if (! menu.data('draged')) {
									!cmd.keepContextmenu && close();
									fm.exec(cmd.name, targets, {_userAction: true, _currentType: type, _currentNode: node});
								}
							}, cmd.contextmenuOpts);
							if (cmd.extra && cmd.extra.node) {
								$('<span class="elfinder-button-icon elfinder-button-icon-'+(cmd.extra.icon || '')+' '+exIcon+'"></span>')
									.append(cmd.extra.node).appendTo(node);
								$(cmd.extra.node).trigger('ready', {targets: targets});
							} else {
								node.remove('.'+exIcon);
							}
						}
						
						if (cmd.extendsCmd) {
							node.children('span.elfinder-button-icon').addClass('elfinder-button-icon-' + cmd.extendsCmd);
						}
						
						if (insSep) {
							menu.append('<div class="elfinder-contextmenu-separator"></div>');
						}
						menu.append(node);
						sep = true;
						insSep = false;
					}
					
					if (cmd && typeof cmd.__disabled !== 'undefined') {
						cmd._disabled = cmd.__disabled;
						delete cmd.__disabled;
						$.each(cmd.linkedCmds, function(i, n) {
							var c;
							if (c = fm.getCommand(n)) {
								c._disabled = c.__disabled;
								delete c.__disabled;
							}
						});
					}
				});
				nodes = menu.children('div.'+cmItem);
			},
			
			createFromRaw = function(raw) {
				currentType = 'raw';
				$.each(raw, function(i, data) {
					var node;
					
					if (data === '|') {
						menu.append('<div class="elfinder-contextmenu-separator"></div>');
					} else if (data.label && typeof data.callback == 'function') {
						node = item(data.label, data.icon, function() {
							if (! menu.data('draged')) {
								!data.remain && close();
								data.callback();
							}
						}, data.options || null);
						menu.append(node);
					}
				});
				nodes = menu.children('div.'+cmItem);
			},
			
			currentType = null,
			currentTargets = null;
		
		fm.one('load', function() {
			base = fm.getUI();
			cwd = fm.getUI('cwd');
			fm.bind('contextmenu', function(e) {
				var data = e.data,
					css = {},
					prevNode;

				if (data.type && data.type !== 'files') {
					cwd.trigger('unselectall');
				}
				close();

				if (data.type && data.targets) {
					fm.trigger('contextmenucreate', data);
					create(data.type, data.targets);
					fm.trigger('contextmenucreatedone', data);
				} else if (data.raw) {
					createFromRaw(data.raw);
				}

				if (menu.children().length) {
					prevNode = data.prevNode || null;
					if (prevNode) {
						menu.data('prevNode', menu.prev());
						prevNode.after(menu);
					}
					if (data.fitHeight) {
						css = {maxHeight: Math.min(fm.getUI().height(), $(window).height()), overflowY: 'auto'};
						menu.draggable('destroy').removeClass('ui-draggable');
					}
					open(data.x, data.y, css);
					// call opened callback function
					if (data.opened && typeof data.opened === 'function') {
						data.opened.call(menu);
					}
				}
			})
			.one('destroy', function() { menu.remove(); })
			.bind('disable', close)
			.bind('select', function(e){
				(currentType === 'files' && (!e.data || e.data.selected.toString() !== currentTargets.toString())) && close();
			});
		})
		.shortcut({
			pattern     : fm.OS === 'mac' ? 'ctrl+m' : 'contextmenu shift+f10',
			description : 'contextmenu',
			callback    : function(e) {
				e.stopPropagation();
				e.preventDefault();
				$(document).one('contextmenu.' + fm.namespace, function(e) {
					e.preventDefault();
					e.stopPropagation();
				});
				var sel = fm.selected(),
					type, targets, pos, elm;
				
				if (sel.length) {
					type = 'files';
					targets = sel;
					elm = fm.cwdHash2Elm(sel[0]);
				} else {
					type = 'cwd';
					targets = [ fm.cwd().hash ];
					pos = fm.getUI('workzone').offset();
				}
				if (! elm || ! elm.length) {
					elm = fm.getUI('workzone');
				}
				pos = elm.offset();
				pos.top += (elm.height() / 2);
				pos.left += (elm.width() / 2);
				fm.trigger('contextmenu', {
					'type'    : type,
					'targets' : targets,
					'x'       : pos.left,
					'y'       : pos.top
				});
			}
		});
		
	});
	
};
