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
				
			fm.one('open', function() {
				setTimeout(function() {
					parent.trigger('resize');
				}, 100);
			});
		}
	});
	
	return this;
}
