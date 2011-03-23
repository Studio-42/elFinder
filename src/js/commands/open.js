
elFinder.prototype.commands.open = function() {
	var self = this;
	
	this._required = true;
	
	this._handlers = {
		select : function() { self._update(); }
	}

	this._shortcuts = [{
		pattern     : 'ctrl+down' + (this.fm.options.selectOnEnter ? '' : ' enter NUMPAD_ENTER'),
		description : 'Open file or enter directory',
		callback    : function() { self.exec(); }
	}];
	
	this._init = function() {
		var fm = this.fm;
		if (!fm.options.selectOnDblClick) {
			fm.bind('dblclick', function(e) {
				fm.open(e.data.file);
			})
		}
	}
	
	this._getstate = function() {
		return this.fm.selected().length ? this._state.enabled : this._state.disabled;
	}
	
	this._exec = function() {
		var fm = this.fm,
			selected = fm.selected();
			
		selected.length == 1
			? fm.open(selected[0])
			: $.each(selected, function(i, hash) {
				fm.file(hash).mime != 'directory' && fm.open(hash);
			});
	}

}