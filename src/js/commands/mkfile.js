"use strict";
/**
 * @class  elFinder command "mkfile"
 * Create new empty file
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkfile = function() {
	this.title           = 'New text file';
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'text/plain';
	this.prefix          = 'untitle file.txt';
	this.exec            = $.proxy(this.fm.res('mixin', 'make'), this);
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}