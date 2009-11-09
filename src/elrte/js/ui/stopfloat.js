/**
 * @class button - stops elements floating. Insert div with style="clear:all"
 * Если выделение схлопнуто и находится внутри div'a с аттрибутом или css clear - он удаляется
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.stopfloat = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);

	this.find = function() {
		if (this.rte.selection.collapsed()) {
			var n = this.rte.dom.selfOrParent(this.rte.selection.getEnd(), /^DIV$/);
			if (n && (this.rte.dom.attr(n, 'clear') || $(n).css('clear') != 'none')) {
				return n;
			}
		}
	}
	
	this.command = function() {
		var n;
		if ((n = this.find())) {
			var n = $(n);
			if (!n.children().length && !$.trim(n.text()).length) {
				n.remove();
			} else {
				n.removeAttr('clear').css('clear', '');
			}
		} else {
			this.rte.selection.insertNode($(this.rte.dom.create('div')).css('clear', 'both').get(0), true);
		}
		this.rte.ui.update(true);
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
		if (this.find()) {
			this.domElem.addClass('active');
		} else {
			this.domElem.removeClass('active');
		}
	}
}

