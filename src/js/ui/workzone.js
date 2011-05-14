
$.fn.elfinderworkzone = function(fm) {
	this.not('.elfinder-workzone').each(function() {
		var nav    = $('<div class="ui-state-default elfinder-nav"/>'),
			wz     = $(this).addClass('elfinder-workzone').append(nav),
			parent = wz.parent().bind('resize', function() {
				var height = parent.height() - pdelta;

				parent.children(':visible').each(function() {
					var $this = $(this);
					
					if (this != wz[0] && $this.css('position') != 'absolute') {
						height -= $this.outerHeight(true);
					}
				});

				wz.height(height).children('.elfinder-cwd').height(height - wdelta);
				nav.height(height - wdelta);
			}),
			wdelta = wz.outerHeight() - wz.height(),
			pdelta = parent.outerHeight() - parent.height();
	});
	
	return this;
}