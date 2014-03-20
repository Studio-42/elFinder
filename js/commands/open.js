"use strict"
/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
elFinder.prototype.commands.open = function() {
	this.alwaysEnabled = true;
	
	this._handlers = {
		dblclick : function(e) { e.preventDefault(); this.exec() },
		'select enable disable reload' : function(e) { this.update(e.type == 'disable' ? -1 : void(0));  }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter'+(this.fm.OS != 'mac' && ' enter')
	}];

	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return cnt == 1 
			? 0 
			: (cnt && !this.fm.UA.Mobile) ? ($.map(sel, function(file) { return file.mime == 'directory' ? null : file}).length == cnt ? 0 : -1) : -1
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm, 
			dfrd  = $.Deferred().fail(function(error) { error && fm.error(error); }),
			files = this.files(hashes),
			cnt   = files.length,
			file, url, s, w, imgW, imgH, winW, winH;

		if (!cnt) {
			return dfrd.reject();
		}

		// open folder
		if (cnt == 1 && (file = files[0]) && file.mime == 'directory') {
			return file && !file.read
				? dfrd.reject(['errOpen', file.name, 'errPerm'])
				: fm.request({
						data   : {cmd  : 'open', target : file.thash || file.hash},
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
				return dfrd.reject(['errOpen', file.name, 'errPerm']);
			}
			
			if (fm.UA.Mobile) {
				if (!(url = fm.url(/*file.thash || */file.hash))) {
					url = fm.options.url;
					url = url + (url.indexOf('?') === -1 ? '?' : '&')
						+ (fm.oldAPI ? 'cmd=open&current='+file.phash : 'cmd=file')
						+ '&target=' + file.hash;
				}
				var wnd = window.open(url);
				if (!wnd) {
					return dfrd.reject('errPopup');
				}
			} else {
				// set window size for image if set
				imgW = winW = Math.round(2 * $(window).width() / 3);
				imgH = winH = Math.round(2 * $(window).height() / 3);
				if (parseInt(file.width) && parseInt(file.height)) {
					imgW = parseInt(file.width);
					imgH = parseInt(file.height);
				} else if (file.dim) {
					s = file.dim.split('x');
					imgW = parseInt(s[0]);
					imgH = parseInt(s[1]);
				}
				if (winW >= imgW && winH >= imgH) {
					winW = imgW;
					winH = imgH;
				} else {
					if ((imgW - winW) > (imgH - winH)) {
						winH = Math.round(imgH * (winW / imgW));
					} else {
						winW = Math.round(imgW * (winH / imgH));
					}
				}
				w = 'width='+winW+',height='+winH;
	
				var wnd = window.open('', 'new_window', w + ',top=50,left=50,scrollbars=yes,resizable=yes');
				if (!wnd) {
					return dfrd.reject('errPopup');
				}
				
				var form = document.createElement("form");
				form.action = fm.options.url;
				form.method = 'POST';
				form.target = 'new_window';
				form.style.display = 'none';
				var params = $.extend({}, fm.options.customData, {
					cmd: 'file',
					target: file.hash
				});
				$.each(params, function(key, val)
				{
					var input = document.createElement("input");
					input.name = key;
					input.value = val;
					form.appendChild(input);
				});
				
				document.body.appendChild(form);
				form.submit();
			}
		}
		return dfrd.resolve(hashes);
	}

}