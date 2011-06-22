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
		},
		filter = function(hashes) {
			return $.map(self.files(hashes), function(f) { return f.mime == 'directory' ? null : f });
		};
	

	this.title = 'Download';
	this.alwaysEnabled = true;
	
	this.handlers = {
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
		var sel = fm.selected(),
			cnt = sel.length;
		
		return fm.newAPI && cnt && cnt == filter(sel).length ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var base  = fm.options.url, 
			files = filter(hashes),
			dfrd  = $.Deferred().fail(function(error) { fm.error(error); }),
			iframe, i, url;
			
		base += base.indexOf('?') === -1 ? '?' : '&';
			
		for (i = 0; i < files.length; i++) {
			var iframe = $('<iframe style="display:none" src="'+base + 'cmd=file&target=' + files[i].hash+'&download=1'+'"/>')
				.appendTo('body')
				.load(function() {
					setTimeout(function() {
						iframe.remove();
					}, 1000)
				});
		}
		return dfrd.resolve(hashes);
	}

}