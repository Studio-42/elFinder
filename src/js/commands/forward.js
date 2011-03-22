
elFinder.prototype.commands.forward = function() {
	var self = this;
	
	this._required = true;
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+right',
		description : 'Go forward',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return self.fm.history.canForward() ? self._state.enabled : self._state.disabled
	}
	
	this._exec = function() {
		self.fm.history.forward();
	}
	
}