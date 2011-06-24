/**
 * @class Create quick look window (similar to MacOS X Quick Look)
 * @author dio dio@std42.ru
 **/
(function($) {
elFinder.prototype.quickLook = function(fm, el) {
	var self    = this;
	this.fm     = fm;
	this._hash  = '';
	this.title  = $('<strong/>');
	this.ico    = $('<p/>');
	this.info   = $('<label/>');
	this.media  = $('<div class="el-finder-ql-media"/>').hide()
	
	this.name = $('<span class="el-finder-ql-name"/>')
	this.kind = $('<span class="el-finder-ql-kind"/>')
	this.size = $('<span class="el-finder-ql-size"/>')
	this.date = $('<span class="el-finder-ql-date"/>')
	this.url  = $('<a href="#"/>').hide().click(function(e) {
		e.preventDefault();
		window.open($(this).attr('href'));
		self.hide();
	});

	this.add = $('<div/>')
	this.content = $('<div class="el-finder-ql-content"/>')
	this.win     = $('<div class="el-finder-ql"/>').hide()
		.append($('<div class="el-finder-ql-drag-handle"/>').append($('<span class="ui-icon ui-icon-circle-close"/>').click(function() { self.hide(); })).append(this.title))
		.append(this.ico)
		.append(this.media)
		.append(this.content.append(this.name).append(this.kind).append(this.size).append(this.date).append(this.url).append(this.add))
		// .appendTo(this.fm.view.win)
		.appendTo('body')
		.draggable({handle : '.el-finder-ql-drag-handle'})
		.resizable({
			minWidth  : 420,
			minHeight : 150,
			resize    : function() {
				if (self.media.children().length) {
					var t = self.media.children(':first');
					switch (t[0].nodeName) {
						case 'IMG':
							var w = t.width(),
								h = t.height(),
								_w = self.win.width(),
								_h = self.win.css('height') == 'auto' ? 350 : self.win.height()-self.content.height()-self.th,
								r = w>_w || h>_h 
									? Math.min(Math.min(_w, w)/w, Math.min(_h, h)/h) 
									: Math.min(Math.max(_w, w)/w, Math.max(_h, h)/h);
							t.css({
								width : Math.round(t.width()*r),
								height : Math.round(t.height()*r)
							})
							break;
						case 'IFRAME':
						case 'EMBED':
							t.css('height', self.win.height()-self.content.height()-self.th);
							break;
						case 'OBJECT':
							t.children('embed').css('height', self.win.height()-self.content.height()-self.th);
					}
				}
			}
		});
	
	this.th = parseInt(this.win.children(':first').css('height'))||18;
	/* All browsers do it, but some is shy to says about it. baka da ne! */
	this.mimes = {
		'image/jpeg' : 'jpg',
		'image/gif'  : 'gif',
		'image/png'  : 'png'
		};

	for (var i=0; i<navigator.mimeTypes.length; i++) {
		var t = navigator.mimeTypes[i].type;
		if (t && t != '*') {
			this.mimes[t] = navigator.mimeTypes[i].suffixes;
		}
	}
	
	if (($.browser.safari && navigator.platform.indexOf('Mac') != -1) || $.browser.msie) {
		/* not booletproof, but better then nothing */
		this.mimes['application/pdf'] = 'pdf';
	} else {
		for (var n=0; n < navigator.plugins.length; n++) {
			for (var m=0; m < navigator.plugins[n].length; m++) {
				var e = navigator.plugins[n][m].description.toLowerCase();
				if (e.substring(0, e.indexOf(" ")) == 'pdf') {
					this.mimes['application/pdf'] = 'pdf';
					break;
				}
			}
		}
	}
	
	if (this.mimes['image/x-bmp']) {
		this.mimes['image/x-ms-bmp'] = 'bmp';
	}
	
	if ($.browser.msie && !this.mimes['application/x-shockwave-flash']) {
		this.mimes['application/x-shockwave-flash'] = 'swf';
	}
	
	// self.fm.log(this.mimes)
	
	/**
	 * Open quickLook window
	 **/
	this.show = function() {
		if (this.win.is(':hidden') && self.fm.selected.length == 1) {
			update();
			var id = self.fm.selected[0],
			 	el = self.fm.view.cwd.find('[key="'+id+'"]'),
				o  = el.offset();
				
			self.fm.lockShortcuts(true);
			this.win.css({
				width    : el.width()-20,
				height   : el.height(),
				left     : o.left,
				top      : o.top,
				opacity  : 0
			}).show().animate({
				width    : 420,
				height   : 150,
				opacity  : 1,
				top      : Math.round($(window).height()/5),
				left     : $(window).width()/2-210
			}, 450, function() { 
				self.win.css({height: 'auto'});
				self.fm.lockShortcuts();
			});
		}
	}
	
	/**
	 * Close quickLook window
	 **/
	this.hide = function() {
		if (this.win.is(':visible')) {
			var o, el = self.fm.view.cwd.find('[key="'+this._hash+'"]');
			if (el) {
				o = el.offset();
				this.media.hide(200)//.empty()
				this.win.animate({
					width    : el.width()-20,
					height   : el.height(),
					left     : o.left,
					top      : o.top,
					opacity  : 0
				}, 350, function() {
					self.fm.lockShortcuts();
					reset();
					self.win.hide().css('height', 'auto');
				});
			} else {
				this.win.fadeOut(200);
				reset();
				self.fm.lockShortcuts();
			}
		}
	}
	
	/**
	 * Open/close quickLook window
	 **/
	this.toggle = function() {
		if (this.win.is(':visible')) {
			this.hide();
		} else {
			this.show();
		}
	}
	
	/**
	 * Update quickLook window content if only one file selected,
	 * otherwise close window
	 **/
	this.update = function() {
		if (this.fm.selected.length != 1) {
			this.hide();
		} else if (this.win.is(':visible') && this.fm.selected[0] != this._hash) {
			update();
		}
	}
	
	/**
	 * Return height of this.media block
	 * @return Number
	 **/
	this.mediaHeight = function() {
		return this.win.is(':animated') || this.win.css('height') == 'auto' ? 315 : this.win.height()-this.content.height()-this.th;
	}
	
	/**
	 * Clean quickLook window DOM elements
	 **/
	function reset() {
		self.media.hide().empty();
		self.win.attr('class', 'el-finder-ql').css('z-index', self.fm.zIndex);
		self.title.empty();
		self.ico.attr('style', '').show();
		self.add.hide().empty();
		self._hash = '';
	}
	
	/**
	 * Update quickLook window content
	 **/
	function update() {
		var f = self.fm.getSelected(0);
		reset();

		self._hash = f.hash;
		self.title.text(f.name);
		self.win.addClass(self.fm.view.mime2class(f.mime));
		self.name.text(f.name);
		self.kind.text(self.fm.view.mime2kind(f.link ? 'symlink' : f.mime)); 
		self.size.text(self.fm.view.formatSize(f.size));
		self.date.text(self.fm.i18n('Modified')+': '+self.fm.view.formatDate(f.date));
		f.dim && self.add.append('<span>'+f.dim+' px</span>').show();
		f.tmb && self.ico.css('background', 'url("'+f.tmb+'") 0 0 no-repeat');
		if (f.url) {
			self.url.text(f.url).attr('href', f.url).show();
			for (var i in self.plugins) {
				if (self.plugins[i].test && self.plugins[i].test(f.mime, self.mimes, f.name)) {
					self.plugins[i].show(self, f);
					return;
				}
			}
		} else {
			self.url.hide();
		}
		
		self.win.css({
			width  : '420px',
			height : 'auto'
		});
	}

}

elFinder.prototype.quickLook.prototype.plugins = {
	
	image : new function() {

		this.test = function(mime, mimes) {
			return mime.match(/^image\//);
		}
		
		this.show = function(ql, f) {
			var url, t;

			if (ql.mimes[f.mime] && f.hash == ql._hash) {
				$('<img/>').hide().appendTo(ql.media.show()).attr('src', f.url+($.browser.msie || $.browser.opera ? '?'+Math.random() : '')).load(function() {
					t = $(this).unbind('load');
					if (f.hash == ql._hash) { 
						ql.win.is(':animated') ? setTimeout(function() { preview(t); }, 330) : preview(t);
					} 
				});
			}
			
			function preview(img) {
				var w = img.width(),
					h = img.height(),
					a = ql.win.is(':animated'),
					_w = a ? 420 : ql.win.width(), 
					_h = a || ql.win.css('height') == 'auto' ? 315 : ql.win.height()-ql.content.height()-ql.th,
					r = w>_w || h>_h 
						? Math.min(Math.min(_w, w)/w, Math.min(_h, h)/h)
						: Math.min(Math.max(_w, w)/w, Math.max(_h, h)/h);

				ql.fm.lockShortcuts(true);
				ql.ico.hide();
				img.css({
					width  : ql.ico.width(),
					height : ql.ico.height()
				}).show().animate({
					width  : Math.round(r*w),
					height : Math.round(r*h)
				}, 450, function() { 
					ql.fm.lockShortcuts(); 
				});
			}
		}
		
	},
	
	text : new function() {

		this.test = function(mime, mimes) {
			return (mime.indexOf('text') == 0 && mime.indexOf('rtf') == -1) || mime.match(/application\/(xml|javascript|json)/);
		}
		
		this.show = function(ql, f) {
			if (f.hash == ql._hash) {
				ql.ico.hide();
				ql.media.append('<iframe src="'+f.url+'" style="height:'+ql.mediaHeight()+'px" />').show();
			}
		}
	},
	
	swf : new function() {
		
		this.test = function(mime, mimes) {
			return mime == 'application/x-shockwave-flash' && mimes[mime];
		}
		
		this.show = function(ql, f) {
			if (f.hash == ql._hash) {
				ql.ico.hide();
				// ql.media.append('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="quality" value="high" /><param name="movie" value="'+url+'" /><embed pluginspage="http://www.macromedia.com/go/getflashplayer" quality="high" src="'+url+'" type="application/x-shockwave-flash" style="width:100%;height:'+ql.mediaHeight()+'px"></embed></object>')
					// .slideDown(400);
				var e = ql.media.append('<embed pluginspage="http://www.macromedia.com/go/getflashplayer" quality="high" src="'+f.url+'" style="width:100%;height:'+ql.mediaHeight()+'px" type="application/x-shockwave-flash" />'); 
				if (ql.win.is(':animated')) {
					e.slideDown(450)
				} else {
					e.show()
				}
			}
		}
	},
	
	audio : new function() {
		
		this.test = function(mime, mimes) {
			return mime.indexOf('audio') == 0 && mimes[mime];
		}
		
		this.show = function(ql, f) {
			if (f.hash == ql._hash) {
				ql.ico.hide();
				var h = ql.win.is(':animated') || ql.win.css('height') == 'auto' ? 100 : ql.win.height()-ql.content.height()-ql.th;
				ql.media.append('<embed src="'+f.url+'" style="width:100%;height:'+h+'px" />').show();
			}
		}
	},
	
	video : new function() {
		
		this.test = function(mime, mimes) {
			return mime.indexOf('video') == 0 && mimes[mime];
		}
		
		this.show = function(ql, f) {
			if (f.hash == ql._hash) {
				ql.ico.hide();
				ql.media.append('<embed src="'+f.url+'" style="width:100%;height:'+ql.mediaHeight()+'px" />').show();
			}
		}
		
	},
	
	pdf : new function() {
		
		this.test = function(mime, mimes) {
			return mime == 'application/pdf' && mimes[mime];
		}
		
		this.show = function(ql, f) {
			if (f.hash == ql._hash) {
				ql.ico.hide();
				ql.media.append('<embed src="'+f.url+'" style="width:100%;height:'+ql.mediaHeight()+'px" />').show();
			}
		}
	}
	
}


})(jQuery);
