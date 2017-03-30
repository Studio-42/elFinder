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
			if (data && data.fullscreen) {
				self.update(void(0), (data.fullscreen === 'on'));
			}
		};

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.value = false;

	this.options = {
		ui : 'fullscreenbutton'
	};

	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var node = fm.getUI().get(0),
			fullNode = fm.toggleFullscreen(node);
		self.update(void(0), (fullNode === node));
	};
	
	fm.bind('init', function() {
		fm.getUI().off('resize.' + fm.namespace, update).on('resize.' + fm.namespace, update);
	});
};
