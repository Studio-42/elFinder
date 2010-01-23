/**
 * @class button - save editor content (submit form)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
(function($) {
elRTE.prototype.ui.prototype.buttons.save = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	this.active = true;
	
	this.command = function() {
		this.rte.save();
	}
	
	this.update = function() { }
}
})(jQuery);
