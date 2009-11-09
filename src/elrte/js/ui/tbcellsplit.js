/**
 * @class button - split merged cell
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки
 * @todo split not merged cell 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru 
 **/
elRTE.prototype.ui.prototype.buttons.tbcellsplit = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	
	this.command = function() {
		var n = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^(TD|TH)$/);
		if (n) {
			var colspan = parseInt(this.rte.dom.attr(n, 'colspan'));
			var rowspan = parseInt(this.rte.dom.attr(n, 'rowspan'));
			if (colspan>1 || rowspan>1) {
				var cnum = colspan-1;
				var rnum = rowspan-1;
				var tb   = this.rte.dom.parent(n, /^TABLE$/);
				var tbm  = this.rte.dom.tableMatrix(tb);
				
				// ячейки в текущем ряду
				if (cnum) {
					for (var i=0; i<cnum; i++) {
						$(this.rte.dom.create(n.nodeName)).html('&nbsp;').insertAfter(n);
					}
				}
				if (rnum) {
					var ndx  = this.rte.dom.indexesOfCell(n, tbm)
					var rndx = ndx[0];
					var cndx = ndx[1];
					// ячейки в следущих рядах
					for (var r=rndx+1; r < rndx+rnum+1; r++) {
						var cell;
						
						if (!tbm[r][cndx].nodeName) {
							if (tbm[r][cndx-1].nodeName) {
								cell = tbm[r][cndx-1];
							} else {
								for (var i=cndx-1; i>=0; i--) {
									if (tbm[r][i].nodeName) {
										cell =tbm[r][i];
										break;
									}
								}
							}
							if (cell) {
								for (var i=0; i<= cnum; i++) {
									$(this.rte.dom.create(cell.nodeName)).html('&nbsp;').insertAfter(cell);
								}
							}
						}
					};
				}
				$(n).removeAttr('colspan').removeAttr('rowspan');
				this.rte.dom.fixTable(tb);
			}
		}
		this.rte.ui.update(true);
	}
	
	this.update = function() {
		var n = this.rte.dom.selfOrParent(this.rte.selection.getNode(), /^(TD|TH)$/);
		if (n && (parseInt(this.rte.dom.attr(n, 'colspan'))>1 || parseInt(this.rte.dom.attr(n, 'rowspan'))>1)) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
}

