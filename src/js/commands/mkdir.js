
elFinder.prototype.commands.mkdir = function() {
	
	this.mime   = 'directory';
	this.prefix = 'untitle folder';
	this._exec  = $.proxy(this.fm.mixins.make, this);
	
	this.getstate = function() {
		return 0;
		return this.fm.cwd().write ? 0 : -1;
	}

}