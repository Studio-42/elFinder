$.fn.elfinderoverlay = function(fm) {
	return this.each(function() {
		var o = $(this).addClass('ui-widget-overlay elfinder-overlay')
			.hide()
			.click(function(e) {
				e.preventDefault();
				e.stopPropagation();
			});
			
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			e.data.mode == 'block' && o[e.type == 'ajaxstart' ? 'show' : 'hide']();
		})
	})
}