/**
 * @class  elFinder toolbar button to switch current directory view.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderviewbutton = function(cmd) {
	"use strict";
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd),
			icon   = button.children('.elfinder-button-icon'),
			text   = button.children('.elfinder-button-text'),
			tm;

		cmd.change(function() {
			tm && cancelAnimationFrame(tm);
			tm = requestAnimationFrame(function() {
				var icons = cmd.value == 'icons';

				icon.toggleClass('elfinder-button-icon-view-list', icons);
				cmd.className = icons? 'view-list' : '';
				cmd.title = cmd.fm.i18n(icons ? 'viewlist' : 'viewicons');
				button.attr('title', cmd.title);
				text.html(cmd.title);
			});
		});
	});
};
