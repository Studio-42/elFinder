/**
 * @class button - create/edit table (open dialog window)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.table = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self    = this;
	this.src    = null;
	this.labels = null;
	
	function init() {
		self.labels = {
			main      : 'Properies',
			adv       : 'Advanced',
			events    : 'Events',
			id        : 'ID',
			'class'   : 'Css class',
			style     : 'Css style',
			dir       : 'Script direction',
			summary   : 'Summary',
			lang      : 'Language',
			href      : 'URL'
		}
		
		self.src = {
			main : {
				caption : $('<input type="text" />'),
				rows    : $('<input type="text" />').attr('size', 5).val(2),
				cols    : $('<input type="text" />').attr('size', 5).val(2),
				width   : $('<input type="text" />').attr('size', 5),
				wunit   : $('<select />')
							.append($('<option />').val('%').text('%'))
							.append($('<option />').val('px').text('px')),				
				height  : $('<input type="text" />').attr('size', 5),	
				hunit   : $('<select />')
							.append($('<option />').val('%').text('%'))
							.append($('<option />').val('px').text('px')),	
				align   : $('<select />')
							.append($('<option />').val('').text(self.rte.i18n('Not set')))
							.append($('<option />').val('left').text(self.rte.i18n('Left')))
							.append($('<option />').val('center').text(self.rte.i18n('Center')))	
							.append($('<option />').val('right').text(self.rte.i18n('Right'))),	
				spacing : $('<input type="text" />').attr('size', 5),	
				padding : $('<input type="text" />').attr('size', 5),
				border  : $('<div />'),
				// frame   : $('<select />')
				// 			.append($('<option />').val('void').text(self.rte.i18n('No')))
				// 			.append($('<option />').val('border').text(self.rte.i18n('Yes'))),
				rules   : $('<select />')
							.append($('<option />').val('none').text(self.rte.i18n('No')))
							.append($('<option />').val('all').text(self.rte.i18n('Cells')))
							.append($('<option />').val('groups').text(self.rte.i18n('Groups')))
							.append($('<option />').val('rows').text(self.rte.i18n('Rows')))
							.append($('<option />').val('cols').text(self.rte.i18n('Columns'))),
				margin  : $('<div />'),
				bg      : $('<div />'),
				bgimg   : $('<input type="text" />').css('width', '90%')
			},
			
			adv : {
				id        : $('<input type="text" />'),
				summary   : $('<input type="text" />'),
				'class'   : $('<input type="text" />'),
				style     : $('<input type="text" />'),
				dir       : $('<select />')
								.append($('<option />').text(self.rte.i18n('Not set')).val(''))
								.append($('<option />').text(self.rte.i18n('Left to right')).val('ltr'))
								.append($('<option />').text(self.rte.i18n('Right to left')).val('rtl')),
				lang      : $('<input type="text" />')
			},
			
			events : {}
		}
		
		$.each(self.src, function() {
			for (var n in this) {
				this[n].attr('name', n);
				var t = this[n].get(0).nodeName; 
				if (t == 'INPUT' && n != 'bgimg') {
					this[n].css(this[n].attr('size') ? {'text-align' : 'right'} : {width : '100%'});
				} else if (t == 'SELECT' && n!='wunit' && n!='hunit') {
					this[n].css('width', '100%');
				}
			}
		});
		
		$.each(
			['onblur', 'onfocus', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout', 'onmouseleave', 'onkeydown', 'onkeypress', 'onkeyup'], 
			function() {
				self.src.events[this] = $('<input type="text" />').attr('name', this).css('width', '100%');
		});
		
		self.src.main.align.change(function() {
			var v = $(this).val();
			if (v == 'center') {
				self.src.main.margin.val({left : 'auto', right : 'auto'});
			} else {
				var m = self.src.main.margin.val();
				if (m.left == 'auto' && m.right == 'auto') {
					self.src.main.margin.val({left : '', right : ''});
				}
			}
		});
		
		self.src.main.bgimg.change(function() {
			var t = $(this);
			t.val(self.rte.utils.absoluteURL(t.val()));
		})
		
	}
	
	this.command = function() {
		var n = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^TABLE$/);
		
		if (this.name == 'table') {
			this.table = $(this.rte.doc.createElement('table'));	
		} else {
			this.table = n ? $(n) : $(this.rte.doc.createElement('table'));					
		}
		
		!this.src && init();
		this.src.main.border.elBorderSelect({styleHeight : 117});
		this.src.main.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
		this.src.main.margin.elPaddingInput({ type : 'margin', value : this.table});
		
		if (this.table.parents().length) {
			this.src.main.rows.val('').attr('disabled', true);
			this.src.main.cols.val('').attr('disabled', true);
		} else {
			this.src.main.rows.val(2).removeAttr('disabled');
			this.src.main.cols.val(2).removeAttr('disabled');
		}
		
		var w = this.table.css('width') || this.table.attr('width');
		this.src.main.width.val(parseInt(w)||'');
		this.src.main.wunit.val(w.indexOf('px') != -1 ? 'px' : '%');
		
		var h = this.table.css('height') || this.table.attr('height');	
		this.src.main.height.val(parseInt(h)||'');
		this.src.main.hunit.val(h && h.indexOf('px') != -1 ? 'px' : '%');

		var f = this.table.css('float');
		this.src.main.align.val('');
		if (f == 'left' || f == 'right') {
			this.src.main.align.val(f);
		} else {
			var ml = this.table.css('margin-left');
			var mr = this.table.css('margin-right');
			if (ml == 'auto' && mr == 'auto') {
				this.src.main.align.val('center');
			}
		}

		this.src.main.border.val(this.table);
		//this.src.main.frame.val(this.table.attr('frame'));
		this.src.main.rules.val(this.rte.dom.attr(this.table.get(0), 'rules'));

		this.src.main.bg.val(this.table.css('background-color'));
		var bgimg = this.table.css('background-image').replace(/url\(([^\)]+)\)/i, "$1");
		this.src.main.bgimg.val(bgimg!='none' ? bgimg : '');

		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); self.set(); d.close(); },
			dialog : {
				width : 530,
				title : this.rte.i18n('Table')
			}
		}
		var d = new elDialogForm(opts);
		
		for (var tab in this.src) {
			d.tab(tab, this.rte.i18n(this.labels[tab]));
			if (tab == 'main') {
				var t1 = $('<table />')
					.append($('<tr />').append('<td>'+this.rte.i18n('Rows')+'</td>').append($('<td />').append(this.src.main.rows)))
					.append($('<tr />').append('<td>'+this.rte.i18n('Columns')+'</td>').append($('<td />').append(this.src.main.cols)));
				var t2 = $('<table />')
					.append($('<tr />').append('<td>'+this.rte.i18n('Width')+'</td>').append($('<td />').append(this.src.main.width).append(this.src.main.wunit)))
					.append($('<tr />').append('<td>'+this.rte.i18n('Height')+'</td>').append($('<td />').append(this.src.main.height).append(this.src.main.hunit)));
				var t3 = $('<table />')
					.append($('<tr />').append('<td>'+this.rte.i18n('Spacing')+'</td>').append($('<td />').append(this.src.main.spacing.val(this.table.attr('cellspacing')||''))))
					.append($('<tr />').append('<td>'+this.rte.i18n('Padding')+'</td>').append($('<td />').append(this.src.main.padding.val(this.table.attr('cellpadding')||''))));
				
				d.append([this.rte.i18n('Caption'), this.src.main.caption.val(this.table.find('caption').eq(0).text() || '')], 'main', true)
					.separator('main')
					.append([t1, t2, t3], 'main', true)
					.separator('main')
					.append([this.rte.i18n('Border'),        this.src.main.border], 'main', true)
					//.append([this.rte.i18n('Frame'),       this.src.main.frame], 'main', true)
					.append([this.rte.i18n('Inner borders'), this.src.main.rules], 'main', true)
					.append([this.rte.i18n('Alignment'),     this.src.main.align], 'main', true)
					.append([this.rte.i18n('Margins'),       this.src.main.margin], 'main', true)
					.append([this.rte.i18n('Background'),    $('<span />').append($('<span />').css({'float' : 'left', 'margin-right' : '3px'}).append(this.src.main.bg)).append(this.src.main.bgimg)], 'main', true)
			} else {
				for (var name in this.src[tab]) {
					var v = this.rte.dom.attr(this.table, name);
					if (tab == 'events') {
						v = this.rte.utils.trimEventCallback(v);
					} 
					d.append([this.rte.i18n(this.labels[name] ? this.labels[name] : name), this.src[tab][name].val(v)], tab, true);
				}
			}
		}
		
		d.open();
	}
	
	this.set = function() {
		
		if (!this.table.parents().length) {
			var r = parseInt(this.src.main.rows.val()) || 0;
			var c = parseInt(this.src.main.cols.val()) || 0;
			if (r<=0 || c<=0) {
				return;
			}
			
			var b = $(this.rte.doc.createElement('tbody')).appendTo(this.table);
			var tr     = $('<tr />');
			for (var i=0; i < c; i++) {
				tr.append($('<td />').html('&nbsp;'));
			};
			for (var i=0; i<r; i++) {
				b.append(tr.clone(true))
			};
			this.rte.selection.insertNode(this.table.get(0), true);
		} else {
			this.table
				.removeAttr('width')
				.removeAttr('height')
				.removeAttr('border')
				.removeAttr('align')
				.removeAttr('bordercolor')
				.removeAttr('bgcolor')
				.removeAttr('cellspacing')
				.removeAttr('cellpadding')
				.removeAttr('frame')
				.removeAttr('rules')
				.removeAttr('style');
		}
		
		var cap = $.trim(this.src.main.caption.val());
		if (cap) {
			if (!this.table.children('caption').length) {
				this.table.prepend($('<caption />'));
			}
			this.table.children('caption').text(cap)
		} else {
			this.table.children('caption').remove();
		}
		
		for (var tab in this.src) {
			if (tab != 'main') {
				for (var n in this.src[tab]) {
					var v = $.trim(this.src[tab][n].val());
					if (v) {
						this.table.attr(n, v);
					} else {
						this.table.removeAttr(n);
					}
				}
			}
		}
		var spacing, padding, rules;

		if ((spacing = parseInt(this.src.main.spacing.val())) && spacing>=0) {
			this.table.attr('cellspacing', spacing);
		} 

		if ((padding = parseInt(this.src.main.padding.val())) && padding>=0) {
			this.table.attr('cellpadding', padding);
		} 
		
		if ((rules = this.src.main.rules.val())) {
			this.table.attr('rules', rules);
		}
		
		var
			w = parseInt(this.src.main.width.val()) || '',
			h = parseInt(this.src.main.height.val()) || '',
			i = $.trim(this.src.main.bgimg.val()),
			b = this.src.main.border.val(),
			m = this.src.main.margin.val(),
			f = this.src.main.align.val();
		this.table.css({
			width              : w ? w+this.src.main.wunit.val() : '',
			height             : h ? h+this.src.main.hunit.val() : '',
			border             : $.trim(b.width+' '+b.style+' '+b.color),
			'background-color' : this.src.main.bg.val(),
			'background-image' : i ? 'url('+i+')' : ''
		});	
		if (m.css) {
			this.table.css('margin', m.css);
		} else {
			this.table.css({
				'margin-top'    : m.top,
				'margin-right'  : m.right,
				'margin-bottom' : m.bottom,
				'margin-left'   : m.left
			});
		}
		if ((f=='left' || f=='right') && this.table.css('margin-left')!='auto'  && this.table.css('margin-right')!='auto') {
			this.table.css('float', f);
		}
		if (!this.table.attr('style')) {
			this.table.removeAttr('style');
		}
		
		this.rte.ui.update();
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
		if (this.name == 'tableprops' && !this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^TABLE$/)) {
			this.domElem.addClass('disabled').removeClass('active');
		}
	}
	
}

elRTE.prototype.ui.prototype.buttons.tableprops = elRTE.prototype.ui.prototype.buttons.table;