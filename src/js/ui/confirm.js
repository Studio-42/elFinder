$.fn.elfinderconfirm = function(fm) {
	
	return this.each(function() {
		var ctext   = 'elfinder-dialog-text',
			cbutton = 'elfinder-dialog-button',
			cok = cbutton+'-ok',
			ccancel = cbutton+'-cancel',
			capplyall = 'elfinder-dialog-confirm-applyall',
			ctitle = 'ui-widget-header',
			win    = $(this).addClass('ui-helper-reset ui-widget ui-widget-content ui-corner-all elfinder-dialog elfinder-dialog-confirm')
				.append('<div class="ui-widget-header ui-corner-top"/><div class="ui-widget-content ui-corner-bottom ui-clearfix"><div class="'+ctext+'"/><span class="elfinder-dialog-icon elfinder-dialog-icon-confirm"/><div class="elfinder-dialog-buttonpane ui-helper-clearfix"><button class="ui-corner-all '+cbutton+' '+cok+'">'+fm.i18n('Ok')+'</button><button class="ui-corner-all '+cbutton+' '+ccancel+'">'+fm.i18n('Cancel')+'</button><div class="'+capplyall+'"><input type="checkbox"/> '+fm.i18n('Aplly to all')+'</div></div></div>')
				.hide()
				.bind('mouseenter', function() {
					!win.is('.ui-draggable') && win.unbind('mouseenter').draggable();
				}),
			title = win.find('.'+ctitle),
			msg    = win.find('.'+ctext),
			ok     = win.find('.'+cok),
			cancel = win.find('.'+ccancel),
			applyall  = win.find('.'+capplyall),
			checkbox = applyall.children(':checkbox');
			
		msg.text('wtf?')	

		fm.bind('confirm', function(e) {
			var buttons = e.data.buttons || {},
				txt = e.data.text,
				all = e.data.applyall,
				cb  = e.data.cb;
			
			if (e.data.text && cb) {
				title.text(fm.i18n(e.data.title || 'Confirmation required'));
				msg.text(txt)
				ok.text(fm.i18n(buttons.ok || 'Ok')).unbind('click').click(function() {
					fm.trigger('uilock');
					win.hide();
					cb(true, checkbox.is(':checked'));
				});
				cancel.text(fm.i18n(buttons.cancel || 'Cancle')).unbind('click').click(function() {
					fm.trigger('uiunlock');
					win.hide();
					cb(false, checkbox.is(':checked'));
				});	
				applyall[e.data.applyall ? 'show' :'hide']();
				checkbox.removeAttr('checked');
				win.show();
			}
				
		})
		
	})
}