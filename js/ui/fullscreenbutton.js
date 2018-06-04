/**
 * @class  elFinder toolbar button to switch full scrren mode.
 *
 * @author Naoki Sawada
 **/

$.fn.elfinderfullscreenbutton = function(cmd) {
	"use strict";
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd),
			icon   = button.children('.elfinder-button-icon'),
			tm;
		cmd.change(function() {
			tm && cancelAnimationFrame(tm);
			tm = requestAnimationFrame(function() {
				var fullscreen = cmd.value;
				icon.addClass('elfinder-button-icon-fullscreen').toggleClass('elfinder-button-icon-unfullscreen', fullscreen);
				cmd.className = fullscreen? 'unfullscreen' : '';
			});
		});
	});
};
