/**
 * @class  elFinder command "view"
 * Change current directory view (icons/list)
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.view = function() {
	this.title          = 'View';
	this.value          = this.fm.view;
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	
	
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		this.fm.viewchange();
		this.value = this.fm.view;
	}

}