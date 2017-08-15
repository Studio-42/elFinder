"use strict";
/**
 * @class  elFinder command "selectinvert"
 * Invert Selection of cwd items
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.selectinvert = function() {
	var self = this,
		fm = this.fm;
	
	/*fm.bind('select', function(e, data) {
		var value, name;
		if (e.data) {
			if (e.data.selectall) {
				value = true;
			} else if (e.data.unselectall) {
				value = false;
			}
		}
		if (self.value !== value) {
			//this.value = value;
			name = value? 'unselectall' : 'selectall';
			self.title = fm.i18n('cmd' + name);
			self.className = name;
			if (self.button){
				self.button.children('span.elfinder-button-icon')
					.removeClass('elfinder-button-icon-unselectall elfinder-button-icon-selectall')
					.addClass('elfinder-button-icon-' + name);
			}
			self.update(void(0), value);
		}
	});*/
	
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	//this.syncTitleOnChange = true;
	//this.value = false;
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		$(document).trigger($.Event('keydown', { keyCode: 73, ctrlKey : true, shiftKey : true, altKey : false, metaKey : false }));
		return $.Deferred().resolve();
	}

};
