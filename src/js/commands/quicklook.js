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
		 * listners for "preview" event
		 *
		 * @type Array
		 **/
		listeners  = [],
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
		keydown    = $.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown',
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
		navfsicon  = navicon+'-fullscreen',
		/**
		 * Triger keydown/keypress event with left/right arrow key code
		 *
		 * @param  Number  left/right arrow key code
		 * @return void
		 **/
		navtrigger = function(code) {
			$(document).trigger($.Event(keydown, { keyCode: code, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
		},
		/**
		 * Return css for closed window
		 *
		 * @param  jQuery  file node in cwd
		 * @return void
		 **/
		closedCss = function(node) {
			!node.length && (node = $('<div/>'));
			return {
				opacity : 0,
				width  : node.width(),
				height : node.height(),
				top    : parseInt(wz.position().top + node.position().top - deltah)+'px',
				left   : parseInt(cwd.position().left + node.position().left + deltaw)+'px'
			}
		},
		/**
		 * Return css for opened window
		 *
		 * @return void
		 **/
		openedCss = function() {
			return {
				opacity : 1,
				width  : width,
				height : height,
				top    : '50px',
				left   : parseInt((parent.width() - width)/2)
			}
		},
		/**
		 * Open window
		 *
		 * @return void
		 **/
		open      = function() {
			var win  = self.window,
				file = self.value, node;

			if (self.closed() && file && (node = cwd.find('#'+file.hash)).length) {
				state = animated;
				node.trigger('scrolltoview');
				self.preview()
				win.css(closedCss(node))
					.show()
					.animate(openedCss(), 'fast', function() { 
						state = opened;
						win.trigger('open').trigger('resize');
					});
			}
		}, 
		/**
		 * Close window
		 *
		 * @param  Boolean  if true - close without animation
		 * @return void
		 **/
		close     = function(force) {
			var win     = self.window,
				ui      = self.ui, 
				onclose = function() {
					win.hide();
					ui.preview.show().children().remove();
					state = closed;
				},
				node;
			
			if (self.opened()) {
				state = animated;
				
				if (force || !(node = cwd.find('#'+win.data('hash'))).length) {
					win.hide();
					onclose();
				} else {
					ui.preview.hide(200);
					win.unbind('open resize')
						.css('height', 'auto')
						.animate(closedCss(node), 350, onclose);
				}
				
			}
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
		 * elFinder workzone node
		 *
		 * @type jQuery
		 **/
		wz, 
		/**
		 * elFinder current directory node
		 *
		 * @type jQuery
		 **/
		cwd, 
		/**
		 * Diference between cwd outer width and cwd width
		 *
		 * @type Number
		 **/
		deltaw, 
		/**
		 * Diference between cwd outer height and cwd height
		 *
		 * @type Number
		 **/
		deltah;

	this.title = 'Preview';
	
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
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {
		ui     : 'button', 
		width  : 450,
		height : 350
	};
	
	this.handlers = {
		select   : function() {
			var state = this.getstate();
			
			this.update(state, state > -1 ? this.fm.selectedFiles()[0] : null);
		},
		error : function() { close(true); }
	}
	
	this.shortcuts = [{
		pattern     : 'space',
		description : 'Preview'
	}];
	
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
	 * Attach/trigger event.
	 * Event fired when window opened and selected file changed
	 *
	 * @param  Function|void  callback
	 * @return Object
	 **/
	this.preview = function(cb) {
		var res;
		
		if (typeof(cb) == 'function') {
			listeners.push(cb);
		} else {
			$.each(listeners, function(i, cb) {
				try {
					res = cb()
				} catch (e) {
					fm.debug('error', e);
				}
				if (res === false) {
					return false;
				}
			});
		}
		return self
	}
	
	
	/**
	 * Quicklook window parts
	 *
	 * @return Object
	 **/
	this.ui = {
		title    : $('<div class="elfinder-quicklook-title"/>'),
		titlebar : $('<div class="elfinder-quicklook-titlebar"/>')
			.append($('<span class="ui-icon ui-icon-circle-close"/>').click(function() { close(); })),
		preview : $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>')
			.bind('resize', function(e) {
				e.stopPropagation();
				self.ui.preview.height(self.window.height() - self.ui.titlebar.outerHeight() - self.ui.navbar.outerHeight());
			}),
		navbar : $('<div class="elfinder-quicklook-navbar"/>')
			.append($('<div class="'+navicon+' '+navfsicon+'"/>').mousedown(function(e) {
					var icon       = $(this),
						win        = self.window,
						fullscreen = icon.is('.'+navfsicon+'-off');
					
					if (fullscreen) {
						win.css(win.data('position'));
					} else {
						win.data('position', {
							left   : win.css('left'), 
							top    : win.css('top'), 
							width  : win.width(), 
							height : win.height()
						})
						.hide() // try to hide window scrollers and calc coorent window size
						.css({
							left   : -Math.ceil(parent.offset().left + 1),
							top    : -Math.ceil(parent.offset().top + 1),
							width  : $(window).width(),
							height : $(window).height()
						})
						.show();
					}
					self.ui.titlebar[fullscreen ? 'show' : 'hide']();
					
					win[fullscreen ? 'removeClass' : 'addClass']('elfinder-quicklook-fullscreen');
					icon[fullscreen ? 'removeClass' : 'addClass'](navfsicon+'-off');
					$.fn.resizable && win.resizable(fullscreen ? 'enable' : 'disable').removeClass('ui-state-disabled');
					win.trigger('resize');
				})
			)
			.append($('<div class="'+navicon+' '+navicon+'-prev"/>').mousedown(function(e) { navtrigger(37); }))
			.append($('<div class="'+navicon+' '+navicon+'-next"/>').mousedown(function(e) { navtrigger(39); }))
	}
	
	/**
	 * Quicklook window 
	 *
	 * @return jQuery
	 **/
	this.window = $('<div class="elfinder-quicklook" style="position:absolute"/>')
		.append(self.ui.titlebar.append(this.ui.title))
		.append(this.ui.preview)
		.append(this.ui.navbar)
		.draggable({handle : '.elfinder-quicklook-titlebar'})
		;
	
	// make window resizable
	if ($.fn.resizable) {
		this.window.resizable({ 
			handles   : 'se', 
			minWidth  : this.options.minWidth || 350,
			minHeight : this.options.minHeight || 160
		});
	}
	
	/**
	 * Init command.
	 * Add default plugins and init other plugins
	 *
	 * @return Object
	 **/
	this.init = function() {
		var o = this.options, 
			plugins = fm.commands.quicklook.plugins || [],
			i, p;
		
		width  = o.width > 0 ? parseInt(o.width) : 450;	
		height = o.height > 0 ? parseInt(o.height) : 200;
		
		fm.one('load', function() {
			parent = fm.getUI().prepend(self.window);
			cwd    = fm.getUI('cwd');
			wz     = cwd.parent();
			deltaw = (cwd.innerWidth() - cwd.width() - 2)/2;
			deltah = (cwd.innerHeight() - cwd.height() - 2)/2

			// on change preview - update file info and title
			self.preview(function() {
				var ui   = self.ui,
					file = self.value,
					tmb  = fm.tmb(file.hash),
					icon = $('<div class="elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime)+'"/>').hide(),
					tpl  = '<div class="elfinder-quicklook-info-data">{value}</div>',
					info = $('<div class="elfinder-quicklook-info">'
						+ '<div class="elfinder-quicklook-info-name">'+fm.escape(file.name)+'</div>'
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('Modified')+': '+ fm.formatDate(file.date))
						+'</div>').hide(),
					margin = function() { 
						info.css('margin-top', -parseInt(info.outerHeight(true)/2)+'px')
							.add(icon)
							.delay(150)
							.fadeIn(100);
					};
				
				self.ui.title.html(fm.escape(file.name));
				self.window.unbind('open resize')
					.data('hash', self.value.hash)
					.bind('resize', function() {
						ui.preview.trigger('resize');
					});
				
				self.ui.preview.children()
					.remove()
					.end()
					.append(info)
					.append(icon)
					;
				
				// load thumbnail
				tmb && $('<img />')
						.hide()
						.insertAfter(icon)
						.load(function() {
							$(this).remove();
							icon.css('background', 'url("'+tmb+'") center center no-repeat');
						})
						.attr('src', tmb);
				
				self.opened() ? margin() : self.window.one('open', margin);
			});

			// init plugins
			$.each(plugins, function(i, pl) { new pl(self); });

			// change handler
			self.change(function() {
				if (!self.closed()) {
					self.value ? self.preview() : close() //self.window.trigger('close');
				}
			});
			
			// close on escape
			$(document).keydown(function(e) {
				e.keyCode == $.ui.keyCode.ESCAPE && self.opened() && close();
			});
			
		});
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? 0 : -1;
	}
	
	this._exec = function() {
		if (this.enabled()) {
			this.closed() ? open() : close();
		}
	}
	
}

// quicklook plugins
elFinder.prototype.commands.quicklook.plugins = [

	/**
	 * Images preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['image/jpeg', 'image/png', 'image/gif'],
			win     = ql.window,
			preview = ql.ui.preview,
			// resize image to fit in quicklook preview
			resize = function() {
				var pw = parseInt(preview.width()),
					ph = parseInt(preview.height()),
					w, h;
					
				if (prop < (pw/ph).toFixed(2)) {
					h = ph;
					w = Math.floor(h * prop);
				} else {
					w = pw;
					h = Math.floor(w/prop);
				}
				
				img.width(w).height(h).css('margin-top', h < ph ? Math.floor((ph - h)/2) : 0);
			},
			// remove icon/info, resize and display image
			show = function() {
				preview.children('.elfinder-quicklook-info,.elfinder-cwd-icon').remove();
				win.bind('resize', resize).trigger('resize');
				img.fadeIn('slow');
			},
			img, prop;
		
		// what kind of imageswe can display
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
		
		// change file handler
		// load and display image
		ql.preview(function() {
			var file = ql.value,
				src;
				
			if (file && $.inArray(file.mime, mimes) !== -1) {
				src  = ql.fm.url(file.hash);
				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.load(function() {
						prop = (img.width()/img.height()).toFixed(2);
						ql.opened() ? show() : win.bind('open', show);
					})
					.attr('src', src);
				
				return false;
			}
		});
	},
	
	/**
	 * HTML preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['text/html', 'application/xhtml+xml'],
			win     = ql.window,
			preview = ql.ui.preview,
			fm      = ql.fm;
			
		ql.preview(function() {
			var file = ql.value, node, iframe, doc;
			
			if (file && file.read && $.inArray(file.mime, mimes) !== -1) {
				node = $('<iframe/>').hide().appendTo(preview);

				fm.ajax({
					options        : {dataType : 'html'},
					data           : {cmd : fm.oldAPI ? 'open' : 'file', target  : file.hash, current : file.phash},
					preventDefault : true,
					raw            : true
				})
				.done(function(data) {
					if (node.parent().length) {
						doc = node[0].contentWindow.document;
						doc.open();
						doc.write(data)
						doc.close()
						node.show().siblings().remove();
					}
				})
				.fail(function() {
					node.remove();
				});
				return false;
			}
		})
			
	},
	
	/**
	 * Texts preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ql.fm.textMimes,
			win     = ql.window,
			preview = ql.ui.preview,
			fm      = ql.fm;
		
		ql.preview(function() {
			var file = ql.value, node;
			
			if (file && file.read && (file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1)) {

				node = $('<div class="elfinder-quicklook-preview-text"/>').hide().appendTo(preview);
				
				fm.ajax({
					options        : {dataType : 'html'},
					data           : {cmd : fm.oldAPI ? 'open' : 'file', target  : file.hash, current : file.phash},
					preventDefault : true,
					raw            : true
				})
				.done(function(data) {
					node.parent().length && node.show().append('<pre>'+data+'</pre>').siblings().remove();
				})
				.fail(function() {
					node.remove();
				});
				
				return false;
			}
		});
	},
	
	/**
	 * PDF preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var win     = ql.window,
			preview = ql.ui.preview,
			fm      = ql.fm,
			active = false;
			
		
		if (($.browser.safari && navigator.platform.indexOf('Mac') != -1) || $.browser.msie) {
			active = true;
		} else {
			$.each(navigator.plugins, function(i, plugins) {
				$.each(plugins, function(i, plugin) {
					if (plugin.type == 'application/pdf') {
						return !(active = true);
					}
				});
			});
		}
		
		active && ql.preview(function() {
			var file = ql.value, node;
			
			if (file && file.read && file.mime == 'application/pdf') {
				node = $('<iframe/>')
					.hide()
					.appendTo(preview)
					.load(function() { node.parent().length && node.show().siblings().remove(); })
					.attr('src', fm.url(file.hash));
			}
		});
		
	}
	
]
