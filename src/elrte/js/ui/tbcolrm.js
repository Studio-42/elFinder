/**
 * @class button - remove table colunm
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.tbcolrm = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	
	this.command = function() {
		var n     = this.rte.selection.getNode();
		var c     = this.rte.dom.selfOrParent(n, /^(TD|TH)$/);
		var prev  = $(c).prev('td,th').get(0);
		var next  = $(c).next('td,th').get(0);			
		var tb    = this.rte.dom.parent(n, /^TABLE$/);
		var cells = this.rte.dom.tableColumn(n, false, true);

		if (cells.length) {
			$.each(cells, function() {
				var $this = $(this);
				var cp    = parseInt($this.attr('colspan')||1);
				if ( cp>1 ) {
					$this.attr('colspan', cp-1);
				} else {
					$this.remove();
				}
			});
			this.rte.dom.fixTable(tb);
			if (prev || next) {
				this.rte.selection.selectContents(prev ? prev : next).collapse(true);
			}
			this.rte.ui.update(true);
		}
	}
	
	this.update = function() {
		if (this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^(TD|TH)$/)) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
}

