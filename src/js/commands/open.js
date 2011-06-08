/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
elFinder.prototype.commands.open = function() {
	var self = this,
		filter = function(hashes) {
			return $.map(hashes, function(h) { return self.fm.file(h).mime != 'directory' ? h : null });
		}
		callback = function(e) {
			e.preventDefault();
			self.exec();
		};
	
	this.title = 'Open files or enter folder';
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

		return cnt && (cnt == 1 || cnt == this.files(sel).length) ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		return this._exec(hashes);
	}
	
	this._exec = function(hashes) {
		var fm     = this.fm, 
			errors = fm.errors,
			dfrd   = $.Deferred().fail(function(error) { error && fm.error(error); }),
			hashes = this.hashes(hashes),
			cnt    = hashes.length,
			files  = this.files(hashes),
			file, url;

		// open folder
		if (cnt == 1 && (!(file = fm.file(hashes[0])) || file.mime == 'directory')) {
			return file && !file.read
				? dfrd.reject([errors.open, file.name, errors.denied])
				: fm.ajax({
						data   : {cmd  : 'open', target : hashes[0]},
						notify : {type : 'open', cnt : 1, hideCnt : true},
						syncOnFail : true
					});
		}
		
		// nothing to open or files and folders selected - do nothing
		if (!cnt || cnt != files.length) {
			return dfrd.reject();
		}
		
		// open files
		cnt = files.length;
		while (cnt--) {
			file = files[cnt];
			
			if (!file.read) {
				return dfrd.reject([errors.open, file.name, errors.denied]);
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
		return dfrd.resolve(hashes);
	}

}