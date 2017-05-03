"use strict";
/**
 * @class  elFinder command "hidden"
 * Always hidden command for uiCmdMap
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.hidden = function() {
	//this._disabled = true;
	this.hidden = true;
	this.updateOnSelect = false;
	this.getstate = function() {
		return -1;
	}
};