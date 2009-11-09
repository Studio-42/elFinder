/**
 * @class Увеличение отступа
 * списки - если выделен один элемент - увеличивается вложенность списка, в остальных случаях - padding у родительского ul|ol
 * Если таблица выделена полностью - ей добавляется margin, если частично - увеличивается padding для ячеек
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.indent = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.command = function() {
		var nodes = this.rte.selection.selected({collapsed : true, blocks : true, wrap : 'inline', tag : 'p'});

		function indent(n) {
			var css = /(IMG|HR|TABLE|EMBED|OBJECT)/.test(n.nodeName) ? 'margin-left' : 'padding-left';
			var val = self.rte.dom.attr(n, 'style').indexOf(css) != -1 ? parseInt($(n).css(css))||0 : 0;
			$(n).css(css, val+40+'px');
		}
		
		for (var i=0; i < nodes.length; i++) {
			if (/^(TABLE|THEAD|TFOOT|TBODY|COL|COLGROUP|TR)$/.test(nodes[i].nodeName)) {
				$(nodes[i]).find('td,th').each(function() {
					indent(this);
				});
			} else if (/^LI$/.test(nodes[i].nodeName)) {
				var n = $(nodes[i]);
				$(this.rte.dom.create(nodes[i].parentNode.nodeName))
					.append($(this.rte.dom.create('li')).html(n.html()||'')).appendTo(n.html('&nbsp;'));
			} else {
				indent(nodes[i]);
			}
		};
		this.rte.ui.update();
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
	}

}

