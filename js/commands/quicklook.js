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
		 * @type Number
		 **/
		navicon    = 'elfinder-quicklook-navbar-icon',
		/**
		 * navbar "fullscreen" icon class
		 *
		 * @type Number
		 **/
		fullscreen  = 'elfinder-quicklook-fullscreen',
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
			var win = $(window);
			var elf = fm.getUI().offset();
			var w = Math.min(width, $(window).width()-10);
			var h = Math.min(height, $(window).height()-80);
			return {
				opacity : 1,
				width  : w,
				height : h,
				top    : parseInt((win.height() - h - 60) / 2 + win.scrollTop() - elf.top),
				left   : parseInt((win.width() - w) / 2 + win.scrollLeft() - elf.left)
			}
		},
		
		support = function(codec) {
			var media = document.createElement(codec.substr(0, codec.indexOf('/'))),
				value = false;
			
			try {
				value = media.canPlayType && media.canPlayType(codec);
			} catch (e) {
				
			}
			
			return value && value !== '' && value != 'no';
		},
		
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
				$.fn.resizable && collection.resizable(full ? 'enable' : 'disable').removeClass('ui-state-disabled');

				win.trigger('viewchange');
			}),
		
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
		navStyle = '';

	(this.navbar = navbar)._show = navShow;
	this.resize = 'resize.'+fm.namespace;
	this.info = $('<div class="elfinder-quicklook-info-wrapper"/>')
		.append(icon)
		.append(info);
		
	this.preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>')
		// clean info/icon
		.on('change', function() {
			navShow();
			navbar.attr('style', navStyle);
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

			if (file && (e.forceUpdate || self.window.data('hash') !== file.hash)) {
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
				$('<span class="ui-icon ui-icon-circle-close"/>').mousedown(function(e) {
					e.stopPropagation();
					self.window.trigger('close');
				})),
				this.preview,
				self.info.hide(),
				cover.hide(),
				navbar
			)
		.draggable({handle : 'div.elfinder-quicklook-titlebar'})
		.on('open', function(e) {
			var win  = self.window, 
				file = self.value,
				node;

			if (self.closed() && file && (node = $('#'+fm.cwdHash2Id(file.hash))).length) {
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
						navShow();
					});
			}
		})
		.on('close', function(e) {
			var win     = self.window,
				preview = self.preview.trigger('change'),
				file    = self.value,
				node    = cwd.find('#'+fm.cwdHash2Id(win.data('hash'))),
				close   = function() {
					state = closed;
					win.hide();
					preview.children().remove();
					self.update(0, self.value);
					
				};
				
			win.data('hash', '');
			if (self.opened()) {
				state = animated;
				win.hasClass(fullscreen) && fsicon.click();
				node.length
					? win.animate(closedCss(node), 500, close)
					: close();
			}
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
		select : function() { this.update(void(0), this.fm.selectedFiles()[0]); },
		error  : function() { self.window.is(':visible') && self.window.data('hash', '').trigger('close'); },
		'searchshow searchhide' : function() { this.opened() && this.window.trigger('close'); }
	};
	
	this.shortcuts = [{
		pattern     : 'space'
	}];
	
	this.support = {
		audio : {
			ogg : support('audio/ogg; codecs="vorbis"'),
			mp3 : support('audio/mpeg;'),
			wav : support('audio/wav; codecs="1"'),
			m4a : support('audio/mp4;') || support('audio/x-m4a;') || support('audio/aac;')
		},
		video : {
			ogg  : support('video/ogg; codecs="theora"'),
			webm : support('video/webm; codecs="vp8, vorbis"'),
			mp4  : support('video/mp4; codecs="avc1.42E01E"') || support('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') 
		}
	};
	
	/**
	 * Return true if quickLoock window is visible and not animated
	 *
	 * @return Boolean
	 **/
	this.closed = function() {
		return state == closed;
	};
	
	/**
	 * Return true if quickLoock window is hidden
	 *
	 * @return Boolean
	 **/
	this.opened = function() {
		return state == opened;
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
			i, p, curCwd;
		
		width  = o.width  > 0 ? parseInt(o.width)  : 450;	
		height = o.height > 0 ? parseInt(o.height) : 300;

		fm.one('load', function() {
			parent = fm.getUI();
			cwd    = fm.getUI('cwd');

			if (fm.zIndex) {
				win.css('z-index', fm.zIndex + 1);
			}
			
			win.appendTo(parent);
			
			// close window on escape
			$(document).keydown(function(e) {
				e.keyCode == $.ui.keyCode.ESCAPE && self.opened() && win.trigger('close')
			})
			
			if ($.fn.resizable) {
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
			}
			
			self.change(function() {
				if (self.opened()) {
					setTimeout(function() {
						if (self.value) {
							preview.trigger($.Event('update', {file : self.value}))
						} else {
							navtrigger(rightKey);
							setTimeout(function() {
								! self.value && win.trigger('close');
							}, 10);
						}
					}, 10);
				}
			});
			
			preview.on('update', function(data) {
				if (fm.searchStatus.mixed && fm.searchStatus.state > 1) {
					// set current volume dispInlineRegex
					try {
						self.dispInlineRegex = new RegExp(fm.option('dispInlineRegex', data.file.hash));
					} catch(e) {
						self.dispInlineRegex = /.*/;
					}
				}
				self.info.show();
			});

			$.each(fm.commands.quicklook.plugins || [], function(i, plugin) {
				if (typeof(plugin) == 'function') {
					new plugin(self)
				}
			});
		});
		
		fm.bind('open',function() {
			var prevCwd = curCwd;
			
			// change cwd
			curCwd = fm.cwd().hash;
			if (self.opened() && prevCwd !== curCwd) {
				win.trigger('close');
			}
			
			// set current volume dispInlineRegex
			try {
				self.dispInlineRegex = new RegExp(fm.option('dispInlineRegex'));
			} catch(e) {
				self.dispInlineRegex = /.*/;
			}
		});
		
		fm.bind('destroy', function() {
			self.window.remove();
		});
	};
	
	this.getstate = function() {
		var fm  = this.fm,
			sel = fm.selected(),
			chk = sel.length === 1 && $('#'+fm.cwdHash2Id(sel[0])).length;
		return chk? state == opened ? 1 : 0 : -1;
	};
	
	this.exec = function() {
		this.enabled() && this.window.trigger(this.opened() ? 'close' : 'open');
	};

	this.hideinfo = function() {
		this.info.stop(true, true).hide();
	};

}).prototype = { forceLoad : true }; // this is required command
