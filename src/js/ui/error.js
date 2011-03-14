/**
 * jQuery plugin
 * Create error "window"
 * On elFinder "error"/"ajaxerror" events show error message
 *
 * @author Dmitry (dio) Levashov
 */
$.fn.elfindererror = function(fm) {

	return this.each(function() {
		var text   = 'elfinder-dialog-text',
			close  = 'ui-icon-close',
			button = 'elfinder-dialog-button',
			win    = $(this).addClass('ui-helper-reset ui-widget ui-widget-content ui-corner-all elfinder-dialog elfinder-dialog-error')
				.append('<div class="ui-widget-header ui-corner-top">'+fm.i18n('Error')+'<span class="ui-icon '+close+'"/></div><div class="ui-widget-content ui-corner-bottom ui-clearfix"><div class="'+text+'"/><span class="elfinder-dialog-icon elfinder-dialog-icon-error"/><div class="elfinder-dialog-buttonpane ui-helper-clearfix"><button class="ui-corner-all '+button+'">'+fm.i18n('Ok')+'</button></div></div>')
				.hide()
				.bind('mouseenter', function() {
					!win.is('.ui-draggable') && win.unbind('mouseenter').draggable();
				}),
			msg = win.find('.'+text),
			btn = win.find('.'+button);
				
		win.find('.'+close).add(btn).click(function() {
			win.hide();
		});
				
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
			
			// win.css('top', '100px')
			win.css({
				top : '30%',
				left : '50%'
			}).show();
			btn.focus();
		})
		.bind('ajaxstart select2', function() {
			// win.hide();
		})
	});
}