
elFinder.prototype.commands.up = function() {
	var self = this;
	
	this.required = true;
	
	this.handlers = {
		open : function() { self.update(self.fm.cwd().phash ? self.states.enabled : self.states.disabled); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+up',
		description : 'Go to parent directory',
		callback    : function() { self.exec() }
	}];
	
	this._exec = function() {
		self.fm.open(self.fm.cwd().phash);
	}

}