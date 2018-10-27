/**
 * @class elfinderworkzone - elFinder container for nav and current directory
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderworkzone = function(fm) {
	"use strict";
	var cl = 'elfinder-workzone';
	
	this.not('.'+cl).each(function() {
		var wz     = $(this).addClass(cl),
			prevH  = Math.round(wz.height()),
			parent = wz.parent(),
			setDelta = function() {
				wdelta = wz.outerHeight(true) - wz.height();
			},
			fitsize = function(e) {
				var height = parent.height() - wdelta,
					style  = parent.attr('style'),
					curH   = Math.round(wz.height());
	
				if (e) {
					e.preventDefault();
					e.stopPropagation();
				}
				
				parent.css('overflow', 'hidden')
					.children(':visible:not(.'+cl+')').each(function() {
						var ch = $(this);
		
						if (ch.css('position') != 'absolute' && ch.css('position') != 'fixed') {
							height -= ch.outerHeight(true);
						}
					});
				parent.attr('style', style || '');
				
				height = Math.max(0, Math.round(height));
				if (prevH !== height || curH !== height) {
					prevH  = Math.round(wz.height());
					wz.height(height);
					fm.trigger('wzresize');
				}
			},
			cssloaded = function() {
				wdelta = wz.outerHeight(true) - wz.height();
				fitsize();
			},
			wdelta;
		
		setDelta();
		parent.on('resize.' + fm.namespace, fitsize);
		fm.one('cssloaded', cssloaded)
		  .bind('uiresize', fitsize)
		  .bind('themechange', setDelta);
	});
	return this;
};
