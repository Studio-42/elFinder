
elFinder.prototype.commands.duplicate = function() {
	var self = this;
	
	this._handlers = {
		select : function() { self._update(); }
	}
	
	this._getstate = function() {
		return this._state[this.fm.selected().length ? 'enabled' : 'disabled'];
	}
	
	this._exec = function() {
		this.fm.duplicate(this.fm.selected());
	}

}