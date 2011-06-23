/**
 * @class elFinder command "getfile". 
 * Return selected files info into outer callback.
 * For use elFinder with wysiwyg editors etc.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.getfile = function() {
	var self   = this,
		fm     = this.fm,
		filter = function(files) {
			var o = self.options;

			files = $.map(files, function(file) {
				return file.mime != 'directory' || o.folders ? file : null;
			});

			return o.multiple || files.length == 1 ? files : [];
		},
		callback = function(e) {
			if (self.getstate() > -1) {
				e.preventDefault();
				self.exec();
			} else {
				self.fm.exec('open');
			}
		};
	
	this.title = 'Select files';
	
	this.alwaysEnabled = true;
	
	this.callback = typeof this.fm.options.getFileCallback == 'function' 
		? this.fm.options.getFileCallback
		: false;
	
	this.init = function() {
		var self       = this,
			fm         = this.fm,
			o          = fm.options,
			name       = 'getfile',
			dblclick   = o.dblclick   == name,
			enter      = o.enter      == name,
			shiftenter = o.shiftenter == name,
			ctrlenter  = o.ctrlenter  == name;

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
			
			ctrlenter && fm.shortcut({
				pattern     : 'ctrl+enter',
				description : self.title,
				callback    : callback
			});
		})
	}
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
			
		return this.callback && cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			opts  = this.options,
			files = this.files(hashes),
			cnt   = files.length,
			url   = fm.option('url'),
			tmb   = fm.option('tmbUrl'),
			dfrd  = $.Deferred()
				.fail(function() {
					fm.trigger('getfile', {files : data});
					self.callback('', fm);
				})
				.done(function(data) {
					self.callback(data, fm);
				}), 
			i, file;

		if (!cnt || (cnt > 1 && !opts.multiple)) {
			return dfrd.reject();
		}
			
		for (i = 0; i < cnt; i++) {
			file = files[i];
			if (file.mime == 'directory' && !opts.folders) {
				return dfrd.reject();
			}
			file.baseUrl = url;
			file.url     = fm.url(file.hash);
			file.path    = fm.path(file.hash);
			if (file.tmb && file.tmb != 1) {
				file.tmb = tmb + file.tmb;
			}
		}
		
		return dfrd.resolve(opts.multiple ? files : files[0]);
	}

}