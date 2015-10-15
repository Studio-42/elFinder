"use strict";
/**
 * @class  elFinder contextmenu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercontextmenu = function(fm) {
	
	return this.each(function() {
		var cmItem = 'elfinder-contextmenu-item',
			smItem = 'elfinder-contextsubmenu-item',
			menu = $(this).addClass('ui-helper-reset ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction)
				.hide()
				.appendTo('body')
				.on('mouseenter mouseleave', '.'+cmItem, function() {
					$(this).toggleClass('ui-state-hover')
				}),
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
					m          = fm.UA.Touch? 10 : 0,
					css        = {
						top  : (y + m + height < wheight ? y + m : y - m - height > 0 ? y - m - height : y + m) + scrolltop,
						left : (x + m + width  < wwidth  ? x + m : x - m - width) + scrollleft,
						'z-index' : 100 + fm.getUI('workzone').zIndex()
					};

				menu.css(css)
					.show();
				
				css = {'z-index' : css['z-index']+10};
				css[subpos] = parseInt(menu.width());
				menu.find('.elfinder-contextmenu-sub').css(css);
			},
			
			close = function() {
				menu.hide().empty();
			},
			
			create = function(type, targets) {
				var sep = false,
				cmdMap = {}, disabled = [], isCwd = (targets[0].indexOf(fm.cwd().volumeid, 0) === 0),
				self = fm.getUI('contextmenu');

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
				
				$.each(types[type]||[], function(i, name) {
					var cmd, node, submenu, hover, _disabled;
					
					if (name == '|' && sep) {
						menu.append('<div class="elfinder-contextmenu-separator"/>');
						sep = false;
						return;
					}
					
					if (cmdMap[name]) {
						name = cmdMap[name];
					}
					cmd = fm.command(name);

					if (cmd && !isCwd) {
						_disabled = cmd._disabled;
						cmd._disabled = !(cmd.alwaysEnabled || (fm._commands[name] ? $.inArray(name, disabled) === -1 : false));
					}

					if (cmd && cmd.getstate(targets) != -1) {
						targets._type = type;
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
							
							submenu = $('<div class="ui-corner-all elfinder-contextmenu-sub"/>')
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
							})
							
						}
						
						menu.append(node)
						sep = true;
					}
					
					cmd && !isCwd && (cmd._disabled = _disabled);
				});
			},
			
			createFromRaw = function(raw) {
				$.each(raw, function(i, data) {
					var node;
					
					if (data.label && typeof data.callback == 'function') {
						node = item(data.label, data.icon, function() {
							close();
							data.callback();
						});
						menu.append(node);
					}
				})
			};
		
		fm.one('load', function() {
			fm.bind('contextmenu', function(e) {
				var data = e.data;

				close();

				if (data.type && data.targets) {
					create(data.type, data.targets);
				} else if (data.raw) {
					createFromRaw(data.raw);
				}

				menu.children().length && open(data.x, data.y);
			})
			.one('destroy', function() { menu.remove(); })
			.bind('disable select', close)
			.getUI().click(close);
		});
		
	});
	
}
