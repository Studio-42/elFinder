
$.fn.elfinderworkzone = function(fm) {
	this.not('.elfinder-workzone').each(function() {
		var wz     = $(this).addClass('elfinder-workzone'),
			parent = wz.parent().bind('resize', function() {
				var height = parent.height();

				parent.children(':visible').each(function() {
					var $this = $(this);
					
					if (this != wz[0] && $this.css('position') != 'absolute') {
						height -= $this.outerHeight(true);
					}
				});
				
				wz.height(height - wdelta);

			}),
			wdelta = wz.outerHeight(true) - wz.height();

	});
	
	
	
	return this;
}

$.fn.elfindernav = function(fm) {
	
	this.not('.elfinder-nav').each(function() {
		var nav    = $(this).addClass('ui-state-default  elfinder-nav'),
			parent = nav.parent().resize(function() {
				nav.height(wz.height() - delta)
			}),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			css    = fm.direction == 'ltr' ? 'left' : 'right',
			handle, icon;

		;
		fm.log(wz)
		
		if (!$.fn.resizable) {
			icon = $('<span class="elfinder-nav-handle ui-icon ui-icon-grip-solid-vertical"/>').prependTo(wz).zIndex(nav.zIndex()+10);
		
			handle = nav
				.resizable({
					handles : 'e'
				})
				.bind('resize', function() {
					fm.log('resize')
					icon.css(css, parseInt(nav.width())-icon.outerWidth()-2+'px');
				})
				.bind('scroll', function() {
					handle.height(nav.height() + nav.scrollTop());
				})
				.find('.ui-resizable-handle')
			
			parent.resize(function() {
				fm.log(nav.width())
			})
			
			fm.one('open', function() {
				setTimeout(function() {
					nav.resize();
					icon.show();
				}, 300);
				
			});
		}
		
		
	})
	
	return this;
}

