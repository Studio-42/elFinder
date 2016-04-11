"use strict"
/**
 * @class  elFinder command "quicklook"
 * Fast preview for some files types
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.quicklook = function() {
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
			return {
				opacity : 0,
				width   : 20,//node.width(),
				height  : fm.view == 'list' ? 1 : 20,
				top     : node.offset().top+'px', 
				left    : node.offset().left+'px' 
			}
		},
		/**
		 * Return css for opened window
		 *
		 * @return void
		 **/
		openedCss = function() {
			var win = $(window);
			var w = Math.min(width, $(window).width()-10);
			var h = Math.min(height, $(window).height()-80);
			return {
				opacity : 1,
				width  : w,
				height : h,
				top    : parseInt((win.height() - h - 60)/2 + win.scrollTop()),
				left   : parseInt((win.width() - w)/2 + win.scrollLeft())
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
		title   = $('<div class="elfinder-quicklook-title"/>'),
		icon    = $('<div/>'),
		info    = $('<div class="elfinder-quicklook-info"/>'),//.hide(),
		fsicon  = $('<div class="'+navicon+' '+navicon+'-fullscreen"/>')
			.mousedown(function(e) {
				var win     = self.window,
					full    = win.hasClass(fullscreen),
					scroll  = 'scroll.'+fm.namespace,
					$window = $(window);
					
				e.stopPropagation();
				
				if (full) {
					win.css(win.data('position')).unbind('mousemove');
					$window.unbind(scroll).trigger(self.resize).unbind(self.resize);
					navbar.unbind('mouseenter').unbind('mousemove');
				} else {
					win.data('position', {
						left   : win.css('left'), 
						top    : win.css('top'), 
						width  : win.width(), 
						height : win.height()
					})
					.css({
						width  : '100%',
						height : '100%'
					});

					$(window).bind(scroll, function() {
						win.css({
							left   : parseInt($(window).scrollLeft())+'px',
							top    : parseInt($(window).scrollTop()) +'px'
						})
					})
					.bind(self.resize, function(e) {
						self.preview.trigger('changesize');
					})
					.trigger(scroll)
					.trigger(self.resize);
					
					win.bind('mousemove', function(e) {
						navbar.stop(true, true).show().delay(3000).fadeOut('slow');
					})
					.mousemove();
					
					navbar.mouseenter(function() {
						navbar.stop(true, true).show();
					})
					.mousemove(function(e) {
						e.stopPropagation();
					});
				}
				navbar.attr('style', '').draggable(full ? 'destroy' : {});
				win.toggleClass(fullscreen);
				$(this).toggleClass(navicon+'-fullscreen-off');
				var collection = win;
				if(parent.is('.ui-resizable')) {
					collection = collection.add(parent);
				};
				$.fn.resizable && !fm.UA.Touch && collection.resizable(full ? 'enable' : 'disable').removeClass('ui-state-disabled');
			}),
			
		navbar  = $('<div class="elfinder-quicklook-navbar"/>')
			.append($('<div class="'+navicon+' '+navicon+'-prev"/>').mousedown(function() { navtrigger(37); }))
			.append(fsicon)
			.append($('<div class="'+navicon+' '+navicon+'-next"/>').mousedown(function() { navtrigger(39); }))
			.append('<div class="elfinder-quicklook-navbar-separator"/>')
			.append($('<div class="'+navicon+' '+navicon+'-close"/>').mousedown(function() { self.window.trigger('close'); }))
		;

	this.resize = 'resize.'+fm.namespace;
	this.info = $('<div class="elfinder-quicklook-info-wrapper"/>')
		.append(icon)
		.append(info);
		
	this.preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>')
		// clean info/icon
		.bind('change', function(e) {
			self.info.attr('style', '').hide();
			icon.removeAttr('class').attr('style', '');
			info.html('');

		})
		// update info/icon
		.bind('update', function(e) {
			var fm      = self.fm,
				preview = self.preview,
				file    = e.file,
				tpl     = '<div class="elfinder-quicklook-info-data">{value}</div>',
				tmb;

			if (file) {
				!file.read && e.stopImmediatePropagation();
				self.window.data('hash', file.hash);
				self.preview.unbind('changesize').trigger('change').children().remove();
				title.html(fm.escape(file.name));
				
				info.html(
						tpl.replace(/\{value\}/, fm.escape(file.name))
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('modify')+': '+ fm.formatDate(file))
					)
				icon.addClass('elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime));

				if (file.tmb) {
					$('<img/>')
						.hide()
						.appendTo(self.preview)
						.load(function() {
							icon.css('background', 'url("'+tmb+'") center center no-repeat');
							$(this).remove();
						})
						.attr('src', (tmb = fm.tmb(file.hash)));
				}
				self.info.delay(100).fadeIn(10);
			} else { 
				e.stopImmediatePropagation();
			}
		});
		

	

	this.window = $('<div class="ui-front ui-helper-reset ui-widget elfinder-quicklook" style="position:absolute"/>')
		.click(function(e) { e.stopPropagation();  })
		.append(
			$('<div class="elfinder-quicklook-titlebar"/>')
				.append(title)
				.append($('<span class="ui-icon ui-icon-circle-close"/>').mousedown(function(e) {
					e.stopPropagation();
					self.window.trigger('close');
				}))
		)
		.append(this.preview.add(navbar))
		.append(self.info.hide())
		.draggable({handle : 'div.elfinder-quicklook-titlebar'})
		.bind('open', function(e) {
			var win  = self.window, 
				file = self.value,
				node;

			if (self.closed() && file && (node = cwd.find('#'+fm.cwdHash2Id(file.hash))).length) {
				navbar.attr('style', '');
				state = animated;
				node.trigger('scrolltoview');
				win.css(closedCss(node))
					.show()
					.animate(openedCss(), 550, function() {
						state = opened;
						self.update(1, self.value);
					});
			}
		})
		.bind('close', function(e) {
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
				
			if (self.opened()) {
				state = animated;
				win.hasClass(fullscreen) && fsicon.mousedown()
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
	}
	
	this.shortcuts = [{
		pattern     : 'space'
	}];
	
	this.support = {
		audio : {
			ogg : support('audio/ogg; codecs="vorbis"'),
			mp3 : support('audio/mpeg;'),
			wav : support('audio/wav; codecs="1"'),
			m4a : support('audio/x-m4a;') || support('audio/aac;')
		},
		video : {
			ogg  : support('video/ogg; codecs="theora"'),
			webm : support('video/webm; codecs="vp8, vorbis"'),
			mp4  : support('video/mp4; codecs="avc1.42E01E"') || support('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') 
		}
	}
	
	
	/**
	 * Return true if quickLoock window is visible and not animated
	 *
	 * @return Boolean
	 **/
	this.closed = function() {
		return state == closed;
	}
	
	/**
	 * Return true if quickLoock window is hidden
	 *
	 * @return Boolean
	 **/
	this.opened = function() {
		return state == opened;
	}
	
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
			i, p;
		
		width  = o.width  > 0 ? parseInt(o.width)  : 450;	
		height = o.height > 0 ? parseInt(o.height) : 300;

		fm.one('load', function() {
			parent = fm.getUI();
			cwd    = fm.getUI('cwd');

			win.appendTo('body');
			
			// close window on escape
			$(document).keydown(function(e) {
				e.keyCode == 27 && self.opened() && win.trigger('close')
			})
			
			if ($.fn.resizable && !fm.UA.Touch) {
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
					self.value ? preview.trigger($.Event('update', {file : self.value})) : win.trigger('close');
				}
			});
			
			$.each(fm.commands.quicklook.plugins || [], function(i, plugin) {
				if (typeof(plugin) == 'function') {
					new plugin(self)
				}
			});
			
			preview.bind('update', function() {
				self.info.show();
			});
		});
		
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? state == opened ? 1 : 0 : -1;
	}
	
	this.exec = function() {
		this.enabled() && this.window.trigger(this.opened() ? 'close' : 'open');
	}

	this.hideinfo = function() {
		this.info.stop(true).hide();
	}

};
