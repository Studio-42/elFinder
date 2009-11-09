/**
 * @class drop-down menu - font size for selected text
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.fontsize = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	var opts = {
		labelTpl : '%label',
		tpl      : '<span style="font-size:%val;line-height:1.2em">%label</span>',
		select   : function(v) { self.set(v); },
		src      : {
			''         : this.rte.i18n('Font size'),
			'xx-small' : this.rte.i18n('Small (8pt)'), 
			'x-small'  : this.rte.i18n('Small (10px)'), 
			'small'    : this.rte.i18n('Small (12pt)'), 
			'medium'   : this.rte.i18n('Normal (14pt)'),
			'large'    : this.rte.i18n('Large (18pt)'),
			'x-large'  : this.rte.i18n('Large (24pt)'),
			'xx-large' : this.rte.i18n('Large (36pt)')
		}
	}
	
	this.select = this.domElem.elSelect(opts);
	
	this.command = function() {
	}
	
	this.set = function(size) {
		var nodes = this.rte.selection.selected({filter : 'textContainsNodes'});
		$.each(nodes, function() {
			$this = /^(THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(this.nodeName) ? $(this).find('td,th') : $(this);
			$this.css('font-size', size).find("[style]").css('font-size', '');
		});
		this.rte.ui.update();
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
		var n = this.rte.selection.getNode();
		this.select.val((m = this.rte.dom.attr(n, 'style').match(/font-size:\s*([^;]+)/i)) ? m[1] : '');
	}
}

