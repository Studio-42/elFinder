"use strict";
/**
 * @class  elFinder toolbar button to switch full scrren mode.
 *
 * @author Naoki Sawada
 **/

$.fn.elfinderfullscreenbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd),
			icon   = button.children('.elfinder-button-icon');
		cmd.change(function() {
			var fullscreen = cmd.value;
			icon.toggleClass('elfinder-button-icon-unfullscreen', fullscreen);
			cmd.className = fullscreen? 'unfullscreen' : '';
		});
	});
};
