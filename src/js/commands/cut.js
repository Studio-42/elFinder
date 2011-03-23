
elFinder.prototype.commands.cut = function() {
	var self = this;
	
	this._handlers = {
		select : function() { self._update(); }
	}
	
	this._shortcuts = [{
		pattern     : 'ctrl+x',
		description : 'Cut',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return this.fm.selected().length ? this._state.enabled : this._state.disabled;
	}
	
	this._exec = function() {
		self.fm.cut(this.fm.selected());
	}

}