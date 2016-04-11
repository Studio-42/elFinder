"use strict";
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
		rtrim = function(str){
			return str.replace(/\s+$/, '');
		},
	
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(files) {
			return $.map(files, function(file) {
				return (file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1) 
					&& file.mime.indexOf('text/rtf')
					&& (!self.onlyMimes.length || $.inArray(file.mime, self.onlyMimes) !== -1)
					&& file.read && file.write ? file : null;
			});
		},
		
		/**
		 * Open dialog with textarea to edit file
		 *
		 * @param  String  id       dialog id
		 * @param  Object  file     file object
		 * @param  String  content  file content
		 * @return $.Deferred
		 **/
		dialog = function(id, file, content) {

			var dfrd = $.Deferred(),
				ta   = $('<textarea class="elfinder-file-edit" rows="20" id="'+id+'-ta">'+fm.escape(content)+'</textarea>'),
				old  = ta.val(),
				save = function() {
					ta.editor && ta.editor.save(ta[0], ta.editor.instance);
					old = ta.val();
					dfrd.notifyWith(ta);
				},
				cancel = function() {
					var close = function(){
						dfrd.reject();
						ta.elfinderdialog('close');
					};
					ta.editor && ta.editor.save(ta[0], ta.editor.instance);
					if (rtrim(old) !== rtrim(ta.val())) {
						old = ta.val();
						fm.confirm({
							title  : self.title,
							text   : 'confirmNotSave',
							accept : {
								label    : 'btnSaveClose',
								callback : function() {
									save();
									close();
								}
							},
							cancel : {
								label    : 'btnClose',
								callback : close
							}
						});
					} else {
						close();
					}
				},
				savecl = function() {
					save();
					cancel();
				},
				opts = {
					title   : fm.escape(file.name),
					width   : self.options.dialogWidth || 450,
					buttons : {},
					btnHoverFocus : false,
					closeOnEscape : false,
					close   : function() { 
						var $this = $(this),
						close = function(){
							ta.editor && ta.editor.close(ta[0], ta.editor.instance);
							$this.elfinderdialog('destroy');
						};
						ta.editor && ta.editor.save(ta[0], ta.editor.instance);
						if (rtrim(old) !== rtrim(ta.val())) {
							fm.confirm({
								title  : self.title,
								text   : 'confirmNotSave',
								accept : {
									label    : 'btnSaveClose',
									callback : function() {
										save();
										close();
									}
								},
								cancel : {
									label    : 'btnClose',
									callback : close
								}
							});
						} else {
							close();
						}
					},
					open    : function() { 
						fm.disable();
						ta.focus(); 
						ta[0].setSelectionRange && ta[0].setSelectionRange(0, 0);
						if (ta.editor) {
							ta.editor.instance = ta.editor.load(ta[0]) || null;
							ta.editor.focus(ta[0], ta.editor.instance);
						}
					}
					
				},
				mimeMatch = function(fileMime, editorMimes){
					editorMimes = editorMimes || mimes.concat('text/');
					if ($.inArray(fileMime, editorMimes) !== -1 ) {
						return true;
					}
					var i, l;
					l = editorMimes.length;
					for (i = 0; i < l; i++) {
						if (fileMime.indexOf(editorMimes[i]) === 0) {
							return true;
						}
					}
					return false;
				},
				extMatch = function(fileName, editorExts){
					if (!editorExts || !editorExts.length) {
						return true;
					}
					var ext = fileName.replace(/^.+\.([^.]+)|(.+)$/, '$1$2').toLowerCase(),
					i, l;
					l = editorExts.length;
					for (i = 0; i < l; i++) {
						if (ext === editorExts[i].toLowerCase()) {
							return true;
						}
					}
					return false;
				};
				
				ta.getContent = function() {
					return ta.val();
				};
				
				$.each(self.options.editors || [], function(i, editor) {
					if (mimeMatch(file.mime, editor.mimes || null)
					&& extMatch(file.name, editor.exts || null)
					&& typeof editor.load == 'function'
					&& typeof editor.save == 'function') {
						ta.editor = {
							load     : editor.load,
							save     : editor.save,
							close    : typeof editor.close == 'function' ? editor.close : function() {},
							focus    : typeof editor.focus == 'function' ? editor.focus : function() {},
							instance : null,
							doSave   : save,
							doCancel : cancel,
							doClose  : savecl,
							file     : file
						};
						
						return false;
					}
				});
				
				if (!ta.editor) {
					ta.keydown(function(e) {
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
						
					}).on('mouseenter', function(){this.focus();});
				}
				
				opts.buttons[fm.i18n('btnSave')]      = save;
				opts.buttons[fm.i18n('btnSaveClose')] = savecl;
				opts.buttons[fm.i18n('btnCancel')]    = cancel;
				
				fm.dialog(ta, opts)
					.attr('id', id)
					.on('keydown keyup keypress', function(e) {
						e.stopPropagation();
					});
				return dfrd.promise();
		},
		
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
		edit = function(file, doconv) {
			var hash   = file.hash,
				opts   = fm.options,
				dfrd   = $.Deferred(), 
				data   = {cmd : 'file', target : hash},
				id    = 'edit-'+fm.namespace+'-'+file.hash,
				d = fm.getUI().find('#'+id),
				conv   = !doconv? 0 : 1,
				error;
			
			
			if (d.length) {
				d.elfinderdialog('toTop');
				return dfrd.resolve();
			}
			
			if (!file.read || !file.write) {
				error = ['errOpen', file.name, 'errPerm'];
				fm.error(error);
				return dfrd.reject(error);
			}
			
			fm.request({
				data   : {cmd : 'get', target  : hash, conv : conv},
				notify : {type : 'file', cnt : 1},
				syncOnFail : true
			})
			.done(function(data) {
				if (data.doconv) {
					fm.confirm({
						title  : self.title,
						text   : 'confirmConvUTF8',
						accept : {
							label    : 'btnConv',
							callback : function() {  
								dfrd = edit(file, 1);
							}
						},
						cancel : {
							label    : 'btnCancel',
							callback : function() { dfrd.reject(); }
						}
					});
				} else {
					dialog(id, file, data.content)
						.progress(function() {
							var ta = this;
							fm.request({
								options : {type : 'post'},
								data : {
									cmd     : 'put',
									target  : hash,
									content : ta.getContent()
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
								setTimeout(function(){
									ta.focus();
									ta.editor && ta.editor.focus(ta[0], ta.editor.instance);
								}, 50);
							});
						});
				}
			})
			.fail(function(error) {
				dfrd.reject(error);
			});

			return dfrd.promise();
		};
	
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+e'
	}];
	
	this.init = function() {
		this.onlyMimes = this.options.mimes || [];
	};
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;

		return !this._disabled && cnt && filter(sel).length == cnt ? 0 : -1;
	};
	
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
	};

};
