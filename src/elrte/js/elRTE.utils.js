/*
 * Misc utils for elRTE
 *
 * @param Object rte - editor
 * @todo Подумать, что из этого реально нужно и навести порядок. Возможно часть перенести в ellib
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 */
(function($) {
elRTE.prototype.utils = function(rte) {
	this.rte     = rte;
	this.url     = null;
	// domo arigato, Steave, http://blog.stevenlevithan.com/archives/parseuri
	this.reg     = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
	this.baseURL = '';
	this.path    = '';
	var self     = this;
	
	this.rgb2hex = function(str) {
	    function hex(x)  {
	    	hexDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8","9", "a", "b", "c", "d", "e", "f"];
	        return !x  ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x% 16];
	    }
		var rgb = str.match(/\(([0-9]{1,3}),\s*([0-9]{1,3}),\s*([0-9]{1,3})\)/); 
		return rgb ? "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]) : '';
	}
	
	this.toPixels = function(num) {
		var m = num.match(/([0-9]+\.?[0-9]*)\s*(px|pt|em|%)/);
		if (m) {
			num  = m[1];
			unit = m[2];
		} 
		if (num[0] == '.') {
			num = '0'+num;
		}
		num = parseFloat(num);

		if (isNaN(num)) {
			return '';
		}
		var base = parseInt($(document.body).css('font-size')) || 16;
		switch (unit) {
			case 'em': return parseInt(num*base);
			case 'pt': return parseInt(num*base/12);
			case '%' : return parseInt(num*base/100);
		}
		return num;
	}
	
	// TODO: add parse rel path ../../etc
	this.absoluteURL = function(url) {
		!this.url && this._url();
		url = $.trim(url);
		if (!url) {
			return '';
		}
		// ссылки на якоря не переводим в абс
		if (url[0] == '#') {
			return url;
		}
		var u = this.parseURL(url);

		if (!u.host && !u.path && !u.anchor) {
			//this.rte.log('Invalid URL: '+url)
			return '';
		}
		if (!this.rte.options.absoluteURLs) { 
			return url;
		}
		if (u.protocol) {
			//this.rte.log('url already absolute: '+url);
			return url;
		}
		if (u.host && (u.host.indexOf('.')!=-1 || u.host == 'localhost')) {
			//this.rte.log('no protocol');
			return this.url.protocol+'://'+url;
		}
		if (url[0] == '/') {
			url = this.baseURL+url;
		} else {
			if (url.indexOf('./') == 0) {
				url = url.substring(2);
			}
			url = this.baseURL+this.path+url;
		}
		return url;
	}
	
	this.parseURL = function(url) {
		var u   = url.match(this.reg);
		var ret = {};
		$.each(["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"], function(i) {
			ret[this] = u[i];
		});
		if (!ret.host.match(/[a-z0-9]/i)) {
			ret.host = '';
		}
		return ret;
	}
	
	this.trimEventCallback = function(c) {
		c = c ? c.toString() : '';
		return $.trim(c.replace(/\r*\n/mg, '').replace(/^function\s*on[a-z]+\s*\(\s*event\s*\)\s*\{(.+)\}$/igm, '$1'));
	}
	
	this._url = function() {
		this.url     = this.parseURL(window.location.href);
		this.baseURL = this.url.protocol+'://'+(this.url.userInfo ?  parts.userInfo+'@' : '')+this.url.host+(this.url.port ? ':'+this.url.port : '');
		this.path    = !this.url.file ? this.url.path : this.url.path.substring(0, this.url.path.length - this.url.file.length);
	}
	
}

})(jQuery);