/**
 * @class color pallete for text color and background
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.forecolor = function(rte, name) {
	var self = this;
	this.constructor.prototype.constructor.call(this, rte, name);
	var opts = {
		'class' : '',
		color   : this.defaultColor,
		update  : function(c) { self.indicator.css('background-color', c); },
		change  : function(c) { self.set(c) }
	}
	
	this.defaultColor = this.rte.utils.rgb2hex( $(this.rte.doc.body).css(this.name=='forecolor' ? 'color' : 'background-color') );
	this.picker       = this.domElem.elColorPicker(opts);
	this.indicator    = $('<div />').addClass('color-indicator').prependTo(this.domElem);
	
	this.command = function() {
	}
	
	this.set = function(c) {
		if (!this.rte.selection.collapsed()) {
			var nodes = this.rte.selection.selected({collapse : false, wrap : 'text'});
			var css   = this.name == 'forecolor' ? 'color' : 'background-color';			
			$.each(nodes, function() {
				if (/^(THEAD|TBODY|TFOOT|TR)$/.test(this.nodeName)) {
					$(this).find('td,th').each(function() {
						$(this).css(css, c).find('*').css(css, '');
					})
				} else {
					$(this).css(css, c).find('*').css(css, '');
				}
			});
			this.rte.ui.update(true);
		}
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
		var n = this.rte.selection.getNode();
		if (n.nodeType != 1) {
			n = n.parentNode;
		}
		var v = $(n).css(this.name == 'forecolor' ? 'color' : 'background-color');
		this.picker.val(v && v!='transparent' ? this.rte.utils.rgb2hex(v): this.defaultColor);
	}
}

elRTE.prototype.ui.prototype.buttons.hilitecolor = elRTE.prototype.ui.prototype.buttons.forecolor;

