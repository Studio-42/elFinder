
elFinder.prototype.commands.up = function() {
	var self = this;
	
	this._required = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+up',
		description : 'Go to parent directory',
		callback    : function() { self.exec() }
	}];
	
	this._getstate = function() {
		return self.fm.cwd().phash ? self._state.enabled : self._state.disabled;
	}
	
	this._exec = function() {
		self.fm.open(self.fm.cwd().phash);
	}

}