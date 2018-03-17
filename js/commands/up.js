/**
 * @class  elFinder command "up"
 * Go into parent directory
 *
 * @author Dmitry (dio) Levashov
 **/
(elFinder.prototype.commands.up = function() {
	"use strict";
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	
	this.shortcuts = [{
		pattern     : 'ctrl+up'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().phash ? 0 : -1;
	};
	
	this.exec = function() {
		var fm = this.fm,
			cwdhash = fm.cwd().hash;
		return this.fm.cwd().phash ? this.fm.exec('open', this.fm.cwd().phash).done(function() {
			fm.one('opendone', function() {
				fm.selectfiles({files : [cwdhash]});
			});
		}) : $.Deferred().reject();
	};

}).prototype = { forceLoad : true }; // this is required command
