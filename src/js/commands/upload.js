"use strict"
elFinder.prototype.commands.upload = function() {

	var cnt = 0,
		fm   = this.fm,
		opts = this.fm.options,
		mimes = opts.onlyMimes,
		data  = opts.customData,
		
		normalizeData = function(data) {
			var ret = {
				// current : '',
				added : [],
				changed : []
			};
			
			if (fm.newAPI) {
				return data;
			}
			
			ret.current = data.cwd.hash;
			
			$.each(data.cdc, function(i, file) {
				file = fm.normalizeOldFile(file, ret.current);
				if ($.inArray(file.hash, data.select) !== -1) {
					
					if (!fm.file(file.hash)) {
						ret.added.push(file);
						fm.log('new '+file.name)
					} else {
						ret.changed.push(file)
						fm.log('changed '+file.name)
					}
					
				}
				
				// fm.log(file.name)
			})
			
			return ret
			
		},
		transports = {
			xhrFormData : function(input) {
			
			},
		
			xhrMultipart : function(input) {
			
			},
		
			iframe : function(input) {
				var dfrd = new $.Deferred(),
					msie = $.browser.msie,
					name = 'iframe-'+fm.namespace+'-'+(++cnt),
					iframe = $('<iframe src="'+(msie ? 'javascript:false' : 'about:blank')+'" name="'+name+'" />')
						.unbind('load')
						.bind('load', function() {
							var response = iframe.contents().text(),
								data;
								
							msie && $('<iframe src="javascript:false;"></iframe>').appendTo(form);
                            // form.remove();
								
							fm.log($.parseJSON(response))
							
							try {
								data = $.parseJSON(response);
							} catch(e) {
								return dfrd.reject([fm.errors.invResponse, fm.errors.notJSON]);
							}
							
							if (!data) {
								dfrd.reject([fm.errors.invResponse, fm.errors.emptyData]);
							} else if (data.error) {
								dfrd.reject(data.error);
							} else {
								fm.validResponse('upload', data) 
									? dfrd.resolve(normalizeData(data)) 
									: dfrd.reject([fm.errors.invResponse, fm.errors.invData]);
							}
							
							
						}),
					form = $('<form action="'+opts.url+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'"><input type="text" name="cmd" value="upload" /><input type="text" name="current" value="'+fm.cwd().hash+'" /></form>')
						.append(iframe)
						.append(input.attr('name', 'upload[]'))
					;
					
				$.each(mimes, function(i, mime) {
					form.append('<input type="text" name="mimes[]" value="'+mime+'"/>');
				});
				
				$.each(data, function(key, val) {
					form.append('<input type="text" name="'+key+'" value="'+val+'"/>');
				});
					
				form.appendTo('body').submit();
			
				return dfrd;
			}
		},
		transport;
		
	this.init = function() {
		this.options.forceIframe = true
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
			o = fm.options
		;
		
		// this.fm.log(input.val())
		
		var t = new transport(input).fail(function(error) {
			fm.log('error '+error)
		}).done(function(data) {
			fm.log(data)
		})
		
		return
		form.attr({
			action : o.url,
			method : 'post',
			enctype : 'multipart/form-data'
		})
		
		form.append('<input type="hidden" name="cmd" value="upload"/><input type="hidden" name="current" value="'+fm.cwd().hash+'"/>');
		
		$.each(o.onlyMimes, function(i, mime) {
			form.append('<input type="hidden" name="mimes[]" value="'+mime+'"/>');
		});
		
		$.each(o.customData, function(k, v) {
			form.append('<input type="hidden" name="'+k+'" value="'+v+'"/>');
		});
		
		
		
	}

}