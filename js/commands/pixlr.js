elFinder.prototype.commands.pixlr = function() {
	this.updateOnSelect = false;

	this.getstate = function(sel) {
		var fm = this.fm;
		var sel = fm.selectedFiles();
		return !this._disabled && sel.length == 1 && sel[0].read && sel[0].mime.indexOf('image/') !== -1 && fm.file(sel[0].phash).write ? 0 : -1;
	};

	this.exec = function(hashes) {
		var fm    = this.fm, 
		dfrd  = $.Deferred().fail(function(error) { error && fm.error(error); }),
		files = this.files(hashes),
		cnt   = files.length,
		file, url, s, w;
		
		var target;
		
		if (!cnt) {
			return dfrd.reject();
		}
		
		file = files[0]
		
		target = fm.options.url;
		target = target + (target.indexOf('?') === -1 ? '?' : '&')
			+ 'cmd=pixlr'
			+ '&target=' + file.phash
			+ '&node=' + encodeURIComponent(fm.id);

		
		url = 'http://pixlr.com/editor/?image=' + encodeURIComponent(fm.url(file.hash))
			+ '&target=' + encodeURIComponent(target)
			+ '&title=' + encodeURIComponent('pixlr_'+file.name);
		
		if (!window.open(url)) {
			return dfrd.reject('errPopup');
		}

		return dfrd.resolve(hashes);
	};
};