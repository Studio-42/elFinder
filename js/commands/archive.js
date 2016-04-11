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
		mimes = [],
		dfrd;
		
	this.variants = [];
	
	this.disableOnSearch = false;
	
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
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length,
			chk = fm.cwd().write,
			cwdId;
		
		if (chk && fm.searchStatus.state > 1) {
			cwdId = fm.cwd().volumeid;
			chk = (cnt === $.map(sel, function(f) { return f.read && f.hash.indexOf(cwdId) === 0 ? f : null; }).length);
		}
		
		return chk && !this._disabled && mimes.length && (cnt || (dfrd && dfrd.state() == 'pending')) ? 0 : -1;
	}
	
	this.exec = function(hashes, type) {
		var files = this.files(hashes),
			cnt   = files.length,
			mime  = type || mimes[0],
			cwd   = fm.cwd(),
			error = ['errArchive', 'errPerm', 'errCreatingTempDir', 'errFtpDownloadFile', 'errFtpUploadFile', 'errFtpMkdir', 'errArchiveExec', 'errExtractExec', 'errRm'],
			i, makeDfrd;

		dfrd = $.Deferred().fail(function(error) {
			error && fm.error(error);
		});

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

		self.mime   = mime;
		self.prefix = ((cnt > 1)? 'Archive' : files[0].name) + (fm.option('archivers')['createext']? '.' + fm.option('archivers')['createext'][mime] : '');
		self.data   = {targets : self.hashes(hashes), type : mime};
		makeDfrd = $.proxy(fm.res('mixin', 'make'), self)();
		dfrd.reject();
		return makeDfrd;
	}

};
