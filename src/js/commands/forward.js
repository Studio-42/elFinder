
elFinder.prototype.commands.forward = function() {
	var self = this;
	
	this.required = true;
	
	this.handlers = {
		open : function() { self.update(self.fm.history.canForward() ? self.states.enabled : self.states.disabled); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+right',
		description : 'Go forward',
		callback    : function() { self.exec(); }
	}];
	
	this._exec = function() {
		self.fm.history.forward();
	}
	
}