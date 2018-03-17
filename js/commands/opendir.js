/**
 * @class  elFinder command "opendir"
 * Enter parent folder
 *
 * @author Naoki Sawada
 **/  
elFinder.prototype.commands.opendir = function() {
	"use strict";
	this.alwaysEnabled = true;
	
	this.getstate = function() {
		var sel = this.fm.selected(),
			cnt = sel.length,
			wz;
		if (cnt !== 1) {
			return -1;
		}
		wz = this.fm.getUI('workzone');
		return wz.hasClass('elfinder-search-result')? 0 : -1;
	};
	
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
		fm.trigger('searchend', { noupdate: true });
		fm.request({
			data   : {cmd  : 'open', target : hash},
			notify : {type : 'open', cnt : 1, hideCnt : true},
			syncOnFail : false
		});
		
		return dfrd;
	};

};
