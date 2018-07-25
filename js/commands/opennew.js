/**
 * @class  elFinder command "opennew"
 * Open folder in new window
 *
 * @author Naoki Sawada
 **/  
elFinder.prototype.commands.opennew = function() {
	"use strict";
	var fm = this.fm;

	this.shortcuts = [{
		pattern  : (typeof(fm.options.getFileCallback) === 'function'? 'shift+' : '') + 'ctrl+enter'
	}];

	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length;
		
		return cnt === 1 
			? (sel[0].mime === 'directory' && sel[0].read? 0 : -1) 
			: -1;
	};
	
	this.exec = function(hashes) {
		var dfrd  = $.Deferred(),
			files = this.files(hashes),
			cnt   = files.length,
			opts  = this.options,
			file, loc, url, win;

		// open folder to new tab (window)
		if (cnt === 1 && (file = files[0]) && file.mime === 'directory') {
			loc = window.location;
			if (opts.url) {
				url = opts.url;
			} else {
				url = loc.pathname;
			}
			if (opts.useOriginQuery) {
				if (!url.match(/\?/)) {
					url += loc.search;
				} else if (loc.search) {
					url += '&' + loc.search.substr(1);
				}
			}
			url += '#elf_' + file.hash;
			win = window.open(url, '_blank');
			setTimeout(function() {
				win.focus();
			}, 1000);
			return dfrd.resolve();
		} else {
			return dfrd.reject();
		}
	};
};
