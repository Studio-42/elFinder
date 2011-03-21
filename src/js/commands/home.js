
elFinder.prototype.commands.home = function() {
	var self = this;
	
	this.required = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+home ctrl+shift+up',
		description : 'Go to parent directory',
		callback    : function() { self.exec(); }
	}];
	
	this._exec = function() {
		self.fm.open(self.fm.root());
	}

}