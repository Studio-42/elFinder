/**
 * @class elFinder command "upload"
 * Upload files using iframe or XMLHttpRequest & FormData.
 * Dialog allow to send files using drag and drop
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.upload = function() {
	var self        = this,
		fm          = this.fm,
		opts        = this.fm.options,
		mimes       = opts.onlyMimes,
		cdata       = opts.customData,
		errors      = fm.errors,
		counter     = 0,
		undef       = 'undefined',
		transport   = 'iframe',
		prepareData = function(text) {
			var warning = '', raw, data;
			if (!$.trim(text)) {
				return {error : [errors.invResponse, errors.emptyData]}
			}
			
			try {
				raw = $.parseJSON(text);
			} catch (e) {
				return {error : [errors.invResponse, errors.notJSON]}
			}
			
			if (!fm.validResponse('upload', raw)) {
				return {error : [errors.invResponse, errors.invData]};
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
			// if no tree - append dirs to data to avoid removing its
			if (!raw.tree) {
				$.each(fm.files(), function(hash, file) {
					file.phash != data.cwd.hash && data.files.push(file);
				});
			}
			// find diff
			data = fm.diff(data.files);
			data.current = raw.cwd.hash;
			data.warning = warning;

			return data;
		},
		transports  = {
			// send files using XMLHttpRequest & FormData
			xhr : function(data) {
				var dfrd     = new $.Deferred(),
					xhr      = new XMLHttpRequest(),
					formData = new FormData(),
					files    = $.map(data ? data.files || (data.input && data.input.files) || [] : [], function(file) { return file instanceof File  && file.type ? file : null; }),
					cnt      = files.length, 
					notify   = false,
					loaded   = 5,
					ntm;
				
				if (!cnt) {
					return dfrd.reject();
				}
				
				dfrd.always(function() {
					timeout && clearTimeout(timeout)
					notify  && fm.notify({type : 'upload', cnt : -cnt});
				});
				
				xhr.addEventListener('abort', function() {
					dfrd.reject([errors.noConnect, errors.connectAborted]);
				}, false);
				
				xhr.addEventListener('load', function() {
					var status = xhr.status, data;
					
					if (status > 500) {
						return dfrd.reject(errors.invResponse);
					}
					if (status != 200) {
						return dfrd.reject(errors.noConnect);
					}
					if (xhr.readyState != 4) {
						return dfrd.reject([errors.noConnect, errors.connectTimeout]); // am i right?
					}
					if (!xhr.responseText) {
						return dfrd.reject([errors.invResponse, errors.emptyData]);
					}
					data = prepareData(xhr.responseText);
					data.error ? dfrd.reject(data.error) : dfrd.resolve(data);
				}, false);

				xhr.upload.addEventListener('progress', function(e) {
					var prev = loaded, curr;
					
					if (e.lengthComputable) {
						curr = parseInt(e.loaded*100 / e.total);
						if (curr - prev > 4) {
							loaded = curr;
							notify && fm.notify({type : 'upload', cnt : 0, progress : (loaded - prev)*cnt});
						}
					}
				}, false);
				
				xhr.open('POST', opts.url, true);
				
				formData.append('cmd', 'upload');
				formData.append('current', fm.cwd().hash);
				
				$.each(cdata, function(key, val) {
					formData.append(key, val);
				});
				$.each(mimes, function(i, mime) {
					formData.append('mimes['+i+']', mime);
				});
				
				$.each(files, function(i, file) {
					formData.append('upload['+i+']', file);
				});
				
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && xhr.status == 0) {
						// ff bug while send zero sized file
						dfrd.reject([errors.noConnect, errors.connectAborted]);
					}
				}
				
				xhr.send(formData);
				
				ntm = timeout  = setTimeout(function() {
					fm.notify({type : 'upload', cnt : cnt, progress : loaded*cnt});
					notify = true;
				}, fm.notifyDelay);
				// xhr.abort();
				return dfrd;
			},
		
			// send files using iframe
			iframe : function(data) {
				var msie   = $.browser.msie,
					cnt    = 0,
					name   = 'iframe-'+fm.namespace+'-'+(++counter),
					dfrd   = new $.Deferred(),
					input  = data && data.input,
					cnt    = input.files ? input.files.length : $(input).val() ? 1 : 0,
					notify = false,
					iframe = $('<iframe src="'+(msie ? 'javascript:false;' : 'about:blank')+'" name="'+name+'" />')
						.bind('load', function() {
							iframe.unbind('load');
							iframe.bind('load', function() {
								var data = prepareData(iframe.contents().text());
								
								stm && clearTimeout(stm);
								ntm && clearTimeout(ntm);
								notify && fm.notify({type : 'upload', cnt : -cnt});	

								setTimeout(function() {
									msie && $('<iframe src="javascript:false;"/>').appendTo(form);
									form.remove();
								}, 100);
								
								data.error ? dfrd.reject(data.error) : dfrd.resolve(data);
							});
							
							// delayed notify dialog
							ntm = setTimeout(function() {
								notify = true;
								fm.notify({type : 'upload', cnt : cnt});
							}, opts.notifyDelay);
							
							// emulate abort on timeout
							if (self.options.iframeTimeout > 0) {
								stm = setTimeout(function() {
									dfrd.reject([errors.noConnect, errors.connectTimeout]);
								}, self.options.iframeTimeout);
							}
							
							form.submit();
						}),
						form   = $('<form action="'+opts.url+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'" style="display:none"><input type="text" name="cmd" value="upload" /><input type="text" name="current" value="'+fm.cwd().hash+'" /></form>')
							.append($(input).attr('name', 'upload[]'))
							.append(iframe),
					ntm, stm;
					
				if (!cnt) {
					return dfrd.reject();
				}
				
				
				form.appendTo('body');
				
				$.each(mimes, function(i, mime) {
					form.append('<input type="text" name="mimes[]" value="'+mime+'"/>');
				});
				
				$.each(cdata, function(key, val) {
					form.append('<input type="text" name="'+key+'" value="'+val+'"/>');
				});
					
				return dfrd;
			}
		},
		
		dialog = function(callback) {
			var complete = false,
				input = $('<input type="file" multiple="true"/>')
					.change(function() {
						complete = true;
						dialog.elfinderdialog('close');
						callback({input : input[0]});
					}),
				button = $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+fm.i18n('Select files')+'</span></div>')
					.append($('<form/>').append(input))
					.hover(function() {
						button.toggleClass('ui-state-hover')
					}),
				wrapper = $('<div class="elfinder-upload-dialog-wrapper"></div>').append(button),
				dialog = fm.dialog(wrapper, {
					title     : self.title,
					modal     : true,
					autoOpen  : false,
					resizable : false,
					close     : function() {
						!complete && callback();
						dialog.elfinderdialog('destroy');
					}
				}),
				dropbox;

			if (transport == 'xhr') {
				dropbox = $('<div class="ui-corner-all elfinder-upload-dropbox">'+fm.i18n('Drop files here')+'</div>')[0];
				dropbox.addEventListener('dragenter', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
					$(dropbox).addClass('ui-state-hover');
				}, false);

				dropbox.addEventListener('dragleave', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
					$(dropbox).removeClass('ui-state-hover');
				}, false);

				dropbox.addEventListener('dragover', function(e) {
					e.stopPropagation();
				  	e.preventDefault();
				}, false);

				dropbox.addEventListener('drop', function(e) {
					var files = e.dataTransfer.files;

					e.stopPropagation();
				  	e.preventDefault();
					complete = true;
					
					dialog.elfinderdialog('close');
					callback({files : files});
				}, false);

				dialog.prepend(dropbox);
				// $(dropbox).after('or')
				$(dropbox).after('<div class="elfinder-upload-dialog-or">or</div>')
			}

			dialog.elfinderdialog('open');
			
		}
		;
	
	this.title = 'Upload files';
	
	// Shortcut opens dialog
	this.shortcuts = [{
		pattern     : 'ctrl+u',
		description : 'Upload files'
	}];
	
	/**
	 * Set file sending transport and toolbar button type
	 *
	 * @return void
	 **/	
	this.init = function() {

		if (!this.options.forceIframe 
		&&  typeof XMLHttpRequestUpload != undef
		&&  typeof File != undef
		&&  typeof FormData != undef) {
			transport = 'xhr';
		} 
		
		this.options.ui = this.options.forceDialog ? 'button' : 'uploadbutton';
	}
	
	/**
	 * Return command state
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}
	
	/**
	 * Without argument (or with invalid argument) - opens dialog.
	 * With valid argument - upload file.
	 *
	 * @param  Object  must contains input[type="file"] node or FileList
	 * @example
	 *   - cmd.exec({input : inputNode})
	 *   - cmd.exec({files : FilesList})
	 * @return jQuery.Deferred
	 **/
	this.exec = function(v) {
		var dfrd;
		
		if ($.isPlainObject(v)) {
			return this._exec(v);
		}

		dfrd = $.Deferred();
		
		dialog(function(data) {
			
			if (data && (data.input || data.files)) {
				self._exec(data).fail(function(error) {
					dfrd.reject(error)
				}).done(function(data) {
					dfrd.resolve(data)
				})
			} else {
				dfrd.reject()
			}

		});
		
		return dfrd;
	}
	
	/**
	 * Upload files.
	 *
	 * @param  Object  must contains input[type="file"] node or FileList
	 * @example
	 *   - cmd.exec({input : inputNode})
	 *   - cmd.exec({files : FilesList})
	 * @return jQuery.Deferred
	 **/
	this._exec = function(data) {
		var fm   = this.fm;
		
		return dfrd = transports[transport](data)
				.fail(function(error) {
					error && fm.error(error);
				})
				.done(function(data) {
					data.warning && fm.error(data.warning);
					if (data.current == fm.cwd().hash) {
						data.removed && fm.remove(data);
						data.added   && fm.add(data);
						data.changed && fm.change(data);
					}
 					fm.trigger('upload', data);
				});
				
	}

}