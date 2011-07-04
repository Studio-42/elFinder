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
	var hover = this.fm.res('class', 'hover'),
		prepareData = function(text) {
			var warning = '', raw, data;
			
			if (!$.trim(text)) {
				return {error : [errors.response, errors.empty]}
			}
			
			try {
				raw = $.parseJSON(text);
			} catch (e) {
				return {error : [errors.response, errors.json]}
			}
			
			if (!fm.validResponse('upload', raw)) {
				return {error : [errors.response]};
			}
			
			if (raw.error) {
				if (fm.newAPI) {
					return {error : raw.error};
				}
				// move error into warning for old api
				warning = fm.i18n(raw.error);
				$.each(raw.errorData||[], function(name, msg) {
					warning += '. '+fm.i18n(msg)+': '+name;
				})

				raw.error = null;
				if (!fm.validResponse('upload', raw)) {
					return {error : warning};
				}
			}
			
			if (fm.newAPI) {
				return fm.normalizeData('upload', raw);
			}
			
			data = fm.normalizeData('open', raw);
			// find diff
			data = fm.diff(data.files);
			data.current = raw.cwd.hash;
			data.warning = warning;

			return data;
		};
	
	
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	
	// Shortcut opens dialog
	this.shortcuts = [{
		pattern     : 'ctrl+u',
	}];
	
	/**
	 * Return command state
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}
	
	
	this.exec = function(data) {
		var fm = this.fm,
			upload = function(data) {
				dialog.elfinderdialog('close');
				fm.upload(data)
					.fail(function(error) {
						dfrd.reject(error)
					})
					.done(function(data) {
						dfrd.resolve(data)
					});
			},
			dfrd, dialog, input, button, dropbox;
		
		if (data && (data.input || data.files)) {
			return fm.upload(data)
		}
		
		dfrd = $.Deferred();
		
		
		input = $('<input type="file" multiple="true"/>')
			.change(function() {
				upload({input : input[0]})
			});

		button = $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+fm.i18n('Select files to upload')+'</span></div>')
			.append($('<form/>').append(input))
			.hover(function() {
				button.toggleClass('ui-state-hover')
			})
			
		dialog = $('<div class="elfinder-upload-dialog-wrapper"/>')
			.append(button);
		
		if (fm.dragUpload) {
			dropbox = $('<div class="ui-corner-all elfinder-upload-dropbox">'+fm.i18n('Drop files here')+'</div>')
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
			}, false);

			dropbox.addEventListener('drop', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
			
				upload({files : e.dataTransfer.files});
			}, false);
			
		}
		
		fm.dialog(dialog, {
			title     : this.title,
			modal     : true,
			resizable : false,
			destroyOnClose : true
		});
			
		return dfrd;
	}

}