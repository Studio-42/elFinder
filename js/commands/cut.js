/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.cut = function() {
	"use strict";
	var fm = this.fm;
	
	this.shortcuts = [{
		pattern     : 'ctrl+x shift+insert'
	}];
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length,
			filter = function(files) {
				var fres = true;
				return $.grep(files, function(f) {
					fres = fres && f.read && ! f.locked && ! fm.isRoot(f) ? true : false;
					return fres;
				});
			};
		
		return cnt && filter(sel).length == cnt ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var dfrd = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});

		$.each(this.files(hashes), function(i, file) {
			if (!(file.read && ! file.locked && ! fm.isRoot(file)) ) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
			if (file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
		});
		
		return dfrd.state() == 'rejected' ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes), true));
	};

};
