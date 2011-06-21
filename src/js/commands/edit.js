"use strict"
/**
 * @class  elFinder command "edit"
 * Edit text files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.edit = function() {
	var self = this,
		fm   = this.fm,
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(hashes) {
			return $.map(self.files(hashes), function(file) {
				return file.mime.indexOf('text/') === 0 || $.inArray(file.mime, fm.textMimes) !== -1 ? file : null;
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
			var hash      = file.hash,
				errors    = fm.errors,
				opts      = fm.options,
				dfrd      = $.Deferred(), 
				data      = {cmd : 'file', target : hash},
				url       = fm.url(hash) || fm.options.url,
				dialog    = function(text) {
					var editor = $('<textarea class="elfinder-file-edit" rows="20">'+text+'</textarea>')
							.keydown(function(e) {
								var value, start;
								
								e.stopPropagation();
								if (e.keyCode == 9) {
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
				error;
			
			
			if (!file.read || !file.write) {
				error = [errors.open, file.name, errors.denied]
				fm.error(error)
				return dfrd.reject(error);
			}
			
			fm.ajax({
				data   : {
					cmd     : fm.oldAPI ? 'fread' : 'get',
					target  : hash,
					current : file.phash // old api
				},
				notify : {type : 'openfile', cnt : 1}
			})
			.done(function(data) {
				dialog(data.content);
			})
			.fail(function(error) {
				dfrd.reject(error);
			})

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
		dialogWidth : 450
	};
	
	this._handlers = {
		select  : function() { this.update(); }
	};
	
	this.getstate = function() {
		var cnt = fm.selected().length;
		
		return cnt && cnt == filter().length ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var files = filter(hashes),
			list  = [],
			file;

		while ((file = files.shift())) {
			list.push(edit(file));
		}
		
		return list.length 
			? $.when.apply(null, list)
			: $.Deferred().reject();

	}

}