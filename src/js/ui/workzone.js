/**
 * @class elfinderworkzone - elFinder container for nav and current directory
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderworkzone = function(fm) {
	var cl = 'elfinder-workzone';
	
	this.not('.'+cl).each(function() {
		var wz     = $(this).addClass(cl),
			wdelta = wz.outerHeight(true) - wz.height(),
			parent = wz.parent().bind('resize', function() {
				var height = parent.height();

				parent.children(':visible:not(.'+cl+')').each(function() {
					var ch = $(this);

					if (ch.css('position') != 'absolute') {
						height -= ch.outerHeight(true);
					}
				});
				
				wz.height(height - wdelta);
			});
	});
	return this;
}

/**
 * @class elfindernav - elFinder container for diretories tree and places
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernav = function(fm) {
	
	this.not('.elfinder-nav').each(function() {
		var nav    = $(this).addClass('ui-state-default elfinder-nav'),
			parent = nav.parent()
				.resize(function() {
					nav.height(wz.height() - delta);
					icon && icon.length && pos();
				}),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			ltr    = fm.direction == 'ltr',
			css    = ltr ? 'left' : 'right',
			pos    = function() { icon.css(css, parseInt(handle.offset()[css])-icon.outerWidth()+'px'); },
			handle, icon;

		
		if ($.fn.resizable) {
			icon   = $('<span class="elfinder-nav-handle-icon ui-icon ui-icon-grip-solid-vertical"/>').prependTo(wz).zIndex(nav.zIndex()+10);
			handle = nav.resizable({handles : ltr ? 'e' : 'n'})
				.resize(pos)
				.scroll(function() {
					handle.css('top', parseInt(nav.scrollTop())+'px');
				})
				.find('.ui-resizable-handle');
		}
	});
	
	return this;
}

