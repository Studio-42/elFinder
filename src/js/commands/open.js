
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
	
	this.handlers.select = function() { this.update() };
	
	this.shortcuts = [{
		pattern     : 'ctrl+down' + (this.fm.options.selectOnEnter ? '' : ' enter NUMPAD_ENTER'),
		description : 'Open files or enter directory'
	}];
	
	this.getstate = function() {
		var fm  = this.fm,
			sel = fm.selected(),
			cnt = sel.length;

		return cnt && (cnt == 1 || onlyFiles(sel)) ? fm.cmdStateEnabled : fm.cmdStateDisabled;
	}
	
	this.exec = function(targets) {
		var fm      = this.fm, 
			dfrd    = $.Deferred(),
			targets = targets ? $.isArray(targets) ? targets : [targets] : this.fm.selected(),
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
						}).fail(function() {
							fm.sync(true);
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

			return dfrd.resolve()
		}
		return dfrd.reject(fm.i18n(errors.invOpenArg));
		
	}

}