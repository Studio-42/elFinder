"use strict";
/**
 * @class  elFinder command "mkdir"
 * Create new folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkdir = function() {
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitle folder';
	this.exec            = $.proxy(this.fm.res('mixin', 'make'), this);
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}