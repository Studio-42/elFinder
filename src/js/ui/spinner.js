/**
 * jQuery plugin
 * On elFinder "ajaxstart"/"ajaxstop"/"ajaxerror" events show/hide ovelay and spinner
 *
 * @author Dmitry (dio) Levashov
 */
$.fn.elfinderspinner = function(fm) {
	
	return this.each(function() {
		var spinner = $(this).addClass('elfinder-spinner').hide();
			
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			e.data.mode == 'block' && spinner[e.type == 'ajaxstart' ? 'show' : 'hide']();
		})
	});
}