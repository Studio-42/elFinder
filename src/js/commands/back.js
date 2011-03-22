
elFinder.prototype.commands.back = function() {
	var self = this;
	
	this._required = true;
	
	
	this._shortcuts = [{
		pattern     : 'ctrl+left',
		description : 'Go back',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return self.fm.history.canBack() ? self._state.enabled : self._state.disabled
	}
	
	this._exec = function() {
		self.fm.history.back();
	}

}