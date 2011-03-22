
$.fn.elfindertoolbar = function(conf, commands) {
	return this.each(function() {
		var self   = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar'),
			panels = conf || [],
			l      = panels.length,
			i, cmd, panel, button
		;
		// console.log(commands)
		while (l--) {
			panel = $('<div class="elfinder-buttonset"/>');
			
			i = panels[l].length;
			
			while (i--) {
				if ((cmd = commands[panels[l][i]])) {
					
					button = 'elfinder'+cmd.options.button;
					if (!$.fn[button]) {
						button = 'elfinderbutton';
					}
					panel.prepend($('<a href="#"/>')[button](cmd));
				}
			}
			
			panel.children().length && self.prepend(panel);
		}
		
		self.show()
	});
}