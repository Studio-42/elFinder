/**
 * @class  elFinder command "back"
 * Open last visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.back = function() {
	this.title = 'Back';
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+left',
		description : 'Go back'
	}];
	
	this.getstate = function() {
		return this.fm.history.canBack() ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.history.back();
	}

}