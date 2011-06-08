/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
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
			// var sel = self.fm.selected();
			e.preventDefault();
			// sel.length && 
			self.exec();
		};
	
	this.title = 'Open';
	this.alwaysEnabled = true;
	
	this.handlers = {
		select   : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter',
		description : 'Open files or enter folder',
		callback    : callback
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
		var sel = this.fm.selected(),
			cnt = sel.length;

		return cnt && (cnt == 1 || onlyFiles(sel)) ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		return this._exec(hashes);
	}
	
	this._exec = function(hashes) {
		// this.fm.log(hashes)
		var fm      = this.fm, 
			dfrd    = $.Deferred().fail(function(error) { error && fm.error(error); }),
			hashes  = hashes == void 0 ? fm.selected() : $.isArray(hashes) ? hashes : [hashes],
			cnt    = hashes.length,
			dir
			;
		// this.fm.log(hashes)

		if (cnt == 1 && (!(dir = fm.file(hashes[0])) || dir.mime == 'directory')) {
			// fm.log(dir)
			return dir && !dir.read
				? dfrd.reject([errors.open, dir.name, errors.denied])
				: fm.ajax({
						data   : {cmd  : 'open', target : hashes[0]},
						notify : {type : 'open', cnt : 1, hideCnt : true},
						syncOnFail : true
					});
		}
		
		return;	
		var fm      = this.fm, 
			dfrd    = $.Deferred().fail(function(error) { error && fm.error(error); }),
			targets = this.files(hashes),
			cnt     = targets.length,
			hashes  = $.isArray(hashes) ? hashes : [],
			errors  = fm.errors,
			hash, file, i, url, s, w;
			
			
		fm.log(cnt)
		// open directory
		if (hashes.length == 1 || cnt == 1) {
			if (!cnt || ((file = fm.file(targets[0])) && file.mime == 'directory')) {
				return file && !file.read
					? dfrd.reject([errors.open, file.name, errors.denied])
					: fm.ajax({
							data   : {cmd  : 'open', target : targets[0]},
							notify : {type : 'open', cnt : 1, hideCnt : true},
							// syncOnFail : true
						});
			}
		}

		

		// files and folders selected - do nothing
		if (!cnt || !onlyFiles(targets)) {
			return dfrd.reject();
		}

		// open files
		for (i = 0; i < cnt; i++) {
			hash = targets[i];
			file = fm.file(hash)

			if (!file.read) {
				return dfrd.reject(fm.i18n([errors.open, file.name, errors.denied]));
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
				return dfrd.reject(errors.popup);
			}
		}

		return dfrd.resolve(targets);
	}

}