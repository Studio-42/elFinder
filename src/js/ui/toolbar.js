
$.fn.elfindertoolbar = function(fm, opts) {
	this.not('.elfinder-toolbar').each(function() {
		var commands = fm._commands,
			self     = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar'),
			panels   = opts || [],
			l        = panels.length,
			i, cmd, panel, button
		;
		
		self.prev().length && self.parent().prepend(this);

		while (l--) {
			panel = $('<div class="elfinder-buttonset"/>');
			i = panels[l].length;
			
			while (i--) {
				if ((cmd = commands[panels[l][i]])) {
					button = 'elfinder'+cmd.options.ui;
					$.fn[button] && panel.prepend($('<a href="#"/>')[button](cmd));
				}
			}
			
			panel.children().length && self.prepend(panel);
		}
		
		self.children().length && self.show();
	});
	
	return this;
}