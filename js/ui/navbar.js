/**
 * @class elfindernav - elFinder container for diretories tree and places
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernavbar = function(fm) {
	
	this.not('.elfinder-navbar').each(function() {
		var nav    = $(this).addClass('ui-state-default elfinder-navbar'),
			parent = nav.parent()
				.resize(function() {
					nav.height(wz.height() - delta);
				}),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			ltr    = fm.direction == 'ltr',
			handle;

		
		if ($.fn.resizable) {
			handle = nav.resizable({handles : ltr ? 'e' : 'w'})
				.scroll(function() {
					handle.css('top', parseInt(nav.scrollTop())+'px');
				})
				
				.find('.ui-resizable-handle').zIndex(nav.zIndex() + 10);

			if (!ltr) {
				nav.resize(function() {
					nav.css('left', null).css('right', 0);
				})
			}

			fm.one('open', function() {
				setTimeout(function() {
					parent.trigger('resize');
				}, 100);
			});
		}
	});
	
	return this;
}
