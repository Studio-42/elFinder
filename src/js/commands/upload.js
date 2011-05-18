"use strict"
elFinder.prototype.commands.upload = function() {

	var self = this,
		fm    = this.fm,
		opts  = this.fm.options,
		mimes = opts.onlyMimes,
		data  = opts.customData,
		errors = fm.errors,
		counter = 0,		
		transports = {
			xhrFormData : function(input) {
				var dfrd = new $.Deferred(),
					xhr = new XMLHttpRequest(),
					formData = new FormData();
				
				xhr.addEventListener('load', function() {
					fm.log('load').log(xhr.responseText)
				}, false)
				xhr.addEventListener('error', function() {
					fm.log('error').log(xhr)
				}, false)
				xhr.addEventListener('abort', function() {
					fm.log('abort').log(xhr)
				}, false)
				xhr.upload.addEventListener('progress', function(e) {
					fm.log('progress').log(parseInt((e.loaded * 100) / e.total))
					
				}, false)
				
				xhr.open('POST', opts.url, true);
				
				
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						fm.log(xhr.status+" text: "+xhr.statusText)
						if (xhr.status == 0) {
							return dfrd.reject([errors.noConnect, errors.connectAborted])
						}
						// if (status > 500)
					}
				}
				
				
				
				formData.append('cmd', 'upload');
				formData.append('current', fm.cwd().hash)
				
				$.each(data, function(key, val) {
					formData.append(key, val);
				});
				$.each(mimes, function(i, mime) {
					formData.append('mimes['+i+']', mime);
				});
				
				$.each(input.files, function(i, file) {
					formData.append('upload['+i+']', file);
				});
				
				
				
				xhr.send(formData)
				// xhr.abort()
				return dfrd;
			},
		
			xhrMultipart : function(input) {
			
			},
		
			iframe : function(input) {
				var dfrd   = new $.Deferred(),
					msie   = $.browser.msie,
					cnt    = input.files ? input.files.length : 1,
					name   = 'iframe-'+fm.namespace+'-'+(++counter),
					iframe = $('<iframe src="'+(msie ? 'javascript:false' : 'about:blank')+'" name="'+name+'" />')
						.unbind('load')
						.bind('load', function() {
							var response = iframe.contents().text(),
								raw, data, error;
								
							iframe.unbind('load');
							fm.notify({type : 'upload', cnt : -cnt});
							tm && clearTimeout(tm);
							setTimeout(function() {
								msie && $('<iframe src="javascript:false;"/>').appendTo(form);
								form.remove();
							}, 100);
							
							try {
								raw = $.parseJSON(response);
							} catch(e) {
								return dfrd.reject([errors.invResponse, errors.notJSON]);
							}

							if (!raw) {
								return dfrd.reject([errors.invResponse, errors.emptyData]);
							}
							if (!fm.validResponse('upload', raw)) {
								return dfrd.reject([errors.invResponse, errors.invData]);
							}

							if (raw.error) {
								if (fm.newAPI) {
									return dfrd.reject(raw.error);
								}
								raw.warning = fm.i18n(raw.error);
								$.each(raw.errorData||[], function(name, msg) {
									raw.warning += '. '+fm.i18n(msg)+': '+name;
								})

								raw.error = null;
								if (!fm.validResponse('upload', raw)) {
									return dfrd.reject(raw.warning);
								}
							} 
							// fm.log(raw)
							data = fm.normalizeData('upload', raw);
							
							if (fm.oldAPI && !raw.tree) {
								$.each(fm.files(), function(hash, file) {
									file.phash != data.cwd.hash && data.files.push(file);
								});
								data = fm.diff(data.files);
								data.current = raw.cwd.hash;
							}
							dfrd.resolve(data);
							
						}),
					form = $('<form action="'+opts.url+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'"><input type="text" name="cmd" value="upload" /><input type="text" name="current" value="'+fm.cwd().hash+'" /></form>')
						.append(iframe)
						.append($(input).attr('name', 'upload[]')),
					tm;
					
					
				$.each(mimes, function(i, mime) {
					form.append('<input type="text" name="mimes[]" value="'+mime+'"/>');
				});
				
				$.each(data, function(key, val) {
					form.append('<input type="text" name="'+key+'" value="'+val+'"/>');
				});
					
				form.appendTo('body').submit();
				
				fm.notify({type : 'upload', cnt : cnt});
				if (self.options.iframeTimeout > 0) {
					tm = setTimeout(function() {
						dfrd.reject([errors.noConnect, errors.connectTimeout]);
					}, self.options.iframeTimeout);
				}
			
				return dfrd;
			}
		},
		transport;
	
	this.title = 'Upload files';
		
	this.init = function() {
		// this.options.forceIframe = true
		if (this.options.forceIframe) {
			return transport = transports.iframe;
		}
		
		if (typeof XMLHttpRequestUpload !== void(0) && typeof File !== void(0)) {
			if (typeof FormData !== void(0)) {
				this.fm.log('formData')
				transport = transports.xhrFormData;
			} else if (typeof FileReader !== void(0) && (new XMLHttpRequest()).sendAsBinary) {
				this.fm.log('binary')
				transport = transports.xhrMultipart;
			}
		}
	}
	
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}
	
	this._exec = function(input) {
		var fm = this.fm,
			dfrd = new transport(input)
				.fail(function(error) {
					fm.error(error);
				}).done(function(data) {
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