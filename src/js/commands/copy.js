/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.copy = function() {
	var fm = this.fm;
	
	this.title = 'Copy';
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+c ctrl+insert',
		description : 'Copy',
	}];
	
	this.getstate = function(sel) {
		sel = sel || fm.selected();
		return sel.length 
			&& sel[0] != fm.cwd().hash
			&& $.map(sel, function(h) { return fm.file(h).read ? h : null }).length == sel.length
			? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var fm   = this.fm,
			dfrd = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});
		
		$.each(this.files(hashes), function(i, file) {
			if (!file.read) {
				return !dfrd.reject([fm.errors.copy, file.name, fm.errors.denied]);
			}
		});
		
		return dfrd.isRejected() ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes)));
	}

}