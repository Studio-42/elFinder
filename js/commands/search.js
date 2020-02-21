/**
 * @class  elFinder command "search"
 * Find files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.search = function() {
	"use strict";
	this.title          = 'Find files';
	this.options        = {ui : 'searchbutton'};
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
	};
	
	/**
	 * Send search request to backend.
	 *
	 * @param  String  search string
	 * @return $.Deferred
	 **/
	this.exec = function(q, target, mime, type) {
		var fm = this.fm,
			reqDef = [],
			sType = type || '',
			onlyMimes = fm.options.onlyMimes,
			phash, targetVolids = [],
			setType = function(data) {
				if (sType && sType !== 'SearchName' && sType !== 'SearchMime') {
					data.type = sType;
				}
				return data;
			},
			rootCnt;
		
		if (typeof q == 'string' && q) {
			if (typeof target == 'object') {
				mime = target.mime || '';
				target = target.target || '';
			}
			target = target? target : '';
			if (mime) {
				mime = $.trim(mime).replace(',', ' ').split(' ');
				if (onlyMimes.length) {
					mime = $.map(mime, function(m){ 
						m = $.trim(m);
						return m && ($.inArray(m, onlyMimes) !== -1
									|| $.grep(onlyMimes, function(om) { return m.indexOf(om) === 0? true : false; }).length
									)? m : null;
					});
				}
			} else {
				mime = [].concat(onlyMimes);
			}

			fm.trigger('searchstart', setType({query : q, target : target, mimes : mime}));
			
			if (! onlyMimes.length || mime.length) {
				if (target === '' && fm.api >= 2.1) {
					rootCnt = Object.keys(fm.roots).length;
					$.each(fm.roots, function(id, hash) {
						reqDef.push(fm.request({
							data   : setType({cmd : 'search', q : q, target : hash, mimes : mime}),
							notify : {type : 'search', cnt : 1, hideCnt : (rootCnt > 1? false : true)},
							cancel : true,
							preventDone : true
						}));
					});
				} else {
					reqDef.push(fm.request({
						data   : setType({cmd : 'search', q : q, target : target, mimes : mime}),
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
										var f = fm.file(this);
										f && f.volumeid && targetVolids.push(f.volumeid);
										reqDef.push(fm.request({
											data   : setType({cmd : 'search', q : q, target : this, mimes : mime}),
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
			} else {
				reqDef = [$.Deferred().resolve({files: []})];
			}
			
			fm.searchStatus.mixed = (reqDef.length > 1)? targetVolids : false;
			
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
				
				// because "preventDone : true" so update files cache
				data.files && data.files.length && fm.cache(data.files);
				
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
		fm.getUI('toolbar').find('.'+fm.res('class', 'searchbtn')+' :text').trigger('focus');
		return $.Deferred().reject();
	};

};
