$.fn.elfinderuploadbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd)
				.unbind('click')
				.click(function(e) {
					if (button.is('.ui-state-disabled')) {
						e.preventDefault();
						input.val('');
					}
				}),
			input = $('<input type="file" multiple="on"/>')
				.change(function() {
					var _input;
					if (input.val()) {
						_input = input.clone(true);
						input.remove();
						cmd.exec(input[0]);
						input = _input.appendTo(form);
					} 
				})
			form = $('<form/>').append(input).appendTo(button)
			;
		
		this._click = function() {
			cmd.fm.log(here)
		}
	})
}