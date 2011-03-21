
elFinder.prototype.commands.back = function() {
	var self = this;
	
	this.required = true;
	
	this.handlers = {
		open : function() { self.update(self.fm.history.canBack() ? self.states.enabled : self.states.disabled); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+left',
		description : 'Go back',
		callback    : function() { self.exec(); }
	}];
	
	this._exec = function() {
		self.fm.history.back();
	}

}