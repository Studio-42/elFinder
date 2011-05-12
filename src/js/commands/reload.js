
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r',
		description : 'Reload'
	}];
	
	this.getstate = function() {
		return 0;
		return self._state.enabled;
	}
	
	this._exec = function() {
		this.fm.sync(true);
	}

}