/**
 * @class button - remove link
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru 
 **/
elRTE.prototype.ui.prototype.buttons.unlink = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);

	this.command = function() {
		var n = this.rte.selection.getNode();
		var l, link;
		if ((l = this.rte.dom.selfOrParentLink(n))) {
			link = l;
		} else if ((l = this.rte.dom.childLinks(n))) {
			link = l[0];
		}
		if (link) {
			this.rte.selection.select(link);
			this.rte.doc.execCommand('unlink', false, null);
			this.rte.ui.update(true);
		}
		
	}
	
	this.update = function() {
		var n = this.rte.selection.getNode();
		if (this.rte.dom.selfOrParentLink(n) || this.rte.dom.childLinks(n).length) {
			this.domElem.removeClass('disabled').addClass('active');
		} else {
			this.domElem.removeClass('active').addClass('disabled');
		}
	}
}


