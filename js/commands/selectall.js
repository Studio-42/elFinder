"use strict";
/**
 * @class  elFinder command "selectall"
 * Select ALL of cwd items
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.selectall = function() {
	var self = this,
		state = 0;
	
	this.fm.bind('select', function(e) {
		state = (e.data && e.data.selectall)? -1 : 0;
	});
	
	this.state = 0;
	this.updateOnSelect = false;
	
	this.getstate = function() {
		return state;
	}
	
	this.exec = function() {
		$(document).trigger($.Event('keydown', { keyCode: 65, ctrlKey : true, shiftKey : false, altKey : false, metaKey : false }));
		return $.Deferred().resolve();
	}
};
