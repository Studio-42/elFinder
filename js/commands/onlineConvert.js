/**
 * @class elFinder command "onlineConvert". 
 * 
 * Open a new (tab|window) to online-convert.com with target item URL
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.onlineConvert = function() {
	"use strict";
	var fm = this.fm,
		filter = function(files) {
			files = $.grep(files, function(file) {
				return file.mime !== 'directory' && file.read && file.size > 0 ? true : false;
			});
			return files.length === 1 ? files : [];
		},
		converter = 'https://%s-conversion.online-convert.com?external_url=';
	
	this.variants = [
		['archive', fm.i18n('Archive converter')],
		['audio', fm.i18n('Audio converter')],
		['document', fm.i18n('Document converter')],
		['ebook', fm.i18n('Ebook converter')],
		['hash', fm.i18n('Hash encryption')],
		['image', fm.i18n('Image converter')],
		['video', fm.i18n('Video converter')],
		['webservice', fm.i18n('Webservice converter')]
	];

	this.alwaysEnabled = true;
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length;
			
		return cnt && filter(sel).length === cnt ? 0 : -1;
	};
	
	this.exec = function(hashes, mode) {
		var fm    = this.fm,
			files = this.files(hashes),
			cnt   = files.length,
			file, dfrd;

		file = files[0];
		if (file.mime === 'directory' || !file.read || !file.size) {
			return dfrd.reject();
		}
		dfrd = fm.url(file.hash, {
			async: true,
			temporary: true
		}).done(function(url) {
			var link = $('<a target="_blank"/>');
			link.attr('href', converter.replace('%s', mode) + encodeURIComponent(fm.convAbsUrl(url)).replace(/%2520/g, '%252520'));
			link.appendTo('body').get(0).click();
		}).fail(function() {

		});

		return dfrd;
	};

};
