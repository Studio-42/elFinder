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
			files  = this.files(hashes),
			cnt    = files.length,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}), 
			args = [];
			
		if (!cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (!file.read) {
				return !dfrd.reject([errors.copy, file.name, errors.access]);
			}
			if (!fm.file(file.phash).write) {
				return !dfrd.reject([errors.copy, file.name, errors.access]);
			}
		})
		
		if (dfrd.isRejected()) {
			return dfrd;
		}
		
		if (fm.oldAPI) {
			$.each(files, function(i, file) {
				args.push(function() {
					return fm.ajax({
						data   : {cmd : 'duplicate', target : file.hash, current : file.phash},
						notify : {type : 'duplicate', cnt : 1}
					});
				});
			});

			return fm.waterfall.apply(null, args);
		}
		
		return fm.ajax({
			data   : {cmd : 'duplicate', targets : this.hashes(hashes)},
			notify : {type : 'duplicate', cnt : cnt}
		});
		
	}

}