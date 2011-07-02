"use strict";
/**
 * @class  elFinder command "view"
 * Change current directory view (icons/list)
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.view = function() {
	this.value          = this.fm.storage('view');
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.options = { ui : 'viewbutton'};
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		this.fm.searchend().viewchange();
		this.update(void(0), this.fm.storage('view'));
	}

}