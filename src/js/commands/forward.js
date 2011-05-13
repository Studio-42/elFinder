
elFinder.prototype.commands.forward = function() {
	
	this.alwaysEnabled = true;
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+right',
		description : 'Go forward'
	}];
	
	this.getstate = function() {
		return this.fm.history.canForward() ? 0 : -1;
	}
	
	this._exec = function() {
		return this.fm.history.forward();
	}
	
}