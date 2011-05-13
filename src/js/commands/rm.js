
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
			dfrd  = $.Deferred(),
			files = this.files(hashes),
			cnt, i, error, file, hash;
			
		cnt = files.length;
		
		if (!cnt) {
			return dfrd.reject('No files to remove');
		}
			
		for (i = 0; i < cnt; i++) {
			hash = files[i];
			file = fm.file(hash);
			if (file.locked) {
				error = [fm.errors.fileLocked, file.name];
				fm.error(error);
				return dfrd.reject(error)
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
					}).fail(function(error) {
						dfrd.reject(error);
					}).done(function(data) {
						dfrd.done(data);
					}).always(function() {
						fm.unlockfiles({files : files});
					});
				}
			},
			cancel : {
				label : 'Cancel',
				callback : function() { dfrd.done(); }
			}
		});
		return dfrd;
	}

}