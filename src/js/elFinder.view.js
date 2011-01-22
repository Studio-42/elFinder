(function($) {
	
	elFinder.prototype.view = function(fm, el) {
		var self = this;
		
		this.fm = fm;
		
		
		this.toolbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar"/>');
		
		this.workzone = $('<div class="ui-helper-clearfix ui-state-disabled elfinder-workzone"/>')
		
		this.nav = $('<div class="ui-state-default elfinder-nav"/>');
		
		this.cwd = $('<div class="elfinder-cwd"/>');
		
		this.spinner = $('<div class="elfinder-spinner"/>');
		
		this.errorMsg = $('<div/>');
		
		this.error = $('<div class="ui-state-error ui-corner-all elfinder-error"><span class="ui-icon ui-icon-alert"/><strong>'+fm.i18n('Error')+'!</strong></div>')
			.prepend($('<span class="ui-icon ui-icon-close"/>').click(function() { self.error.hide() }))
			.append(this.errorMsg);
		
		this.statusbar = $('<div class="ui-widget-header  ui-corner-all elfinder-statusbar"/>')
		
		this.viewport = el.empty()
			.attr('id', fm.id)
			.addClass('ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all  elfinder elfinder-'+fm.dir+' '+(fm.options.cssClass||''))
			.append(this.toolbar.hide())
			.append(this.workzone.append(this.nav).append(this.cwd))
			.append(this.spinner)
			.append(this.error)
			.append(this.statusbar.hide());
	
		fm.bind('lock', function() {
			var s = !fm.lock().ui;
				
			self.toolbar.add(self.workzone).add(self.statusbar)[s ? 'removeClass' : 'addClass']('ui-state-disabled');
			self.spinner[s ? 'hide' : 'show']();
		});
	
		// fm.bind('lock', function() { fm.log('here lock'); fm.log(fm.lock()) })//.trigger('load')
	
		fm.lock({ui:false})
		fm.lock({ shortcuts : false})
		// fm.log(fm.lock())
	}
	
})(jQuery);