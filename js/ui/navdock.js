/**
 * @class elfindernavdock - elFinder container for preview etc at below the navbar
 *
 * @author Naoki Sawada
 **/
$.fn.elfindernavdock = function(fm, opts) {
	
	this.not('.elfinder-navdock').each(function() {
		var self = $(this).hide().addClass('ui-state-default elfinder-navdock touch-punch'),
			node = self.parent(),
			wz   = node.children('.elfinder-workzone').append(self),
			resize = function(to, curH) {
				var curH = curH || self.height(),
					diff = to - curH,
					len  = Object.keys(sizeSyncs).length,
					calc = len? diff / len : 0,
					ovf;
				if (diff) {
					ovf = self.css('overflow');
					self.css('overflow', 'hidden');
					$.each(sizeSyncs, function(id, n) {
						n.height(n.height() + calc).trigger('resize.' + fm.namespace);
					});
					self.height(to);
					fm.trigger('wzresize');
					self.css('overflow', ovf);
				}
			},
			handle = $('<div class="ui-front ui-resizable-handle ui-resizable-n"/>').appendTo(self),
			sizeSyncs = {},
			resizeFn = [],
			initMaxHeight = (parseInt(opts.initMaxHeight) || 50) / 100,
			maxHeight = (parseInt(opts.maxHeight) || 90) / 100;
		
		
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
			self.height(tH).show();
			
			fm.trigger('wzresize');
			
			if (opts.init) {
				mH = fm.storage('navdockHeight');
				if (mH) {
					tH = mH;
				} else {
					tH = tH > imaxH? imaxH : tH;
				}
			}
			resize(Math.min(tH, wzH * maxHeight));
			
			return self;
		});
		
		self.data('removeNode', function(nodeId, appendTo) {
			var cNode = $('#'+nodeId);
			delete sizeSyncs[nodeId];
			self.height(self.height() - $('#'+nodeId).outerHeight(true));
			if (appendTo) {
				appendTo.append(cNode);
				cNode.trigger('resize.' + fm.namespace);
			} else {
				cNode.remove();
			}
			if (self.children().length <= 1) {
				self.height(0).hide();
			}
			fm.trigger('wzresize');
		});
		
		if (! opts.disabled) {
			fm.one('init', function() {
				if (fm.getUI('navbar').children().not('.ui-resizable-handle').length) {
					self.data('dockEnabled', true);
					self.resizable({
						maxHeight: fm.getUI('workzone').height() * maxHeight,
						handles: { n: handle },
						resize: function(e, ui) {
							fm.trigger('wzresize');
						},
						stop: function(e, ui) {
							self.css('top', '');
							fm.storage('navdockHeight', ui.size.height);
							resize(ui.size.height, ui.originalSize.height);
						}
					});
					fm.bind('wzresize', function() {
						var maxH = fm.getUI('workzone').height() * maxHeight;
						if (self.height() > maxH) {
							resize(maxH);
						}
						self.resizable('option', 'maxHeight', maxH);
					});
				}
				fm.bind('navbarshow navbarhide', function(e) {
					self[e.type === 'navbarshow'? 'show' : 'hide']();
				});
			});
		}
	});
	return this;
};