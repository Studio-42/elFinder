
elFinder.prototype.commands.open = function() {
	var self = this,
		onlyFiles = function(hashes) {
			var i = hashes.length, f;
			
			while (i--) {
				f = self.fm.file(hashes[i]);
				if (!f || f.mime == 'directory') {
					return false;
				}
			}
			return true;
		},
		callback = function(e) {
			e.preventDefault();
			self.exec();
		};
	
	this.title = 'Open';
	this.alwaysEnabled = true;
	
	this.handlers = {
		select   : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter',
		description : 'Open files or enter directory'
	}];
	
	this.init = function() {
		var self       = this,
			fm         = this.fm,
			o          = fm.options,
			name       = 'open',
			dblclick   = o.dblclick == name,
			enter      = o.enter == name,
			shiftenter = o.shiftenter == name
			;

		fm.one('load', function() {
			dblclick && fm.bind('dblclick', callback);
			
			enter && fm.shortcut({
				pattern     : 'enter',
				description : self.title,
				callback    : callback
			});
			
			shiftenter && fm.shortcut({
				pattern     : 'shift+enter',
				description : self.title,
				callback    : callback
			});
		})
	}
	
	this.getstate = function() {
		var fm  = this.fm,
			sel = fm.selected(),
			cnt = sel.length;

		return cnt && (cnt == 1 || onlyFiles(sel)) ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		return this._exec(hashes);
	}
	
	this._exec = function(hashes) {
		var fm      = this.fm, 
			dfrd    = $.Deferred().fail(function(error) { error && fm.error(error); }),
			targets = this.files(hashes),
			cnt     = targets.length,
			hashes  = $.isArray(hashes) ? hashes : [],
			errors  = fm.errors,
			hash, file, i, url, s, w;

		// open directory
		if (hashes.length == 1 || cnt == 1) {
			if (!cnt || ((file = fm.file(targets[0])) && file.mime == 'directory')) {
				return file && !file.read
					? dfrd.reject([errors.read, file.name])
					: fm.ajax({
							data   : {cmd  : 'open', target : targets[0]},
							notify : {type : 'open', cnt : 1, hideCnt : true},
							syncOnFail : true
						})
						// .fail(function(error) {
						// 	error && fm.sync(true)
						// 		.fail(function() {
						// 			var cwd = fm.cwd().hash,
						// 				root = fm.root();
						// 			if (cwd && root && cwd != root) {
						// 				self._exec(fm.root());
						// 			}
						// 		});
						// });
			}
		}

		if (!cnt || !onlyFiles(targets)) {
			return dfrd.reject();
		}

		// open files
		for (i = 0; i < cnt; i++) {
			hash = targets[i];
			file = fm.file(hash)
			if (!file) {
				return dfrd.reject(fm.i18n([errors.openFile, errors.fileNotFound]));
			}
			if (!file.read) {
				return dfrd.reject(fm.i18n([errors.read, file.name]));
			}

			if (!(url = fm.url(file.hash))) {
				url = fm.options.url;
				url = url + (url.indexOf('?') === -1 ? '?' : '&')
					+ (fm.oldAPI ? 'cmd=open&current='+file.phash : 'cmd=file')
					+ '&target=' + file.hash;
			}
			
			// set window size for image
			if (file.dim) {
				s = file.dim.split('x');
				w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
			}

			if (!window.open(url, '_blank', w + ',top=50,left=50,scrollbars=yes,resizable=yes')) {
				return dfrd.reject(errors.popupBlocks);
			}
		}

		return dfrd.resolve(targets);
	}

}