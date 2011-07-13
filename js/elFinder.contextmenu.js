"use strict";

elFinder.prototype.contextmenu = function(fm) {
	
	var clItem  = 'elfinder-contextmenu-item',
		clGroup = 'elfinder-contextmenu-group',
		clSub   = 'elfinder-contextmenu-sub',
		subpos  = fm.direction == 'ltr' ? 'left' : 'right',
		tpl     = '<div class="elfinder-contextmenu-item"><span class="elfinder-button-icon {icon} elfinder-contextmenu-icon"/><span>{label}</span></div>',
		createitem = function(label, icon, callback) {
			return $(tpl.replace('{icon}', icon ? 'elfinder-button-icon-'+icon : '').replace('{label}', label))
				.click(function(e) {
					e.stopPropagation();
					callback();
				})
		}
		;
	
	this.fm = fm;
	
	this.types = $.extend({}, fm.options.contextmenu);
	
	fm.log(this.types)
	
	this.menu = $('<div class="ui-helper-reset ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction+'"/>')
		.hide()
		.appendTo('body')
	;
	
	this.create = function(type, targets) {
		var self = this,
			sep = false;
		
		this.close();
		
		$.each(this.types[type] || [], function(i, name) {
			var cmd,
				item, sub;
			
			if (name == '|' && sep) {
				self.menu.append('<div class="elfinder-contextmenu-separator"/>');
				sep = false;
				return;
			}
			
			cmd = self.fm.command(name);
			
			if (!cmd || cmd.getstate(targets) == -1) {
				return;
			}
			
			if (cmd.variants) {
				if (!cmd.variants.length) {
					return;
				}
				
				
			} else {
				item = createitem(name, cmd.title || cmd.name, function() {
					fm.log(name, targets)
				})
			}
			
			self.fm.log(item)
			
			
			sep = true;

		})
		
		
		this.fm.log(type).log(targets)
	}
	
	this.open = function(content) {
		fm.log('open')
	}
	
	this.close = function() {
		this.menu.hide().text('').removeData('targets');
	}
	
}