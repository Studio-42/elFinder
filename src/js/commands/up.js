
elFinder.prototype.commands.up = function() {
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+up backspace',
		description : 'Go to parent directory'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().phash ? 0 : -1;
	}
	
	this._exec = function() {
		this.fm.exec('open', this.fm.cwd().phash);
	}

}