"use strict"
/**
 * @class  elFinder command "opendir"
 * Enter parent folder
 *
 * @author Naoki Sawada
 **/  
elFinder.prototype.commands.opendir = function() {
	this.alwaysEnabled = true;
	
	this.getstate = function() {
		var sel = this.fm.selected(),
			cnt = sel.length,
			cwdWrapper;
		if (cnt !== 1) {
			return -1;
		}
		cwdWrapper = this.fm.getUI('cwd').parent();
		return cwdWrapper.hasClass('elfinder-search-result')? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			dfrd  = $.Deferred(),
			files = this.files(hashes),
			cnt   = files.length,
			hash, pcheck = null;

		if (!cnt || !files[0].phash) {
			return dfrd.reject();
		}

		hash = files[0].phash;
		if (!fm.file(hash)) {
			// parents check
			pcheck = fm.request({
				data   : {cmd  : 'parents', target : hash},
				syncOnFail : false
			});
		}
		// open folder
		$.when(pcheck)
		.done(function(data){
			fm.trigger('searchend', { noupdate: true });
			fm.request({
				data   : {cmd  : 'open', target : hash},
				notify : {type : 'open', cnt : 1, hideCnt : true},
				syncOnFail : false
			});
		});
		
		return dfrd;
	}

};
