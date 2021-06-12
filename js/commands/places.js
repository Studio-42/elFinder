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
		var fres = true;
		return $.grep(self.files(hashes), function(f) {
			fres = fres && f.mime == 'directory' ? true : false;
			return fres;
		});
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
