
elFinder.prototype.commands.duplicate = function() {
	var self = this;
	
	this._handlers = {
		select : function() { self._update(); }
	}
	
	this._getstate = function() {
		var selected = this.fm.selectedFiles(),
			l = selected.length;
			
		while (l--) {
			if (selected[l].read) {
				return this._state.enabled;
			}
		}
		return this._state.disabled;
	}
	
	this._exec = function() {
		this.fm.duplicate(this.fm.selected());
	}

}