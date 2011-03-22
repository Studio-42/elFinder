$.fn.elfinderbutton = function(cmd) {
	return this.each(function() {
		var disabled = 'ui-state-disabled',
			active   = 'ui-state-active',
			self     = $(this).addClass('ui-widget ui-state-default ui-corner-all elfinder-button ui-state-disabled')
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+'"/>')
				.hover(function(e) {
					var $this = $(this);
					!$this.is('.'+disabled) && $this.toggleClass('ui-state-hover', e.type == 'mouseenter')
				})
				.click(function(e) {
					e.preventDefault();
					!$(this).is('.'+disabled) && this._click();
				});
			
		cmd.change(function(e) {
			
			if (e.data.enabled) {
				self.removeClass(disabled);
				e.data.active && self.addClass(active);
			} else {
				self.removeClass(active).addClass(disabled);
			}
		})
			
		this._click = function() {
			cmd.exec();
		}	
	})
}