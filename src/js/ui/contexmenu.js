
$.fn.elfindercontextmenu = function(fm) {
	
	return this.each(function() {
		var event = $.browser.opera ? 'click' : 'contextmenu',
			itemclass = 'elfinder-contextmenu-item',
			groupclass = 'elfinder-contextmenu-group',
			separatorclass = 'elfinder-contextmenu-separator',
			menu = $(this).addClass('ui-helper-reset ui-widget ui-state-default ui-corner-all elfinder-contextmenu')
				.hide()
				.appendTo('body')
				.delegate('.'+itemclass, 'hover', function() {
					var item = $(this).toggleClass('ui-state-hover');
					
					
				})
				.delegate('.'+itemclass, 'mousedown', function(e) {
					var item = $(this),
						data = item.data();

					e.preventDefault();
					e.stopPropagation();
					
					if (item.is('.'+groupclass)) {
						
					} else {
						data && data.cmd && fm.exec(data.cmd, data.targets, data.arg);
						close();
					}

				}),
			options = $.extend({navbar : [], cwd : []}, fm.options.contextmenu),
			/**
			 * Append items to menu
			 *
			 * @param String  menu type (navbar/cwd)
			 * @param Array   files ids list
			 * @return void
			 **/
			append = function(type, targets) {
				var commands = options[type], sep = false, node;

				$.each(commands, function(i, name) {
					var cmd = fm.command(name),
						item, sub, variants;

					if (!(cmd && cmd.name)) {
						if (name == '|' && sep) {
							menu.append('<div class="elfinder-contextmenu-separator"/>');
							sep = false;
						}
						// name == '|' && menu.append('<div class="elfinder-contextmenu-separator"/>');
						return;
					}
					
					if (cmd.getstate(targets) == -1) {
						return;
					}
					
					item = $('<div class="elfinder-contextmenu-item"><span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+' elfinder-contextmenu-icon"/>'+cmd.title+'</div>')
						.data({cmd : cmd.name, targets : targets});

					
					if ((variants = cmd.variants()) && variants.length) {
						sub = $('<div class="elfinder-contextmenu-sub"/>').appendTo(item.addClass('elfinder-contextmenu-group'))
						
					} 
					
					menu.append(item)
					sep = true;
				});
				
				// while((node = menu.children(':first')).length && node.is('.'+separatorclass)) {
				// 	node.remove();
				// }
				// 
				// node = menu.children(':first');
				// node.is('.'+separatorclass) && node.remove();
				// if (menu.children)
				// node = menu.children(':last');
				// node.is('.'+separatorclass) && node.remove();
			},
			/**
			 * Close menu and empty it
			 *
			 * @return void
			 **/
			close = function() {
				menu.hide().html('')
			},
			/**
			 * Open menu in required position
			 *
			 * @param Number  left offset
			 * @param Number  top offset
			 * @return void
			 **/
			open = function(x, y) {
				var win = $(window);

				if (!menu.children().length) {
					return;
				}
				
				menu.css({
					top  : y + win.scrollTop(),
					left : x + win.scrollLeft()
				})
				.slideDown(100);
			},
			item = function(name, title, arg) {
				menu.append($('<a href="#" class="elfinder-contextmenu-item"><span class="elfinder-button-icon elfinder-button-icon-'+name+' elfinder-contextmenu-icon"/>'+title+'</a>').data({cmd : name, arg : arg}))
			},
			cwd, nav;

		fm.one('load', function() {
			
			fm.getUI('cwd').bind(event, function(e) {
				var target = $(e.target);

				e.preventDefault();
				menu.append('menu').show();
				fm.log(target)				
				
			})
			
			fm.getUI('nav').bind(event, function(e) {
				var target = $(e.target);

				if (target.is('.elfinder-navbar-dir,.elfinder-navbar-dir-wrapper')) {
					e.preventDefault();
					if (target.is('.elfinder-navbar-dir-wrapper')) {
						target = target.children();
					}
					append('navbar', [fm.navId2Hash(target.attr('id'))]);
					open(e.clientX, e.clientY);
				}

			})
			
			$(document).mousedown(function() {
				// fm.log('click')
				close()
			})

		}).one('destroy', function() {
			menu.remove();
		})
		
		
	})
}