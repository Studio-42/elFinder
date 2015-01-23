/**
 * @class elfindernav - elFinder container for diretories tree and places
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernavbar = function(fm, opts) {

	this.not('.elfinder-navbar').each(function() {
		var nav    = $(this).addClass('ui-state-default elfinder-navbar'),
			parent = nav.parent()
				.resize(function() {
					nav.height(wz.height() - delta);
				}),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			ltr    = fm.direction == 'ltr',
			handle;

		
		if ($.fn.resizable) {
			handle = nav.resizable({
					handles : ltr ? 'e' : 'w',
					minWidth : opts.minWidth || 150,
					maxWidth : opts.maxWidth || 500
				})
				.bind('resize scroll', function() {
					var offset = (fm.UA.Opera && nav.scrollLeft())? 20 : 2;
					handle.css({
						top  : parseInt(nav.scrollTop())+'px',
						left : ltr ? 'auto' : parseInt(nav.scrollLeft() + offset),
						right: ltr ? parseInt(nav.scrollLeft() - offset) * -1 : 'auto'
					});
				})
				.find('.ui-resizable-handle').zIndex(nav.zIndex() + 10);

			if (fm.UA.Touch) {
				var toggle = function(){
					if (handle.data('closed')) {
						handle.data('closed', false).css({backgroundColor: 'transparent'});
						nav.css({width: handle.data('width')}).trigger('resize');
					} else {
						handle.data('closed', true).css({backgroundColor: 'inherit'});
						nav.css({width: 8});
					}
					handle.data({startX: null, endX: null});
				};
				handle.data({closed: false, width: nav.width()})
				.bind('touchstart', function(e){
					handle.data('startX', e.originalEvent.touches[0].pageX);
				})
				.bind('touchmove', function(e){
					var x = e.originalEvent.touches[0].pageX;
					var sx = handle.data('startX');
					var open = ltr? (sx && sx < x) : (sx > x);
					var close = ltr? (sx > x) : (sx && sx < x);
					(open || close) && toggle();
				})
				.bind('touchend', function(e){
					handle.data('startX') && toggle();
				});
				if (fm.UA.Mobile) {
					handle.data('defWidth', nav.width());
					$(window).bind('resize', function(e){
						var hw = nav.parent().width() / 2;
						if (handle.data('defWidth') > hw) {
							nav.width(hw);
						} else {
							nav.width(handle.data('defWidth'));
						}
						handle.data('width', nav.width());
					});
				}
			}

			fm.one('open', function() {
				setTimeout(function() {
					nav.trigger('resize');
				}, 150);
			});
		}
	});
	
	return this;
};
