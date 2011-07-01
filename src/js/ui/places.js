"use strict";
/**
 * @class elFinder places/favorites ui
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderplaces = function(fm) {
	return this.each(function() {
		var c = 'class',
			navdir = fm.res(c, 'navdir'),
			tpl = fm.res('tpl', 'navdir'),
			permsTpl = fm.res('tpl', 'perms'),
			add = function(dir) {
				var html = tpl.replace(/\{id\}/, 'place-'+dir.id)
						.replace(/\{name\}/, fm.escape(dir.name))
						.replace(/\{cssclass\}/, fm.perms2class(dir))
						.replace(/\{permissions\}/, !dir.read || !dir.write ? permsTpl : '')
						.replace(/\{symlink\}/, '');
						
				subtree.append(html).show()
			},
			arrow = $('<span class="'+fm.res(c, 'navarrow')+'"/>')
				.click(function() {
					places.toggleClass('elfinder-navbar-expanded');
					subtree.slideToggle();
				}),
			subtree = $('<div class="'+fm.res(c, 'navsubtree')+'"/>'),
			wrapper = $('<span class="ui-corner-all '+navdir+' elfinder-navbar-tree-root"/>')
				.append(arrow)
				.append('<span class="elfinder-nav-icon"/>')
				.append(fm.res('tpl', 'navicon'))
				.append(fm.i18n(fm.res('msg', 'places')))
				.bind($.browser.opera ? 'click' : 'contextmenu', function(e) {
					e.stopPropagation();
					e.preventDefault()
				}),
			places = $(this).addClass(' elfinder-navbar-places ui-corner-all')
				.append(wrapper)
				.append(subtree)
				.hide()
				.appendTo(fm.getUI('navbar'))
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-navbar-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
					drop : function(e, ui) {
						var dirs = [];
						
						fm.log(ui.helper.data('files'))
						$.each(ui.helper.data('files'), function(i, hash) {
							var file = fm.file(hash);
							
							if (file && file.mime == 'directory') {
								dirs.push(file);
								fm.log(file.name)
								add(file)
							}
						})
					}
				})
		
			;
	
		// places.addClass('elfinder-navbar-collapsed')
		
		fm.one('load', function() {
			var dirs;
			
			if (fm.oldAPI) {
				return;
			}
			places.show();
			fm.getUI('navbar').show();
				
			dirs = fm.storage('places');
			if (dirs) {
				dirs = dirs.spllit(';');
				fm.log(dirs)
			}
				

		})
		
	});
}