/**
 * @class elFinder command "duplicate"
 * Create file/folder copy with suffix "copy Number"
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.duplicate = function() {
	"use strict";
	var fm = this.fm;
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length,
			filter = function(files) {
				var fres = true;
				return $.grep(files, function(f) {
					fres = fres && f.read && f.phash === fm.cwd().hash && ! fm.isRoot(f)? true : false;
					return fres;
				});
			};

		return cnt && fm.cwd().write && filter(sel).length == cnt ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var fm     = this.fm,
			files  = this.files(hashes),
			cnt    = files.length,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}), 
			args = [];
			
		if (! cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (!file.read || !fm.file(file.phash).write) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
		});
		
		if (dfrd.state() == 'rejected') {
			return dfrd;
		}
		
		return fm.request({
			data   : {cmd : 'duplicate', targets : this.hashes(hashes)},
			notify : {type : 'copy', cnt : cnt},
			navigate : {
				toast : {
					inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmdduplicate')])}
				}
			}
		});
		
	};

};
