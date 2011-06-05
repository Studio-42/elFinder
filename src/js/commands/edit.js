"use strict"
elFinder.prototype.commands.edit = function() {
	var self = this,
		fm = this.fm,
		// text files but not text mime
		mimes = ['application/javascript', 'application/xhtml+xml', 'audio/x-mp3-playlist', 'application/x-bittorrent torrent', 'application/x-web-config'],
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(files) {
			return $.map(files || [], function(h) {
				var file = fm.file(h);
				return file && (file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1) ? h : null
			})
		},
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
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
				editDialog = function(text) {
					var editor = $('<textarea class="elfinder-file-edit" rows="20" style="padding:0;margin:0;border:1px solid #ccc">'+text+'</textarea>')
							.keydown(function(e) {
								var size = parseInt(self.options.tabSize) || 4,
									value, start;
							
								if (e.keyCode == 9) {
									e.preventDefault();
									// insert spaces on tab press
									if (this.setSelectionRange) {
										value = this.value;
										start = this.selectionStart;
										this.value = value.substr(0, start) + Array(size+1).join(' ') + value.substr(this.selectionEnd);
										start += size;
										this.setSelectionRange(start, start);
									}
								}
							}),
						opts = {
							title   : file.name,
							width   : self.options.dialogWidth || 450,
							close   : function() { $(this).elfinderdialog('destroy'); },
							open    : function() { 
								editor.focus(); 
								if (editor[0].setSelectionRange) {
									editor[0].setSelectionRange(0, 0)
								}
							},
							buttons : {}
						};
						
					opts.buttons[fm.i18n('Save')] = function() {
						var value = editor.val();
						$(this).elfinderdialog('close');
						
						fm.ajax({
							options : {type : 'post'},
							data : {
								cmd     : fm.oldAPI ? 'edit' : 'put',
								target  : hash,
								content : value,
								current : fm.cwd().hash // old api
							},
							notify : {type : 'save', cnt : 1},
							preventFail : true
						})
						.fail(function(error) {
							error.unshift(file.name);
							error.unshift(errors.save)
							dfrd.reject(error);
						})
						.done(function(data) {
							dfrd.resolve(data);
						});
					}
						
					opts.buttons[fm.i18n('Cancel')] = function() { $(this).elfinderdialog('close'); }
					
					fm.dialog(editor, opts);
				},
				timeout, jqxhr;
			
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
				jqxhr.always(function() {
					fm.notify({type : 'read', cnt : -1});
				})
			}, opts.notifyDelay);
			
			jqxhr = $.ajax({
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
							if (status == 403) {
								error = [errors.edit, file.name, errors.read, file.name];
							} else if (status == 404) {
								error = [errors.edit, file.name, errors.fileNotFound];
							} else {
								error = [errors.edit, fil.name, status > 400 ? errors.noConnect : errors.invResponse];
							}
					}
					
					dfrd.reject(error);
				},
				success : editDialog
			})
			.always(function() {
				clearTimeout(timeout);
			});
			
			return dfrd;
		};
	
	
	this.title = 'Edit text file';
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {
		ui          : 'button', 
		dialogWidth : 450, 
		tabSize     : 4
	};
	
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