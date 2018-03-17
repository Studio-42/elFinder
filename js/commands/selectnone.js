/**
 * @class  elFinder command "selectnone"
 * Unselect ALL of cwd items
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.selectnone = function() {
	"use strict";
	var self = this,
		fm = this.fm,
		state = -1;
	
	fm.bind('select', function(e) {
		state = (e.data && e.data.unselectall)? -1 : 0;
	});
	
	this.state = -1;
	this.updateOnSelect = false;
	
	this.getstate = function() {
		return state;
	};
	
	this.exec = function() {
		fm.getUI('cwd').trigger('unselectall');
		return $.Deferred().resolve();
	};
};
