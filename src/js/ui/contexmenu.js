
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
						fm.log(data).log(menu.data('targets'))
						data && data.cmd && fm.exec(data.cmd, menu.data('targets'), data.arg, true);
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
				var commands = options[type], 
					sep = false;

				$.each(commands, function(i, name) {
					var cmd = fm.command(name),
						item, sub, variants;

					if (!(cmd && cmd.name)) {
						if (name == '|' && sep) {
							menu.append('<div class="elfinder-contextmenu-separator"/>');
							sep = false;
						}
						return;
					}
					
					if (cmd.getstate(targets) == -1) {
						return;
					}
					
					item = $('<div class="elfinder-contextmenu-item"><span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+' elfinder-contextmenu-icon"/>'+cmd.title+'</div>')
						.data({cmd : cmd.name});

					
					if ((variants = cmd.variants()) && variants.length) {
						sub = $('<div class="elfinder-contextmenu-sub"/>').appendTo(item.addClass('elfinder-contextmenu-group'))
						
					} 
					
					menu.append(item);
					sep = true;
				});
			},
			/**
			 * Close menu and empty it
			 *
			 * @return void
			 **/
			close = function() {
				menu.hide().html('');
			},
			/**
			 * Open menu in required position
			 *
			 * @param Number  left offset
			 * @param Number  top offset
			 * @return void
			 **/
			open = function(x, y) {
				var win        = $(window),
					width      = menu.outerWidth(),
					height     = menu.outerHeight(),
					wwidth     = win.width(),
					wheight    = win.height(),
					scrolltop  = win.scrollTop(),
					scrollleft = win.scrollLeft(),
					css        = {
						top  : (y + height  < wheight ? y : y - height) + scrolltop,
						left : (x + width < wwidth ? x : x - width) + scrollleft
					};

				if (!menu.children().length) {
					return;
				}
				
				menu.css(css).show();
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
				var target = $(e.target),
					targets = [];

				if (target.is('.elfinder-navbar-dir,.elfinder-navbar-dir-wrapper')) {
					e.preventDefault();
					if (target.is('.elfinder-navbar-dir-wrapper')) {
						target = target.children();
					}
					targets.push(fm.navId2Hash(target.attr('id')))
					menu.data('targets', targets);
					append('navbar', targets);
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