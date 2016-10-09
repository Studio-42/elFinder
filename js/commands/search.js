"use strict"
/**
 * @class  elFinder command "search"
 * Find files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.search = function() {
	this.title          = 'Find files';
	this.options        = {ui : 'searchbutton'}
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	
	/**
	 * Return command status.
	 * Search does not support old api.
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return 0;
	}
	
	/**
	 * Send search request to backend.
	 *
	 * @param  String  search string
	 * @return $.Deferred
	 **/
	this.exec = function(q, target, mime) {
		var fm = this.fm,
			reqDef = [],
			phash;
		
		if (typeof q == 'string' && q) {
			if (typeof target == 'object') {
				mime = target.mime || '';
				target = target.target || '';
			}
			target = target? target : '';
			mime = mime? $.trim(mime).replace(',', ' ').split(' ') : [];
			$.each(mime, function(){ return $.trim(this); });
			fm.trigger('searchstart', {query : q, target : target, mimes : mime});
			
			if (target === '' && fm.api >= 2.1) {
				$.each(fm.roots, function(id, hash) {
					reqDef.push(fm.request({
						data   : {cmd : 'search', q : q, target : hash, mimes : mime},
						notify : {type : 'search', cnt : 1, hideCnt : (reqDef.length? false : true)},
						cancel : true,
						preventDone : true
					}));
				});
			} else {
				reqDef.push(fm.request({
					data   : {cmd : 'search', q : q, target : target, mimes : mime},
					notify : {type : 'search', cnt : 1, hideCnt : true},
					cancel : true,
					preventDone : true
				}));
				if (target !== '' && fm.api >= 2.1 && Object.keys(fm.leafRoots).length) {
					$.each(fm.leafRoots, function(hash, roots) {
						phash = hash;
						while(phash) {
							if (target === phash) {
								$.each(roots, function() {
									reqDef.push(fm.request({
										data   : {cmd : 'search', q : q, target : this, mimes : mime},
										notify : {type : 'search', cnt : 1, hideCnt : false},
										cancel : true,
										preventDone : true
									}));
								});
							}
							phash = (fm.file(phash) || {}).phash;
						}
					});
				}
			}
			
			fm.searchStatus.mixed = (reqDef.length > 1);
			
			return $.when.apply($, reqDef).done(function(data) {
				var argLen = arguments.length,
					i;
				
				data.warning && fm.error(data.warning);
				
				if (argLen > 1) {
					data.files = (data.files || []);
					for(i = 1; i < argLen; i++) {
						arguments[i].warning && fm.error(arguments[i].warning);
						
						if (arguments[i].files) {
							data.files.push.apply(data.files, arguments[i].files);
						}
					}
				}
				
				fm.lazy(function() {
					fm.trigger('search', data);
				}).then(function() {
					// fire event with command name + 'done'
					return fm.lazy(function() {
						fm.trigger('searchdone');
					});
				}).then(function() {
					// force update content
					data.sync && fm.sync();
				});
			});
		}
		fm.getUI('toolbar').find('.'+fm.res('class', 'searchbtn')+' :text').focus();
		return $.Deferred().reject();
	}

};
