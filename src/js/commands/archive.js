"use strict"
/**
 * @class  elFinder command "archive"
 * Archive selected files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.archive = function() {
	var self  = this,
		fm    = self.fm;
		
	this.mimes = [];
	
	this.title = 'Create archive';
	
	this.handlers = {
		select  : function() { this.update(); },
	};
	
	this.options = { ui : 'archivebutton'}
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	this.init = function() {
		fm.one('load', function() {
			fm.bind('open reload', function() {
				self.mimes = fm.option('archivers')['create'] || [];
			});
		});
	}
	
	this.getstate = function() {
		return self.mimes.length && fm.selected().length && fm.cwd().write ? 0 : -1;
	}
	
	this._exec = function(hashes, type) {
		var files = this.files(hashes),
			cnt   = files.length,
			mime  = type || this.mimes[0],
			cwd   = fm.cwd(),
			error = [fm.errors.archive, fm.errors.denied],
			dfrd  = $.Deferred().fail(function(error) {
				error && fm.error(error);
			}), 
			i;
		
		if (!(cnt && self.mimes.length && $.inArray(mime, this.mimes) !== -1)) {
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

		return fm.ajax({
			data       : {cmd : 'archive', targets : this.hashes(hashes), type : mime, current : cwd.hash},
			notify     : {type : 'archive', cnt : 1},
			syncOnFail : true
		});
	}

}