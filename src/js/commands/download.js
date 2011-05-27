/**
 * @class download. Download selected files
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.download = function() {

	var fm = this.fm,
		filter = function(hashes) {
		return $.map(hashes, function(h) { 
			return fm.file(h).mime == 'directory' ? null : h;
		})
	}

	this.title = 'Download file';
	this.alwaysEnabled = true;
	
	this._handlers = {
		select  : function() { this.update(); }
	};
	
	this.init = function() {
		var self = this,
			fm   = this.fm,
			description = 'Return file info into callback',
			callback = function() { self._exec(); };

		this.options.dblclick && fm.dblclick(function(e) { 
			if (self.getstate() > -1) {
				e.preventDefault();
				self.exec();
			}
		});
		
		this.options.enter && fm.shortcut({
			pattern     : 'enter numpad_enter',
			description : description,
			callback    : callback
		});
		this.options.shiftenter && fm.shortcut({
			pattern     : 'shift+enter',
			description : description,
			callback    : callback
		});
	}
	
	this.getstate = function() {
		return this.fm.newAPI && filter(this.fm.selected()).length ? 0 : -1;
	}
	
	this._exec = function() {
		var hashes = filter(this.fm.selected()),
			fm     = this.fm,
			base   = fm.options.url, 
			dfrd   = $.Deferred().fail(function(error) { fm.error(error); }),
			i, url;
			
		base += base.indexOf('?') === -1 ? '?' : '&';
			
		for (i = 0; i < hashes.length; i++) {
			if (!window.open(base + 'cmd=file&target=' + hashes[i]+'&download=1') ) {
				return dfrd.reject(fm.errors.popupBlocks);
			}
		}
		return dfrd.resolve(hashes);
	}

}