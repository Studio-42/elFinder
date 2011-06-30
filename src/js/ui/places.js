"use strict";
/**
 *
 *
 *
 **/
$.fn.elfinderplaces = function(fm) {
	return this.each(function() {
		var c = 'class',
			navdir    = fm.res(c, 'navdir'),

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
				.appendTo(fm.getUI('navbar').show())
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-navbar-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
				})
		
			;
	
		places.addClass('elfinder-navbar-collapsed')
		
	});
}