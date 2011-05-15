elFinder.prototype.commands.mkfile = function() {
	
	this.mime   = 'plain/text';
	this.prefix = 'untitle file';
	this._exec  = $.proxy(this.fm.mixins.make, this);
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}