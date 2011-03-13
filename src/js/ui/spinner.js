/**
 * jQuery plugin
 * On elFinder "ajaxstart"/"ajaxstop"/"ajaxerror" events show/hide ovelay and spinner
 *
 * @author Dmitry (dio) Levashov
 */
$.fn.elfinderspinner = function(fm) {
	
	return this.each(function() {
		var spinner = $(this).addClass('elfinder-spinner').hide();
			
		fm.bind('ajaxstart', function() {
			spinner.show();
		})
		.bind('ajaxstop ajaxerror', function() {
			spinner.hide();
		});
	});
}