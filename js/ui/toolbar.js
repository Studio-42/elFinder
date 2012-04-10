"use strict";
/**
 * @class  elFinder toolbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertoolbar = function(fm, opts) {
	this.not('.elfinder-toolbar').each(function() {
		var commands = fm._commands,
			self     = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-top elfinder-toolbar'),
			panels   = opts || [],
			l        = panels.length,
			i, cmd, panel, button;
		
		self.prev().length && self.parent().prepend(this);

		while (l--) {
			if (panels[l]) {
				panel = $('<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>');
				i = panels[l].length;
				while (i--) {
					if ((cmd = commands[panels[l][i]])) {
						button = 'elfinder'+cmd.options.ui;
						$.fn[button] && panel.prepend($('<div/>')[button](cmd));
					}
				}
				
				panel.children().length && self.prepend(panel);
				panel.children(':not(:last),:not(:first):not(:last)').after('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');

			}
		}
		
		self.children().length && self.show();
	});
	
	return this;
}