/**
 * @class elFinder command "duplicate"
 * Create file/folder copy with suffix "copy Number"
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.duplicate = function() {
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.getstate = function() {
		return this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var fm    = this.fm,
			phash = fm.cwd().hash,
			files = this.files(hashes),
			cnt   = files.length,
			num   = 0,
			dfrd  = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}), 
			i;
			
		if (!cnt) {
			return dfrd.reject(fm.errors.nothing);
		}
		
		for (i = 0; i < cnt; i++) {
			if (!fm.file(files[i]).read) {
				return dfrd.reject([fm.errors.noFilesForCmd, this.title]);
			}
		}
		
		if (fm.newAPI) {
			return fm.ajax({
				data   : {cmd : 'duplicate', targets : files},
				notify : {type : 'duplicate', cnt : cnt}
			});
		} 
				
		$.each(files, function(i, hash) {
			fm.ajax({
				data   : {cmd : 'duplicate', target : hash, current : phash},
				notify : {type : 'duplicate', cnt : 1}
			})
			.fail(function(error) {
				num++;
				if (!dfrd.isRejected()) {
					dfrd.reject(error);
				}
			})
			.done(function(data) {
				if (++num == cnt && !dfrd.isRejected()) {
					dfrd.resolve(data);
				}
			});
		});
		
		return dfrd;
	}

}