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
			dispre   = null,
			uiCmdMapPrev = '',
			l, i, cmd, panel, button;
		
		self.prev().length && self.parent().prepend(this);

		var render = function(disabled){
			var name;
			self.empty();
			l = panels.length;
			while (l--) {
				if (panels[l]) {
					panel = $('<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>');
					i = panels[l].length;
					while (i--) {
						name = panels[l][i];
						if ((!disabled || $.inArray(name, disabled) === -1) && (cmd = commands[name])) {
							button = 'elfinder'+cmd.options.ui;
							$.fn[button] && panel.prepend($('<div/>')[button](cmd));
						}
					}
					
					panel.children().length && self.prepend(panel);
					panel.children(':gt(0)').before('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');

				}
			}
			
			self.children().length? self.show() : self.hide();
			self.trigger('load');
		};
		
		render();
		
		fm.bind('open sync', function(){
			var repCmds = [],
			disabled = fm.option('disabled');

			if (!dispre || dispre.toString() !== disabled.sort().toString()) {
				render(disabled && disabled.length? disabled : null);
			}
			dispre = disabled.concat().sort();

			if (uiCmdMapPrev !== JSON.stringify(fm.commandMap)) {
				uiCmdMapPrev = JSON.stringify(fm.commandMap);
				if (Object.keys(fm.commandMap).length) {
					$.each(fm.commandMap, function(from, to){
						var cmd = fm._commands[to],
						button = cmd? 'elfinder'+cmd.options.ui : null;
						if (button && $.fn[button]) {
							repCmds.push(from);
							var btn = $('div.elfinder-buttonset div.elfinder-button').has('span.elfinder-button-icon-'+from);
							if (btn.length && !btn.next().has('span.elfinder-button-icon-'+to).length) {
								btn.after($('<div/>')[button](fm._commands[to]).data('origin', from));
								btn.hide();
							}
						}
					});
				}
				// reset toolbar
				$.each($('div.elfinder-button'), function(){
					var origin = $(this).data('origin');
					if (origin && $.inArray(origin, repCmds) == -1) {
						$('span.elfinder-button-icon-'+$(this).data('origin')).parent().show();
						$(this).remove();
					}
				});
			}

		});
	});
	
	return this;
};
