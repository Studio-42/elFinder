$.fn.elfinderpanel = function(fm) {
	"use strict";
	return this.each(function() {
		var panel = $(this).addClass('elfinder-panel ui-state-default ui-corner-all'),
			margin = 'margin-'+(fm.direction == 'ltr' ? 'left' : 'right');
		
		fm.one('load', function(e) {
			var navbar = fm.getUI('navbar');
			
			panel.css(margin, parseInt(navbar.outerWidth(true)));
			navbar.on('resize', function(e) {
				e.preventDefault();
				e.stopPropagation();
				panel.is(':visible') && panel.css(margin, parseInt(navbar.outerWidth(true)));
			});
		});
	});
};
