
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r',
		description : 'Reload'
	}];
	
	this.getstate = function() {
		return 0;
	}
	
	this._exec = function() {
		var fm = this.fm;
		
		return this.fm.sync(true)
			.done(function(data) {
				fm.reload(data);
			});
	}

}