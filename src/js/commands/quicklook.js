"use strict"
/**
 * @class  elFinder command "quicklook"
 * Fast preview for some files types
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.quicklook = function() {
	var self      = this,
		fm        = self.fm,
		listeners = [],
		closed    = 0,
		animated  = 1,
		opened    = 2,
		state     = closed,
		closedCss = function(node) {
			if (!node.length) {
				node = $('<div/>')
			}
			return {
				opacity : 0,
				width  : node.width()+'px',
				// height : node.height(),
				top    : parseInt(wz.position().top + node.position().top - deltah)+'px',
				left   : parseInt(cwd.position().left + node.position().left + deltaw)+'px'
			}
		},
		openedCss = function(node) {
			return {
				opacity : 1,
				width  : width+'px',
				// height : height,
				top    : '50px',
				left   : parseInt((parent.width() - width)/2)
			}
		},
		open = function() {
			var win = self.window,
				file = self.value, node;

			if (self.closed() && file && (node = cwd.find('#'+file.hash)).length) {
				state = animated;
				node.trigger('scrolltoview');
				self.preview()
				win.css(closedCss(node))
					.show()
					.animate(openedCss(node), 'fast', function() { 
						state = opened;
						// win.css('height', 'auto')
						self.window.trigger('open')
					})
				
			}
			
		}, 
		close = function() {
			var win = self.window,
				ui = self.ui;
			
			if (self.opened()) {
				state = animated;
				// ui.nav.hide()
				ui.preview.css({width : 'auto', height : 'auto'}).hide(200);
				win.unbind('open resize')
					.css('height', 'auto')
					.animate(closedCss(cwd.find('#'+win.data('hash'))), 350, function() { 
						win.hide().data('resized', false);
						ui.preview.show().children().remove();
						// ui.nav.show()
						state = closed; 
					});
			}
		},
		width, height, parent, wz, cwd, deltaw, deltah
		;

	this.title = 'Preview';
	
	this.alwaysEnabled = true;
	
	this.value = null;
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {
		ui     : 'button', 
		width  : 450,
		height : 200
	};
	
	this.handlers = {
		select   : function() {
			var state = this.getstate();
			
			this.update(state, state > -1 ? this.fm.selectedFiles()[0] : null);
		}
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
					return false
				}
			});
		}
		return self
	}
	
	this.ui = {
		title   : $('<div class="elfinder-quicklook-title"/>'),
		preview : $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>'),
		nav     : $('<div class="elfinder-quicklook-nav"/>')
	}
	
	this.window = $('<div class="ui-reset elfinder-quicklook"/>')
		.append(
			$('<div class="elfinder-quicklook-titlebar"/>')
				.append(this.ui.title)
				.append($('<span class="ui-icon ui-icon-circle-close"/>').click(function() { self.window.trigger('close'); }))
				
		)
		.append(this.ui.preview)
		.append(this.ui.nav);
	
	if ($.fn.resizable) {
		this.window.resizable({ 
			handles    : 'se', 
			alsoResize : '.elfinder-quicklook-preview',
			minWidth   : this.options.minWidth || 350,
			minHeight  : this.options.minHeight || 160,
			start      : function() { self.window.data('resized', true); }
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
			parent = fm.getUI().append(self.window);
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
						info.css('margin-top', -parseInt(info.outerHeight(true)/2)+'px');
						info.add(icon).delay(150).fadeIn(100)
					};
				
				self.window.unbind('open resize').data('hash', self.value.hash);	
				self.ui.title.html(fm.escape(file.name));
				
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

			// if no one plugins catch event - show file info
			self.preview(function() {
				var show = function() {
						self.ui.preview.children('.elfinder-quicklook-info,.elfinder-cwd-icon').show();
					};
				// self.opened() ? show() : self.window.one('open', show);
			});

			// change handler
			self.change(function() {
				if (!self.closed()) {
					self.value ? self.preview() : close() //self.window.trigger('close');
				}
			});
			
			$(document).keyup(function(e) {
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
		var mimes    = ['image/jpeg', 'image/png', 'image/gif'],
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
			img, prop;
		
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
		
		// change file handler
		ql.preview(function() {
			var file = ql.value,
				src  = ql.fm.url(file.hash);
				
			if (file && $.inArray(file.mime, mimes) !== -1) {
				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.load(function() {
						var show = function() {
							var _show = function(a) {
								win.bind('resize', resize).trigger('resize');
								img.fadeIn('fast');
								a === void(0) && win.data('resized', true);
							};
							
							preview.children('.elfinder-quicklook-info,.elfinder-cwd-icon').remove();

							win.data('resized') 
								? _show(true) 
								: preview.animate({height : Math.floor(Math.min(preview.width()/prop, $(window).height() * 0.7))}, 300, _show);
						};
						
						prop = (img.width()/img.height()).toFixed(2);
						ql.opened() ? show() : win.bind('open', show);
					})
					.attr('src', src);
				
				return false
			}
		})
		
	}
]
