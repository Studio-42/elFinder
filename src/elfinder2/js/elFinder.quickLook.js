elFinder.prototype.quickLook = function(fm, el) {
	var self = this;
	this.fm = fm;
	this._img = false;
	this._hash = '';
	this.img  = $('<img/>');
	this.iframe = $('<iframe/>');
	this.ico  = $('<div class="el-finder-icon"/>').append('<p/>');
	this.info = $('<p class="el-finder-ql-info"/>');
	this.ql   = $('<div class="el-finder-ql"/>').hide()
		.append(this.iframe)
		.append(this.img)
		.append(this.ico)
		.append(this.info)
		.appendTo(document.body)
		.click(function() {	self.hide(); });
	
	this.show = function() {
		if (this.ql.is(':hidden') && self.fm.selected.length == 1) {
			update();
			var id =self.fm.selected[0],
			 	el = self.fm.view.cwd.find('[key="'+id+'"]'),
				o  = el.offset(),
				w  = Math.max(this.ql.width(), 350),
				h  = this.ql.height();

			self.fm.keydown = false;
			
			this.ql.css({
				width    : el.width(),
				minWidth : el.width(),
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
				self.fm.keydown = true;
				self.ql.css('height', 'auto').css('width', 'auto');
				if (self._img) {
					preview();
					self._img = false;
				}
			});
		}
	}
	
	this.hide = function() {

		if (this.ql.is(':visible')) {
			var o, w, el = self.fm.view.cwd.find('[key="'+this._hash+'"]');
			if (el) {
				o = el.offset();
				w = el.width();
				self.fm.keydown = false;
				this.ql.animate({
					width    : w,
					minWidth : w,
					height   : el.height(),
					left     : o.left,
					top      : o.top,
					opacity  : 0
				}, 350, function() {
					self.fm.keydown = true;
					self.ql.hide().css({
						width    : 'auto',
						minWidth : 'auto',
						height   : 'auto'
					});
					reset();
				})
			} else {
				this.ql.fadeOut(200);
				reset()
			}
		}
	}
	
	this.toggle = function() {
		if (this.ql.is(':visible')) {
			this.hide();
		} else {
			this.show();
		}
	}
	
	function reset() {
		self.img.hide().unbind('load').removeAttr('src').removeAttr('load').css({width:'', height:''});
		self.iframe.hide();
		self.info.empty();
		self.ico.show().children('p').attr('class', '').css({background: '', border: ''});
		self._hash = '';
	}
	
	function update() {
		var f = self.fm.getSelected(0);
		reset();
		self._hash = f.hash
		self.ico.children('p').attr('class', f.type == 'link' && !f.link ? 'broken' : f.mime.replace('/' , ' ').replace(/\./g, '-'));
		f.tmb && self.ico.children('p').css({background: 'url("'+f.tmb+'") 0 0 no-repeat', border: '1px solid #fff'});
		self.info.append($('<strong/>').text(f.name))
			.append(self.fm.view.kind(f)+'<br/>'+self.fm.view.formatSize(f.size)+'<br/>'+self.fm.i18n('Modified')+': '+self.fm.view.formatDate(f.date));
		f.dim && self.info.append('<br/>'+self.fm.i18n('Dimesions')+': '+f.dim);
		f.url && self.info.append($('<a/>').attr('href', f.url).text(f.url).click(function(e) {
			e.preventDefault();
			e.stopPropagation();
			window.open(f.url);
		}));
		
		if (f.mime.match(/image\/(jpeg|png|gif)/)) {
			var url = self.fm.fileURL();
			self.img.attr('src', url).load(function() {
				if (self.ql.is(':hidden') || self.ql.is(':animated')) {
					self._img = true;
				} else {
					preview();
				}
			});
		} else if((0 == f.mime.indexOf('text') && f.mime != 'text/rtf') || f.mime.match(/application\/(pdf|xml)/)) {
			self.ico.hide();
			self.iframe.attr('src', self.fm.fileURL()).show();
		}
	}

	function preview() {
		var iw = self.img.width(),
			ih = self.img.height(),
			r = Math.min(Math.min(400, iw) / iw, Math.min(300, ih) / ih);

		self.ico.hide();
		self.fm.keydown = false;
		self.img.css({
			width:self.ico.width(),
			height:self.ico.height()
		}).animate({
			width:Math.round(r * iw),
			height:Math.round(r * ih)
		}, 350, function() { self.fm.keydown = true; });
	}
	
	this.update = function() {
		if (this.fm.selected.length != 1) {
			this.hide();
		} else if (this.ql.is(':visible') && this.fm.selected[0] != this._hash) {
			update();
		}
	}
	
	
	this.isVisible = function() {
		return this.ql.is(':visible');
	}
	
}