"use strict"
/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
elFinder.prototype.commands.open = function() {
	var self   = this,
		title  = 'Open',
		filter = function(hashes) {
			return $.map(hashes, function(h) { return self.fm.file(h).mime != 'directory' ? h : null });
		},
		callback = function(e) {
			e.preventDefault();
			self.exec();
		};
	
	this.title = title;
	this.alwaysEnabled = true;
	
	this.handlers = {
		select   : function() { this.update(); }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter',
		description : title,
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
				description : title,
				callback    : callback
			});
			
			shiftenter && fm.shortcut({
				pattern     : 'shift+enter',
				description : title,
				callback    : callback
			});
		})
	}
	
	this.getstate = function(sel) {
		var cnt;
		
		// call from context menu
		if (sel) {
			return this.fm.file(sel[0]).read ? 0 : -1;
		}
		
		sel = this.fm.selected();
		cnt = sel.length;

		return cnt && (cnt == 1 || cnt == filter(sel).length) ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm     = this.fm, 
			errors = fm.errors,
			dfrd   = $.Deferred().fail(function(error) { error && fm.error(error); }),
			files  = this.files(hashes),
			cnt    = files.length,
			file, url, s, w;

		if (!cnt) {
			return dfrd.reject();
		}

		// open folder
		if (cnt == 1 && (file = files[0]) && file.mime == 'directory') {
			return file && !file.read
				? dfrd.reject([errors.open, file.name, errors.denied])
				: fm.ajax({
						data   : {cmd  : 'open', target : file.hash},
						notify : {type : 'open', cnt : 1, hideCnt : true},
						syncOnFail : true
					});
		}
		
		files = $.map(files, function(file) { return file.mime != 'directory' ? file : null });
		
		// nothing to open or files and folders selected - do nothing
		if (cnt != files.length) {
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
			
			w = '';
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