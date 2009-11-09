/**
 * @class button - table cell properties
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.tbcellprops = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.src = null;
	this.labels = null;
	
	function init() {
		self.labels = {
			main    : 'Properies',
			adv     : 'Advanced',
			events  : 'Events',
			id      : 'ID',
			'class' : 'Css class',
			style   : 'Css style',
			dir     : 'Script direction',
			lang    : 'Language'
		}
		
		self.src = {
			main : {
				type    : $('<select />').css('width', '100%')
							.append($('<option />').val('td').text(self.rte.i18n('Data')))
							.append($('<option />').val('th').text(self.rte.i18n('Header'))),
				width   : $('<input type="text" />').attr('size', 4),
				wunit   : $('<select />')
							.append($('<option />').val('%').text('%'))
							.append($('<option />').val('px').text('px')),				
				height  : $('<input type="text" />').attr('size', 4),	
				hunit   : $('<select />')
							.append($('<option />').val('%').text('%'))
							.append($('<option />').val('px').text('px')),	
				align   : $('<select />').css('width', '100%')
							.append($('<option />').val('').text(self.rte.i18n('Not set')))
							.append($('<option />').val('left').text(self.rte.i18n('Left')))
							.append($('<option />').val('center').text(self.rte.i18n('Center')))	
							.append($('<option />').val('right').text(self.rte.i18n('Right')))
							.append($('<option />').val('justify').text(self.rte.i18n('Justify'))),	
				border  : $('<div />'),
				padding  : $('<div />'),
				bg      : $('<div />'),
				bgimg   : $('<input type="text" />').css('width', '90%'),
				apply   : $('<select />').css('width', '100%')
							.append($('<option />').val('').text(self.rte.i18n('Current cell')))
							.append($('<option />').val('row').text(self.rte.i18n('All cells in row')))
							.append($('<option />').val('column').text(self.rte.i18n('All cells in column')))	
							.append($('<option />').val('table').text(self.rte.i18n('All cells in table')))
			},
			
			adv : {
				id        : $('<input type="text" />'),
				'class'   : $('<input type="text" />'),
				style     : $('<input type="text" />'),
				dir       : $('<select />').css('width', '100%')
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
				if (this[n].attr('type') == 'text' && !this[n].attr('size') && n!='bgimg') {
					this[n].css('width', '100%')
				}
			}
		});
		
		$.each(
			['onblur', 'onfocus', 'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout', 'onmouseleave', 'onkeydown', 'onkeypress', 'onkeyup'], 
			function() {
				self.src.events[this] = $('<input type="text" />').attr('name', this).css('width', '100%');
		});
		
	}
	
	this.command = function() {
		!this.src && init();
		this.cell = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^(TD|TH)$/);
		if (!this.cell) {
			return;
		}
		this.src.main.type.val(this.cell.nodeName.toLowerCase());
		this.cell = $(this.cell);
		this.src.main.border.elBorderSelect({styleHeight : 117, value : this.cell});
		this.src.main.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
		this.src.main.padding.elPaddingInput({ value : this.cell});
		
		var w = this.cell.css('width') || this.cell.attr('width');
		this.src.main.width.val(parseInt(w)||'');
		this.src.main.wunit.val(w.indexOf('px') != -1 ? 'px' : '%');
		
		var h = this.cell.css('height') || this.cell.attr('height');	
		this.src.main.height.val(parseInt(h)||'');
		this.src.main.hunit.val(h.indexOf('px') != -1 ? 'px' : '%');
		
		this.src.main.align.val(this.cell.attr('align') || this.cell.css('text-align'));
		this.src.main.bg.val(this.cell.css('background-color'));
		var bgimg = this.cell.css('background-image');
		this.src.main.bgimg.val(bgimg && bgimg!='none' ? bgimg.replace(/url\(([^\)]+)\)/i, "$1") : '');
		this.src.main.apply.val('');
		
		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); self.set(); d.close(); },
			dialog : {
//				width : 471,
				width : 'auto',
				title : this.rte.i18n('Table cell properties')
			}
		}
		var d = new elDialogForm(opts);
		for (var tab in this.src) {
			d.tab(tab, this.rte.i18n(this.labels[tab]));
			
			if (tab == 'main') {
				d.append([this.rte.i18n('Width'),              $('<span />').append(this.src.main.width).append(this.src.main.wunit)],  'main', true)
					.append([this.rte.i18n('Height'),          $('<span />').append(this.src.main.height).append(this.src.main.hunit)], 'main', true)
					.append([this.rte.i18n('Table cell type'), this.src.main.type],    'main', true)
					.append([this.rte.i18n('Border'),          this.src.main.border],  'main', true)
					.append([this.rte.i18n('Alignment'),       this.src.main.align],   'main', true)
					.append([this.rte.i18n('Paddings'),        this.src.main.padding], 'main', true)
					.append([this.rte.i18n('Background'),      $('<span />').append($('<span />').css({'float' : 'left', 'margin-right' : '3px'}).append(this.src.main.bg)).append(this.src.main.bgimg)],  'main', true)
					.append([this.rte.i18n('Apply to'),        this.src.main.apply],   'main', true);
			} else {
				for (var name in this.src[tab]) {
					var v = this.cell.attr(name) || '';
					if (tab == 'events') {
						v = this.rte.utils.trimEventCallback(v);
					} 
					d.append([this.rte.i18n(this.labels[name] ? this.labels[name] : name), this.src[tab][name].val(v)], tab, true);
				}
			}
		}
		d.open()
	}
	
	this.set = function() {
		
		var target = this.cell;
		var apply  = this.src.main.apply.val();
		switch (this.src.main.apply.val()) {
			case 'row':
				target = this.cell.parent('tr').children('td,th');
				break;
				
			case 'column':
				target = $(this.rte.dom.tableColumn(this.cell.get(0)));
				break;
				
			case 'table':
				target = this.cell.parents('table').find('td,th');
				break;
		}

		for (var tab in this.src) {
			if (tab != 'main') {
				for (var n in this.src[tab]) {
					var v = $.trim(this.src[tab][n].val());
					if (v) {
						target.attr(n, v);
					} else {
						target.removeAttr(n);
					}
				}
			}
		}
		
		target.removeAttr('width')
			.removeAttr('height')
			.removeAttr('border')
			.removeAttr('align')
			.removeAttr('bordercolor')
			.removeAttr('bgcolor');
			
		var t = this.src.main.type.val();
		var w = parseInt(this.src.main.width.val()) || '';
		var h = parseInt(this.src.main.height.val()) || '';
		var i = $.trim(this.src.main.bgimg.val());
		var b = this.src.main.border.val();
		var css = {
			'width'            : w ? w+this.src.main.wunit.val() : '',
			'height'           : h ? h+this.src.main.hunit.val() : '',
			'background-color' : this.src.main.bg.val(),
			'background-image' : i ? 'url('+i+')' : '',
			'border'           : $.trim(b.width+' '+b.style+' '+b.color),
			'text-align'       : this.src.main.align.val() || ''
		};
		var p = this.src.main.padding.val();
		if (p.css) {
			css.padding = p.css;
		} else {
			css['padding-top']    = p.top;
			css['padding-right']  = p.right;
			css['padding-bottom'] = p.bottom;
			css['padding-left']   = p.left;
		}
		
		target = target.get();

		$.each(target, function() {
			var type = this.nodeName.toLowerCase();
			var $this = $(this);
			if (type != t) {
				
				var attr = {}
				for (var i in self.src.adv) {
					var v = $this.attr(i)
					if (v) {
						attr[i] = v.toString();
					}
				}
				for (var i in self.src.events) {
					var v = $this.attr(i)
					if (v) {
						attr[i] = v.toString();
					}
				}
				var colspan = $this.attr('colspan')||1;
				var rowspan = $this.attr('rowspan')||1;
				if (colspan>1) {
					attr.colspan = colspan;
				}
				if (rowspan>1) {
					attr.rowspan = rowspan;
				}
				
				$this.replaceWith($('<'+t+' />').html($this.html()).attr(attr).css(css) );
				
			} else {
				$this.css(css);
			}
		});

		this.rte.ui.update();
	}
	
	this.update = function() {
		if (this.rte.dom.parent(this.rte.selection.getNode(), /^TABLE$/)) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
	
}

