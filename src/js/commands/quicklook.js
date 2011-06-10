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
				top    : parseInt(wz.position().top + node.position().top - deltah)+'px',
				left   : parseInt(cwd.position().left + node.position().left + deltaw)+'px'
			}
		},
		openedCss = function(node) {
			return {
				opacity : 1,
				width  : width+'px',
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
						self.window.trigger('open')
					})
				
			}
			
		}, 
		close = function() {
			var win = self.window;
			
			if (self.opened()) {
				state = animated;
				self.ui.preview.css({width : 'auto', height : 'auto'}).hide('slow')
				win.unbind('open resize').css('height', 'auto').animate(closedCss(cwd.find('#'+win.data('hash'))), 'slow', function() { 
					
					win.hide().data('resized', false);
					self.ui.preview.css('height', 'auto').show().children().remove();
					state = closed; 
				})
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
		title : $('<div class="elfinder-quicklook-title"/>'),
		preview : $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>'),
		icon : $('<div/>'),
		info : $('<div class="elfinder-quicklook-info"/>'),
		nav : $('<div class="elfinder-quicklook-nav"/>')
		
		
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
			handles : 'se', 
			alsoResize : '.elfinder-quicklook-preview',
			minHeight : 160,
			start : function() {
				self.window.data('resized', true)
			}
		}).resize(function() {
			// fm.log('resize')

		})
		
	}
	
	this.init = function() {
		var o = this.options, 
			plugins = fm.commands.quicklook.plugins || [],
			i, p;
		
		width = o.width > 0 ? parseInt(o.width) : 450;	
		height = o.height > 0 ? parseInt(o.height) : 200;
		
		fm.one('load', function() {
			parent = fm.getUI().append(self.window);
			cwd    = fm.getUI('cwd');
			wz     = cwd.parent();
			deltaw = (cwd.innerWidth() - cwd.width() - 2)/2;
			deltah = (cwd.innerHeight() - cwd.height() - 2)/2

			// on change preview - update icon and title
			self.preview(function() {
				var ui = self.ui,
					file = self.value,
					tmb  = fm.tmb(file.hash),
					icon = $('<div class="elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime)+'"/>'),
					tpl = '<div class="elfinder-quicklook-info-data">{value}</div>',
					info = $('<div class="elfinder-quicklook-info">'
						+ '<div class="elfinder-quicklook-info-name">'+fm.escape(file.name)+'</div>'
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('Modified')+': '+ fm.formatDate(file.date))
						+'</div>'),
					show = function() {
						info.css('margin-top', -parseInt(info.outerHeight(true)/2)+'px').show()
					}
					;
				
				self.window.unbind('open resize').data('hash', self.value.hash);	
				self.ui.title.html(fm.escape(file.name));
				
				self.ui.preview.children()
					.remove()
					.end()
					.append(info.hide())
					.append(icon)
					;
				
				// load thumbnail
				tmb && $('<img />')
						.hide()
						.insertAfter(icon)
						.load(function() {
							icon.css('background', 'url("'+tmb+'") center center no-repeat');
							$(this).remove()
						})
						.attr('src', tmb);
				
				if (self.opened()) { 
					show();
				} else {
					self.window.one('open', show)
				}

			});

			// init plugins
			$.each(plugins, function(i, pl) { new pl(self); });

			// add default preview handler
			self.preview(function() {
				var ui  = self.ui,
					tpl = '<div class="elfinder-quicklook-info-data">{value}</div>',
					file = self.value,
					info = '<div class="elfinder-quicklook-info-name">'+fm.escape(file.name)+'</div>'
							+ tpl.replace(/\{value\}/, fm.mime2kind(file))
							+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
							+ tpl.replace(/\{value\}/, fm.i18n('Modified')+': '+ fm.formatDate(file.date)),
					append = function() {
						ui.preview.css('height', 'auto').append(ui.info)
					};
							
				// ui.preview.find('.elfinder-cwd-icon').addClass('elfinder-quicklook-preview-icon');
				ui.info.html(info);
				// self.opened() ? append() : self.window.one('open', append);
			})

			// change handler
			self.change(function() {
				if (!self.closed()) {
					self.value ? self.preview() : self.window.trigger('close');
				}
			});
			
		})
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? 0 : -1;
	}
	
	this._exec = function() {
		// this.window.trigger('toggle')
		if (this.enabled()) {
			this.closed() ? open() : close();
			// self.window.trigger(self.closed() ? 'open' : 'close');
		}
	}
	
}


elFinder.prototype.commands.quicklook.plugins = [

	function(ql) {
		var mimes = ['image/jpeg', 'image/png', 'image/gif'],
			win = ql.window,
			preview = ql.ui.preview;
		
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
		
		// ql.fm.log(mimes)
		
		ql.preview(function() {
			var file = ql.value,
				src = ql.fm.url(file.hash),
				t;
				
			if (file && $.inArray(file.mime, mimes) !== -1) {
				
				preview.children().hide();
				t = setTimeout(function() {
					preview.children().show()
				}, 200)
				
				$('<img />')
					.hide()
					.appendTo(preview)
					.load(function() {
						var img = $(this),
							w   = img.width(),
							h   = img.height(),
							p   = (w/h).toFixed(2),
							show = function(w, h) {
								img.width(w).height(h).siblings().fadeOut(100).end().fadeIn(350);
								if (h < preview.height()) {
									img.css('margin-top', parseInt((preview.height() - h)/2)+'px')
								}
							};
							
						clearTimeout(t)	;
						
						if (ql.opened()) {
							if (p < (preview.width()/preview.height()).toFixed(2)) {
								h = parseInt(preview.height());
								w = Math.floor(h * p);
							} else {
								w = preview.width();
								h = Math.floor(w/p)
							}
							show(w, h);
						} else {
							win.bind('open', function() {
								h = Math.floor(Math.min(preview.width()/p, $(window).height() * 0.7));
								w = Math.floor(h * p);
								
								preview.animate({height : h}, 300);
								show(w, h);
							})
							
							
						}

					})
					.attr('src', src)
				;
				
				return false
			}
		})
		
		// console.log(ql)
	}
]
