"use strict"
/**
 * @class  elFinder command "extract"
 * Extract files from archive
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.archive = function() {
	var self    = this,
		fm      = self.fm,
		mimes   = [];
	
	this.title = 'Create archive';
	
	this._handlers = {
		select  : function() { this.update(); },
	};
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	this.init = function() {
		fm.one('load', function() {
			fm.bind('open reload', function() {
				mimes = fm.option('archivers')['create'] || [];
			});
		});
	}
	
	this.getstate = function() {
		return mimes.length && fm.selected().length && fm.cwd().write ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var files = this.files(hashes),
			cnt   = files.length,
			cwd   = fm.cwd(),
			error = [fm.errors.archive, fm.errors.denied],
			dfrd  = $.Deferred().fail(function(error) {
				error && fm.error(error);
			}), 
			i;
		
		fm.log(files)
		
		if (!(cnt && mimes.length)) {
			return dfrd.reject();
		}
		
		if (!cwd.write) {
			return dfrd.reject(error);
		}
		
			
		for (i = 0; i < cnt; i++) {
			if (!files[i].read) {
				return dfrd.reject(error)
			}
		}

		return fm.ajax({
			data       : {cmd : 'archive', targets : this.hashes(hashes), type : mimes[0], current : cwd.hash},
			notify     : {type : 'archive', cnt : 1},
			// syncOnFail : true
		});
	}

}