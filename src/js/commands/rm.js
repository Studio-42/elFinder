
elFinder.prototype.commands.rm = function() {

	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace',
		description : 'Delete'
	}];
	
	this.getstate = function() {
		return this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var self  = this,
			fm    = this.fm,
			dfrd  = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			files = this.files(hashes),
			cnt   = files.length, 
			i, error, file, hash;
		
		if (!cnt) {
			return dfrd.reject('No files to remove');
		}
			
		for (i = 0; i < cnt; i++) {
			hash = files[i];
			file = fm.file(hash);
			if (file.locked) {
				return dfrd.reject([fm.errors.fileLocked, file.name]);
			}
		}
			
		fm.confirm({
			title  : 'Remove',
			text   : 'Are you shure you want to remove files?<br/>This cannot be undone!',
			accept : {
				label    : 'Remove',
				callback : function() {  
					fm.lockfiles({files : files});
					fm.ajax({
						data   : {cmd : 'rm', targets : files, current : fm.cwd().hash},
						notify : {type : 'rm', cnt : cnt}
					})
					.fail(function(error) {
						dfrd.reject(error);
					})
					.done(function(data) {
						dfrd.done(data);
					}
					).always(function() {
						fm.unlockfiles({files : files});
					});
				}
			},
			cancel : {
				label    : 'Cancel',
				callback : function() { dfrd.reject(); }
			}
		});
		return dfrd;
	}

}