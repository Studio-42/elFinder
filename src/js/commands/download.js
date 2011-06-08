/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.download = function() {
	var self     = this,
		fm       = this.fm,
		callback = function(e) {
			if (self.getstate() > -1) {
				e.preventDefault();
				self.exec();
			} else {
				self.fm.exec('open');
			}
		};
	

	this.title = 'Download files';
	this.alwaysEnabled = true;
	
	this._handlers = {
		select  : function() { this.update(); }
	};
	
	this.init = function() {
		var self       = this,
			fm         = this.fm,
			o          = fm.options,
			name       = 'download',
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
		var cnt = fm.selected().length;
		
		return fm.newAPI && cnt && fm.selected().length == this.files().length ? 0 : -1;
	}
	
	this._exec = function(hashes) {
		var base   = fm.options.url, 
			files = this.files(hashes),
			dfrd   = $.Deferred().fail(function(error) { fm.error(error); }),
			i, url;
			
		base += base.indexOf('?') === -1 ? '?' : '&';
			
		for (i = 0; i < files.length; i++) {
			if (!window.open(base + 'cmd=file&target=' + files[i].hash+'&download=1', '_blank') ) {
				return dfrd.reject(fm.errors.popup);
			}
		}
		return dfrd.resolve(hashes);
	}

}