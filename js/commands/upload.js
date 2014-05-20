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
	this.getstate = function() {
		return !this._disabled && this.fm.cwd().write ? 0 : -1;
	};
	
	
	this.exec = function(data) {
		var fm = this.fm,
			upload = function(data) {
				dialog.elfinderdialog('close');
				fm.upload(data)
					.fail(function(error) {
						dfrd.reject(error);
					})
					.done(function(data) {
						dfrd.resolve(data);
					});
			},
			dfrd, dialog, input, button, dropbox, pastebox, dropUpload, paste;
		
		if (this.disabled()) {
			return $.Deferred().reject();
		}
		
		dropUpload = function(e) {
			e.stopPropagation();
		  	e.preventDefault();
			var file = false;
			var type = '';
			var data = null;
			try{
				data = e.dataTransfer.getData('text/html');
			} catch(e) {}
			if (data) {
				file = [ data ];
				type = 'html';
			} else if (e.dataTransfer && e.dataTransfer.items &&  e.dataTransfer.items.length) {
				file = e.dataTransfer;
				type = 'data';
			} else if (e.dataTransfer && e.dataTransfer.files &&  e.dataTransfer.files.length) {
				file = e.dataTransfer.files;
				type = 'files';
			} else if (data = e.dataTransfer.getData('text')) {
				file = [ data ];
				type = 'text';
			}
			return file? fm.upload({files : file, type : type}) : false;
		};
		
		if (data) {
			if (data.input || data.files) {
				data.type = 'files';
				return fm.upload(data);
			} else if (data.dropEvt) {
				return dropUpload(data.dropEvt);
			}
		}
		
		dfrd = $.Deferred();
		
		paste = function(e) {
			var e = e.originalEvent || e;
			var files = [];
			var file;
			if (e.clipboardData && e.clipboardData.items && e.clipboardData.items.length){
				for (var i=0; i < e.clipboardData.items.length; i++) {
					if (e.clipboardData.items[i].kind == 'file') {
						file = e.clipboardData.items[i].getAsFile();
						files.push(file);
					}
				}
				if (files.length) {
					upload({files : files, type : 'files'});
					return;
				}
			}
			var my = e.target || e.srcElement;
			setTimeout(function () {
				if (my.innerHTML) {
					var src = my.innerHTML.replace(/<br[^>]*>/gi, ' ');
					var type = src.match(/<[^>]+>/)? 'html' : 'text';
					my.innerHTML = '';
					upload({files : [ src ], type : type});
				}
			}, 1);
		};
		
		input = $('<input type="file" multiple="true"/>')
			.change(function() {
				upload({input : input[0]});
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
			.on('focus', function(e){
				e = e.originalEvent || e;
				(e.target || e.srcElement).innerHTML = '';
			})
			.on('blur', function(e){
				e = e.originalEvent || e;
				(e.target || e.srcElement).innerHTML = fm.i18n('dropFilesBrowser');
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
				.on('focus', function(e){
					(e.originalEvent || e).target.innerHTML = '';
				})
				.on('blur', function(e){
					(e.originalEvent || e).target.innerHTML = fm.i18n('dropPasteFiles');
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
			  	$(dropbox).addClass(hover);
			}, false);

			dropbox.addEventListener('drop', function(e) {
				dialog.elfinderdialog('close');
				dropUpload(e);
			}, false);
			
		} else {
			pastebox
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];
			
		}
		
		fm.dialog(dialog, {
			title          : this.title,
			modal          : true,
			resizable      : false,
			destroyOnClose : true
		});
		
		return dfrd;
	};

};