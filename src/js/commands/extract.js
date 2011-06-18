"use strict"
/**
 * @class  elFinder command "extract"
 * Extract files from archive
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.extract = function() {
	var self    = this,
		fm      = self.fm,
		mimes   = [],
		getfile = function() {
			var file = fm.selected().length == 1 && fm.selectedFiles()[0];
			return file && $.inArray(file.mime, mimes) !== -1 ? file : false
		};
	
	
	this.title = 'Extract files from archive';
	
	this._handlers = {
		select  : function() { this.update(); },
	};
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	this.init = function() {
		fm.one('load', function() {
			fm.bind('open reload', function() {
				mimes = fm.option('archivers')['extract'] || [];
			});
		});
	}
	
	this.getstate = function() {
		return getfile() ? 0 : -1;
	}
	
	this._exec = function() {
		var file = getfile(),
			dfrd = $.Deferred().fail(function(error) {
				error && fm.error(error);
			});
			
		if (!file) {
			return dfrd.reject();
		}
		
		if (!file.read) {
			return dfrd.reject([fm.errors.extract, file.name, fm.errors.denied]);
		}
		
		return fm.ajax({
			data       : {cmd : 'extract', target : file.hash, current : file.phash},
			notify     : {type : 'extract', cnt : 1},
			syncOnFail : true
		});
	}

}