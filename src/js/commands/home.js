
elFinder.prototype.commands.home = function() {
	
	this.alwaysEnabled = true;
	
	this._shortcuts = [{
		pattern     : 'ctrl+home ctrl+shift+up',
		description : 'Go to root folder'
	}];
	
	this.getstate = function() {
		var root = this.fm.root(),
			cwd  = this.fm.cwd().hash;
			
		return root && cwd && root != cwd ? 0: -1;
	}
	
	this._exec = function() {
		this.fm.exec('open', this.fm.root());
	}
	

}