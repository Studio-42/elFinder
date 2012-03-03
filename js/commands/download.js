"use strict";
/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.download = function() {
	var self   = this,
		fm     = this.fm,
		filter = function(hashes) {
			return $.map(self.files(hashes), function(f) { return f.mime == 'directory' ? null : f });
		};
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function() {
		var sel = this.fm.selected(),
			cnt = sel.length;
		
		return  !this._disabled && cnt && (!$.browser.msie || cnt == 1) && cnt == filter(sel).length ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			base  = fm.options.url, 
			files = filter(hashes),
			dfrd  = $.Deferred(),
			iframe, i, url;
			
		if (this.disabled()) {
			return dfrd.reject();
		}
			
		if (fm.oldAPI) {
			fm.error('errCmdNoSupport');
			return dfrd.reject();
		}
			
		base += base.indexOf('?') === -1 ? '?' : '&';
		
		for (i = 0; i < files.length; i++) {
			iframe = $('<iframe class="downloader" style="display:none" src="'+base + 'cmd=file&target=' + files[i].hash+'&download=1'+'"/>')
				.appendTo('body');
		}
		iframe.ready(function() {
			setTimeout(function() {
				$('body iframe.downloader').remove();
			}, $.browser.mozilla? (10000 * i + 1) : 1000);
		});
		return dfrd.resolve(hashes);
	}

}