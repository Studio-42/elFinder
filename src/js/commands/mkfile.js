elFinder.prototype.commands.mkfile = function() {
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'text/plain';
	this.prefix          = 'untitle file.txt';
	this.exec            = $.proxy(this.fm.mixins.make, this);
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}