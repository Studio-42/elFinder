/**
 * @class  elFinder command "mkdir"
 * Create new folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkdir = function() {
	"use strict";
	var fm   = this.fm,
		self = this,
		curOrg;
	
	this.value           = '';
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.syncTitleOnChange = true;
	this.mime            = 'directory';
	this.prefix          = 'untitled folder';
	this.exec            = function(select, cOpts) {
		var onCwd;

		if (select && select.length && cOpts && cOpts._currentType && cOpts._currentType === 'navbar') {
			this.origin = cOpts._currentType;
			this.data = {
				target: select[0]
			};
		} else {
			onCwd = fm.cwd().hash === select[0];
			this.origin = curOrg && !onCwd? curOrg : 'cwd';
			delete this.data;
		}
		if (! select && ! this.options.intoNewFolderToolbtn) {
			fm.getUI('cwd').trigger('unselectall');
		}
		//this.move = (!onCwd && curOrg !== 'navbar' && fm.selected().length)? true : false;
		this.move = this.value === fm.i18n('cmdmkdirin');
		return $.proxy(fm.res('mixin', 'make'), self)();
	};
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n'
	}];

	this.init = function() {
		if (this.options.intoNewFolderToolbtn) {
			this.syncTitleOnChange = true;
		}
	};
	
	fm.bind('select contextmenucreate closecontextmenu', function(e) {
		var sel = (e.data? (e.data.selected || e.data.targets) : null) || fm.selected();
		
		self.className = 'mkdir';
		curOrg = e.data && sel.length? (e.data.origin || e.data.type || '') : '';
		if (!self.options.intoNewFolderToolbtn && curOrg === '') {
			curOrg = 'cwd';
		}
		if (sel.length && curOrg !== 'navbar' && curOrg !== 'cwd' && fm.cwd().hash !== sel[0]) {
			self.title = fm.i18n('cmdmkdirin');
			self.className += ' elfinder-button-icon-mkdirin';
		} else {
			self.title = fm.i18n('cmdmkdir');
		}
		if (e.type !== 'closecontextmenu') {
			self.update(void(0), self.title);
		} else {
			requestAnimationFrame(function() {
				self.update(void(0), self.title);
			});
		}
	});
	
	this.getstate = function(select) {
		var cwd = fm.cwd(),
			sel = (curOrg === 'navbar' || (select && select[0] !== cwd.hash))? this.files(select || fm.selected()) : [],
			cnt = sel.length,
			filter = function(files) {
				var fres = true;
				return $.grep(files, function(f) {
					fres = fres && f.read && ! f.locked? true : false;
					return fres;
				});
			};

		if (curOrg === 'navbar') {
			return cnt && sel[0].write && sel[0].read? 0 : -1;  
		} else {
			return cwd.write && (!cnt || filter(sel).length == cnt)? 0 : -1;
		}
	};

};
