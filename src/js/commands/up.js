
elFinder.prototype.commands.up = function() {
	this.title = 'Go to parent directory';
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	
	this.shortcuts = [{
		pattern     : 'ctrl+up backspace',
		description : this.title
	}];
	
	this.getstate = function() {
		return this.fm.cwd().phash ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.exec('open', this.fm.cwd().phash);
	}

}