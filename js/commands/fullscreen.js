"use strict";
/**
 * @class  elFinder command "fullscreen"
 * elFinder node to full scrren mode
 *
 * @author Naoki Sawada
 **/

elFinder.prototype.commands.fullscreen = function() {
	var self   = this,
		fm     = this.fm,
		update = function(e, data) {
			e.preventDefault();
			e.stopPropagation();
			if (data && data.fullscreen) {
				self.update(void(0), (data.fullscreen === 'on'));
			}
		};

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.syncTitleOnChange = true;
	this.value = false;

	this.options = {
		ui : 'fullscreenbutton'
	};

	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var node = fm.getUI().get(0),
			full = (node === fm.toggleFullscreen(node));
		self.title = fm.i18n(full ? 'reinstate' : 'cmdfullscreen');
		self.update(void(0), full);
		return $.Deferred().resolve();
	};
	
	fm.bind('init', function() {
		fm.getUI().off('resize.' + fm.namespace, update).on('resize.' + fm.namespace, update);
	});
};
