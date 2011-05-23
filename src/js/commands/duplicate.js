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
		return this.fm.cwd().write && this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var fm     = this.fm,
			errors = fm.errors,
			phash  = fm.cwd().hash,
			files  = this.files(hashes),
			cnt    = files.length,
			num    = 0,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}), 
			args = [],
			file, i;
			
		if (!cnt) {
			return dfrd.reject([errors.noFilesForCmd, this.title]);
		}
		
		for (i = 0; i < cnt; i++) {
			file = fm.file(files[i]);
			if (!file.read) {
				return dfrd.reject([errors.notDuplicate, file.name]);
			}
			file = fm.file(file.phash);
			if (!file.write) {
				return dfrd.reject(['Unable duplicate "$1" because this location is not writable.', file.name]);
			}
		}
		
		if (fm.oldAPI) {
			$.each(files, function(i, hash) {
				args.push(function() {
					return fm.ajax({
						data   : {cmd : 'duplicate', target : hash, current : fm.files(hash).phash},
						notify : {type : 'duplicate', cnt : 1}
					});
				});
			});

			return fm.waterfall.apply(null, args);
		}
		
		return fm.ajax({
			data   : {cmd : 'duplicate', targets : files},
			notify : {type : 'duplicate', cnt : cnt}
		});
		
	}

}