"use strict"
/**
 * @class elFinder command "edit". 
 * Edit text file in dialog window
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.edit = function() {
	var self  = this,
		fm    = this.fm,
		mimes = fm.res('mimes', 'text') || [],
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(files) {
			return $.map(files, function(file) {
				return file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1 && file.read && file.write ? file : null;
			})
		},
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
		edit = function(file) {
			var hash   = file.hash,
				opts   = fm.options,
				dfrd   = $.Deferred(), 
				data   = {cmd : 'file', target : hash},
				url    = fm.url(hash) || fm.options.url,
				id    = 'edit-'+fm.namespace+'-'+file.hash,
				dialog = function(text) {
					var editor = $('<textarea class="elfinder-file-edit" rows="20">'+text+'</textarea>')
							.keydown(function(e) {
								var code = e.keyCode,
									value, start;
								
								e.stopPropagation();
								if (code == 9) {
									e.preventDefault();
									// insert tab on tab press
									if (this.setSelectionRange) {
										value = this.value;
										start = this.selectionStart;
										this.value = value.substr(0, start) + "\t" + value.substr(this.selectionEnd);
										start += 1;
										this.setSelectionRange(start, start);
									}
								}
								
								if (e.ctrlKey || e.metaKey) {
									// close on ctrl+w/q
									if (code == 81 || code == 87) {
										e.preventDefault();
										cancel();
									}
									if (code == 83) {
										e.preventDefault();
										save();
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
								editor[0].setSelectionRange && editor[0].setSelectionRange(0, 0);
							}
							
						},
					cancel = function() {
						dfrd.resolve();
						editor.elfinderdialog('close');
					},
					save = function() {
						var value = editor.val();
						
						editor.elfinderdialog('close');
						
						fm.request({
							options : {type : 'post'},
							data : {
								cmd     : 'put',
								target  : hash,
								content : value
							},
							notify : {type : 'save', cnt : 1},
							syncOnFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							data.changed && data.changed.length && fm.change(data);
							dfrd.resolve(data);
						});
					};
						
					opts.buttons[fm.i18n('Save')]   = save;
					opts.buttons[fm.i18n('Cancel')] = cancel;
					
					fm.dialog(editor, opts).attr('id', id);
				},
				d = fm.getUI().find('#'+id), 
				error;
			
			
			if (d.length) {
				d.elfinderdialog('toTop');
				return dfrd.resolve();
			}
			
			if (!file.read || !file.write) {
				error = ['errOpen', file.name, 'errPerm']
				fm.error(error)
				return dfrd.reject(error);
			}
			
			fm.request({
				data   : {cmd : 'get', target  : hash},
				notify : {type : 'openfile', cnt : 1},
				syncOnFail : true
			})
			.done(function(data) {
				dialog(data.content);
			})
			.fail(function(error) {
				dfrd.reject(error);
			})

			return dfrd;
		};
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+e'
	}];
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
			
		return !this._disabled && cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var files = filter(this.files(hashes)),
			list  = [],
			file;

		if (this.disabled()) {
			return $.Deferred().reject();
		}

		while ((file = files.shift())) {
			list.push(edit(file));
		}
		
		return list.length 
			? $.when.apply(null, list)
			: $.Deferred().reject();
	}

}