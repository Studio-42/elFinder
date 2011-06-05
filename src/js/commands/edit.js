
elFinder.prototype.commands.edit = function() {
	var self = this,
		fm = this.fm,
		// text files but not text mime
		mimes = ['application/javascript', 'application/xhtml+xml', 'audio/x-mp3-playlist', 'application/x-bittorrent torrent', 'application/x-web-config'],
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
				data = {
					cmd    : 'file',
					target : hash
				},
				url = fm.url(hash) || fm.options.url,
				edit = function(text) {
					var editor = $('<textarea class="elfinder-file-edit">'+text+'</textarea>'),
						dialog = fm.dialog(editor, { 
							title : file.name,
							width : 400,
							height : 400
							
						})
						;
				},
				timeout;
			
			if (!file.read) {
				return dfrd.reject([errors.read, file.name]);
			}
			if (!file.write) {
				return dfrd.reject([errors.write, file.name]);
			}
			
			if (fm.oldAPI) {
				data.current = file.phash,
				data.cmd     = 'open';
			}
			
			timeout = setTimeout(function() {
				fm.notify({type : 'read', cnt : 1});
				dfrd.always(function() {
					fm.notify({type : 'read', cnt : -1});
				})
			}, opts.notifyDelay);
			
			dfrd = $.ajax({
				url      : url,
				data     : $.extend({}, opts.customData, {mimes : opts.onlyMimes}, data),
				type     : 'get',
				dataType : 'html',
				error    : function(xhr, status) {
					var error;

					switch (status) {
						case 'abort':
							error = [errors.edit, file.name, errors.noConnect, errors.connectAborted];
							break;
						case 'timeout':
							error = [errors.edit, file.name, errors.noConnect, errors.connectTimeout];
							break;
						default:
							status = parseInt(xhr.status);
							if (status == 404) {
								error = [errors.edit, file.name, errors.read, file.name];
							} else if (status == 403) {
								error = [errors.edit, file.name, errors.fileNotFound];
							} else {
								error = [errors.edit, fil.name, status > 400 ? errors.noConnect : errors.invResponse];
							}
					}
					
					fm.error(error);
				},
				success : function(data) {
					fm.log(data)
					edit(data)
				}
			})
			.always(function() {
				clearTimeout(timeout);
			});
			
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