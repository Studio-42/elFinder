/**
 * @class  elFinder command "reload"
 * Sync files and folders
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	this.updateOnSelect = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r f5'
	}];
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var fm      = this.fm,
			dfrd    = fm.sync(),
			timeout = setTimeout(function() {
				fm.notify({type : 'reload', cnt : 1, hideCnt : true});
				dfrd.always(function() { fm.notify({type : 'reload', cnt  : -1}); });
			}, fm.notifyDelay);
			
		return dfrd.always(function() { 
			clearTimeout(timeout); 
			fm.trigger('reload');
		});
	}

}