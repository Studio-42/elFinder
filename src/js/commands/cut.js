/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.cut = function() {
	var fm = this.fm;
	
	this.title = 'Cut';
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+x shift+insert',
		description : 'Cut',
	}];
	
	this.getstate = function(sel) {
		sel = sel || fm.selected();
		return sel.length && $.map(sel, function(h) { var f = fm.file(h); return f.read && f.phash && !f.locked ? h : null }).length == sel.length
			? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm     = this.fm,
			errors = fm.errors,
			dfrd   = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});
		
		$.each(this.files(hashes), function(i, file) {
			if (!(file.read && file.phash) ) {
				return !dfrd.reject([errors.copy, file.name, errors.denied]);
			}
			if (file.locked) {
				return !dfrd.reject([errors.locked, file.name]);
			}
		});
		
		return dfrd.isRejected() ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes), true));
	}

}