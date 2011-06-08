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
			var file       = fm.file(hash),
				errors     = fm.errors,
				openError  = [errors.openFile, file.name, '<br/>'],
				saveError  = [errors.save, file.name, '<br/>'],
				opts       = fm.options,
				dfrd       = $.Deferred(), 
				data       = {cmd : 'file', target : hash},
				url        = fm.url(hash) || fm.options.url,
				dialog = function(text) {
					var editor = $('<textarea class="elfinder-file-edit" rows="20" style="padding:0;margin:0;border:1px solid #ccc">'+text+'</textarea>')
							.keydown(function(e) {
								var size = parseInt(self.options.tabSize) || 4,
									value, start;
								e.stopPropagation();
								if (e.keyCode == 9) {
									e.preventDefault();
									// insert spaces on tab press
									if (this.setSelectionRange) {
										value = this.value;
										start = this.selectionStart;
										// this.value = value.substr(0, start) + Array(size+1).join(' ') + value.substr(this.selectionEnd);
										this.value = value.substr(0, start) + "\t" + value.substr(this.selectionEnd);
										start += 1;//size;
										this.setSelectionRange(start, start);
									}
								}
							}),
						opts = {
							title   : file.name,
							width   : self.options.dialogWidth || 450,
							buttons : {},
							close   : function() { 
								$(this).elfinderdialog('destroy'); 
							},
							open    : function() { 
								fm.disable();
								editor.focus(); 
								if (editor[0].setSelectionRange) {
									editor[0].setSelectionRange(0, 0);
								}
							}
							
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
							syncOnFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							dfrd.resolve(data);
						});
					}
						
					opts.buttons[fm.i18n('Cancel')] = function() { 
						dfrd.resolve();
						$(this).elfinderdialog('close'); 
					}
					
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
			
			jqxhr = fm.ajax({
				data : data,
				options : {
					url      : url,
					type     : 'get',
					dataType : 'html'
				},
				raw : true,
				notify : {type : 'read', cnt : 1},
				preventFail : true,
				syncOnFail : !fm.option('url')
			})
			.fail(function(error, xhr, status) {
				var error = [errors.open, file.name];
				
				switch (status) {
					case 'abort':
						error.push(errors.abort);
						break;
					case 'timeout':	
						error.push(errors.timeout);
						break;
					default:
						if (xhr.status == 403) {
							error.push(errors.access);
						} else if (xhr.status == 404) {
							error.push(errors.notfound);
						} else {
							error.push(errors.connect);
						} 
				}
				fm.error(error);
				dfrd.reject(error);
			})
			.done(dialog)
			
			
			return dfrd
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
			file, dfrd;

		while ((file = files.shift())) {
			list.push(edit(file));
		}
		
		return dfrd = list.length 
			? $.when.apply(null, list)
			: $.Deferred().reject();

	}

}