/**
 * @class  elFinder command "colwidth"
 * CWD list table columns width to auto
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.colwidth = function() {
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	
	this.getstate = function() {
		return this.fm.getUI('cwd').find('table').css('table-layout') === 'fixed' ? 0 : -1;
	}
	
	this.exec = function() {
		this.fm.getUI('cwd').trigger('colwidth');
	}
	
};