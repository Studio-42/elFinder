
elFinder.prototype.commands.back = function() {

	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+left',
		description : 'Go back'
	}];
	
	this.getstate = function() {
		return this.fm.history.canBack() ? 0 : -1;
	}
	
	this._exec = function() {
		return this.fm.history.back();
	}

}