
elFinder.prototype.commands.back = function() {

	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+left',
		description : 'Go back',
		callback    : function() { this.exec(); }
	}];
	
	this.getstate = function() {
		return this.fm.history.canBack() ? 0 : -1;
	}
	
	this._exec = function() {
		this.fm.history.back();
	}

}