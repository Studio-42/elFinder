/**
 * @class button - remove table row
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.tbrowrm = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	this.command = function() {
		
		var n  = this.rte.selection.getNode();
		var c  = this.rte.dom.selfOrParent(n, /^(TD|TH)$/);
		var r  = this.rte.dom.selfOrParent(c, /^TR$/);
		var tb = this.rte.dom.selfOrParent(c, /^TABLE$/);
		var mx = this.rte.dom.tableMatrix(tb);
		
		if (c && r && mx.length) {
			if (mx.length==1) {
				$(tb).remove();
				return this.rte.ui.update();
			}
			var mdf = [];
			var ro  = $(r).prevAll('tr').length;
			
			function _find(x, y) {
				while (y>0) {
					y--;
					if (mx[y] && mx[y][x] && mx[y][x].nodeName) {
						return mx[y][x];
					}
				}
			}
			
			// move cell with rowspan>1 to next row
			function _move(cell, x) {
				y = ro+1;
				var sibling= null;
				if (mx[y]) {
					for (var _x=0; _x<x; _x++) {
						if (mx[y][_x] && mx[y][_x].nodeName) {
							sibling = mx[y][_x];
						}
					};
					
					cell = cell.remove();
					if (sibling) {
						cell.insertAfter(sibling);
					} else {
						cell.prependTo($(r).next('tr').eq(0));
					}
				}
			}
			
			function _cursorPos(column) {
				for (var i = 0; i<column.length; i++) {
					if (column[i] == c) {
						return i<column.length-1 ? column[i+1] : column[i-1];
					}
				}
			}
			
			for (var i=0; i<mx[ro].length; i++) {
				var cell = null;
				var move = false;
				if (mx[ro][i] && mx[ro][i].nodeName) {
					cell = mx[ro][i];
					move = true;
				} else if (mx[ro][i] == '-' && (cell = _find(i, ro))) {
					move = false;
				}
				if (cell) {
					cell = $(cell);
					var rowspan = parseInt(cell.attr('rowspan')||1);
					if (rowspan>1) {
						cell.attr('rowspan', rowspan-1);
						move && _move(cell, i, ro);
					} 
				}
			};
			
			var _c = _cursorPos(this.rte.dom.tableColumn(c));
			if (_c) {
				this.rte.selection.selectContents(_c).collapse(true);
			}

			$(r).remove();
		}
		this.rte.ui.update();
	}
	
	this.update = function() {
		if (this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^TR$/)) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
}

