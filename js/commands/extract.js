"use strict"
/**
 * @class  elFinder command "extract"
 * Extract files from archive
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.extract = function() {
	var self    = this,
		fm      = self.fm,
		mimes   = [],
		filter  = function(files) {
			return $.map(files, function(file) { 
				return file.read && $.inArray(file.mime, mimes) !== -1 ? file : null
				
			})
		};
	
	this.disableOnSearch = true;
	
	// Update mimes list on open/reload
	fm.bind('open reload', function() {
		mimes = fm.option('archivers')['extract'] || [];
		self.change();
	});
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return !this._disabled && cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var files    = this.files(hashes),
			dfrd     = $.Deferred(),
			cnt      = files.length, 
			complete = cnt, 
			i, file, error;
		
		if (!(this.enabled() && cnt && mimes.length)) {
			return dfrd.reject();
		}
		
		for (i = 0; i < cnt; i++) {
			file = files[i];
			if (!(file.read && fm.file(file.phash).write)) {
				error = ['errExtract', file.name, 'errPerm']
				fm.error(error);
				return dfrd.reject(error);
			}
			
			if ($.inArray(file.mime, mimes) === -1) {
				error = ['errExtract', file.name, 'errNoArchive'];
				fm.error(error);
				return dfrd.reject(error);
			}
			
			fm.request({
				data       : {cmd : 'extract', target : file.hash},
				notify     : {type : 'extract', cnt : 1},
				syncOnFail : true
			})
			.fail(function(error) {
				if (!dfrd.isRejected()) {
					dfrd.reject(error);
				}
			})
			.done(function() {
				complete--;
				if (complete == 0) {
					dfrd.resolve();
				}
			});
			
		}
		
		return dfrd;
	}

}