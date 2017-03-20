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
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;

		return cnt && fm.cwd().write && $.map(sel, function(f) { return f.read && f.phash === fm.cwd().hash && ! fm.isRoot(f)? f : null  }).length == cnt ? 0 : -1;
	}
	
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
			notify : {type : 'copy', cnt : cnt}
		}).done(function(data) {
			var newItem;
			if (data && data.added && data.added[0]) {
				fm.one('duplicatedone', function() {
					newItem = fm.findCwdNodes(data.added);
					if (newItem.length) {
						newItem.trigger('scrolltoview');
					} else {
						fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
						fm.toast({msg: fm.i18n(['complete', fm.i18n('cmdduplicate')])});
					}
				});
			}
		});
		
	}

};
