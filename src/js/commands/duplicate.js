"use strict";
/**
 * @class elFinder command "duplicate"
 * Create file/folder copy with suffix "copy Number"
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.duplicate = function() {
	var fm = this.fm;
	
	this.disableOnSearch = true;
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return cnt && fm.cwd().write && $.map(sel, function(f) { return f.phash && f.read ? f : null  }).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm     = this.fm,
			errors = fm.errors(),
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
		});
		
		if (dfrd.isRejected()) {
			return dfrd;
		}
		
		if (fm.oldAPI) {
			$.each(files, function(i, file) {
				args.push(function() {
					return fm.request({
						data   : {cmd : 'duplicate', target : file.hash, current : file.phash},
						notify : {type : 'copy', cnt : 1}
					});
				});
			});

			return fm.waterfall.apply(null, args);
		}
		
		return fm.request({
			data   : {cmd : 'duplicate', targets : this.hashes(hashes)},
			notify : {type : 'copy', cnt : cnt}
		});
		
	}

}