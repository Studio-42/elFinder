/**
 * @class button - insert/edit link (open dialog window)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.link = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	
	function init() {
		self.labels = {
			id        : 'ID',
			'class'   : 'Css class',
			style     : 'Css style',
			dir       : 'Script direction',
			lang      : 'Language',
			charset   : 'Charset',
			type      : 'Target MIME type',
			rel       : 'Relationship page to target (rel)',
			rev       : 'Relationship target to page (rev)',
			tabindex  : 'Tab index',
			accesskey : 'Access key'
		}
		self.src = {
			main : {
				href   : $('<input type="text" />'),
				title  : $('<input type="text" />'),
				anchor : $('<select />').attr('name', 'anchor')//,
				// target : $('<select />')
				// 	.append($('<option />').text(self.rte.i18n('In this window')).val(''))
				// 	.append($('<option />').text(self.rte.i18n('In new window (_blank)')).val('_blank'))
				// 	.append($('<option />').text(self.rte.i18n('In new parent window (_parent)')).val('_parent'))
				// 	.append($('<option />').text(self.rte.i18n('In top frame (_top)')).val('_top'))
			},

			popup : {
				use        : $('<input type="checkbox />"'),
				url        : $('<input type="text" />'    ).val('http://'),
				name       : $('<input type="text" />'    ),
				width      : $('<input type="text" />'    ).attr({size : 6, title : self.rte.i18n('Width')} ).css('text-align', 'right'),
				height     : $('<input type="text" />'    ).attr({size : 6, title : self.rte.i18n('Height')}).css('text-align', 'right'),
				left       : $('<input type="text" />'    ).attr({size : 6, title : self.rte.i18n('Left')}  ).css('text-align', 'right'),
				top        : $('<input type="text" />'    ).attr({size : 6, title : self.rte.i18n('Top')}   ).css('text-align', 'right'),
				location   : $('<input type="checkbox" />'),				
				menubar    : $('<input type="checkbox" />'),
				toolbar    : $('<input type="checkbox" />'),
				scrollbars : $('<input type="checkbox" />'),
				status     : $('<input type="checkbox" />'),
				resizable  : $('<input type="checkbox" />'),
				dependent  : $('<input type="checkbox" />'),
				retfalse   : $('<input type="checkbox" />').attr('checked', true)
			},

			adv : {
				id        : $('<input type="text" />'),
				'class'   : $('<input type="text" />'),
				style     : $('<input type="text" />'),
				dir       : $('<select />')
							.append($('<option />').text(self.rte.i18n('Not set')).val(''))
							.append($('<option />').text(self.rte.i18n('Left to right')).val('ltr'))
							.append($('<option />').text(self.rte.i18n('Right to left')).val('rtl')),
				lang      : $('<input type="text" />'),
				charset   : $('<input type="text" />'),
				type      : $('<input type="text" />'),
				rel       : $('<input type="text" />'),
				rev       : $('<input type="text" />'),
				tabindex  : $('<input type="text" />'),
				accesskey : $('<input type="text" />')
			},
			events : {}
		}

		$.each(
			['onblur', 'onfocus', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout', 'onmouseleave', 'onkeydown', 'onkeypress', 'onkeyup'], 
			function() {
				self.src.events[this] = $('<input type="text" />');
		});

		$.each(self.src, function() {
			for (var n in this) {
				this[n].attr('name', n);
				var t = this[n].attr('type');
				if (!t || (t == 'text'  && !this[n].attr('size')) ) {
					this[n].css('width', '100%');
				}
			}
		});
		
	}
	
	this.command = function() {
		!this.src && init();
		this.rte.browser.msie && this.rte.selection.saveIERange();
		
		var n = this.rte.selection.getNode();
		var l;
		if ((l = this.rte.dom.selfOrParentLink(n))) {
			this.link = l;
		} else if ((l = this.rte.dom.childLinks(n))) {
			this.link = l[0];
		}
		this.link = this.link ? $(this.link) : $(this.rte.doc.createElement('a'));

		this.updatePopup();
		
		this.src.main.anchor.empty();
		$('a[href!=""][name]', this.rte.doc).each(function() {
			var n = $(this).attr('name');
			self.src.main.anchor.append($('<option />').val(n).text(n));
		});
		if (this.src.main.anchor.children().length) {
			this.src.main.anchor.prepend($('<option />').val('').text(this.rte.i18n('Select bookmark')) )
				.change(function() {
					var v = $(this).val();
					if (v) {
						self.src.main.href.val('#'+v);
					}
				});
		}
		
		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); self.set(); d.close(); },
			tabs : { show : function(e, ui) { if (ui.index==3) { self.updateOnclick(); } } },
			dialog : {
				width : 'auto',
				width : 430,
				title : this.rte.i18n('Link')
			}
		}
		var d = new elDialogForm(opts);
		
		var l = $('<div />')
			.append( $('<label />').append(this.src.popup.location).append(this.rte.i18n('Location bar')))
			.append( $('<label />').append(this.src.popup.menubar).append(this.rte.i18n('Menu bar')))
			.append( $('<label />').append(this.src.popup.toolbar).append(this.rte.i18n('Toolbar')))				
			.append( $('<label />').append(this.src.popup.scrollbars).append(this.rte.i18n('Scrollbars')));
		var r = $('<div />')
			.append( $('<label />').append(this.src.popup.status).append(this.rte.i18n('Status bar')))
			.append( $('<label />').append(this.src.popup.resizable).append(this.rte.i18n('Resizable')))
			.append( $('<label />').append(this.src.popup.dependent).append(this.rte.i18n('Depedent')))				
			.append( $('<label />').append(this.src.popup.retfalse).append(this.rte.i18n('Add return false')));
		
		d.tab('main', this.rte.i18n('Properies'))
			.tab('popup',  this.rte.i18n('Popup'))
			.tab('adv',    this.rte.i18n('Advanced'))
			.tab('events', this.rte.i18n('Events'))
			.append($('<label />').append(this.src.popup.use).append(this.rte.i18n('Open link in popup window')), 'popup')
			.separator('popup')
			.append([this.rte.i18n('URL'),  this.src.popup.url],  'popup', true)
			.append([this.rte.i18n('Window name'), this.src.popup.name], 'popup', true)
			.append([this.rte.i18n('Window size'), $('<span />').append(this.src.popup.width).append(' x ').append(this.src.popup.height).append(' px')], 'popup', true)
			.append([this.rte.i18n('Window position'), $('<span />').append(this.src.popup.left).append(' x ').append(this.src.popup.top).append(' px')], 'popup', true)				
			.separator('popup')
			.append([l, r], 'popup', true);

		var link = this.link.get(0);
		var href = this.rte.dom.attr(link, 'href');
		this.src.main.href.val(href).change(function() {
			$(this).val(self.rte.utils.absoluteURL($(this).val()));
		});
		
		if (this.rte.options.fmAllow && this.rte.options.fmOpen) {
			var s = $('<span />').append(this.src.main.href.css('width', '87%'))
				.append(
					$('<span />').addClass('ui-state-default ui-corner-all')
						.css({'float' : 'right', 'margin-right' : '3px'})
						.attr('title', self.rte.i18n('Open file manger'))
						.append($('<span />').addClass('ui-icon ui-icon-folder-open'))
							.click( function() {
								self.rte.options.fmOpen( function(url) { self.src.main.href.val(url).change(); } );
							})
							.hover(function() {$(this).addClass('ui-state-hover')}, function() { $(this).removeClass('ui-state-hover')})
				);
			d.append([this.rte.i18n('Link URL'), s], 'main', true);
		} else {
			d.append([this.rte.i18n('Link URL'), this.src.main.href], 'main', true);
		}
		this.src.main.href.change();
		
		d.append([this.rte.i18n('Title'), this.src.main.title.val(this.rte.dom.attr(link, 'title'))], 'main', true);
		if (this.src.main.anchor.children().length) {
			d.append([this.rte.i18n('Bookmark'), this.src.main.anchor.val(href)], 'main', true)
		}

		for (var n in this.src.adv) {
			this.src.adv[n].val(this.rte.dom.attr(link, n));
			d.append([this.rte.i18n(this.labels[n] ? this.labels[n] : n), this.src.adv[n]], 'adv', true);
		}
		for (var n in this.src.events) {
			var v = this.rte.utils.trimEventCallback(this.rte.dom.attr(link, n));
			this.src.events[n].val(v);
			d.append([this.rte.i18n(this.labels[n] ? this.labels[n] : n), this.src.events[n]], 'events', true);
		}
		
		this.src.popup.use.change(function() {
			var c = $(this).attr('checked');
			$.each(self.src.popup, function() {
				if ($(this).attr('name') != 'use') {
					if (c) {
						$(this).removeAttr('disabled');
					} else {
						$(this).attr('disabled', true);
					}
				}
			})
		});
		this.src.popup.use.change();
		d.open();
	}
	
	this.update = function() {
		var n = this.rte.selection.getNode();
		if (this.rte.dom.selfOrParentAnchor(n)) {
			this.domElem.addClass('disabled');	
		} else if (this.rte.dom.selfOrParentLink(n) || this.rte.dom.childLinks(n).length) {
			this.domElem.removeClass('disabled').addClass('active');
		} else {
			this.domElem.removeClass('active');
			if (!this.rte.selection.collapsed() || (n.nodeType == 1 && /^(IMG|EMBED|OBJECT)$/.test(n.nodeName))) {
				this.domElem.removeClass('disabled');
			} else {
				this.domElem.addClass('disabled');
			}
		}
	}
	
	this.updatePopup = function() {
		var onclick = this.rte.dom.attr(this.link.get(0), 'onclick');
		onclick = onclick ? $.trim(onclick.toString()) : ''
		if ( onclick.length>0 && (m = onclick.match(/window.open\("([^"]+)",\s*"([^"]*)",\s*"([^"]*)"\s*.*\);\s*(return\s+false)?/))) {
			this.src.popup.use.attr('checked', 'on')
			this.src.popup.url.val(m[1]);
			this.src.popup.name.val(m[2]);

			if ( /location=yes/.test(m[3]) ) {
				this.src.popup.location.attr('checked', true);
			}
			if ( /menubar=yes/.test(m[3]) ) {
				this.src.popup.menubar.attr('checked', true);
			}
			if ( /toolbar=yes/.test(m[3]) ) {
				this.src.popup.toolbar.attr('checked', true);
			}
			if ( /scrollbars=yes/.test(m[3]) ) {
				this.src.popup.scrollbars.attr('checked', true);
			}
			if ( /status=yes/.test(m[3]) ) {
				this.src.popup.status.attr('checked', true);
			}
			if ( /resizable=yes/.test(m[3]) ) {
				this.src.popup.resizable.attr('checked', true);
			}
			if ( /dependent=yes/.test(m[3]) ) {
				this.src.popup.dependent.attr('checked', true);
			}
			if ((_m = m[3].match(/width=([^,]+)/))) {
				this.src.popup.width.val(_m[1]);
			}
			if ((_m = m[3].match(/height=([^,]+)/))) {
				this.src.popup.height.val(_m[1]);
			}
			if ((_m = m[3].match(/left=([^,]+)/))) {
				this.src.popup.left.val(_m[1]);
			}
			if ((_m = m[3].match(/top=([^,]+)/))) {
				this.src.popup.top.val(_m[1]);
			}
			if (m[4]) {
				this.src.popup.retfalse.attr('checked', true);
			}
		} else {
			$.each(this.src.popup, function() {
				var $this = $(this);
				if ($this.attr('type') == 'text') {
					$this.val($this.attr('name') == 'url' ? 'http://' : '');
				} else {
					if ($this.attr('name') == 'retfalse') {
						this.attr('checked', true);
					} else {
						$this.removeAttr('checked');
					}
				}
			});
		}
		
	}
	
	this.updateOnclick = function () {
		var url = this.src.popup.url.val();
		if (this.src.popup.use.attr('checked') && url) {
			var params = '';
			if (this.src.popup.location.attr('checked')) {
				params += 'location=yes,';
			}
			if (this.src.popup.menubar.attr('checked')) {
				params += 'menubar=yes,';
			}
			if (this.src.popup.toolbar.attr('checked')) {
				params += 'toolbar=yes,';
			}
			if (this.src.popup.scrollbars.attr('checked')) {
				params += 'scrollbars=yes,';
			}
			if (this.src.popup.status.attr('checked')) {
				params += 'status=yes,';
			}
			if (this.src.popup.resizable.attr('checked')) {
				params += 'resizable=yes,';
			}
			if (this.src.popup.dependent.attr('checked')) {
				params += 'dependent=yes,';
			}
			if (this.src.popup.width.val()) {
				params += 'width='+this.src.popup.width.val()+',';
			}
			if (this.src.popup.height.val()) {
				params += 'height='+this.src.popup.height.val()+',';
			}
			if (this.src.popup.left.val()) {
				params += 'left='+this.src.popup.left.val()+',';
			}
			if (this.src.popup.top.val()) {
				params += 'top='+this.src.popup.top.val()+',';
			}
			if (params.length>0) {
				params = params.substring(0, params.length-1)
			}
			var retfalse = this.src.popup.retfalse.attr('checked') ? 'return false;' : '';
			var onclick = 'window.open("'+url+'", "'+$.trim(this.src.popup.name.val())+'", "'+params+'");'+retfalse;
			this.src.events.onclick.val(onclick);
			if (!this.src.main.href.val()) {
				this.src.main.href.val('#');
			}
		} else {
			var v = this.src.events.onclick.val();
			v = v.replace(/window\.open\([^\)]+\)\s*;?\s*return\s*false\s*;?/i, '');
			this.src.events.onclick.val(v);
		}
	}
	
	this.set = function() {
		this.updateOnclick();
		this.rte.browser.msie && this.rte.selection.restoreIERange();
		var href = this.rte.utils.absoluteURL(this.src.main.href.val());
		if (!href) {
			this.link.parents().length && this.rte.doc.execCommand('unlink', false, null);
		} else {
			if (!this.link.parents().length) {
				
				var fakeURL = '#--el-editor---'+Math.random();
				var r =this.rte.doc.execCommand('createLink', false, fakeURL);
				// self.rte.log(r)
				this.link = $('a[href="'+fakeURL+'"]', this.rte.doc);
				this.link.each(function() {
					var $this = $(this);
					// удаляем ссылки вокруг пустых элементов
					if (!$.trim($this.html()) && !$.trim($this.text())) {
						$this.replaceWith($this.text()); //  сохраняем пробелы :)
					}
				});
			}
			this.src.main.href.val(href);
			for (var tab in this.src) {
				if (tab != 'popup') {
					for (var n in this.src[tab]) {
						if (n != 'anchors') {
							var v = $.trim(this.src[tab][n].val());
							if (v) {
								this.link.attr(n, v);
							} else {
								this.link.removeAttr(n);
							}
						}
					}
				}
			};
		}
		this.rte.ui.update(true);
	}
	
}

