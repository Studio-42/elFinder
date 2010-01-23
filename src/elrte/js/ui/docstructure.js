/**
 * @class кнопка - Включение/выключение показа структуры документа
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 * 
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
(function($) {
elRTE.prototype.ui.prototype.buttons.docstructure = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	
	this.command = function() {
		this.domElem.toggleClass('active');
		$(this.rte.doc.body).toggleClass('el-rte-structure');
	}
	this.command();
	
	this.update = function() {	
		this.domElem.removeClass('disabled');
	}
}
})(jQuery);
