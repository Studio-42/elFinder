"use strict";
/**
 * @class  elFinder command "quicklook"
 * Fast preview for some files types
 *
 * @author Dmitry (dio) Levashov
 **/
(elFinder.prototype.commands.quicklook = function() {
	var self       = this,
		fm         = self.fm,
		/**
		 * window closed state
		 *
		 * @type Number
		 **/
		closed     = 0,
		/**
		 * window animated state
		 *
		 * @type Number
		 **/
		animated   = 1,
		/**
		 * window opened state
		 *
		 * @type Number
		 **/
		opened     = 2,
		/**
		 * window docked state
		 *
		 * @type Number
		 **/
		docked     = 3,
		/**
		 * window state
		 *
		 * @type Number
		 **/
		state      = closed,
		/**
		 * next/prev event name (requied to cwd catch it)
		 *
		 * @type Number
		 **/
		// keydown    = fm.UA.Firefox || fm.UA.Opera ? 'keypress' : 'keydown',
		/**
		 * navbar icon class
		 *
		 * @type String
		 **/
		navicon    = 'elfinder-quicklook-navbar-icon',
		/**
		 * navbar "fullscreen" icon class
		 *
		 * @type String
		 **/
		fullscreen = 'elfinder-quicklook-fullscreen',
		/**
		 * info wrapper class
		 * 
		 * @type String
		 */
		infocls    = 'elfinder-quicklook-info-wrapper',
		/**
		 * Triger keydown/keypress event with left/right arrow key code
		 *
		 * @param  Number  left/right arrow key code
		 * @return void
		 **/
		navtrigger = function(code) {
			$(document).trigger($.Event('keydown', { keyCode: code, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
		},
		/**
		 * Return css for closed window
		 *
		 * @param  jQuery  file node in cwd
		 * @return void
		 **/
		closedCss = function(node) {
			var elf = fm.getUI().offset(),
				base = node.find('.elfinder-cwd-file-wrapper'),
				baseOffset = base.offset();
			return {
				opacity : 0,
				width   : base.width(),
				height  : base.height(),
				top     : baseOffset.top - elf.top,
				left    : baseOffset.left  - elf.left
			}
		},
		/**
		 * Return css for opened window
		 *
		 * @return void
		 **/
		openedCss = function() {
			var contain = self.options.contain,
				win = contain? fm.getUI() : $(window),
				elf = fm.getUI().offset(),
				w = Math.min(width, win.width()-10),
				h = Math.min(height, win.height()-80);
			return {
				opacity : 1,
				width  : w,
				height : h,
				top    : parseInt((win.height() - h - 60) / 2 + (contain? 0 : win.scrollTop() - elf.top)),
				left   : parseInt((win.width() - w) / 2 + (contain? 0 : win.scrollLeft() - elf.left))
			}
		},
		
		support = function(codec, name) {
			var media = document.createElement(name || codec.substr(0, codec.indexOf('/'))),
				value = false;
			
			try {
				value = media.canPlayType && media.canPlayType(codec);
			} catch (e) {
				
			}
			
			return (value && value !== '' && value != 'no')? true : false;
		},
		
		platformWin = (window.navigator.platform.indexOf('Win') != -1),
		
		/**
		 * Opened window width (from config)
		 *
		 * @type Number
		 **/
		width, 
		/**
		 * Opened window height (from config)
		 *
		 * @type Number
		 **/
		height, 
		/**
		 * Previous style before docked
		 *
		 * @type String
		 **/
		prevStyle,
		/**
		 * elFinder node
		 *
		 * @type jQuery
		 **/
		parent, 
		/**
		 * elFinder current directory node
		 *
		 * @type jQuery
		 **/
		cwd, 
		/**
		 * Current directory hash
		 *
		 * @type String
		 **/
		cwdHash,
		dockEnabled = false,
		navdrag = false,
		navmove = false,
		navtm   = null,
		leftKey = $.ui.keyCode.LEFT,
		rightKey = $.ui.keyCode.RIGHT,
		coverEv = 'mousemove touchstart ' + ('onwheel' in document? 'wheel' : 'onmousewheel' in document? 'mousewheel' : 'DOMMouseScroll'),
		title   = $('<div class="elfinder-quicklook-title"/>'),
		icon    = $('<div/>'),
		info    = $('<div class="elfinder-quicklook-info"/>'),//.hide(),
		cover   = $('<div class="ui-front elfinder-quicklook-cover"/>'),
		fsicon  = $('<div class="'+navicon+' '+navicon+'-fullscreen"/>')
			.on('click touchstart', function(e) {
				if (navmove) {
					return;
				}
				
				var win     = self.window,
					full    = win.hasClass(fullscreen),
					$window = $(window),
					resize  = function() { self.preview.trigger('changesize'); };
					
				e.stopPropagation();
				e.preventDefault();
				
				if (full) {
					navStyle = '';
					navShow();
					win.toggleClass(fullscreen)
					.css(win.data('position'));
					$window.trigger(self.resize).off(self.resize, resize);
					navbar.off('mouseenter mouseleave');
					cover.off(coverEv);
				} else {
					win.toggleClass(fullscreen)
					.data('position', {
						left   : win.css('left'), 
						top    : win.css('top'), 
						width  : win.width(), 
						height : win.height(),
						display: 'block'
					})
					.removeAttr('style');

					$(window).on(self.resize, resize)
					.trigger(self.resize);

					cover.on(coverEv, function(e) {
						if (! navdrag) {
							if (e.type === 'mousemove' || e.type === 'touchstart') {
								navShow();
								navtm = setTimeout(function() {
									if (fm.UA.Mobile || navbar.parent().find('.elfinder-quicklook-navbar:hover').length < 1) {
										navbar.fadeOut('slow', function() {
											cover.show();
										});
									}
								}, 3000);
							}
							if (cover.is(':visible')) {
								coverHide();
								cover.data('tm', setTimeout(function() {
									cover.show();
								}, 3000));
							}
						}
					}).show().trigger('mousemove');
					
					navbar.on('mouseenter mouseleave', function(e) {
						if (! navdrag) {
							if (e.type === 'mouseenter') {
								navShow();
							} else {
								cover.trigger('mousemove');
							}
						}
					});
				}
				if (fm.zIndex) {
					win.css('z-index', fm.zIndex + 1);
				}
				if (fm.UA.Mobile) {
					navbar.attr('style', navStyle);
				} else {
					navbar.attr('style', navStyle).draggable(full ? 'destroy' : {
						start: function() {
							navdrag = true;
							navmove = true;
							cover.show();
							navShow();
						},
						stop: function() {
							navdrag = false;
							navStyle = self.navbar.attr('style');
							setTimeout(function() {
								navmove = false;
							}, 20);
						}
					});
				}
				$(this).toggleClass(navicon+'-fullscreen-off');
				var collection = win;
				if (parent.is('.ui-resizable')) {
					collection = collection.add(parent);
				};
				collection.resizable(full ? 'enable' : 'disable').removeClass('ui-state-disabled');

				win.trigger('viewchange');
			}
		),
		
		updateOnSel = function() {
			self.update(void(0), (function() {
				var fm = self.fm,
					files = fm.selectedFiles(),
					cnt = files.length,
					inDock = self.docked(),
					getInfo = function() {
						var size = 0, ts = 0;
						$.each(files, function(i, f) {
							var s = parseInt(f.size),
								t = parseInt(f.ts);
							if (f.mime !== 'directory' && s >= 0 && size >= 0) {
								size += s;
							} else {
								size = 'unknown';
							}
							if (ts >= 0) {
								if (t > ts) {
									ts = t;
								}
							} else {
								ts = 'unknown';
							}
						});
						return {
							hash : cwdHash,
							name : fm.i18n('items') + ': ' + cnt,
							mime : 'group',
							size : size,
							ts   : ts
						};
					};
				if (! cnt && inDock) {
					cnt = 1;
					files = [fm.cwd()];
				}
				return (!inDock || cnt === 1)? files[0] : getInfo();
			})());
		},
		
		navShow = function() {
			if (self.window.hasClass(fullscreen)) {
				navtm && clearTimeout(navtm);
				navtm = null;
				// if use `show()` it make infinite loop with old jQuery (jQuery/jQuery UI: 1.8.0/1.9.0)
				// see #1478 https://github.com/Studio-42/elFinder/issues/1478
				navbar.stop(true, true).css('display', 'block');
				coverHide();
			}
		},
		
		coverHide = function() {
			cover.data('tm') && clearTimeout(cover.data('tm'));
			cover.removeData('tm');
			cover.hide();
		},
			
		prev = $('<div class="'+navicon+' '+navicon+'-prev"/>').on('click touchstart', function(e) { ! navmove && navtrigger(leftKey); return false; }),
		next = $('<div class="'+navicon+' '+navicon+'-next"/>').on('click touchstart', function(e) { ! navmove && navtrigger(rightKey); return false; }),
		navbar  = $('<div class="elfinder-quicklook-navbar"/>')
			.append(prev)
			.append(fsicon)
			.append(next)
			.append('<div class="elfinder-quicklook-navbar-separator"/>')
			.append($('<div class="'+navicon+' '+navicon+'-close"/>').on('click touchstart', function(e) { ! navmove && self.window.trigger('close'); return false; }))
		,
		titleClose = $('<span class="ui-front ui-icon elfinder-icon-close ui-icon-closethick"/>').mousedown(function(e) {
			e.stopPropagation();
			self.window.trigger('close');
		}),
		titleDock = $('<span class="ui-front ui-icon elfinder-icon-minimize ui-icon-minusthick"/>').mousedown(function(e) {
			e.stopPropagation();
			if (! self.docked()) {
				self.window.trigger('navdockin');
			} else {
				self.window.trigger('navdockout');
			}
		}),
		navStyle = '',
		init = true,
		dockHeight;

	(this.navbar = navbar)._show = navShow;
	this.resize = 'resize.'+fm.namespace;
	this.info = $('<div/>').addClass(infocls)
		.append(icon)
		.append(info);
	this.autoPlay = function() {
		if (self.opened()) {
			return !! self.options[self.docked()? 'dockAutoplay' : 'autoplay'];
		}
		return false;
	};
	this.preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>')
		// clean info/icon
		.on('change', function() {
			navShow();
			navbar.attr('style', navStyle);
			self.docked() && navbar.hide();
			self.preview.attr('style', '').removeClass('elfinder-overflow-auto');
			self.info.attr('style', '').hide();
			icon.removeAttr('class').attr('style', '');
			info.html('');
		})
		// update info/icon
		.on('update', function(e) {
			var fm      = self.fm,
				preview = self.preview,
				file    = e.file,
				tpl     = '<div class="elfinder-quicklook-info-data">{value}</div>',
				tmb, name;

			if (file && (e.forceUpdate || file.hash === cwdHash || self.window.data('hash') !== file.hash)) {
				name = fm.escape(file.i18 || file.name);
				!file.read && e.stopImmediatePropagation();
				self.window.data('hash', file.hash);
				self.preview.off('changesize').trigger('change').children().remove();
				title.html(name);
				
				prev.css('visibility', '');
				next.css('visibility', '');
				if (file.hash === fm.cwdId2Hash(cwd.find('[id]:first').attr('id'))) {
					prev.css('visibility', 'hidden');
				}
				if (file.hash === fm.cwdId2Hash(cwd.find('[id]:last').attr('id'))) {
					next.css('visibility', 'hidden');
				}
				
				info.html(
						tpl.replace(/\{value\}/, name)
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('modify')+': '+ fm.formatDate(file))
					)
				icon.addClass('elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime));
				
				if (file.icon) {
					icon.css(fm.getIconStyle(file, true));
				}
				
				self.info.attr('class', infocls);
				if (file.csscls) {
					self.info.addClass(file.csscls);
				}

				if (file.read && (tmb = fm.tmb(file))) {
					$('<img/>')
						.hide()
						.appendTo(self.preview)
						.on('load', function() {
							icon.addClass(tmb.className).css('background-image', "url('"+tmb.url+"')");
							$(this).remove();
						})
						.attr('src', tmb.url);
				}
				self.info.delay(100).fadeIn(10);
				if (self.window.hasClass(fullscreen)) {
					cover.trigger('mousemove');
				}
			} else { 
				e.stopImmediatePropagation();
			}
		});

	this.window = $('<div class="ui-front ui-helper-reset ui-widget elfinder-quicklook touch-punch" style="position:absolute"/>')
		.hide()
		.addClass(fm.UA.Touch? 'elfinder-touch' : '')
		.on('click', function(e) { e.stopPropagation();  })
		.append(
			$('<div class="elfinder-quicklook-titlebar"/>')
			.append(
				title,
				$('<span class="elfinder-quicklook-titlebar-icon'+(platformWin? ' elfinder-platformWin' : '')+'"/>').append(
					titleClose, titleDock
				)
			),
			self.info.hide(),
			this.preview,
			cover.hide(),
			navbar
		)
		.draggable({handle : 'div.elfinder-quicklook-titlebar'})
		.on('open', function(e) {
			var win  = self.window, 
				file = self.value,
				node = fm.getUI('cwd');

			if (self.closed() && file && (file.hash === cwdHash || (node = $('#'+fm.cwdHash2Id(file.hash))).length)) {
				navStyle = '';
				navbar.attr('style', '');
				state = animated;
				node.trigger('scrolltoview');
				coverHide();
				win.css(closedCss(node))
					.show()
					.animate(openedCss(), 550, function() {
						state = opened;
						self.update(1, self.value);
						self.change();
						navShow();
					});
			}
		})
		.on('close', function(e, dfd) {
			var win     = self.window,
				preview = self.preview.trigger('change'),
				file    = self.value,
				hash    = win.data('hash'),
				close   = function() {
					state = closed;
					win.hide();
					preview.children().remove();
					self.update(0, self.value);
					dfd && dfd.resolve();
				},
				node;
				
			if (! self.docked()) {
				win.data('hash', '');
				if (self.opened()) {
					state = animated;
					win.hasClass(fullscreen) && fsicon.click();
					(hash && (node = cwd.find('#'+hash)).length)
						? win.animate(closedCss(node), 500, close)
						: close();
				}
			}
		})
		.on('navdockin', function(e, data) {
			var w      = self.window,
				box    = fm.getUI('navdock'),
				height = dockHeight || box.width(),
				opts   = data || {};
			
			if (init) {
				opts.init = true;
				init = false;
			}
			state = docked;
			prevStyle = w.attr('style');
			w.toggleClass('ui-front').removeClass('ui-widget').draggable('disable').resizable('disable').removeAttr('style').css({
				width: '100%',
				height: height,
				boxSizing: 'border-box',
				paddingBottom: 0,
				zIndex: 'unset'
			});
			navbar.hide();
			titleClose.hide();
			titleDock.toggleClass('ui-icon-plusthick ui-icon-minusthick elfinder-icon-full elfinder-icon-minimize');
			
			box.data('addNode')(w, opts);
			
			self.preview.trigger('changesize');
			
			fm.storage('previewDocked', '1');
		})
		.on('navdockout', function(e) {
			var w   = self.window,
				box = fm.getUI('navdock'),
				dfd = $.Deferred();
			
			state = opened;
			
			box.data('removeNode')(w.attr('id'), fm.getUI());
			
			dockHeight = w.outerHeight();
			w.toggleClass('ui-front').addClass('ui-widget').draggable('enable').resizable('enable').attr('style', prevStyle);
			navbar.show();
			titleClose.show();
			titleDock.toggleClass('ui-icon-plusthick ui-icon-minusthick elfinder-icon-full elfinder-icon-minimize');
			
			w.data('hash', '');
			w.trigger('close', dfd);
			dfd.done(function() {
				w.trigger('open');
			});
			
			fm.storage('previewDocked', '0');
		})
		.on('resize.' + fm.namespace, function() {
			self.preview.trigger('changesize'); 
		});

	/**
	 * This command cannot be disable by backend
	 *
	 * @type Boolean
	 **/
	this.alwaysEnabled = true;
	
	/**
	 * Selected file
	 *
	 * @type Object
	 **/
	this.value = null;
	
	this.handlers = {
		// save selected file
		select : function() { this.opened() && updateOnSel(); },
		error  : function() { self.window.is(':visible') && self.window.data('hash', '').trigger('close'); },
		'searchshow searchhide' : function() { this.opened() && this.window.trigger('close'); },
		navbarshow : function() {
			setTimeout(function() {
				self.docked() && self.preview.trigger('changesize');
			}, 0);
		},
		destroy : function() { self.window.remove(); }
	};
	
	this.shortcuts = [{
		pattern     : 'space'
	}];
	
	this.support = {
		audio : {
			ogg : support('audio/ogg; codecs="vorbis"') || support('audio/ogg; codecs="flac"'),
			mp3 : support('audio/mpeg;'),
			wav : support('audio/wav; codecs="1"'),
			m4a : support('audio/mp4;') || support('audio/x-m4a;') || support('audio/aac;'),
			flac: support('audio/flac;')
		},
		video : {
			ogg  : support('video/ogg; codecs="theora"'),
			webm : support('video/webm; codecs="vp8, vorbis"') || support('video/webm; codecs="vp9"'),
			mp4  : support('video/mp4; codecs="avc1.42E01E"') || support('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
			m3u8 : support('application/x-mpegURL', 'video') || support('application/vnd.apple.mpegURL', 'video'),
			mpd  : support('application/dash+xml', 'video')
		}
	};
	
	/**
	 * Return true if quickLoock window is hiddenReturn true if quickLoock window is visible and not animated
	 *
	 * @return Boolean
	 **/
	this.closed = function() {
		return state == closed;
	};
	
	/**
	 * Return true if quickLoock window is visible and not animated
	 *
	 * @return Boolean
	 **/
	this.opened = function() {
		return state == opened || state == docked;
	};
	
	/**
	 * Return true if quickLoock window is in NavDock
	 *
	 * @return Boolean
	 **/
	this.docked = function() {
		return state == docked;
	};
	
	/**
	 * Init command.
	 * Add default plugins and init other plugins
	 *
	 * @return Object
	 **/
	this.init = function() {
		var o       = this.options, 
			win     = this.window,
			preview = this.preview,
			i, p, cwdDispInlineRegex;
		
		width  = o.width  > 0 ? parseInt(o.width)  : 450;	
		height = o.height > 0 ? parseInt(o.height) : 300;
		if (o.dockHeight !== 'auto') {
			dockHeight = parseInt(o.dockHeight);
			if (! dockHeight) {
				dockHeight = void(0);
			}
		}

		fm.one('load', function() {
			
			dockEnabled = fm.getUI('navdock').data('dockEnabled');
			
			! dockEnabled && titleDock.hide();
			
			parent = fm.getUI();
			cwd    = fm.getUI('cwd');

			if (fm.zIndex) {
				win.css('z-index', fm.zIndex + 1);
			}
			
			win.appendTo(parent);
			
			// close window on escape
			$(document).on('keydown.'+fm.namespace, function(e) {
				e.keyCode == $.ui.keyCode.ESCAPE && self.opened() && ! self.docked() && win.trigger('close');
			});
			
			win.resizable({ 
				handles   : 'se', 
				minWidth  : 350, 
				minHeight : 120, 
				resize    : function() { 
					// use another event to avoid recursion in fullscreen mode
					// may be there is clever solution, but i cant find it :(
					preview.trigger('changesize'); 
				}
			});
			
			self.change(function() {
				if (self.opened()) {
					setTimeout(function() {
						if (self.value) {
							if (self.value.tmb && self.value.tmb == 1) {
								// try re-get file object
								self.value = Object.assign({}, fm.file(self.value.hash));
							}
							preview.trigger($.Event('update', {file : self.value}));
						} else {
							if (state != docked) {
								navtrigger(rightKey);
								setTimeout(function() {
									! self.value && win.trigger('close');
								}, 10);
							}
						}
					}, 10);
				}
			});
			
			preview.on('update', function(e) {
				var file = e.file,
					hash = file.hash,
					serach = (fm.searchStatus.mixed && fm.searchStatus.state > 1);
				
				if (file.mime !== 'directory') {
					if (parseInt(file.size)) {
						// set current dispInlineRegex
						self.dispInlineRegex = cwdDispInlineRegex;
						if (serach || fm.optionsByHashes[hash]) {
							try {
								self.dispInlineRegex = new RegExp(fm.option('dispInlineRegex', hash), 'i');
							} catch(e) {
								try {
									self.dispInlineRegex = new RegExp(!fm.isRoot(file)? fm.option('dispInlineRegex', file.phash) : fm.options.dispInlineRegex, 'i');
								} catch(e) {
									self.dispInlineRegex = /^$/;
								}
							}
						}
					} else {
						//  do not preview of file that size = 0
						e.stopImmediatePropagation();
					}
				} else {
					self.dispInlineRegex = /^$/;
				}
				
				self.info.show();
			});

			$.each(fm.commands.quicklook.plugins || [], function(i, plugin) {
				if (typeof(plugin) == 'function') {
					new plugin(self)
				}
			});
		}).one('open', function() {
			var dock = fm.storage('previewDocked') || (o.docked? 1 : 0);
			if (dockEnabled && dock >= 1) {
				self.exec();
				self.window.trigger('navdockin', { init : true });
				self.update(void(0), fm.cwd());
			}
		}).bind('open', function() {
			var prevCwd = cwdHash;
			
			// change cwd
			cwdHash = fm.cwd().hash;
			if (self.opened() && state != docked && prevCwd !== cwdHash) {
				win.trigger('close');
			}
			
			self.value = fm.cwd();
			
			// set current volume dispInlineRegex
			try {
				cwdDispInlineRegex = new RegExp(fm.option('dispInlineRegex'), 'i');
			} catch(e) {
				cwdDispInlineRegex = /^$/;
			}
		}).bind('change', function(e) {
			if (e.data && e.data.changed && self.opened()) {
				$.each(e.data.changed, function() {
					if (self.window.data('hash') === this.hash) {
						self.window.data('hash', null);
						self.preview.trigger('update');
						return false;
					}
				});
			}
		});
	};
	
	this.getstate = function() {
		var fm  = this.fm,
			sel = fm.selected(),
			chk = sel.length === 1 && $('#'+fm.cwdHash2Id(sel[0])).length;
		return chk? (self.opened()? 1 : 0) : -1;
	};
	
	this.exec = function() {
		if (state != docked) {
			this.closed() && updateOnSel();
			this.enabled() && this.window.trigger(this.opened() ? 'close' : 'open');
		}
	};

	this.hideinfo = function() {
		this.info.stop(true, true).hide();
	};

}).prototype = { forceLoad : true }; // this is required command
