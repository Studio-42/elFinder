
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
		};
	
	this.alwaysEnabled = true;
	
	this.handlers = {
		select   : function() { this.update() },
		dblclick : function(e) { this.exec([e.data.file]) }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down enter NUMPAD_ENTER',
		description : 'Open files or enter directory'
	}];
	
	// fake for button
	this.disabled = function() {
		return this.state <= 0;
	}
	
	// fake for button
	this.active = function() {
		return false;
	}
	
	this.getstate = function() {
		var fm  = this.fm,
			sel = fm.selected(),
			cnt = sel.length;

		return cnt && (cnt == 1 || onlyFiles(sel)) ? 1 : 0;
	}
	
	this._exec = function(hashes) {
		var fm      = this.fm, 
			dfrd    = $.Deferred(),
			targets = this.files(hashes),
			cnt     = targets.length,
			errors  = fm.errors,
			hash, file, i, url, s, w;

		if (cnt && (cnt == 1 || onlyFiles(targets))) {
			
			if (cnt == 1) {
				hash = targets[0];
				file = fm.file(hash);
				if (!file || file.mime == 'directory') {
					if (file && !file.read) {
						this.enabled() && fm.error([errors.notRead, file.name])
						return dfrd.reject(fm.i18n([errors.notRead, file.name]));
					}

					return fm.ajax({
							data   : {cmd : 'open', target : hash},
							notify : {type : 'open', cnt : 1, hideCnt : true},
							freeze : true
						})
						.fail(function() {
							fm.sync(true)
								.fail(function() {
									var cwd = fm.cwd().hash,
										root = fm.root();
									if (cwd && root && cwd != root) {
										self._exec(fm.root());
									}
								});
						});
				}
			}
			
			for (i = 0; i < cnt; i++) {
				hash = targets[i];
				file = fm.file(hash)
				if (!file) {
					return dfrd.reject(fm.i18n(errors.notFound));
				}
				if (!file.read) {
					return dfrd.reject(fm.i18n([errors.notRead, file.name]));
				}

				if (!(url = fm.url(file.hash))) {
					url = fm.option('url');
					url = url + (url.substr(-1, 1) == '/' ? '?' : '&')
						+ (fm.oldAPI ? 'cmd=open&current='+file.phash : 'cmd=file')
						+ '&target=' + file.hash;
				}

				// image - set window size
				if (file.dim) {
					s = file.dim.split('x');
					w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
				}

				if (!window.open(url, '_blank', w + ',top=50,left=50,scrollbars=yes,resizable=yes')) {
					return dfrd.reject(fm.i18n(errors.popupBlocks));
				}
			}

			return dfrd.resolve();
		}
		return dfrd.reject(fm.i18n(errors.invOpenArg));
		
	}

}