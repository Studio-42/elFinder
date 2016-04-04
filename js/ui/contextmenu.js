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
				.appendTo('body')
				.on('mouseenter mouseleave', '.'+cmItem, function(e) {
					$(this).toggleClass('ui-state-hover', e.type === 'mouseenter');
				})
				.on('mouseenter mouseleave', '.'+exIcon, function(e) {
					$(this).parent().toggleClass('ui-state-hover', e.type === 'mouseleave');
				})
				.on('contextmenu', function(){return false;}),
			subpos  = fm.direction == 'ltr' ? 'left' : 'right',
			types = $.extend({}, fm.options.contextmenu),
			clItem = cmItem + (fm.UA.Touch ? ' elfinder-touch' : ''),
			tpl     = '<div class="'+clItem+'"><span class="elfinder-button-icon {icon} elfinder-contextmenu-icon"/><span>{label}</span></div>',
			item = function(label, icon, callback) {
				return $(tpl.replace('{icon}', icon ? 'elfinder-button-icon-'+icon : '').replace('{label}', label))
					.click(function(e) {
						e.stopPropagation();
						e.preventDefault();
						callback();
					})
			},
			
			open = function(x, y) {
				var win        = $(window),
					width      = menu.outerWidth(),
					height     = menu.outerHeight(),
					wwidth     = win.width(),
					wheight    = win.height(),
					scrolltop  = win.scrollTop(),
					scrollleft = win.scrollLeft(),
					mw         = fm.UA.Touch? 30 : 0,
					mh         = fm.UA.Touch? 20 : 0,
					css        = {
						top  : Math.max(0, y - scrolltop + mh + height < wheight ? y + mh : (y - mh - height > 0 ? y - mh - height : y + mh)),
						left : Math.max(0, x - scrollleft + mw + width < wwidth  ? x + mw :  x - mw - width)
					};

				menu.css(css)
					.show();
				
				//alert(navigator.platform);
				css[subpos] = parseInt(menu.width());
				menu.find('.elfinder-contextmenu-sub').css(css);
				if (fm.UA.iOS) {
					$('div.elfinder div.overflow-scrolling-touch').css('-webkit-overflow-scrolling', 'auto');
				}
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
						//targets._type = type;
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
								e.stopPropagation();
								if (node.data('touching')) {
									node.data('touching', false);
									$(this).removeClass('ui-state-hover');
									e.preventDefault();
								} else if (e.type == 'click') {
									menu.hide();
									cmd.exec(targets, $(this).data('exec'));
								}
							});
							
							submenu = $('<div class="ui-front ui-corner-all elfinder-contextmenu-sub"/>')
								.appendTo(node.append('<span class="elfinder-contextmenu-arrow"/>'));
							
							hover = function(){
									var win    = $(window),
									baseleft   = $(node).offset().left,
									basetop    = $(node).offset().top,
									basewidth  = $(node).outerWidth(),
									width      = submenu.outerWidth(),
									height     = submenu.outerHeight(),
									wwidth     = win.scrollLeft() + win.width(),
									wheight    = win.scrollTop() + win.height(),
									margin     = 5, x, y, over;

									over = (baseleft + basewidth + width + margin) - wwidth;
									x = (over > 0)? basewidth - over : basewidth;
									over = (basetop + 5 + height + margin) - wheight;
									y = (over > 0)? 5 - over : 5;

									var css = {
										left : x,
										top : y
									};
									submenu.css(css).toggle();
							};
							
							node.addClass('elfinder-contextmenu-group').hover(function(){ hover(); });
							
							$.each(cmd.variants, function(i, variant) {
								submenu.append(
									$('<div class="'+clItem+' '+smItem+'"><span>'+variant[1]+'</span></div>').data('exec', variant[0])
								);
							});
								
						} else {
							node = item(cmd.title, cmd.name, function() {
								close();
								cmd.exec(targets);
							});
							if (cmd.extra && cmd.extra.node) {
								node.append(
									$('<span class="elfinder-button-icon elfinder-button-icon-'+(cmd.extra.icon || '')+' elfinder-contextmenu-extra-icon"/>')
									.append(cmd.extra.node)
								);
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
			var uiCwd = fm.getUI('cwd');
			fm.bind('contextmenu', function(e) {
				var data = e.data;

				if (!data.type || data.type !== 'files') {
					uiCwd.trigger('unselectall');
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
