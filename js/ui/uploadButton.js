"use strict";
/**
 * @class  elFinder toolbar's button tor upload file
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderuploadbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd)
				.unbind('click'), 
			form = $('<form/>').appendTo(button),
			input = $('<input type="file" multiple="true"/>')
				.appendTo(form)
				.change(function() {
					var _input;
					if (input.val()) {
						_input = input.clone(true);
						cmd.exec({input : input.remove()[0]});
						input = _input.appendTo(form);
					} 
				});
				
		cmd.change(function() {
			form[cmd.disabled() ? 'hide' : 'show']();
		})
		.change();
	});
}