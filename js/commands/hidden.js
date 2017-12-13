/**
 * @class  elFinder command "hidden"
 * Always hidden command for uiCmdMap
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.hidden = function() {
	"use strict";
	this.hidden = true;
	this.updateOnSelect = false;
	this.getstate = function() {
		return -1;
	};
};