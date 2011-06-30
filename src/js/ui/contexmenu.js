"use strict";
/**
 * @class  elFinder contextmenu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercontextmenu = function(fm) {
	
	return this.each(function() {
		var event        = $.browser.opera ? 'click' : 'contextmenu',
			c            = 'class',
			clItem       = 'elfinder-contextmenu-item',
			clGroup      = 'elfinder-contextmenu-group',
			clSub        = 'elfinder-contextmenu-sub',
			clHover      = fm.res(c, 'hover'),
			clDisabled   = fm.res(c, 'disabled'),
			clCwdFile    = fm.res(c, 'cwdfile'), 
			clNavdir     = fm.res(c, 'navdir'), 
			clNavDirWrap = fm.res(c, 'navdirwrap'), 
			subpos       = fm.direction == 'ltr' ? 'left' : 'right',
			menu = $(this).addClass('ui-helper-reset ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction)
				.hide()
				.appendTo('body')
				.delegate('.'+clItem, 'hover', function() {
					var item = $(this).toggleClass(clHover);
					item.is('.'+clGroup) && item.children('.'+clSub).toggle()
					
				})
				.delegate('.'+clItem, 'click', function(e) {
					var item = $(this),
						data = item.data();

					e.preventDefault();
					e.stopPropagation();

					if (!item.is('.'+clGroup)) {
						data && data.cmd && fm.exec(data.cmd, menu.data('targets'), data.variant, true);
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

				menu.text('').data('targets', targets);

				$.each(commands, function(i, name) {
					var cmd = fm.command(name),
						item, sub;

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
					
					item = $('<div class="'+clItem+'"><span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+' elfinder-contextmenu-icon"/><span>'+cmd.title+'</span></div>')
						.data({cmd : cmd.name});

					
					if (cmd.variants) {

						sub = $('<div class="ui-corner-all '+clSub+'"/>')
							.appendTo(item.addClass(clGroup).append('<span class="ui-icon ui-icon-triangle-1-e"/>'));
							
						$.each(cmd.variants, function(i, variant) {
							sub.append($('<div class="'+clItem+'"><span>'+variant[1]+'</span></div>')
								.data({cmd : cmd.name, variant : variant[0]}));
						});
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
				menu.hide().text('').removeData('targets');
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
						top  : (y + height  < wheight  ? y : y - height > 0 ? y - height : y) + scrolltop,
						left : (x + width < wwidth ? x : x - width) + scrollleft,
						'z-index' : 100 + fm.getUI('workzone').zIndex()
					};

				if (!menu.children().length) {
					return;
				}
				
				menu.css(css).show();
				
				css = {'z-index' : css['z-index']+10};
				css[subpos] = parseInt(menu.width());
				menu.find('.'+clSub).css(css);
			},
			cwd, nav;

		fm.one('load', function() {
			
			cwd = fm.getUI('cwd').bind(event, function(e) {
				var target  = $(e.target),
					file    = target.closest('.'+clCwdFile),
					targets = [],
					type    = 'files';

				e.preventDefault();
				
				if (file.length) {
					// do not show menu on disabled files
					if (file.is('.'+clDisabled)) {
						return;
					}
					cwd.trigger('selectfile', file.attr('id'));
					targets = fm.selected();
				} else {
					cwd.trigger('unselectall');
					targets.push(fm.cwd().hash);
					type = 'cwd';
				}

				append(type, targets);
				open(e.clientX, e.clientY);
			})
			
			fm.getUI('nav').bind(event, function(e) {
				var target  = $(e.target),
					targets = [];

				if (target.is('.'+clNavdir+',.'+clNavDirWrap)) {
					e.preventDefault();
					target.is('.'+clNavDirWrap) && (target = target.children());
					targets.push(fm.navId2Hash(target.attr('id')))
					append('navbar', targets);
					open(e.clientX, e.clientY);
				}

			})
			
			fm.select(close).getUI().click(close);

		}).one('destroy', function() {
			menu.remove();
		});
		
	});
}