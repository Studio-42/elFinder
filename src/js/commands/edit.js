
elFinder.prototype.commands.edit = function() {
	var self = this,
		fm = this.fm,
		mimes = ['application/javascript', 'application/xhtml+xml', 'audio/x-mp3-playlist', 'application/x-bittorrent torrent'],
		filter = function(files) {
			return $.map(files || [], function(h) {
				var file = fm.file(h);
				return file && (file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1) ? h : null
			})
		},
		edit = function(hash) {
			var errors = fm.errors,
				opts   = fm.options,
				dfrd   = $.Deferred().fail(function(error) {
					error && fm.error(error);
				}), 
				file = fm.file(hash),
				data = {},
				url;
			
			if (!file.read) {
				return dfrd.reject([errors.read, file.name]);
			}
			if (!file.write) {
				return dfrd.reject([errors.write, file.name]);
			}
			
			url = fm.url(hash);
			if (!url) {
				url = fm.options.url;
				
				
				
			}
			data.target = hash;
			data.cmd = 'file';
			
			if (fm.oldAPI) {
				data.current = file.phash,
				data.cmd = 'open';
			}
			
			data  = $.extend({}, opts.customData, {mimes : opts.onlyMimes}, data);
			
			return $.ajax({
				url      : url,
				data     : data,
				type     : 'get',
				dataType : 'html',
				error    : function(xhr, status) {
					var error;

					switch (status) {
						case 'abort':
							error = [errors.noConnect, errors.connectAborted];
							break;
						case 'timeout':
							error = [errors.noConnect, errors.connectTimeout];
							break;
						default:
							status = parseInt(xhr.status);
							if (status == 403) {
								error = [errors.read, file.name];
							} else if (status == 404) {
								error = [errors.fileNotFoundN, file.name];
							} else {
								status > 400 ? errors.noConnect : errors.invResponse;
							}
					}
					
					fm.error(error);
				},
				success : function(data) {
					fm.log(data)
				}
			})
			
			return dfrd;
		}
		;
	
	
	this.title = 'Edit text file';
	
	this._handlers = {
		select  : function() { this.update(); }
	};
	
	this.getstate = function() {
		return filter(fm.selected()).length ? 0 : -1;
	}
	
	this._exec = function(files) {
		var files = filter(this.files(files)),
			list = [],
			file,
			dfrd
			;
		// fm.log(files)	
		while ((file = files.shift())) {
			list.push(edit(file))
		}
		// fm.log(list)
		
		dfrd = list.length 
			? $.when.apply(null, list)
			: $.Deferred().reject();

	}

}