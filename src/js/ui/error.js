/**
 * jQuery plugin
 * Create error "window"
 * On elFinder "error"/"ajaxerror" events show error message
 *
 * @author Dmitry (dio) Levashov
 */
$.fn.elfindererror = function(fm) {

	return this.each(function() {
		var msg = $('<div class="elfinder-error-msg">asdsdfasfssssssssssssdd asdfasdfa </div>'),
			win = $(this).addClass('ui-corner-all elfinder-error')
				.append('<span class="elfinder-error-icon"/>')
				.append($('<span class="ui-icon ui-icon-close elfinder-error-icon-close"/>').click(function() { win.hide(); }))
				.append('<div class="elfinder-error-title">'+fm.i18n('Error')+'!</div>')
				.append(msg)
				.draggable();
				
		fm.bind('error ajaxerror', function(e) {
			var error = e.data.error||'', 
				text  = '';

			if ($.isArray(error)) {
				$.each(error, function(i, err) {
					text += fm.i18n(err) + '<br/>';
				});
			} else {
				text = fm.i18n(error);
			}
			
			msg.html(text);
			win.show();
			setTimeout(function() {
				win.hide();
			}, 4000);
		})
		.bind('ajaxstart select', function() {
			win.hide();
		})
	});
}