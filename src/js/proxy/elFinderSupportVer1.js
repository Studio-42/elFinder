"use strict";

window.elFinderSupportVer1 = function() {
	var self = this;
	
	this.init = function(fm) {
		this.fm = fm;
	}
	
	
	this.send = function(opts) {
		var dfrd = $.Deferred(),
			xhr;
			
		dfrd.abort = function() {
			!xhr.isRejected() && !xhr.isResolved() && xhr.abort();
		}
		
		xhr = $.ajax(opts)
			.fail(function(error) {
				dfrd.reject(error)
			})
			.done(function(data) {
				dfrd.resolve(data)
			})
			

		return dfrd;
		this.fm.log(opts)
		return $.ajax(opts);
	}
	
	
}
