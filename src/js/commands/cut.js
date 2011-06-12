/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.cut = function() {
	
	this.title = 'Cut files';
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+x shift+insert',
		description : 'Cut files',
	}];
	
	this.getstate = function() {
		return this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var fm     = this.fm,
			errors = fm.errors,
			dfrd   = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});
		
		$.each(this.files(hashes), function(i, file) {
			if (!file.read) {
				return !dfrd.reject([errors.copy, file.name, errors.access]);
			}
			if (file.locked) {
				return !dfrd.reject([errors.locked, file.name]);
			}
		});
		
		return dfrd.isRejected() ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes), true));
	}

}