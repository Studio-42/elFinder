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
			reqDef;
		
		if (typeof q == 'string' && q) {
			if (typeof target == 'object') {
				mime = target.mime || '';
				target = target.target || '';
			}
			target = target? target : '';
			mime = mime? $.trim(mime).replace(',', ' ').split(' ') : [];
			$.each(mime, function(){ return $.trim(this); });
			fm.trigger('searchstart', {query : q, target : target, mimes : mime});
			
			reqDef = fm.request({
				data   : {cmd : 'search', q : q, target : target, mimes : mime},
				notify : {type : 'search', cnt : 1, hideCnt : true},
				cancel : true
			});
			return reqDef;
		}
		fm.getUI('toolbar').find('.'+fm.res('class', 'searchbtn')+' :text').focus();
		return $.Deferred().reject();
	}

};
