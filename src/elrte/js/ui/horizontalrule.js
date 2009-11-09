/**
 * @class button - horizontal rule (open dialog window)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.horizontalrule = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.src = {
		width   : $('<input type="text" />').attr({'name' : 'width', 'size' : 4}).css('text-align', 'right'),
		wunit   : $('<select />').attr('name', 'wunit')
					.append($('<option />').val('%').text('%'))
					.append($('<option />').val('px').text('px'))
					.val('%'),
		height  : $('<input type="text" />').attr({'name' : 'height', 'size' : 4}).css('text-align', 'right'),
		bg      : $('<div />'),
		border  : $('<div />'),
		'class' : $('<input type="text" />').css('width', '100%'),
		style   : $('<input type="text" />').css('width', '100%')
	}
	
	this.command = function() {
		this.src.bg.elColorPicker({palettePosition : 'outer', 'class' : 'el-colorpicker ui-icon ui-icon-pencil'});
		
		var n   = this.rte.selection.getEnd();
		this.hr = n.nodeName == 'HR' ? $(n) : $(rte.doc.createElement('hr')).css({width : '100%', height : '1px'});
		this.src.border.elBorderSelect({styleHeight : 73, value : this.hr});
		
		var _w  = this.hr.css('width') || this.hr.attr('width');
		this.src.width.val(parseInt(_w) || 100);
		this.src.wunit.val(_w.indexOf('px') != -1 ? 'px' : '%');
		
		this.src.height.val( this.rte.utils.toPixels(this.hr.css('height') || this.hr.attr('height')) || 1) ;
		this.src.bg.val(this.rte.utils.rgb2hex(this.hr.css('background-color')) || '');
		this.src['class'].val(this.rte.dom.attr(this.hr, 'class'));
		this.src.style.val(this.rte.dom.attr(this.hr, 'style'));
		
		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); self.set(); d.close(); },
			dialog : {
				title : this.rte.i18n('Horizontal rule')
			}
		}

		var d = new elDialogForm(opts);
		d.append([this.rte.i18n('Width'),          $('<span />').append(this.src.width).append(this.src.wunit) ], null, true)
			.append([this.rte.i18n('Height'),      $('<span />').append(this.src.height).append(' px')], null, true)
			.append([this.rte.i18n('Border'),      this.src.border], null, true)
			.append([this.rte.i18n('Background'),  this.src.bg], null, true)
			.append([this.rte.i18n('Css class'),   this.src['class']], null, true)
			.append([this.rte.i18n('Css style'),   this.src.style], null, true)
			.open();
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
		if (this.rte.selection.getEnd().nodeName == 'HR') {
			this.domElem.addClass('active');
		} else {
			this.domElem.removeClass('active');
		}
	}
	
	this.set = function() {
		!this.hr.parentNode && this.rte.selection.insertNode(this.hr.get(0));
		var attr = {
			noshade : true,
			style   : this.src.style.val()
		}
		var b = this.src.border.val();
		var css = {
			width  : (parseInt(this.src.width.val()) || 100)+this.src.wunit.val(),
			height : parseInt(this.src.height.val()) || 1,
			'background-color' : this.src.bg.val(),
			border : b.width && b.style ? b.width+' '+b.style+' '+b.color : ''
		}

		this.hr.removeAttr('class')
			.removeAttr('style')
			.removeAttr('width')
			.removeAttr('height')
			.removeAttr('align')
			.attr(attr)
			.css(css);
		
		if (this.src['class'].val()) {
			this.hr.attr('class', this.src['class'].val());	
		}
	}
	
}

