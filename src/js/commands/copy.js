
elFinder.prototype.commands.copy = function() {
	var self = this;
	
	this._handlers = {
		select : function() { self._update(); }
	}
	
	this._shortcuts = [{
		pattern     : 'ctrl+c ctrl+insert',
		description : 'Copy',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return this.fm.selected().length ? this._state.enabled : this._state.disabled;
	}
	
	this._exec = function() {
		self.fm.copy(this.fm.selected());
	}

}