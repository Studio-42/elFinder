
elFinder.prototype.commands.rm = function() {

	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace',
		description : 'Delete',
		callback    : function() { this.exec(); }
	}];
	
	this.getstate = function() {
		return this.fm.selected().length ? 0 : -1;
	}
	
	this._exec = function() {
		var self = this,
			fm = this.fm,
			dfrd = $.Deferred(),
			sel = fm.selected();
			cnt = sel.length,
			opts = {
				cssClass : 'elfinder-dialog-confirm',
				title : fm.i18n('Confirmation requied'),
				modal : true
			},
			d = '<span class="elfinder-dialog-icon elfinder-dialog-icon-confirm"/>'+fm.i18n('Are you shure you want to remove files?<br/>This cannot be undone!');
			
			
		fm.confirm({
			text : 'Are you shure you want to remove files?<br/>This cannot be undone!',
			accept : {
				label : 'Continue',
				callback : function() { fm.log('Ok') }
			},
			cancel : {
				label : 'Cancel',
				callback : function() { fm.log('Cancel')}
			},
			reject : {
				label : 'No',
				callback : function(checked) { fm.log('No').log(checked)}
			},
			all : true
		})
		// fm.dialog(d, opts)
			
			
		return dfrd;
		
		var self = this,
			fm = this.fm,
			msg = fm.i18n('Are you shure you want to remove files?<br/>This cannot be undone!'),
			selected = fm.selected();
			
		fm.confirm(fm.i18n('Delete'), msg, function(result) { result && fm.rm(selected) });
	}

}