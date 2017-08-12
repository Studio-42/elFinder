"use strict";
/**
 * @class  elFinder command "mkdir"
 * Create new folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkdir = function() {
	var fm   = this.fm,
		self = this,
		curOrg;
	
	this.value           = '';
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitled folder';
	this.exec            = function(contextSel) {
		this.origin = curOrg? curOrg : 'cwd';
		if (! contextSel && ! this.options.intoNewFolderToolbtn) {
			fm.getUI('cwd').trigger('unselectall');
		}
		this.move = (this.origin !== 'navbar' && fm.selected().length)? true : false;
		return $.proxy(fm.res('mixin', 'make'), self)();
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n'
	}];

	this.init = function() {
		if (this.options.intoNewFolderToolbtn) {
			this.syncTitleOnChange = true;
		}
	}
	
	fm.bind('select', function(e) {
		var sel = (e.data && e.data.selected)? e.data.selected : [];
		
		self.className = 'mkdir';
		curOrg = sel.length? (e.data.origin || '') : '';
		if (sel.length && (curOrg !== 'navbar')) {
			self.title = fm.i18n('cmdmkdirin');
			self.className += ' elfinder-button-icon-mkdirin';
		} else {
			self.title = fm.i18n('cmdmkdir');
		}
		self.update(void(0), self.title);
	});
	
	this.getstate = function(sel) {
		var cwd = fm.cwd(),
			sel = (curOrg === 'navbar' || (sel && sel[0] != cwd.hash))? this.files(sel || fm.selected()) : [],
			cnt = sel.length;

		if (curOrg === 'navbar') {
			return cnt && sel[0].write && sel[0].read? 0 : -1;  
		} else {
			return cwd.write && (!cnt || $.map(sel, function(f) { return f.read && ! f.locked? f : null  }).length == cnt)? 0 : -1;
		}
	}

};
