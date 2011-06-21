/**
 * @class elFinder command "duplicate"
 * Create file/folder copy with suffix "copy Number"
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.duplicate = function() {
	var fm = this.fm;
	
	this.title = 'Duplicate';
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.getstate = function(sel) {
		sel = sel || this.fm.selected();
		return sel.length 
			&& sel[0] != this.fm.cwd().hash
			&& $.map(sel, function(h) { return fm.file(h).read ? h : null }).length == sel.length
			? 0 : -1;
		
		
		sel = sel || this.fm.selected();
		return sel.length && sel[0] != this.fm.cwd().hash && this.fm.file(sel[0]).write ? 0 : -1;
		
		if (!files) {
			files = this.fm.selected();
		}

		return files.length && this.fm.file(files[0]).write ? 0 : -1;
		return this.fm.cwd().write && this.fm.selected().length ? 0 : -1;
	}
	
	this.exec = function(hashes) {
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
				return !dfrd.reject([errors.copy, file.name, errors.denied]);
			}
			if (!fm.file(file.phash).write) {
				return !dfrd.reject([errors.copy, file.name, errors.denied]);
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
						notify : {type : 'copy', cnt : 1}
					});
				});
			});

			return fm.waterfall.apply(null, args);
		}
		
		return fm.ajax({
			data   : {cmd : 'duplicate', targets : this.hashes(hashes)},
			notify : {type : 'copy', cnt : cnt}
		});
		
	}

}