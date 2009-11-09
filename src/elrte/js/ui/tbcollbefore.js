/**
 * @class button - Insert new column in table(before or after current)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.tbcolbefore = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	
	this.command = function() {
		var cells = this.rte.dom.tableColumn(this.rte.selection.getNode(), false, true);
		if (cells.length) {
			$.each(cells, function() {
				var $this = $(this);
				var cp = parseInt($this.attr('colspan')||1)
				if (cp >1) {
					$this.attr('colspan', cp+1);
				} else {
					var c = $this.clone().html('&nbsp;').removeAttr('colspan').removeAttr('width').removeAttr('id');
					if (self.name == 'tbcolbefore') {
						c.insertBefore(this);
					} else {
						c.insertAfter(this);
					}
				}
			});
			this.rte.ui.update();
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

elRTE.prototype.ui.prototype.buttons.tbcolafter = elRTE.prototype.ui.prototype.buttons.tbcolbefore;

