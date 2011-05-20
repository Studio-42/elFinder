
elFinder.prototype.commands.upload = function() {

	var self    = this,
		fm      = this.fm,
		opts    = this.fm.options,
		mimes   = opts.onlyMimes,
		data    = opts.customData,
		errors  = fm.errors,
		counter = 0,
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
		transports = {
			xhr : function(input) {
				var dfrd     = new $.Deferred()
						.always(function() {
							timeout && clearTimeout(timeout)
							notify  && fm.notify({type : 'upload', cnt : -cnt});
						}),
					xhr      = new XMLHttpRequest(),
					formData = new FormData(),
					cnt      = input.files.length,
					notify   = false,
					loaded   = 5,
					timeout  = setTimeout(function() {
						fm.notify({type : 'upload', cnt : cnt, progress : loaded*cnt});
						notify = true;
					}, fm.notifyDelay);
				
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
				
				$.each(data, function(key, val) {
					formData.append(key, val);
				});
				$.each(mimes, function(i, mime) {
					formData.append('mimes['+i+']', mime);
				});
				
				$.each(input.files, function(i, file) {
					formData.append('upload['+i+']', file);
				});
				
				xhr.send(formData);

				return dfrd;
			},
		
			iframe : function(input) {
				var msie   = $.browser.msie,
					cnt    = input.files ? input.files.length : 1,
					name   = 'iframe-'+fm.namespace+'-'+(++counter),
					dfrd   = new $.Deferred()
						.always(function() {
							stop && clearTimeout(stop);
							if (notify) {
								fm.notify({type : 'upload', cnt : -cnt});	
							} else if (timeout) {
								clearTimeout(timeout);
							}
							setTimeout(function() {
								msie && $('<iframe src="javascript:false;"/>').appendTo(form);
								form.remove();
							}, 100);
						}),
					form   = $('<form action="'+opts.url+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'"><input type="text" name="cmd" value="upload" /><input type="text" name="current" value="'+fm.cwd().hash+'" /></form>')
						.append($(input).attr('name', 'upload[]'))
						.appendTo('body'),
					iframe = $('<iframe src="'+(msie ? 'javascript:false' : 'about:blank')+'" name="'+name+'" />')
						.appendTo(form)
						.unbind('load')
						.bind('load', function() {
							var response = iframe.contents().text(),
								data, error;
								
							iframe.unbind('load');
							data = prepareData(response);
							data.error ? dfrd.reject(data.error) : dfrd.resolve(data);
						}),
					notify = false,
					timeout = setTimeout(function() {
						notify = true;
						fm.notify({type : 'upload', cnt : cnt});
					}, opts.notifyDelay),
					stop = self.options.iframeTimeout > 0
						? setTimeout(function() {
							dfrd.reject([errors.noConnect, errors.connectTimeout]);
						}, self.options.iframeTimeout)
						: null;

				
				$.each(mimes, function(i, mime) {
					form.append('<input type="text" name="mimes[]" value="'+mime+'"/>');
				});
				
				$.each(data, function(key, val) {
					form.append('<input type="text" name="'+key+'" value="'+val+'"/>');
				});
					
				form.submit();
			
				return dfrd;
			}
		},
		transport;
	
	this.title = 'Upload files';
	
	/**
	 * Set file sending transport
	 *
	 * @return void
	 **/	
	this.init = function() {

		if (!this.options.forceIframe 
		&& typeof XMLHttpRequestUpload !== void(0) 
		&& typeof File !== void(0)
		&& typeof FormData !== void(0)) {
			transport = transports.xhr;
		} else {
			transport = transports.iframe;
		}
	}
	
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}
	
	this._exec = function(input) {
		var fm   = this.fm,
			dfrd = new transport(input)
				.fail(function(error) {
					fm.error(error);
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
				
		return dfrd;
	}

}