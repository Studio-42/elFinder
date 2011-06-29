
elFinder.prototype.commands.mkdir = function() {
	this.title = 'New folder';
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitle folder';
	this.exec            = $.proxy(this.fm.mixins.make, this);
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n',
		description : this.title,
	}];
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}