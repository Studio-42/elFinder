"use strict";
/**
 * @class  elFinder contextmenu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercontextmenu = function(fm) {
	
	return this.each(function() {
		var self   = $(this),
			cmItem = 'elfinder-contextmenu-item',
			smItem = 'elfinder-contextsubmenu-item',
			exIcon = 'elfinder-contextmenu-extra-icon',
			menu = self.addClass('ui-helper-reset ui-front ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction)
				.hide()
				.on('mouseenter mouseleave', '.'+cmItem, function(e) {
					$(this).toggleClass('ui-state-hover', e.type === 'mouseenter');
				})
				.on('mouseenter mouseleave', '.'+exIcon, function(e) {
					$(this).parent().toggleClass('ui-state-hover', e.type === 'mouseleave');
				})
				.on('contextmenu', function(){return false;}),
			subpos  = fm.direction == 'ltr' ? 'left' : 'right',
			types = $.extend({}, fm.options.contextmenu),
			tpl     = '<div class="'+cmItem+'"><span class="elfinder-button-icon {icon} elfinder-contextmenu-icon"/><span>{label}</span></div>',
			item = function(label, icon, callback) {
				return $(tpl.replace('{icon}', icon ? 'elfinder-button-icon-'+icon : '').replace('{label}', label))
					.click(function(e) {
						e.stopPropagation();
						e.preventDefault();
						callback();
					});
			},
			base, cwd,

			autoToggle = function() {
				var evTouchStart = 'touchstart.contextmenuAutoToggle';
				menu.data('hideTm') && clearTimeout(menu.data('hideTm'));
				if (menu.is(':visible')) {
					menu.on('touchstart', function(e) {
						if (e.originalEvent.touches.length > 1) {
							return;
						}
						menu.stop().show();
						menu.data('hideTm') && clearTimeout(menu.data('hideTm'));
					})
					.data('hideTm', setTimeout(function() {
						cwd.find('.elfinder-cwd-file').off(evTouchStart);
						cwd.find('.elfinder-cwd-file.ui-selected')
						.one(evTouchStart, function(e) {
							if (e.originalEvent.touches.length > 1) {
								return;
							}
							var tgt = $(e.target);
							if (menu.first().length && !tgt.is('input:checkbox') && !tgt.hasClass('elfinder-cwd-select')) {
								open(e.originalEvent.touches[0].pageX, e.originalEvent.touches[0].pageY);
								return false;
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
							}
						});
					}, 4500));
				}
			},
			
			open = function(x, y) {
				var width      = menu.outerWidth(),
					height     = menu.outerHeight(),
					bpos       = base.offset(),
					bwidth     = base.width(),
					bheight    = base.height(),
					mw         = fm.UA.Mobile? 40 : 2,
					mh         = fm.UA.Mobile? 20 : 2,
					body       = $('body'),
					x          = x - (bpos? bpos.left : 0),
					y          = y - (bpos? bpos.top : 0),
					css        = {
						top  : Math.max(0, y + mh + height < bheight ? y + mh : y - (y + height - bheight)),
						left : Math.max(0, (x < width + mw || x + mw + width < bwidth)? x + mw : x - mw - width),
						opacity : '1'
					};

				menu.stop().css(css).show();
				
				css[subpos] = parseInt(menu.width());
				menu.find('.elfinder-contextmenu-sub').css(css);
				if (fm.UA.iOS) {
					$('div.elfinder div.overflow-scrolling-touch').css('-webkit-overflow-scrolling', 'auto');
				}
				fm.UA.Mobile && autoToggle();
			},
			
			close = function() {
				menu.hide().empty();
				fm.trigger('closecontextmenu');
				if (fm.UA.iOS) {
					$('div.elfinder div.overflow-scrolling-touch').css('-webkit-overflow-scrolling', 'touch');
				}
			},
			
			create = function(type, targets) {
				var sep = false,
				cmdMap = {}, disabled = [], isCwd = (targets[0].indexOf(fm.cwd().volumeid, 0) === 0),
				selcnt = 0;

				if (self.data('cmdMaps')) {
					$.each(self.data('cmdMaps'), function(i, v){
						if (targets[0].indexOf(i, 0) == 0) {
							cmdMap = v;
							return false;
						}
					});
				}
				if (!isCwd) {
					if (fm.disabledCmds) {
						$.each(fm.disabledCmds, function(i, v){
							if (targets[0].indexOf(i, 0) == 0) {
								disabled = v;
								return false;
							}
						});
					}
				}
				if (type === 'navbar') {
					fm.select({selected: targets});
				}

				selcnt = fm.selected().length;
				if (selcnt > 1) {
					menu.append('<div class="ui-corner-top ui-widget-header elfinder-contextmenu-header"><span>'
					 + fm.i18n('selectedItems', ''+selcnt)
					 + '</span></div>');
				}
				$.each(types[type]||[], function(i, name) {
					var cmd, node, submenu, hover;
					
					if (name == '|' && sep) {
						menu.append('<div class="elfinder-contextmenu-separator"/>');
						sep = false;
						return;
					}
					
					if (cmdMap[name]) {
						name = cmdMap[name];
					}
					cmd = fm.command(name);

					if (cmd && !isCwd && (!fm.searchStatus.state || !cmd.disableOnSearch)) {
						cmd.__disabled = cmd._disabled;
						cmd._disabled = !(cmd.alwaysEnabled || (fm._commands[name] ? $.inArray(name, disabled) === -1 : false));
						$.each(cmd.linkedCmds, function(i, n) {
							var c;
							if (c = fm.command(n)) {
								c.__disabled = c._disabled;
								c._disabled = !(c.alwaysEnabled || (fm._commands[n] ? $.inArray(n, disabled) === -1 : false));
							}
						});
					}

					if (cmd && cmd.getstate(targets) != -1) {
						if (cmd.variants) {
							if (!cmd.variants.length) {
								return;
							}
							node = item(cmd.title, cmd.name, function(){})
							.on('touchend', function(e){
								node.data('touching', true);
								setTimeout(function(){node.data('touching', false);}, 50);
							})
							.on('click touchend', '.'+smItem, function(e){
								var opts;
								e.stopPropagation();
								if (node.data('touching')) {
									node.data('touching', false);
									$(this).removeClass('ui-state-hover');
									e.preventDefault();
								} else if (e.type == 'click') {
									menu.hide();
									opts = $(this).data('exec');
									if ($.isPlainObject(opts)) {
										opts._currentType = type;
									}
									cmd.exec(targets, opts);
								}
							});
							
							submenu = $('<div class="ui-front ui-corner-all elfinder-contextmenu-sub"/>')
								.appendTo(node.append('<span class="elfinder-contextmenu-arrow"/>'));
							
							hover = function(show){
								submenu.css({ left: 'auto', right: 'auto' });
								var nodeOffset = node.offset(),
									baseleft   = nodeOffset.left,
									basetop    = nodeOffset.top,
									basewidth  = node.outerWidth(),
									width      = submenu.outerWidth(),
									height     = submenu.outerHeight(),
									baseOffset = base.offset(),
									wwidth     = baseOffset.left + base.width(),
									wheight    = baseOffset.top + base.height(),
									x, y, over;

								over = (baseleft + basewidth + width) - wwidth;
								x = (baseleft > width && over > 0)? (fm.UA.Mobile? 10 - width : basewidth - over) : basewidth;
								if (subpos === 'right' && baseleft < width) {
									x = fm.UA.Mobile? 30 - basewidth : basewidth - (width - baseleft);
								}
								over = (basetop + 5 + height) - wheight;
								y = (over > 0 && basetop < wheight)? 10 - over : (over > 0? 30 - height : 5);

								submenu.css({ top : y }).css(subpos, x).toggle(show);
							};
							
							node.addClass('elfinder-contextmenu-group').hover(function(e){
								if (fm.UA.Mobile) {
									hover(e.type === 'mouseenter');
								} else {
									if (e.type === 'mouseleave') {
										node.data('timer', setTimeout(function() {
											node.data('timer', null);
											hover(false);
										}, 250));
									} else {
										if (node.data('timer')) {
											clearTimeout(node.data('timer'));
											node.data('timer', null);
										}
										hover(true);
									}
								}
							});
							
							$.each(cmd.variants, function(i, variant) {
								submenu.append(
									variant === '|' ? '<div class="elfinder-contextmenu-separator"/>' :
									$('<div class="'+cmItem+' '+smItem+'"><span>'+variant[1]+'</span></div>').data('exec', variant[0])
								);
							});
								
						} else {
							node = item(cmd.title, cmd.name, function() {
								close();
								cmd.exec(targets, {_currentType: type});
							});
							if (cmd.extra && cmd.extra.node) {
								$('<span class="elfinder-button-icon elfinder-button-icon-'+(cmd.extra.icon || '')+' elfinder-contextmenu-extra-icon"/>')
									.append(cmd.extra.node).appendTo(node);
								$(cmd.extra.node).trigger('ready');
							} else {
								node.remove('.elfinder-contextmenu-extra-icon');
							}
						}
						
						menu.append(node)
						sep = true;
					}
					
					if (cmd && typeof cmd.__disabled !== 'undefined') {
						cmd._disabled = cmd.__disabled;
						delete cmd.__disabled;
						$.each(cmd.linkedCmds, function(i, n) {
							var c;
							if (c = fm.command(n)) {
								c._disabled = c.__disabled;
								delete c.__disabled;
							}
						});
					}
				});
			},
			
			createFromRaw = function(raw) {
				$.each(raw, function(i, data) {
					var node;
					
					if (data === '|') {
						menu.append('<div class="elfinder-contextmenu-separator"/>');
					} else if (data.label && typeof data.callback == 'function') {
						node = item(data.label, data.icon, function() {
							!data.remain && close();
							data.callback();
						});
						menu.append(node);
					}
				});
			};
		
		fm.one('load', function() {
			base = fm.getUI();
			cwd = fm.getUI('cwd');
			fm.bind('contextmenu', function(e) {
				var data = e.data;

				if (!data.type || data.type !== 'files') {
					cwd.trigger('unselectall');
				}
				close();

				if (data.type && data.targets) {
					create(data.type, data.targets);
				} else if (data.raw) {
					createFromRaw(data.raw);
				}

				menu.children().length && open(data.x, data.y);
			})
			.one('destroy', function() { menu.remove(); })
			.bind('disable select', function(){
				// 'mouseEvInternal' for Firefox's bug (maybe)
				!self.data('mouseEvInternal') && close();
				self.data('mouseEvInternal', false);
			})
			.getUI().click(close);
		});
		
	});
	
};
