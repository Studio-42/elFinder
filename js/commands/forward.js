/**
 * @class  elFinder command "forward"
 * Open next visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.forward = function() {
	this.alwaysEnabled = true;
	this.updateOnSelect = true;

	if ( $.inArray('forward',this.fm.options.allowShortcuts) !== -1 ) {
		this.shortcuts = [{
			pattern     : 'ctrl+right'
		}];
	}
	
	this.getstate = function() {
		return this.fm.history.canForward() ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.history.forward();
	}
	
}