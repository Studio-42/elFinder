/**
 * @class  elFinder command "selectinvert"
 * Invert Selection of cwd items
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.selectinvert = function() {
	"use strict";
	this.updateOnSelect = false;
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function() {
		$(document).trigger($.Event('keydown', { keyCode: 73, ctrlKey : true, shiftKey : true, altKey : false, metaKey : false }));
		return $.Deferred().resolve();
	};

};
