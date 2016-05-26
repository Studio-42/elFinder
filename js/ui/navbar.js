/**
 * @class elfindernav - elFinder container for diretories tree and places
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernavbar = function(fm, opts) {

	this.not('.elfinder-navbar').each(function() {
		var nav    = $(this).addClass('ui-state-default elfinder-navbar'),
			parent = nav.parent(),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			ltr    = fm.direction == 'ltr',
			handle, swipeHandle;

		fm.bind('resize', function() {
			nav.height(wz.height() - delta);
		});
		
		if (fm.UA.Touch) {
			fm.bind('load', function() {
				swipeHandle = $('<div class="elfinder-navbar-swipe-handle"/>').appendTo(wz);
				if (swipeHandle.css('pointer-events') !== 'none') {
					swipeHandle.remove();
					swipeHandle = null;
				}
			});
			
			nav.on('navshow navhide', function(e, data) {
				var mode     = (e.type === 'navshow')? 'show' : 'hide',
					duration = (data && data.duration)? data.duration : 'fast',
					handleW = (data && data.handleW)? data.handleW : Math.max(50, fm.getUI().width() / 10);
				nav.stop(true, true)[mode](duration, function() {
					if (mode === 'show') {
						swipeHandle && swipeHandle.stop(true, true).hide();
					} else {
						if (swipeHandle) {
							swipeHandle.width(handleW? handleW : '');
							fm.resources.blink(swipeHandle, 'slowonce');
						}
					}
					fm.trigger('navbar'+ mode);
					fm.getUI('cwd').trigger('resize');
				});
			});
			
			if (opts.autoHideUA && opts.autoHideUA.length > 0) {
				fm.one('open', function() {
					if ($.map(opts.autoHideUA, function(v){ return fm.UA[v]? true : null; }).length) {
						setTimeout(function() {
							nav.trigger('navhide', {duration: 'slow'});
						}, 500);
					}
				});
			}
		}
		
		if ($.fn.resizable && ! fm.UA.Mobile) {
			handle = nav.resizable({
					handles : ltr ? 'e' : 'w',
					minWidth : opts.minWidth || 150,
					maxWidth : opts.maxWidth || 500
				})
				.on('resize scroll', function(e) {
					clearTimeout($(this).data('posinit'));
					$(this).data('posinit', setTimeout(function() {
						var offset = (fm.UA.Opera && nav.scrollLeft())? 20 : 2;
						handle.css({
							top  : parseInt(nav.scrollTop())+'px',
							left : ltr ? 'auto' : parseInt(nav.scrollLeft() + offset),
							right: ltr ? parseInt(nav.scrollLeft() - offset) * -1 : 'auto'
						});
						if (e.type === 'resize') {
							fm.getUI('cwd').trigger('resize');
						}
					}, 50));
				})
				.find('.ui-resizable-handle').addClass('ui-front');

			fm.one('open', function() {
				setTimeout(function() {
					nav.trigger('resize');
				}, 150);
			});
		}

		if (fm.UA.Mobile) {
			nav.data('defWidth', nav.width());
			$(window).on('resize', function(e){
				var hw = nav.parent().width() / 2;
				if (nav.data('defWidth') > hw) {
					nav.width(hw);
				} else {
					nav.width(nav.data('defWidth'));
				}
				nav.data('width', nav.width());
			});
		}

	});
	
	return this;
};
