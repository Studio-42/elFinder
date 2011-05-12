
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r',
		description : 'Reload'
	}];
	
	this.getstate = function() {
		return 0;
	}
	
	this._exec = function() {
		var fm = this.fm;
		
		return this.fm.sync(true)
			.done(function() {
				fm.reload();
			})
			.fail(function(error) {
				var cwd = fm.cwd().hash,
					root = fm.root();
				
				fm.error(error);
				if (cwd != root) {
					fm.ajax({
						data : {cmd : 'open', target : root, tree : 1, init : 1},
						notify : {type : 'open', cnt : 1, hideCnt : true}
					});
				}
			});
	}

}