/**
 * @class  elFinder command "archive"
 * Archive selected files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.archive = function() {
	"use strict";
	var self  = this,
		fm    = self.fm,
		mimes = [],
		dfrd;
		
	this.variants = [];
	
	this.disableOnSearch = false;
	
	this.nextAction = {};
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	fm.bind('open reload', function() {
		self.variants = [];
		$.each((mimes = fm.option('archivers')['create'] || []), function(i, mime) {
			self.variants.push([mime, fm.mime2kind(mime)]);
		});
		self.change();
	});
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length,
			chk = (cnt && ! fm.isRoot(sel[0]) && (fm.file(sel[0].phash) || {}).write),
			filter = function(files) {
				var fres = true;
				return $.grep(files, function(f) {
					fres = fres && f.read && f.hash.indexOf(cwdId) === 0 ? true : false;
					return fres;
				});
			},
			cwdId;
		
		if (chk && fm.searchStatus.state > 1) {
			if (chk = (cnt === filter(sel).length)) {
				cwdId = fm.cwd().volumeid;
			}
		}
		
		return chk && !this._disabled && mimes.length && (cnt || (dfrd && dfrd.state() == 'pending')) ? 0 : -1;
	};
	
	this.exec = function(hashes, type) {
		var files = this.files(hashes),
			cnt   = files.length,
			mime  = type || mimes[0],
			cwd   = fm.file(files[0].phash) || null,
			error = ['errArchive', 'errPerm', 'errCreatingTempDir', 'errFtpDownloadFile', 'errFtpUploadFile', 'errFtpMkdir', 'errArchiveExec', 'errExtractExec', 'errRm'],
			i, open;

		dfrd = $.Deferred().fail(function(error) {
			error && fm.error(error);
		});

		if (! (cnt && mimes.length && $.inArray(mime, mimes) !== -1)) {
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
		
		if (fm.cwd().hash !== cwd.hash) {
			open = fm.exec('open', cwd.hash).done(function() {
				fm.one('cwdrender', function() {
					fm.selectfiles({files : hashes});
					dfrd = $.proxy(fm.res('mixin', 'make'), self)();
				});
			});
		} else {
			fm.selectfiles({files : hashes});
			dfrd = $.proxy(fm.res('mixin', 'make'), self)();
		}
		
		return dfrd;
	};

};
