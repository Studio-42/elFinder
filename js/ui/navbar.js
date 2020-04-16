/**
 * @class elfindernav - elFinder container for diretories tree and places
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernavbar = function(fm, opts) {
	"use strict";
	this.not('.elfinder-navbar').each(function() {
		var nav    = $(this).hide().addClass('ui-state-default elfinder-navbar'),
			parent = nav.css('overflow', 'hidden').parent(),
			wz     = parent.children('.elfinder-workzone').append(nav),
			ltr    = fm.direction == 'ltr',
			delta, deltaW, handle, swipeHandle, autoHide, setWidth, navdock,
			setWzRect = function() {
				var cwd = fm.getUI('cwd'),
					wz  = fm.getUI('workzone'),
					wzRect = wz.data('rectangle'),
					cwdOffset = cwd.offset();
				wz.data('rectangle', Object.assign(wzRect, { cwdEdge: (fm.direction === 'ltr')? cwdOffset.left : cwdOffset.left + cwd.width() }));
			},
			setDelta = function() {
				nav.css('overflow', 'hidden');
				delta  = Math.round(nav.outerHeight() - nav.height());
				deltaW = Math.round(navdock.outerWidth() - navdock.innerWidth());
				nav.css('overflow', 'auto');
			};

		fm.one('init', function() {
			navdock = fm.getUI('navdock');
			var set = function() {
					setDelta();
					fm.bind('wzresize', function() {
						var navdockH = 0;
						navdock.width(nav.outerWidth() - deltaW);
						if (navdock.children().length > 1) {
							navdockH = navdock.outerHeight(true);
						}
						nav.height(wz.height() - navdockH - delta);
					}).trigger('wzresize');
				};
			if (fm.cssloaded) {
				set();
			} else {
				fm.one('cssloaded', set);
			}
		})
		.one('opendone',function() {
			handle && handle.trigger('resize');
			nav.css('overflow', 'auto');
		}).bind('themechange', setDelta);
		
		if (fm.UA.Touch) {
			autoHide = fm.storage('autoHide') || {};
			if (typeof autoHide.navbar === 'undefined') {
				autoHide.navbar = (opts.autoHideUA && opts.autoHideUA.length > 0 && $.grep(opts.autoHideUA, function(v){ return fm.UA[v]? true : false; }).length);
				fm.storage('autoHide', autoHide);
			}
			
			if (autoHide.navbar) {
				fm.one('init', function() {
					if (nav.children().length) {
						fm.uiAutoHide.push(function(){ nav.stop(true, true).trigger('navhide', { duration: 'slow', init: true }); });
					}
				});
			}
			
			fm.bind('load', function() {
				if (nav.children().length) {
					swipeHandle = $('<div class="elfinder-navbar-swipe-handle"></div>').hide().appendTo(wz);
					if (swipeHandle.css('pointer-events') !== 'none') {
						swipeHandle.remove();
						swipeHandle = null;
					}
				}
			});
			
			nav.on('navshow navhide', function(e, data) {
				var mode     = (e.type === 'navshow')? 'show' : 'hide',
					duration = (data && data.duration)? data.duration : 'fast',
					handleW = (data && data.handleW)? data.handleW : Math.max(50, fm.getUI().width() / 10);
				nav.stop(true, true)[mode]({
					duration: duration,
					step    : function() {
						fm.trigger('wzresize');
					},
					complete: function() {
						if (swipeHandle) {
							if (mode === 'show') {
								swipeHandle.stop(true, true).hide();
							} else {
								swipeHandle.width(handleW? handleW : '');
								fm.resources.blink(swipeHandle, 'slowonce');
							}
						}
						fm.trigger('navbar'+ mode);
						data.init && fm.trigger('uiautohide');
						setWzRect();
					}
				});
				autoHide.navbar = (mode !== 'show');
				fm.storage('autoHide', Object.assign(fm.storage('autoHide'), {navbar: autoHide.navbar}));
			}).on('touchstart', function(e) {
				if ($(this)['scroll' + (fm.direction === 'ltr'? 'Right' : 'Left')]() > 5) {
					e.originalEvent._preventSwipeX = true;
				}
			});
		}
		
		if (! fm.UA.Mobile) {
			handle = nav.resizable({
					handles : ltr ? 'e' : 'w',
					minWidth : opts.minWidth || 150,
					maxWidth : opts.maxWidth || 500,
					resize : function() {
						fm.trigger('wzresize');
					},
					stop : function(e, ui) {
						fm.storage('navbarWidth', ui.size.width);
						setWzRect();
					}
				})
				.on('resize scroll', function(e) {
					var $this = $(this),
						tm = $this.data('posinit');
					e.preventDefault();
					e.stopPropagation();
					if (! ltr && e.type === 'resize') {
						nav.css('left', 0);
					}
					tm && cancelAnimationFrame(tm);
					$this.data('posinit', requestAnimationFrame(function() {
						var offset = (fm.UA.Opera && nav.scrollLeft())? 20 : 2;
						handle.css('top', 0).css({
							top  : parseInt(nav.scrollTop())+'px',
							left : ltr ? 'auto' : parseInt(nav.scrollRight() -  offset) * -1,
							right: ltr ? parseInt(nav.scrollLeft() - offset) * -1 : 'auto'
						});
						if (e.type === 'resize') {
							fm.getUI('cwd').trigger('resize');
						}
					}));
				})
				.children('.ui-resizable-handle').addClass('ui-front');
		}

		if (setWidth = fm.storage('navbarWidth')) {
			nav.width(setWidth);
		} else {
			if (fm.UA.Mobile) {
				fm.one(fm.cssloaded? 'init' : 'cssloaded', function() {
					var set = function() {
						setWidth = nav.parent().width() / 2;
						if (nav.data('defWidth') > setWidth) {
							nav.width(setWidth);
						} else {
							nav.width(nav.data('defWidth'));
						}
						nav.data('width', nav.width());
						fm.trigger('wzresize');
					};
					nav.data('defWidth', nav.width());
					$(window).on('resize.' + fm.namespace, set);
					set();
				});
			}
		}

	});
	
	return this;
};
