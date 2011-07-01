"use strict";
/**
 * @class elFinder places/favorites ui
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderplaces = function(fm) {
	return this.each(function() {
		var dirs = [],
			c = 'class',
			navdir = fm.res('class', 'navdir'),
			tpl = fm.res('tpl', 'navdir'),
			ptpl = fm.res('tpl', 'perms'),
			create = function(dir) {
				var html = tpl.replace(/\{id\}/, 'place-'+dir.hash)
						.replace(/\{name\}/, fm.escape(dir.name))
						.replace(/\{cssclass\}/, fm.perms2class(dir))
						.replace(/\{permissions\}/, !dir.read || !dir.write ? ptpl : '')
						.replace(/\{symlink\}/, '');
				return $(html);
			},

			wrapper = create({
					hash  : 'root-'+fm.namespace, 
					name  : fm.i18n(fm.res('msg', 'places')),
					read  : true,
					write : true
				}),
			root = wrapper.children('.'+navdir)
				.addClass(fm.res(c, 'treeroot'))
				.click(function() {
					places.toggleClass('elfinder-navbar-expanded');
					subtree.slideToggle();
				}),
			subtree = wrapper.children('.'+fm.res(c, 'navsubtree')),
			places = $(this).addClass('elfinder-places ui-corner-all')
				.hide()
				.append(wrapper)
				
				.appendTo(fm.getUI('navbar'))
				.delegate('.'+navdir, 'hover', function() {
					$(this).toggleClass('ui-state-hover');
				})
				.delegate('.'+navdir, 'click', function(e) {
					fm.exec('open', $(this).attr('id').substr(6))
				})
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-navbar-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
					drop : function(e, ui) {
						var  resolve = true;
						
						$.each(ui.helper.data('files'), function(i, hash) {
							var file = fm.file(hash), node;
							
							if (file && file.mime == 'directory' && $.inArray(file.hash, dirs) === -1) {

								fm.log(file.name)
								dirs.push(file.hash)
								node = create(file);
								subtree.append(node)
								root.addClass('elfinder-navbar-collapsed')
							} else {
								resolve = false;
							}
						})
						fm.log(dirs)
						
						fm.storage('places', dirs.join(','))
						
						resolve && ui.helper.hide();
					}
				})
		
			;
	
		// places.addClass('elfinder-navbar-collapsed')
		
		fm.log(subtree)
		
		fm.one('load', function() {
			var _places = fm.storage('places').split(',');
			
			if (fm.oldAPI) {
				return;
			}
			places.show();
			fm.getUI('navbar').show();
			
			
			
			fm.log(fm.storage('places'))
			// dirs = fm.storage('places');
			// if (dirs) {
			// 	dirs = dirs.spllit(';');
			// 	fm.log(dirs)
			// }
				

		})
		
	});
}