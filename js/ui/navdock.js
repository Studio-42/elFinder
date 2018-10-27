/**
 * @class elfindernavdock - elFinder container for preview etc at below the navbar
 *
 * @author Naoki Sawada
 **/
$.fn.elfindernavdock = function(fm, opts) {
	"use strict";
	this.not('.elfinder-navdock').each(function() {
		var self = $(this).hide().addClass('ui-state-default elfinder-navdock touch-punch'),
			node = self.parent(),
			wz   = node.children('.elfinder-workzone').append(self),
			resize = function(to, h) {
				var curH = h || self.height(),
					diff = to - curH,
					len  = Object.keys(sizeSyncs).length,
					calc = len? diff / len : 0,
					ovf;
				if (diff) {
					ovf = self.css('overflow');
					self.css('overflow', 'hidden');
					self.height(to);
					$.each(sizeSyncs, function(id, n) {
						n.height(n.height() + calc).trigger('resize.' + fm.namespace);
					});
					fm.trigger('wzresize');
					self.css('overflow', ovf);
				}
			},
			handle = $('<div class="ui-front ui-resizable-handle ui-resizable-n"/>').appendTo(self),
			sizeSyncs = {},
			resizeFn = [],
			initMaxHeight = (parseInt(opts.initMaxHeight) || 50) / 100,
			maxHeight = (parseInt(opts.maxHeight) || 90) / 100,
			basicHeight, hasNode;
		
		
		self.data('addNode', function(cNode, opts) {
			var wzH = fm.getUI('workzone').height(),
				imaxH = wzH * initMaxHeight,
				curH, tH, mH;
			opts = Object.assign({
				first: false,
				sizeSync: true,
				init: false
			}, opts);
			if (!cNode.attr('id')) {
				cNode.attr('id', fm.namespace+'-navdock-' + (+new Date()));
			}
			opts.sizeSync && (sizeSyncs[cNode.attr('id')] = cNode);
			curH = self.height();
			tH = curH + cNode.outerHeight(true);
			
			if (opts.first) {
				handle.after(cNode);
			} else {
				self.append(cNode);
			}
			hasNode = true;
			self.resizable('enable').height(tH).show();
			
			fm.trigger('wzresize');
			
			if (opts.init) {
				mH = fm.storage('navdockHeight');
				if (mH) {
					tH = mH;
				} else {
					tH = tH > imaxH? imaxH : tH;
				}
				basicHeight = tH;
			}
			resize(Math.min(tH, wzH * maxHeight));
			
			return self;
		}).data('removeNode', function(nodeId, appendTo) {
			var cNode = $('#'+nodeId);
			delete sizeSyncs[nodeId];
			self.height(self.height() - $('#'+nodeId).outerHeight(true));
			if (appendTo) {
				if (appendTo === 'detach') {
					cNode = cNode.detach();
				} else {
					appendTo.append(cNode);
				}
			} else {
				cNode.remove();
			}
			if (self.children().length <= 1) {
				hasNode = false;
				self.resizable('disable').height(0).hide();
			}
			fm.trigger('wzresize');
			return cNode;
		});
		
		if (! opts.disabled) {
			fm.one('init', function() {
				var ovf;
				if (fm.getUI('navbar').children().not('.ui-resizable-handle').length) {
					self.data('dockEnabled', true);
					self.resizable({
						maxHeight: fm.getUI('workzone').height() * maxHeight,
						handles: { n: handle },
						start: function(e, ui) {
							ovf = self.css('overflow');
							self.css('overflow', 'hidden');
							fm.trigger('navdockresizestart', {event: e, ui: ui}, true);
						},
						resize: function(e, ui) {
							self.css('top', '');
							fm.trigger('wzresize', { inNavdockResize : true });
						},
						stop: function(e, ui) {
							fm.trigger('navdockresizestop', {event: e, ui: ui}, true);
							self.css('top', '');
							basicHeight = ui.size.height;
							fm.storage('navdockHeight', basicHeight);
							resize(basicHeight, ui.originalSize.height);
							self.css('overflow', ovf);
						}
					});
					fm.bind('wzresize', function(e) {
						var minH, maxH, h;
						if (self.is(':visible')) {
							maxH = fm.getUI('workzone').height() * maxHeight;
							if (! e.data || ! e.data.inNavdockResize) {
								h = self.height();
								if (maxH < basicHeight) {
									if (Math.abs(h - maxH) > 1) {
										resize(maxH);
									}
								} else {
									if (Math.abs(h - basicHeight) > 1) {
										resize(basicHeight);
									}
								}
							}
							self.resizable('option', 'maxHeight', maxH);
						}
					}).bind('themechange', function() {
						var oldH = Math.round(self.height());
						requestAnimationFrame(function() {
							var curH = Math.round(self.height()),
								diff = oldH - curH;
							if (diff !== 0) {
								resize(self.height(),  curH - diff);
							}
						});
					});
				}
				fm.bind('navbarshow navbarhide', function(e) {
					self[hasNode && e.type === 'navbarshow'? 'show' : 'hide']();
				});
			});
		}
	});
	return this;
};