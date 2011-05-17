$.fn.elfinderbutton = function(cmd) {
	return this.each(function() {
		
		var disabled = 'ui-state-disabled',
			active   = 'ui-state-active',
			button   = $(this).addClass('ui-widget ui-state-default ui-corner-all elfinder-button')
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+'"/>')
				.hover(function(e) {
					!button.is('.'+disabled) && button.toggleClass('ui-state-hover', e.type == 'mouseenter');
				})
				.click(function(e) {
					// e.preventDefault();
					!button.is('.'+disabled) && this._click();
				});
			
			
		cmd.change(function() {
			// here this - command object 
			if (this.disabled()) {
				button.removeClass(active).addClass(disabled);
			} else {
				button.removeClass(disabled);
				button[this.active() ? 'addClass' : 'removeClass'](active);
			}
		});
		cmd.change()	
		this._click = function() {
			cmd.exec();
		}	
	})
}