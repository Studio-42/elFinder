"use strict";
/**
 * @class  elFinder toolbar button to switch mkdir mode.
 *
 * @author Naoki Sawada
 **/
$.fn.elfindermkdirbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd);

		cmd.change(function() {
			button.attr('title', cmd.value);
		});
	});
};
