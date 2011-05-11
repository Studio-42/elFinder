
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r',
		description : 'Reload'
	}];
	
	this.getstate = function() {
		return -1;
		return self._state.enabled;
	}
	
	this._exec = function() {
		this.fm.reload();
	}

}