$.fn.elfinderbutton = function(cmd) {
	return this.each(function() {
		
		var disabled = 'ui-state-disabled',
			active   = 'ui-state-active',
			button   = $(this).addClass('ui-widget- ui-state-default elfinder-button')
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+'"/>')
				.hover(function(e) {
					!button.is('.'+disabled) && button.toggleClass('ui-state-hover', e.type == 'mouseenter');
				})
				.click(function(e) {
					// e.preventDefault();
					!button.is('.'+disabled) && this._click(e);
				});
			
			
		cmd.change(function() {
			if (cmd.disabled()) {
				button.removeClass(active).addClass(disabled);
			} else {
				button.removeClass(disabled);
				button[cmd.active() ? 'addClass' : 'removeClass'](active);
			}
		})
		.change();
		
		this._click = function() {
			cmd.exec();
		}	
	})
}