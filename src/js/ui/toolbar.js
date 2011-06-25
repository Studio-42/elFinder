
$.fn.elfindertoolbar = function(fm, opts) {
	this.not('.elfinder-toolbar').each(function() {
		var commands = fm._commands,
			self     = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-top elfinder-toolbar'),
			panels   = opts || [],
			l        = panels.length,
			i, cmd, panel, button
		;
		
		self.prev().length && self.parent().prepend(this);

		while (l--) {
			panel = $('<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>');
			i = panels[l].length;
			
			while (i--) {
				if ((cmd = commands[panels[l][i]])) {
					button = 'elfinder'+cmd.options.ui;
					if ($.fn[button]) {
						panel.prepend($('<div/>')[button](cmd));
						if (i > 0) {
							panel.prepend('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');
						}
					}
					
					// $.fn[button] && panel.prepend($('<div/>')[button](cmd)).prepend('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');
				}
			}
			
			panel.children().length && self.prepend(panel);
		}
		
		self.children().length && self.show();
	});
	
	return this;
}