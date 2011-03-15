$.fn.elfinderdialog = function() {
	var fm     = arguments[0], 
		opts   = arguments[1], 
		cmd    = arguments[0];
		
	return this.each(function() {
		var dialog = $(this), 
			self   = this,
			
			childs, modal, buttons, close, overlay, buttonspane;
		
		if (!dialog.is('.elfinder-dialog')) {
			modal   = !!opts.modal;
			buttons = opts.buttons;
			close   = opts.close;
			// overlay = fm.node.find('.elfinder-overlay');
			
			childs = dialog.children().remove();
			dialog.addClass('ui-helper-reset ui-widget ui-widget-content ui-corner-all elfinder-dialog '+(opts.dialogClass || ''))
					.html('<div class="ui-widget-header ui-corner-top">'+(opts.title ? fm.i18n(opts.title) : '')+'<span class="ui-icon ui-icon-close"/></div><div class="ui-widget-content ui-corner-bottom elfinder-dialog-content"><span class="elfinder-dialog-icon"/></div>')
					.hide()
					.one('mouseenter', function() {
						dialog.draggable();
					})
					.find('.elfinder-dialog-content:first')
					.prepend(childs);

			this._close = function() {
				modal && fm.node.find('.elfinder-overlay').hide();
				dialog.hide();
				fm.trigger('focus');
				typeof(close) == 'function' && close.apply(dialog);
			}
			
			this._open = function() {
				if (modal) {
					fm.trigger('blur');
					fm.node.find('.elfinder-overlay').show();
				}
				dialog.show();
			}

			dialog.find('.ui-icon-close').click(self._close);
			
			if (buttons) {
				buttonspane = $('<div class="elfinder-dialog-buttonspane ui-helper-clearfix"/>').appendTo(dialog.find('.elfinder-dialog-content:first'));
				$.each(buttons, function(name, callback) {
					$('<button class="ui-corner-all elfinder-dialog-button">'+fm.i18n(name)+'</button>')
						.appendTo(buttonspane)
						.click(function(e) {
							callback.apply(self);
						});
				});
				
			}
		}
		console.log(cmd)
		switch (cmd) {
			case 'open':
			
				this._open();
				break;
				
			case 'close':
				this._close();
				break;
				
			case 'destroy':
				dialog.remove();
		}
	});
	
}