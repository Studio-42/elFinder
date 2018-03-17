/**
 * @class  elFinder command "places"
 * Regist to Places
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.places = function() {
	"use strict";
	var self   = this,
	fm     = this.fm,
	filter = function(hashes) {
		return $.grep(self.files(hashes), function(f) { return f.mime == 'directory' ? true : false; });
	},
	places = null;
	
	this.getstate = function(select) {
		var sel = this.hashes(select),
		cnt = sel.length;
		
		return  places && cnt && cnt == filter(sel).length ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var files = this.files(hashes);
		places.trigger('regist', [ files ]);
		return $.Deferred().resolve();
	};
	
	fm.one('load', function(){
		places = fm.ui.places;
	});

};
