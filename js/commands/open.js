/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
(elFinder.prototype.commands.open = function() {
	"use strict";
	var fm = this.fm;
	this.alwaysEnabled = true;
	this.noChangeDirOnRemovedCwd = true;
	
	this._handlers = {
		dblclick : function(e) { e.preventDefault(); fm.exec('open', e.data && e.data.file? [ e.data.file ]: void(0)); },
		'select enable disable reload' : function(e) { this.update(e.type == 'disable' ? -1 : void(0));  }
	};
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter'+(fm.OS != 'mac' && ' enter')
	}];

	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length;
		
		return cnt == 1 
			? (sel[0].read? 0 : -1) 
			: (cnt && !fm.UA.Mobile) ? ($.grep(sel, function(file) { return file.mime == 'directory' || ! file.read ? false : true;}).length == cnt ? 0 : -1) : -1;
	};
	
	this.exec = function(hashes, cOpts) {
		var dfrd  = $.Deferred().fail(function(error) { error && fm.error(error); }),
			files = this.files(hashes),
			cnt   = files.length,
			thash = (typeof cOpts == 'object')? cOpts.thash : false,
			opts  = this.options,
			into  = opts.into || 'window',
			file, url, s, w, imgW, imgH, winW, winH, reg, link, html5dl, inline,
			selAct, cmd;

		if (!cnt && !thash) {
			{
				return dfrd.reject();
			}
		}

		// open folder
		if (thash || (cnt == 1 && (file = files[0]) && file.mime == 'directory')) {
			if (!thash && file && !file.read) {
				return dfrd.reject(['errOpen', file.name, 'errPerm']);
			} else {
				if (fm.keyState.ctrlKey && (fm.keyState.shiftKey || typeof fm.options.getFileCallback !== 'function')) {
					if (fm.getCommand('opennew')) {
						return fm.exec('opennew', [thash? thash : file.hash]);
					}
				}

				return fm.request({
					data   : {cmd  : 'open', target : thash || file.hash},
					notify : {type : 'open', cnt : 1, hideCnt : true},
					syncOnFail : true,
					lazy : false
				});
			}
		}
		
		files = $.grep(files, function(file) { return file.mime != 'directory' ? true : false; });
		
		// nothing to open or files and folders selected - do nothing
		if (cnt != files.length) {
			return dfrd.reject();
		}
		
		var doOpen = function() {
			var wnd, target, getOnly;
			
			try {
				reg = new RegExp(fm.option('dispInlineRegex'), 'i');
			} catch(e) {
				reg = false;
			}
	
			// open files
			link     = $('<a>').hide().appendTo($('body')),
			html5dl  = (typeof link.get(0).download === 'string');
			cnt = files.length;
			while (cnt--) {
				target = 'elf_open_window';
				file = files[cnt];
				
				if (!file.read) {
					return dfrd.reject(['errOpen', file.name, 'errPerm']);
				}
				
				inline = (reg && file.mime.match(reg));
				url = fm.openUrl(file.hash, !inline);
				if (fm.UA.Mobile || !inline) {
					if (html5dl) {
						if (!inline) {
							link.attr('download', file.name);
						} else {
							link.attr('target', '_blank');
						}
						link.attr('href', url).get(0).click();
					} else {
						wnd = window.open(url);
						if (!wnd) {
							return dfrd.reject('errPopup');
						}
					}
				} else {
					getOnly = (typeof opts.method === 'string' && opts.method.toLowerCase() === 'get');
					if (!getOnly
						&& url.indexOf(fm.options.url) === 0
						&& fm.customData
						&& Object.keys(fm.customData).length
						// Since playback by POST request can not be done in Chrome, media allows GET request
						&& !file.mime.match(/^(?:video|audio)/)
					) {
						// Send request as 'POST' method to hide custom data at location bar
						url = '';
					}
					if (into === 'window') {
						// set window size for image if set
						imgW = winW = Math.round(2 * screen.availWidth / 3);
						imgH = winH = Math.round(2 * screen.availHeight / 3);
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
						wnd = window.open(url, target, w + ',top=50,left=50,scrollbars=yes,resizable=yes,titlebar=no');
					} else {
						if (into === 'tabs') {
							target = file.hash;
						}
						wnd = window.open('about:blank', target);
					}
					
					if (!wnd) {
						return dfrd.reject('errPopup');
					}
					
					if (url === '') {
						var form = document.createElement("form");
						form.action = fm.options.url;
						form.method = 'POST';
						form.target = target;
						form.style.display = 'none';
						var params = Object.assign({}, fm.customData, {
							cmd: 'file',
							target: file.hash,
							_t: file.ts || parseInt(+new Date()/1000)
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
					} else if (into !== 'window') {
						wnd.location = url;
					}
					$(wnd).trigger('focus');
				}
			}
			link.remove();
			return dfrd.resolve(hashes);
		};
		
		if (cnt > 1) {
			fm.confirm({
				title: 'openMulti',
				text : ['openMultiConfirm', cnt + ''],
				accept : {
					label : 'cmdopen',
					callback : function() { doOpen(); }
				},
				cancel : {
					label : 'btnCancel',
					callback : function() { 
						dfrd.reject();
					}
				},
				buttons : (fm.getCommand('zipdl') && fm.isCommandEnabled('zipdl', fm.cwd().hash))? [
					{
						label : 'cmddownload',
						callback : function() {
							fm.exec('download', hashes);
							dfrd.reject();
						}
					}
				] : []
			});
		} else {
			selAct = fm.storage('selectAction') || opts.selectAction;
			if (selAct) {
				$.each(selAct.split('/'), function() {
					var cmdName = this.valueOf();
					if (cmdName !== 'open' && (cmd = fm.getCommand(cmdName)) && cmd.enabled()) {
						return false;
					}
					cmd = null;
				});
				if (cmd) {
					return fm.exec(cmd.name);
				}
			}
			doOpen();
		}
		
		return dfrd;
	};

}).prototype = { forceLoad : true }; // this is required command
