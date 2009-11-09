/**
 * @class button - insert/edit image (open dialog window)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.image = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.img = null
	this.init = function() {
		
		this.labels = {
			main   : 'Properies',
			link   : 'Link',
			adv    : 'Advanced',
			events : 'Events',
			id        : 'ID',
			'class'   : 'Css class',
			style     : 'Css style',
			longdesc  : 'Detail description URL',
			href    : 'URL',
			target  : 'Open in',
			title   : 'Title'
		}
		
		this.src = {
			main : {
				src    : $('<input type="text" />').css('width', '100%'),
				title  : $('<input type="text" />').css('width', '100%'),
				alt    : $('<input type="text" />').css('width', '100%'),
				width  : $('<input type="text" />').attr('size', 5).css('text-align', 'right'),
				height : $('<input type="text" />').attr('size', 5).css('text-align', 'right'),
				margin : $('<div />'),
				align  : $('<select />').css('width', '100%')
							.append($('<option />').val('').text(this.rte.i18n('Not set', 'dialogs')))
							.append($('<option />').val('left'       ).text(this.rte.i18n('Left')))
							.append($('<option />').val('right'      ).text(this.rte.i18n('Right')))
							.append($('<option />').val('top'        ).text(this.rte.i18n('Top')))
							.append($('<option />').val('text-top'   ).text(this.rte.i18n('Text top')))
							.append($('<option />').val('middle'     ).text(this.rte.i18n('middle')))
							.append($('<option />').val('baseline'   ).text(this.rte.i18n('Baseline')))
							.append($('<option />').val('bottom'     ).text(this.rte.i18n('Bottom')))
							.append($('<option />').val('text-bottom').text(this.rte.i18n('Text bottom'))),
				border : $('<div />')
			},

			adv : {
				id       : $('<input type="text" />').css('width', '100%'),
				'class'  : $('<input type="text" />').css('width', '100%'),
				style    : $('<input type="text" />').css('width', '100%'),
				longdesc : $('<input type="text" />').css('width', '100%')
			},

			// link : {
			// 	href  : $('<input type="text" />').css('width', '100%'),
			// 	title : $('<input type="text" />').css('width', '100%')
			// },
			
			events : {}
		}
		
		$.each(
			['onblur', 'onfocus', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout', 'onmouseleave', 'onkeydown', 'onkeypress', 'onkeyup'], 
			function() {
				self.src.events[this] = $('<input type="text" />').css('width', '100%');
		});
		
		$.each(self.src, function() {
			for (var n in this) {
				this[n].attr('name', n);
			}
		});
		
	}
	
	this.command = function() {
		!this.src && this.init();
		this.rte.browser.msie && this.rte.selection.saveIERange();
		this.src.main.border.elBorderSelect({ change : function() { self.updateImg(); }, name : 'border' });
		this.src.main.margin.elPaddingInput({ type : 'margin' });

		this.cleanValues();
		this.src.main.src.val('');
		
		var n = this.rte.selection.getEnd();
		this.preview = null;
		this.prevImg = null;
		this.link    = null;
		if (n.nodeName == 'IMG') {
			this.img     = $(n);
		} else {
			this.img = $(this.rte.doc.createElement('img'));
			
		}
		
		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); self.set(); d.close(); },
			dialog : {
				width    : 520,
				position : 'top',
				title    : this.rte.i18n('Image')
			}
		}
		var d = new elDialogForm(opts);
		
		if (this.rte.options.fmAllow && this.rte.options.fmOpen) {
			var src = $('<span />').append(this.src.main.src.css('width', '88%'))
					.append(
						$('<span />').addClass('ui-state-default ui-corner-all')
							.css({'float' : 'right', 'margin-right' : '3px'})
							.attr('title', self.rte.i18n('Open file manger'))
							.append($('<span />').addClass('ui-icon ui-icon-folder-open'))
								.click( function() {
									self.rte.options.fmOpen( function(url) { self.src.main.src.val(url).change() } );
								})
								.hover(function() {$(this).addClass('ui-state-hover')}, function() { $(this).removeClass('ui-state-hover')})
						);
		} else {
			var src = this.src.main.src;
		}
		
		d.tab('main', this.rte.i18n('Properies'))
			.append([this.rte.i18n('Image URL'), src],                 'main', true)
			.append([this.rte.i18n('Title'),     this.src.main.title], 'main', true)
			.append([this.rte.i18n('Alt text'),  this.src.main.alt],   'main', true)
			.append([this.rte.i18n('Size'), $('<span />').append(this.src.main.width).append(' x ').append(this.src.main.height).append(' px')], 'main', true)
			.append([this.rte.i18n('Alignment'), this.src.main.align],  'main', true)
			.append([this.rte.i18n('Margins'),   this.src.main.margin], 'main', true)
			.append([this.rte.i18n('Border'),    this.src.main.border], 'main', true)

		for (var tab in this.src) {
			if (tab != 'main') {
				d.tab(tab, this.rte.i18n(this.labels[tab]));
				for (var name in this.src[tab]) {
					var l = this.rte.i18n(this.labels[name] ? this.labels[name] : name);
					if (tab == 'events') {
						this.src[tab][name].val(this.rte.utils.trimEventCallback(this.img.attr(name)));
					} else if (tab == 'link') {
						if (this.link) {
							this.src[tab][name].val(name == 'href' ? this.rte.utils.absoluteURL(this.link.attr(name)) : this.link.attr(name));
						}
					} else {
						this.src[tab][name].val(this.img.attr(name)||'');
					}
					d.append([l, this.src[tab][name]], tab, true);
				}
			}
		};
				
		d.open();
		
		var fs = $('<fieldset />').append($('<legend />').text(this.rte.i18n('Preview')))
		d.append(fs, 'main');
		var frame = document.createElement('iframe');
		$(frame).attr('src', '#').addClass('el-rte-preview').appendTo(fs);

		html = this.rte.options.doctype+'<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head><body style="padding:0;margin:0;font-size:9px"> </body></html>';
		frame.contentWindow.document.open();
		frame.contentWindow.document.write(html);
		frame.contentWindow.document.close();
		this.frame = frame.contentWindow.document
		this.preview = $(frame.contentWindow.document.body)
		 				 .text('Proin elit arcu, rutrum commodo, vehicula tempus, commodo a, risus. Curabitur nec arcu. Donec sollicitudin mi sit amet mauris. Nam elementum quam ullamcorper ante. Etiam aliquet massa et lorem. Mauris dapibus lacus auctor risus. Aenean tempor ullamcorper leo. Vivamus sed magna quis ligula eleifend adipiscing. Duis orci. Aliquam sodales tortor vitae ipsum. Aliquam nulla. Duis aliquam molestie erat. Ut et mauris vel pede varius sollicitudin');
		
		if (this.img.attr('src')) {
			
			this.prevImg = $(this.frame.createElement('img'))
				.attr('src',  this.rte.utils.absoluteURL(this.img.attr('src')))
				
			this.prevImg.attr('width', this.img.attr('width'))
				.attr('height', this.img.attr('height'))
				.attr('title', this.img.attr('title')||'')
				.attr('alt', this.img.attr('alt')||'')
				.attr('style', this.img.attr('style')||'')
			for (var n in this.src.adv) {
				var a = this.img.attr(n);
				if (a) {
					this.prevImg.attr(n, a)
				}
			}	
				
			this.preview.prepend(this.prevImg);
			this.updateValues();
		}
		
		$.each(this.src, function() {
			$.each(this, function() {
				if (this === self.src.main.src) {
					this.bind('change', function() { self.updatePreview(); });
				} else if (this == self.src.main.width || this == self.src.main.height) {
					this.bind('change', function(e) {self.updateDimesions(e);});
				} else {
					this.bind('change', function() { self.updateImg(); });
				}
			});
		});
		
		// this.src.link.href.change(function() {
		// 	var $this = $(this);
		// 	$this.val(self.rte.utils.absoluteURL($this.val()));
		// });
		
	}
	

	
	/**
	 * Устанавливает значения полей формы из аттрибутов prevImg
	 * Вызывается после загрузки prevImg
	 *
	 **/
	this.updateValues = function() {
		
		var i = this.prevImg.get(0);
		
		this.origW = this.prevImg.attr('width'); 
		this.origH = this.prevImg.attr('height');
		
		this.src.main.src.val(this.rte.dom.attr(i, 'src'));
		this.src.main.title.val(this.rte.dom.attr(i, 'title'));		
		this.src.main.alt.val(this.rte.dom.attr(i, 'alt'));
		this.src.main.width.val(this.origW);
		this.src.main.height.val(this.origH);
		this.src.adv['class'].val(this.rte.dom.attr(i, 'class'));
		this.src.main.margin.val(this.prevImg)
		var f = this.prevImg.css('float');
		this.src.main.align.val(f == 'left' || f == 'right' ? f : (this.prevImg.css('vertical-align')||''));
		this.src.main.border.val(this.prevImg)
		this.src.adv.style.val(this.rte.dom.attr(i, 'style'));
	}
	
	/**
	 * Очищает поля формы
	 *
	 **/
	this.cleanValues = function() {
		$.each(this.src, function() {
			$.each(this, function() {
				var $this = $(this);
				if ($this.attr('name') != 'src') {
					$this.val('');
				}
			});
		});
	}
	
	/**
	 * Устанавливает аттрибуты prevImg из полей формы
	 *
	 **/
	this.updateImg = function() {
		this.prevImg.attr({
				style  : $.trim(this.src.adv.style.val()),
				title  : $.trim(this.src.main.title.val()),
				alt    : $.trim(this.src.main.alt.val()),
				width  : parseInt(this.src.main.width.val()),
				height : parseInt(this.src.main.height.val())
			});

		var a = this.src.main.align.val();
		var f = a == 'left' || a == 'right' ? a : '';
		
		var b = this.src.main.border.val(); 
		var m = this.src.main.margin.val();
		this.prevImg.css('float', f);
		this.prevImg.css('vertical-align', f ? '' : a);
		this.prevImg.css('border', $.trim(b.width+' '+b.style+' '+b.color));
		if (m.css) {
			this.prevImg.css('margin', m.css);
		} else {
			this.prevImg.css('margin-top', m.top);
			this.prevImg.css('margin-right', m.right);
			this.prevImg.css('margin-bottom', m.bottom);
			this.prevImg.css('margin-left', m.left);						
		}

		$.each([this.src.events, this.src.adv], function() {
			$.each(this, function() {
				var $this = $(this);
				var n = $this.attr('name');
				if (n != 'style') {
					var v = $.trim($this.val());
					if (v) {
						self.prevImg.attr(n, v);
					} else {
						self.prevImg.removeAttr(n);
					}
				}
			});
		});
		
	}
	
	/**
	 * Обновляет форму выбора изображения
	 *
	 **/
	this.updatePreview = function() {
		
		var imgsrc = this.prevImg ? this.prevImg.attr('src') : '';
		var src    = $.trim(this.src.main.src.val());
		if (!src || src !=imgsrc) { // new image or empty src
			if (this.prevImg) {
				this.prevImg.remove();
				this.prevImg = null;
			}
			this.cleanValues();
			if (src) {  // new image
				
				this.prevImg = $(this.frame.createElement('img'))
					.attr('src',  this.rte.utils.absoluteURL(src))
					.bind('load', function() {
						self.updateValues();
					})
				this.preview.prepend(this.prevImg);
				self.updateValues();
			}
		} else { // update existsed image
			this.updateImg();
		}
	}
	
	this.updateDimesions = function(e) {
		
		var w = parseInt(this.src.main.width.val())  || 0;
		var h = parseInt(this.src.main.height.val()) || 0;
		if (w > 0 && h > 0) {
			if (e.currentTarget == this.src.main.width.get(0)) {
				
				this.src.main.height.val(parseInt(w*this.origH/this.origW));
			} else {
				this.src.main.width.val(parseInt(h*this.origW/this.origH));
			}	
		} else {
			this.src.main.width.val(this.origW);
			this.src.main.height.val(this.origH);			
		}

		this.updateImg();

	}
	
	this.set = function() {
		
		if (!this.prevImg || !this.prevImg.attr('width')) {
			this.img  && this.img.remove();
			this.link && this.rte.doc.execCommand('unlink', false, null);
		} else {
			if (!this.img.parents().length) {
				this.rte.browser.msie && this.rte.selection.restoreIERange();
				this.img = $(this.rte.doc.createElement('img'));
			}
			this.img.attr({
					src    : this.rte.utils.absoluteURL($.trim(this.src.main.src.val())),
					style  : $.trim(this.rte.dom.attr(this.prevImg.get(0), 'style')),
					title  : $.trim(this.src.main.title.val()),
					alt    : $.trim(this.src.main.alt.val()),
					width  : parseInt(this.src.main.width.val()),
					height : parseInt(this.src.main.height.val())
				});
				
			for (var _n in this.src.adv) {
				if (_n != 'style') {
					var val = this.src.adv[_n].val();
					if (val) {
						this.img.attr(_n, val);
					} else {
						this.img.removeAttr(_n)
					}
					
				}
			}
			for (var _n in this.src.events) {
				var val = this.src.events[_n].val();
				if (val) {
					this.img.attr(_n, val);
				} else {
					this.img.removeAttr(_n)
				}
			}
				
			if (!this.img.parents().length) {
				this.rte.selection.insertNode(this.img.get(0))
			}

			// Link
			// var href   = this.rte.utils.absoluteURL(this.src.link.href.val());
			// var title  = $.trim(this.src.link.title.val());
			// if (!href) {
			// 	if (this.link) {
			// 		this.link.replaceWith(this.prevImg);
			// 	}
			// } else {
			// 	if (this.link) {
			// 		this.link.attr('href', href).removeAttr('target').removeAttr('title');
			// 		title  && this.alink.attr('title', title);
			// 	} else {
			// 		this.link = $(this.rte.doc.createElement('a')).attr('href', href);
			// 		title  && this.link.attr('title', title);
			// 		this.prevImg.wrap(this.link);
			// 	}
			// }
		}
		this.rte.ui.update();
	}

	this.update = function() {
		this.domElem.removeClass('disabled');
		var n = this.rte.selection.getEnd();
		if (n.nodeName == 'IMG') {
			this.domElem.addClass('active');
		} else {
			this.domElem.removeClass('active');
		}
	}
	
}

