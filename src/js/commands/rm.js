
elFinder.prototype.commands.rm = function() {
	var self = this;
	
	this._handlers = {
		select : function() { self._update(); }
	}
	
	this._shortcuts = [{
		pattern     : 'delete ctrl+backspace',
		description : 'Delete',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return this.fm.selected().length ? this._state.enabled : this._state.disabled;
	}
	
	this._exec = function() {
		var self = this,
			fm = this.fm,
			msg = fm.i18n('Are you shure you want to remove files?') + '<br/>' + fm.i18n('This cannot be undone!'),
			selected = fm.selected();
			
		fm.confirm(fm.i18n('Delete'), msg, function() { fm.rm(selected) });
	}

}