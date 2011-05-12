
elFinder.prototype.commands.getfile = function() {
	
	this.alwaysEnabled = true;
	
	this.callback = typeof(this.fm.options.getFileCallback) == 'function' ? this.fm.options.getFileCallback : false;
	
	this.handlers = {
		select : function() { this.update() }
	}
	
	this.init = function() {
		var self = this,
			fm   = this.fm;

		if (this.callback) {
			this.options.dblclick && fm.dblclick(function(e) { 
				if (self.getstate() > -1) {
					e.preventDefault();
					self.exec();
				}
			});
			
			this.options.enter && fm.shortcut({
				pattern     : 'enter numpad_enter',
				description : 'Return file info into callback',
				callback    : function() {
					self.getstate() > -1 && self.exec();
				}
			});
		}

	}
	
	this.getstate = function() {
		var fm = this.fm,
			sel = fm.selected(),
			cnt = sel.length, f;
			
		if (!this.callback || !cnt || (cnt > 1 && !this.options.multiple)) {
			return -1;
		}
		
		if (this.options.folders) {
			return 0;
		}	
		while (cnt--) {
			f = fm.file(sel[cnt]);
			if (f && f.mime == 'directory') {
				return -1;
			}
		}
		return 0;

	}
	
	this._exec = function() {
		var fm     = this.fm,
			hashes = this.options.multiple ? fm.selected() : [fm.selected().shift()],
			files  = [];
			
		$.each(hashes, function(i, hash) {
			var file = fm.file(hash);
			
			if (file) {
				file.baseUrl = fm.option('url')
				file.url = fm.url(hash);
				file.path = fm.path(hash);
				files.push(file);
			}

		});
		fm.trigger('getfile', {files : files});
		this.callback(files);
		return $.Deferred().resolve();
	}

}