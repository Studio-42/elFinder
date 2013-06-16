"use strict"
/**
 * @class  elFinder command "archive"
 * Archive selected files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.archive = function() {
	var self  = this,
		fm    = self.fm,
		mimes = [];
		
	this.variants = [];
	
	this.disableOnSearch = true;
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	fm.bind('open reload', function() {
		self.variants = [];
		$.each((mimes = fm.option('archivers')['create'] || []), function(i, mime) {
			self.variants.push([mime, fm.mime2kind(mime)])
		});
		self.change();
	});
	
	this.getstate = function() {
		return !this._disabled && mimes.length && fm.selected().length && fm.cwd().write ? 0 : -1;
	}
	
	this.exec = function(hashes, type) {
		var files = this.files(hashes),
			cnt   = files.length,
			mime  = type || mimes[0],
			cwd   = fm.cwd(),
			error = ['errArchive', 'errPerm', 'errCreatingTempDir', 'errFtpDownloadFile', 'errFtpUploadFile', 'errFtpMkdir', 'errArchiveExec', 'errExtractExec', 'errRm'],
			dfrd  = $.Deferred().fail(function(error) {
				error && fm.error(error);
			}), 
			i;

		if (!(this.enabled() && cnt && mimes.length && $.inArray(mime, mimes) !== -1)) {
			return dfrd.reject();
		}
		
		if (!cwd.write) {
			return dfrd.reject(error);
		}
		
		for (i = 0; i < cnt; i++) {
			if (!files[i].read) {
				return dfrd.reject(error);
			}
		}

		return fm.request({
			data       : {cmd : 'archive', targets : this.hashes(hashes), type : mime},
			notify     : {type : 'archive', cnt : 1},
			syncOnFail : true
		});
	}

}