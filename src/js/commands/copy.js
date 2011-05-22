/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.copy = function() {
	
	this.title = 'Copy files';
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+c ctrl+insert',
		description : 'Copy files',
	}];
	
	this.getstate = function() {
		return this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var fm   = this.fm,
			dfrd = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				}),
			hashes = this.files(hashes),
			l      = hashes.length,
			i, file;
		
		for (i = 0; i < l; i++) {
			file = fm.file(hashes[i]);
			if (!file.read) {
				return dfrd.reject([fm.errors.notCopy, file.name]);
			}
		}
		
		return dfrd.resolve(fm.clipboard(hashes));
	}

}