
elFinder.prototype.commands.mkdir = function() {
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitle folder';
	this.exec            = $.proxy(this.fm.mixins.make, this);
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}