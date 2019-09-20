/**
 * @class  elFinder command "mkfile"
 * Create new empty file
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkfile = function() {
	"use strict";
	var self = this;

	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'text/plain';
	this.prefix          = 'untitled file.txt';
	this.variants        = [];

	this.getTypeName = function(mime, type) {
		var fm = self.fm,
			name;
		if (name = fm.messages['kind' + fm.kinds[mime]]) {
			name = fm.i18n(['extentiontype', type.toUpperCase(), name]);
		} else {
			name = fm.i18n(['extentionfile', type.toUpperCase()]);
		}
		return name;
	};

	this.fm.bind('open reload canMakeEmptyFile', function() {
		var fm = self.fm,
			hides = fm.getCommand('edit').getMkfileHides();
		self.variants = [];
		if (fm.mimesCanMakeEmpty) {
			$.each(fm.mimesCanMakeEmpty, function(mime, type) {
				type && !hides[mime] && fm.uploadMimeCheck(mime) && self.variants.push([mime, self.getTypeName(mime, type)]);
			});
		}
		self.change();
	});

	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	};

	this.exec = function(_dum, mime) {
		var fm = self.fm,
			type, err;
		if (type = fm.mimesCanMakeEmpty[mime]) {
			if (fm.uploadMimeCheck(mime)) {
				this.mime = mime;
				this.prefix = fm.i18n(['untitled file', type]);
				return $.proxy(fm.res('mixin', 'make'), self)();
			}
			err = ['errMkfile', self.getTypeName(mime, type)];
		}
		return $.Deferred().reject(err);
	};
};
