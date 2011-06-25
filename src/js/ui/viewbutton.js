"use strict"
/**
 * @class  elFinder toolbar button widget.
 * If command has variants - create menu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderviewbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd),
			icon = button.children('.elfinder-button-icon');

		cmd.change(function() {
			var icons = cmd.fm.view == 'icons';
			
			icon.toggleClass('elfinder-button-icon-view-list', icons);
			button.attr('title', cmd.fm.i18n(icons ? 'View as list' : 'View as icons'));
		});
	});
}