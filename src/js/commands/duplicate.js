
elFinder.prototype.commands.duplicate = function() {
	
	this.handlers = {
		select : function() { this.update(); }
	}
	
	this.getstate = function() {
		var l = this.fm.selected().length;
		return l
			? this.fm.newAPI ? 0 : l == 1 ? 0 : -1
			: -1;
	}
	
	this._exec = function(hashes) {
		var self  = this,
			fm    = this.fm,
			files = this.files(hashes),
			cnt   = files.length,
			dfrd  = $.Deferred(), 
			data  = {cmd : 'duplicate'},
			i, file, error;
			
		if (!cnt) {
			return dfrd.reject('Nothing to duplicate');
		}
		
		for (i = 0; i < cnt; i++) {
			file = fm.file(files[i]);
			
			if (!file.read) {
				error = [fm.errors.notDuplicate, file.name];
				fm.error(error);
				return dfrd.reject(error);
			}
		}
		
		if (fm.newAPI) {
			data.targets = files;
		} else {
			data.target  = files.shift();
			data.current = fm.cwd().hash;
		}
		
		return fm.ajax({
			data : data,
			notify : {type : 'duplicate', cnt : fm.newAPI ? cnt : 1}
		})
		
		
		
		// this.fm.duplicate(this.fm.selected());
	}

}