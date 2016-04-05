"use strict";
/**
 * @class  elFinder command "places"
 * Regist to Places
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.places = function() {
	var self   = this,
	fm     = this.fm,
	filter = function(hashes) {
		return $.map(self.files(hashes), function(f) { return f.mime == 'directory' ? f : null; });
	},
	places = null;
	
	this.getstate = function(sel) {
		var sel = this.hashes(sel),
		cnt = sel.length;
		
		return  places && cnt && cnt == filter(sel).length ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var files = this.files(hashes);
		places.trigger('regist', [ files ]);
	};
	
	fm.one('load', function(){
		places = fm.ui.places;
	});

};
