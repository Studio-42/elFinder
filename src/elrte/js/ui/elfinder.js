/**
 * @class button - open elfinder window (not needed for image or link buttons).Used in ELDORADO.CMS for easy file manipulations.
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
(function($) {
elRTE.prototype.ui.prototype.buttons.elfinder = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.command = function() {
		if (self.rte.options.fmAllow && typeof(self.rte.options.fmOpen) == 'function') {
			self.rte.options.fmOpen( function(url) { self.rte.log(url) } );
		}
	}
	
	this.update = function() {
		if (self.rte.options.fmAllow && typeof(self.rte.options.fmOpen) == 'function') {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
}

})(jQuery);