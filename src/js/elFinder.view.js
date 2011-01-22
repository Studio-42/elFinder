(function($) {
	
	elFinder.prototype.view = function(fm, el) {
		var self = this,
			error = function(m) {
				self.errorMsg.text(fm.i18n(m));
				self.error.fadeIn('slow');
				setTimeout(function() { 
					self.error.fadeOut('slow');
				}, 4000);
			};
		
		this.fm = fm;
		
		
		this.toolbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar"/>');
		
		this.workzone = $('<div class="ui-helper-clearfix elfinder-workzone"/>')
		
		this.nav = $('<div class="ui-state-default elfinder-nav"/>');
		
		this.cwd = $('<div class="elfinder-cwd"/>');
		
		this.spinner = $('<div class="elfinder-spinner"/>');
		
		this.overlay = $('<div class="ui-widget-overlay elfinder-overlay"/>');
		
		this.errorMsg = $('<div/>');
		
		this.error = $('<div class="ui-state-error ui-corner-all elfinder-error"><span class="ui-icon ui-icon-alert"/><strong>'+fm.i18n('Error')+'!</strong></div>')
			.prepend($('<span class="ui-icon ui-icon-close"/>').click(function() { self.error.hide() }))
			.append(this.errorMsg);
		
		this.statusbar = $('<div class="ui-widget-header ui-corner-all elfinder-statusbar"/>')
		
		this.viewport = el.empty()
			.attr('id', fm.id)
			.addClass('ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+fm.dir+' '+(fm.options.cssClass||''))
			.append(this.toolbar.hide())
			.append(this.workzone.append(this.nav).append(this.cwd))
			.append(this.overlay.hide())
			.append(this.spinner)
			.append(this.error)
			.append(this.statusbar.hide());
	
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			var s = e.type == 'ajaxstart';
			
			self.spinner[s ? 'show' : 'hide']();
			e.type == 'ajaxerror' && error(e.data.state == '404' ? 'Unable to connect to backend' : 'Invalid backend configuration');
		})
		.bind('lock', function(e) {
			self.overlay[fm.locks.ui ? 'show' : 'hide']();
		});


	}
	
})(jQuery);