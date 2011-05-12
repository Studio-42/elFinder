
elFinder.prototype.commands.forward = function() {
	
	this.alwaysEnabled = true;
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+right',
		description : 'Go forward',
		callback    : function() { self.exec(); }
	}];
	
	this.getstate = function() {
		return this.fm.history.canForward() ? 0 : -1;
	}
	
	this._exec = function() {
		this.fm.history.forward();
	}
	
}