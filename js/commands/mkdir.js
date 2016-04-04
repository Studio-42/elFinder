"use strict";
/**
 * @class  elFinder command "mkdir"
 * Create new folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkdir = function() {
	var fm   = this.fm,
		self = this;
	
	this.value           = '';
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitled folder';
	this.exec            = $.proxy(fm.res('mixin', 'make'), this);
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n'
	}];

	this.options = { ui : 'mkdirbutton' };

	fm.bind('select', function(e) {
		var sel = (e.data && e.data.selected)? e.data.selected : [];
		self.title = sel.length? fm.i18n('cmdmkdirin') : fm.i18n('cmdmkdir');
		self.update(void(0), self.title);
	});
	
	this.getstate = function(sel) {
		var cwd = fm.cwd(),
			sel = (sel && sel[0] != cwd.hash)? this.files(sel) : [],
			cnt = sel.length;

		return !this._disabled && cwd.write && (!cnt || $.map(sel, function(f) { return f.phash && f.read && !f.locked ? f : null  }).length == cnt)? 0 : -1;
	}

};
