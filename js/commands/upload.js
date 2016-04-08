"use strict";
/**
 * @class elFinder command "upload"
 * Upload files using iframe or XMLHttpRequest & FormData.
 * Dialog allow to send files using drag and drop
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.upload = function() {
	var hover = this.fm.res('class', 'hover');
	
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	
	// Shortcut opens dialog
	this.shortcuts = [{
		pattern     : 'ctrl+u'
	}];
	
	/**
	 * Return command state
	 *
	 * @return Number
	 **/
	this.getstate = function(sel) {
		var fm = this.fm, f,
		sel = fm.directUploadTarget? [fm.directUploadTarget] : (sel || [fm.cwd().hash]);
		if (!this._disabled && sel.length == 1) {
			f = fm.file(sel[0]);
		}
		return (f && f.mime == 'directory' && f.write)? 0 : -1;
	};
	
	
	this.exec = function(data) {
		var fm = this.fm,
			targets = data && (data instanceof Array)? data : null,
			check  = !targets && data && data.target? [ data.target ] : targets,
			fmUpload = function(data) {
				fm.upload(data)
					.fail(function(error) {
						dfrd.reject(error);
					})
					.done(function(data) {
						var cwd = fm.getUI('cwd');
						dfrd.resolve(data);
						if (data && data.added && data.added[0]) {
							var newItem = cwd.find('#'+fm.cwdHash2Id(data.added[0].hash));
							if (newItem.length) {
								newItem.trigger('scrolltoview');
							}
						}
					});
			},
			upload = function(data) {
				dialog.elfinderdialog('close');
				if (targets) {
					data.target = targets[0];
				}
				fmUpload(data);
			},
			dfrd = $.Deferred().always(function() {
				//setTimeout(function() {
				//	fm.autoSync();
				//}, 1000);
			}),
			dialog, input, button, dropbox, pastebox, dropUpload, paste;
		
		//fm.autoSync('stop');
		if (this.getstate(check) < 0) {
			return dfrd.reject();
		}
		
		dropUpload = function(e) {
			e.stopPropagation();
			e.preventDefault();
			var file = false,
				type = '',
				elfFrom = null,
				mycwd = '',
				data = null,
				target = e._target || null,
				trf = e.dataTransfer || null,
				kind = (trf.items && trf.items.length && trf.items[0].kind)? trf.items[0].kind : '';
			
			if (trf) {
				try {
					elfFrom = trf.getData('elfinderfrom');
					if (elfFrom) {
						mycwd = window.location.href + fm.cwd().hash;
						if ((!target && elfFrom === mycwd) || target === mycwd) {
							dfrd.reject();
							return;
						}
					}
				} catch(e) {}
				
				if (kind === 'file' && (trf.items[0].getAsEntry || trf.items[0].webkitGetAsEntry)) {
					file = trf;
					type = 'data';
				} else if (kind !== 'string' && trf.files && trf.files.length && $.inArray('Text', trf.types) === -1) {
					file = trf.files;
					type = 'files';
				} else {
					try {
						if ((data = trf.getData('text/html')) && data.match(/<(?:img|a)/i)) {
							file = [ data ];
							type = 'html';
						}
					} catch(e) {}
					if (! file && (data = trf.getData('text'))) {
						file = [ data ];
						type = 'text';
					}
				}
			}
			if (file) {
				fmUpload({files : file, type : type, target : target});
			} else {
				dfrd.reject();
			}
		};
		
		if (!targets && data) {
			if (data.input || data.files) {
				data.type = 'files';
				fmUpload(data);
			} else if (data.dropEvt) {
				dropUpload(data.dropEvt);
			}
			return dfrd;
		}
		
		paste = function(e) {
			var e = e.originalEvent || e;
			var files = [], items = [];
			var file;
			if (e.clipboardData) {
				if (e.clipboardData.items && e.clipboardData.items.length){
					items = e.clipboardData.items;
					for (var i=0; i < items.length; i++) {
						if (e.clipboardData.items[i].kind == 'file') {
							file = e.clipboardData.items[i].getAsFile();
							files.push(file);
						}
					}
				} else if (e.clipboardData.files && e.clipboardData.files.length) {
					files = e.clipboardData.files;
				}
				if (files.length) {
					upload({files : files, type : 'files'});
					return;
				}
			}
			var my = e.target || e.srcElement;
			setTimeout(function () {
				if (my.innerHTML) {
					$(my).find('img').each(function(i, v){
						if (v.src.match(/^webkit-fake-url:\/\//)) {
							// For Safari's bug.
							// ref. https://bugs.webkit.org/show_bug.cgi?id=49141
							//      https://dev.ckeditor.com/ticket/13029
							$(v).remove();
						}
					});
					var src = my.innerHTML.replace(/<br[^>]*>/gi, ' ');
					var type = src.match(/<[^>]+>/)? 'html' : 'text';
					my.innerHTML = '';
					upload({files : [ src ], type : type});
				}
			}, 1);
		};
		
		input = $('<input type="file" multiple="true"/>')
			.change(function() {
				upload({input : input[0], type : 'files'});
			})
			.on('dragover', function(e) {
				e.originalEvent.dataTransfer.dropEffect = 'copy';
			});

		button = $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+fm.i18n('selectForUpload')+'</span></div>')
			.append($('<form/>').append(input))
			.hover(function() {
				button.toggleClass(hover)
			});
			
		dialog = $('<div class="elfinder-upload-dialog-wrapper"/>')
			.append(button);
		
		pastebox = $('<div class="ui-corner-all elfinder-upload-dropbox" contenteditable="true">'+fm.i18n('dropFilesBrowser')+'</div>')
			.on('paste drop', function(e){
				paste(e);
			})
			.on('mousedown click', function(){
				$(this).focus();
			})
			.on('focus', function(){
				this.innerHTML = '';
			})
			.on('dragenter mouseover', function(){
				pastebox.addClass(hover);
			})
			.on('dragleave mouseout', function(){
				pastebox.removeClass(hover);
			});
		
		if (fm.dragUpload) {
			dropbox = $('<div class="ui-corner-all elfinder-upload-dropbox" contenteditable="true">'+fm.i18n('dropPasteFiles')+'</div>')
				.on('paste', function(e){
					paste(e);
				})
				.on('mousedown click', function(){
					$(this).focus();
				})
				.on('focus', function(){
					this.innerHTML = '';
				})
				.on('mouseover', function(){
					$(this).addClass(hover);
				})
				.on('mouseout', function(){
					$(this).removeClass(hover);
				})
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];
			
			dropbox.addEventListener('dragenter', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
				$(dropbox).addClass(hover);
			}, false);

			dropbox.addEventListener('dragleave', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
				$(dropbox).removeClass(hover);
			}, false);

			dropbox.addEventListener('dragover', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
				e.dataTransfer.dropEffect = 'copy';
			  	$(dropbox).addClass(hover);
			}, false);

			dropbox.addEventListener('drop', function(e) {
				dialog.elfinderdialog('close');
				targets && (e._target = targets[0]);
				dropUpload(e);
			}, false);
			
		} else {
			pastebox
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];
			
		}
		
		fm.dialog(dialog, {
			title          : this.title + (targets? ' - ' + fm.escape(fm.file(targets[0]).name) : ''),
			modal          : true,
			resizable      : false,
			destroyOnClose : true
		});
		
		return dfrd;
	};

};
