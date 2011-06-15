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
		fullscreen  = 'elfinder-quicklook-fullscreen',
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
			var height = node.height() - delta;
			
			return {
				opacity : 0,
				width  : node.width(),
				height : height > 0 ? height : 1,
				top    : parseInt(wz.position().top   + node.position().top  - deltah)+'px',
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
		
		support = function(codec) {
			var media = document.createElement(codec.substr(0, codec.indexOf('/'))),
				value = media.canPlayType && media.canPlayType(codec);
			
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
		delta,
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
		deltah,
		title   = $('<div class="elfinder-quicklook-title"/>'),
		// preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>'), 
		icon    = $('<div/>'),
		info    = $('<div class="elfinder-quicklook-info"/>'),//.hide(),
		fsicon  = $('<div class="'+navicon+' '+navicon+'-fullscreen"/>')
			.mousedown(function(e) {
				var win = self.window,
					full = win.is('.'+fullscreen);
					
				e.stopPropagation()
				
				if (full) {
					$(window).unbind('scroll.'+fm.namespace);
					win.appendTo(parent).css(win.data('position'));
				} else {
					win.data('position', {
						left   : win.css('left'), 
						top    : win.css('top'), 
						width  : win.width(), 
						height : win.height()
					})
					.prependTo('body')
					.css({
						width  : '100%',
						height : '100%'
					});
					
					$(window).bind('scroll.'+fm.namespace, function() {
						win.css({
							left   : parseInt($(window).scrollLeft())+'px',
							top    : parseInt($(window).scrollTop())+'px',
						})
					})
					.trigger('scroll');

				}
				
				win.toggleClass(fullscreen);
				self.preview.trigger('resize');
				$(this).toggleClass(navicon+'-fullscreen-off');
				$.fn.resizable && win.resizable(full ? 'enable' : 'disable').removeClass('ui-state-disabled');
			}),
			
		navbar  = $('<div class="elfinder-quicklook-navbar"/>')
			.append($('<div class="'+navicon+' '+navicon+'-prev"/>').mousedown(function() { navtrigger(37); }))
			.append(fsicon)
			.append($('<div class="'+navicon+' '+navicon+'-next"/>').mousedown(function() { navtrigger(39); }))
			.append('<div class="elfinder-quicklook-navbar-separator"/>')
			.append($('<div class="'+navicon+' '+navicon+'-close"/>').mousedown(function() { self.window.trigger('close'); }))
		;

	this.preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>');

	this.info = $('<div class="elfinder-quicklook-info-wrapper"/>')
		.append(icon)
		.append(info)

	this.window = $('<div class="ui-helper-reset ui-widget elfinder-quicklook" style="position:absolute"/>')
		.append(
			$('<div class="elfinder-quicklook-titlebar"/>')
				.append(title)
				.append($('<span class="ui-icon ui-icon-circle-close"/>').mousedown(function(e) {
					e.stopPropagation();
					self.window.trigger('close');
				}))
		)
		.append(this.preview.add(navbar).mousedown(function(e) { e.stopPropagation(); }))
		// .append(icon.add(info))
		.append(self.info.hide())
		.draggable({handles : '.elfinder-quicklook-titlebar'})
		.bind('open', function(e) {
			var win  = self.window, 
				file = self.value,
				node;

			if (self.closed() && file && (node = cwd.find('#'+file.hash)).length) {
				state = animated;
				node.trigger('scrolltoview');
				win.css(closedCss(node))
					.show()
					.animate(openedCss(), 350, function() {
						state = opened;
						win.trigger($.Event('preview', {file : self.value}));
					});
			}
		})
		.bind('close', function(e) {
			var win   = self.window.trigger('change'),
				file  = self.value,
				node  = cwd.find('#'+win.data('hash')),
				close = function() {
					state = closed;
					win.hide();
					self.preview.children().remove()
				};
				
			if (self.opened()) {
				state = animated;
				win.is('.'+fullscreen) && fsicon.mousedown()
				node.length
					? win.animate(closedCss(node), 100, close)
					: close();
			}
		})
		.bind('change', function(e) {
			self.info.attr('style', '')
				.hide();
			icon.removeAttr('class').css('background', '');
			info.html('');
		})
		.bind('preview', function(e) {
			var fm   = self.fm,
				win  = self.window,
				file = e.file,
				tpl  = '<div class="elfinder-quicklook-info-data">{value}</div>',
				tmb;
			
			if (file) {
				win.trigger('change').data('hash', file.hash);
				self.preview.unbind('resize').children().remove();
				title.html(fm.escape(file.name));
				
				info.html(
						tpl.replace(/\{value\}/, file.name)
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('Modified')+': '+ fm.formatDate(file.date))
					)
				icon.addClass('elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime));

				if (file.tmdb) {
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
			}
		});

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
	
	this.handlers = {
		select   : function() {
			var state = this.getstate();
			
			this.update(state, state > -1 ? this.fm.selectedFiles()[0] : null);
		},
		error : function() { self.window.data('hash', '').trigger('close'); }
	}
	
	this.shortcuts = [{
		pattern     : 'space',
		description : 'Preview'
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
			plugins = fm.commands.quicklook.plugins || [],
			win     = this.window,
			i, p;
		
		width  = o.width  > 0 ? parseInt(o.width)  : 450;	
		height = o.height > 0 ? parseInt(o.height) : 300;

		fm.one('load', function() {
			parent = fm.getUI().prepend(win);
			cwd    = fm.getUI('cwd');
			wz     = cwd.parent();
			deltaw = parseInt((cwd.innerWidth()  - cwd.width() - 2)/2);
			deltah = parseInt((cwd.innerHeight() - cwd.height() - 2)/2),
			delta  = parseInt(win.outerHeight()  - win.height())

			win.zIndex(10 + parent.zIndex());
			
			$(document).keydown(function(e) {
				e.keyCode == 27 && self.opened() && win.trigger('close')
			})
			
			if ($.fn.resizable) {
				win.resizable({ 
					handles   : 'se', 
					minWidth  : 350, //o.minWidth  > 0 ? parseInt(o.minWidth)  : 300,
					minHeight : 120, //o.minHeight > 0 ? parseInt(o.minHeight) : 160,
					resize    : function() { self.preview.trigger('resize'); }
				});
			}
			
			self.change(function() {
				self.opened() && self.window.trigger(self.value ? $.Event('preview', {file : self.value}) : 'close');
			});
			
			$.each(fm.commands.quicklook.plugins || [], function(i, plugin) {
				if (typeof(plugin) == 'function') {
					new plugin(self)
				}
			});
			
			win.bind('preview', function() {
				self.info.show()
			});
		});
		
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? 0 : -1;
	}
	
	
	
	this._exec = function() {
		this.enabled() && this.window.trigger(this.opened() ? 'close' : 'open');
	}

}

// quicklook plugins
elFinder.prototype.commands.quicklook.plugins_ = [

	/**
	 * Images preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['image/jpeg', 'image/png', 'image/gif'],
			win     = ql.window,
			preview = ql.ui.preview,
			// remove icon/info, resize and display image
			show = function() {
				// resize image to fit in quicklook preview
				win.bind('resize', function() {
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
				})
				.trigger('resize');
				img.siblings().remove().end().fadeIn('slow');
			},
			img, prop;
		
		// what kind of images we can display
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
		
		// change file handler
		// load and display image
		ql.preview(function(file) {
			if (file && $.inArray(file.mime, mimes) !== -1) {
				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.load(function() {
						prop = (img.width()/img.height()).toFixed(2);
						ql.opened() ? show() : win.bind('open', show);
					})
					.attr('src', ql.fm.url(file.hash));
				
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
			
		// win.bind('test', function(e, file) {
		// 	fm.log(file)
		// 	file = null
		// 	// e.stopPropagation()
		// })

		win.bind('open close preview', function(e) {
			fm.log(e.type)
		})
			
		ql.preview(function(file) {
			var show = function(data) {
					if (node.parent().length) {
						doc = node[0].contentWindow.document;
						doc.open();
						doc.write(data);
						doc.close();
						node.siblings().remove().end().show();
					}
				},
				node, doc;

			if (file && file.read && $.inArray(file.mime, mimes) !== -1) {
				node = $('<iframe/>').hide().appendTo(preview);

				fm.ajax({
					options        : {dataType : 'html'},
					data           : {cmd : fm.oldAPI ? 'open' : 'file', target  : file.hash, current : file.phash},
					preventDefault : true,
					raw            : true
				})
				.done(function(data) {
					ql.opened() ? show(data) : win.one('open', function() { show(data) })
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
		
		win.bind('test', function(e, file) {
			// fm.log(file)
			fm.log(e.isPropagationStopped())
		})
		
		ql.preview(function(file) {
			var node;
			
			if (file && file.read && (file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1)) {

				node = $('<div class="elfinder-quicklook-preview-text"/>').hide().appendTo(preview);
				
				fm.ajax({
					data   : {
						cmd     : fm.oldAPI ? 'fread' : 'get',
						target  : file.hash,
						current : file.phash // old api
					},
					preventDefault : true,
				})
				.done(function(data) {
					node.parent().length && node.show().append('<pre>'+fm.escape(data.content)+'</pre>').siblings().remove();
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
		
	},
	
	/**
	 * Flash preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mime    = 'application/x-shockwave-flash',
			preview = ql.ui.preview,
			fm      = ql.fm,
			active  = false;
			
		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				if (plugin.type == mime) {
					return !(active = true);
				}
			});
		});
		
		active && ql.preview(function() {
			var file = ql.value, node;
			
			if (file && file.read && file.mime == mime) {

				preview.children()
					.remove()
					.end()
					.append((node = $('<embed pluginspage="http://www.macromedia.com/go/getflashplayer" src="'+fm.url(file.hash)+'" quality="high" type="application/x-shockwave-flash" />')))
					// .resize(function() {
						// node.css('margin-top', parseInt((preview.height() - node.height())/2));
					// }).trigger('resize');
					
				return false;
			}
		});
		
	},
	
	/**
	 * Audio preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var fm      = ql.fm,
			preview = ql.ui.preview,
			mimes   = [],
			support = {
				'audio/mpeg'    : 'mp3',
				'audio/mpeg3'   : 'mp3',
				'audio/mp3'     : 'mp3',
				'audio/x-mpeg3' : 'mp3',
				'audio/x-mp3'   : 'mp3',
				'audio/x-wav'   : 'wav',
				'audio/wav'     : 'wav',
				'audio/x-m4a'   : 'm4a',
				'audio/aac'     : 'm4a',
				'audio/mp4'     : 'm4a',
				'audio/x-mp4'   : 'm4a',
				'audio/ogg'     : 'ogg'
			},
			node;
			
		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				if (plugin.type.indexOf('audio/') === 0) {
					mimes.push(plugin.type);
				}
			});
		});
		
		ql.support.audio.ogg && mimes.push('audio/ogg');
		
		ql.close(function() {
			
		})
		
		ql.preview(function() {
			var file = ql.value, 
				mime = file.mime,
				src;
			ql.fm.log('preview')
			if (file && file.read && $.inArray(mime, mimes) !== -1) {
				src = fm.url(file.hash);

				if (support[mime] && ql.support.audio[support[mime]]) {
					node = $('<audio controls preload="auto" autobuffer autoplay_><source src="'+src+'" /></audio>');
				} else {
					node = $('<div class="elfinder-quicklook-preview-audio"><embed  src="'+src+'" type="'+mime+'"  /></div>');
				}
				return !preview.append(node)
			} else {
				ql.fm.log('here')
			}
		});
		
	},
	
	/**
	 * Video preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = [],
			support = {
				'video/mp4'   : 'mp4',
				'video/x-m4v' : 'mp4',
				'video/ogg'   : 'ogg',
				'video/webm'  : 'webm'
			},
			preview = ql.ui.preview,
			fm      = ql.fm;
			

		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				if (plugin.type.indexOf('video/') === 0) {
					mimes.push(plugin.type);
				}
			});
		});

		if (ql.support.video.ogg) {
			mimes.push('video/ogg');
			mimes.push('application/ogg');
		}

		if (ql.support.video.webm) {
			mimes.push('video/webm');
		}

		// fm.log(mimes).log(ql.support.video)

		ql.preview(function() {
			var file = ql.value, 
				mime = file.mime,
				src, node;
			// fm.log(mime)
			if (file && file.read && $.inArray(mime, mimes) !== -1) {
				src = fm.url(file.hash);
				
				if (support[mime] && ql.support.video[support[mime]]) {
					node = '<video controls preload="auto" autobuffer><source src="'+src+'"/></video>'
				} else {
					node = '<embed src="'+src+'" type="'+mime+'"/>';
				}
				
				preview.children().remove().end().append(node)
				
				return false;
				// fm.log(file)
				// preview.children().remove().end()//.append('<embed src="'+fm.url(file.hash)+'" quality="high" type="'+file.mime+'"/>')
				// 	.append('<video controls="controls" width="100%" height="100%"><source src="'+fm.url(file.hash)+'" /></video>')
			}
		})
	}
	
	
]
