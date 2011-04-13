
elFinder.prototype.commands.reload = function() {
	var self = this;
	
	this._required = true;
	
	this._shortcuts = [{
		pattern     : 'ctrl+shift+r',
		description : 'Reload',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return self._state.enabled;
	}
	
	this._exec = function() {
		self.fm.reload();
	}

}