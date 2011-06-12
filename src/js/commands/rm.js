
elFinder.prototype.commands.rm = function() {

	this.title = 'Delete files';

	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace',
		description : this.title
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
			cnt   = files.length;
		
		if (!cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (file.locked) {
				return !dfrd.reject([fm.errors.locked, file.name]);
			}
		});
		
		if (!dfrd.isRejected()) {
			files = this.hashes(hashes);
			
			fm.confirm({
				title  : 'Remove',
				text   : 'Are you shure you want to remove files?<br/>This cannot be undone!',
				accept : {
					label    : 'Remove',
					callback : function() {  
						fm.lockfiles({files : files});
						fm.ajax({
							data   : {cmd  : 'rm', targets : files, current : fm.cwd().hash}, // current - for old api
							notify : {type : 'rm', cnt : cnt},
							preventFail : true
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
		}
			
		return dfrd;
	}

}