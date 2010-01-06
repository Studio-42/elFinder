/**
 * @class Create quick look window (similar to MacOS X Quick Look)
 * @author dio dio@std42.ru
 **/
elFinder.prototype.quickLook = function(fm, el) {
	var self    = this;
	this.fm     = fm;
	this._img   = false;
	this._hash  = '';
	this.title  = $('<strong/>');
	this.img    = $('<img/>');
	this.iframe = $('<iframe/>');
	this.ico    = $('<p/>');
	this.info   = $('<label/>');
	this.ql     = $('<div class="el-finder-ql"/>').hide()
		.append($('<div/>')
			.append($('<span class="ui-icon ui-icon-circle-close"/>').click(function() { self.hide(); })).append(this.title))
		.append(this.iframe)
		.append(this.img)
		.append(this.ico)
		.append(this.info)
		.appendTo(document.body).draggable();
	
	/**
	 * Open quickLook window
	 **/
	this.show = function() {

		if (this.ql.is(':hidden') && self.fm.selected.length == 1) {
			update();
			var id = self.fm.selected[0],
			 	el = self.fm.view.cwd.find('[key="'+id+'"]'),
				o  = el.offset(),
				w  = Math.max(this.ql.width(), 350),
				h  = this.ql.height(),
				ew = el.width()-20;
			self.fm.lockShortcuts(true);
			this.ql.css({
				width    : ew,
				minWidth : ew,
				height   : el.height(),
				left     : o.left,
				top      : o.top,
				opacity  : 0
			}).animate({
				width    : w,
				minWidth : 350,
				height   : h,
				opacity  : 1,
				top      : Math.round($(window).height()/5),
				left     : ($(window).width()-w)/2-42
			}, 400, function() { 
				self.ql.css({height: 'auto', width: 'auto'});
				if (self._img) {
					preview();
				} else {
					self.fm.lockShortcuts();
				}
			});
		}
	}
	
	/**
	 * Close quickLook window
	 **/
	this.hide = function() {
		if (this.ql.is(':visible')) {
			var o, w, el = self.fm.view.cwd.find('[key="'+this._hash+'"]');
			if (el) {
				o = el.offset();
				w = el.width();
				
				this.ql.animate({
					width    : w-20,
					minWidth : w-20,
					height   : el.height(),
					left     : o.left,
					top      : o.top,
					opacity  : 0
				}, 350, function() {
					reset();
					self.ql.hide().css({
						width    : 'auto',
						minWidth : 350,
						height   : 'auto'
					});
					self.fm.lockShortcuts();
				});
			} else {
				this.ql.fadeOut(200);
				reset();
				self.fm.lockShortcuts();
			}
		}
	}
	
	/**
	 * Open/close quickLook window
	 **/
	this.toggle = function() {
		if (this.ql.is(':visible')) {
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
		} else if (this.ql.is(':visible') && this.fm.selected[0] != this._hash) {
			update();
		}
	}
	
	/**
	 * Clean quickLook window DOM elements
	 **/
	function reset() {
		self.ql.attr('class', 'el-finder-ql').css('z-index', self.fm.zIndex);
		self.img.hide().unbind('load').removeAttr('src').removeAttr('load').css({width:'', height:''});
		self.iframe.hide();
		self.info.empty();
		self.title.empty();
		self.ico.show().css({background: '', border: ''});
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
		self.ql.addClass(self.fm.view.mime2class(f.mime));
		
		self.info.append('<strong>'+f.name+'</strong><br/>'+self.fm.view.kind(f)+'<br/>'+self.fm.view.formatSize(f.size)+'<br/>'+self.fm.i18n('Modified')+': '+self.fm.view.formatDate(f.date));
		f.dim && self.info.append('<br/>'+self.fm.i18n('Dimesions')+': '+f.dim);
		f.url && self.info.append($('<a/>').attr('href', f.url).text(f.url).click(function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.open(f.url);
		}));
		
		if (f.mime.match(/image\/(jpeg|png|gif)/)) {
			var url = self.fm.fileURL();
			self.img.attr('src', url+(window.opera ? '?'+Math.random() : '')).load(function() {
				if (self.ql.is(':hidden') || self.ql.is(':animated')) {
					self._img = true;
				} else {
					preview();
				}
			});
		} else if((0 == f.mime.indexOf('text') && f.mime != 'text/rtf') || f.mime.match(/application\/(pdf|xml)/)) {
			self.ico.hide();
			self.iframe.removeAttr('src').attr('src', self.fm.fileURL()).show();
		}
	}

	/**
	 * Load image preview
	 **/
	function preview() {
		var iw = self.img.width(),
			ih = self.img.height(),
			r  = Math.min(Math.min(400, iw) / iw, Math.min(300, ih) / ih);
		self._img = false;
		self.ico.hide();

		self.fm.lockShortcuts(true);
		self.img.css({
			width:self.ico.width(),
			height:self.ico.height()
		}).animate({
			width:Math.round(r*(iw>400?iw:400)),
			height:Math.round(r*(ih>300?ih:300))
		}, 350, function() { self.fm.lockShortcuts(); });
	}
	

}