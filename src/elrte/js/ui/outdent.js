/**
 * @class button - outdent text
 * уменьшает padding/margin/самомнение ;)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 * @todo decrease lists nesting level!
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.outdent = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;

	this.command = function() {
		var v = this.find();
		if (v.node) {
			$(v.node).css(v.type, (v.val>40 ? v.val-40 : 0)+'px');
			this.rte.ui.update();
		}
	}
	
	this.find = function(n) {
		function checkNode(n) {
			var ret = {type : '', val : 0};
			var s;
			if ((s = self.rte.dom.attr(n, 'style'))) {
				ret.type = s.indexOf('padding-left') != -1
					? 'padding-left'
					: (s.indexOf('margin-left') != -1 ? 'margin-left' : '');
				ret.val = ret.type ? parseInt($(n).css(ret.type))||0 : 0;
			}
			return ret;
		}
		
		var n = this.rte.selection.getNode();
		var ret = checkNode(n);
		if (ret.val) {
			ret.node = n;
		} else {
			$.each(this.rte.dom.parents(n, '*'), function() {
				ret = checkNode(this);
				if (ret.val) {
					ret.node = this;
					return ret;
				}
			})
		}
		return ret;
	}
	
	this.update = function() {
		var v = this.find();
		if (v.node) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}

	
}

