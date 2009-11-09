/**
 * @class button - table cells merge
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.tbcellsmerge = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	var self = this;
	
	function selectedCells() {
		var c1 = self.rte.dom.selfOrParent(self.rte.selection.getStart(), /^(TD|TH)$/);
		var c2 = self.rte.dom.selfOrParent(self.rte.selection.getEnd(), /^(TD|TH)$/);		
		if (c1 && c2 && c1!=c2 && $(c1).parents('table').get(0) == $(c2).parents('table').get(0)) {
			return [c1, c2];
		}
		return null;
	}
	
	this.command = function() {
		var cells = selectedCells();

		if (cells) {
			
			var _s  = this.rte.dom.indexOf($(cells[0]).parent('tr').get(0));
			var _e  = this.rte.dom.indexOf($(cells[1]).parent('tr').get(0));
			var ro  = Math.min(_s, _e); // row offset
			var rl  = Math.max(_s, _e) - ro + 1; // row length
			var _c1 = this.rte.dom.tableColumn(cells[0], true, true); 
			var _c2 = this.rte.dom.tableColumn(cells[1], true);
			var _i1 = $.inArray(cells[0], _c1.column); 
			var _i2 = $.inArray(cells[1], _c2.column);
			
			var colBegin = _c1.info.offset[_i1] < _c2.info.offset[_i2]  ? _c1 : _c2;
			var colEnd   = _c1.info.offset[_i1] >= _c2.info.offset[_i2] ? _c1 : _c2;
			var length   = 0;
			var target   = null;
			var html     = '';

			var rows = $($(cells[0]).parents('table').eq(0).find('tr').get().slice(ro, ro+rl))
				.each( function(i) {
					var _l = html.length;
					var accept = false;
					$(this).children('td,th').each(function() {
						var $this   = $(this);
						var inBegin = $.inArray(this, colBegin.column);
						var inEnd   = $.inArray(this, colEnd.column);
						
						if (inBegin!=-1 || inEnd!=-1) {
							accept = inBegin!=-1 && inEnd==-1;
							var len = parseInt($this.attr('colspan')||1)
							if (i == 0) {
								length += len;
							}
							
							if (inBegin!=-1 && i>0) {
								var delta = colBegin.info.delta[inBegin];
								if (delta>0) {
									if ($this.css('text-align') == 'left') {
										var cell = $this.clone(true);
										$this.html('&nbsp;');
									} else {
										var cell = $this.clone().html('&nbsp;');
									}
									cell.removeAttr('colspan').removeAttr('id').insertBefore(this);
									if (delta>1) {
										cell.attr('colspan', delta);
									}
								}
							}
							
							if (inEnd!=-1) {
								var delta = colEnd.info.delta[inEnd];
								if (len-delta>1) {
									var cp = len-delta-1;
									if ($this.css('text-align') == 'right') {
										var cell = $this.clone(true);
										$this.html('&nbsp;');
									} else {
										var cell = $this.clone().html('&nbsp;');
									}
									cell.removeAttr('colspan').removeAttr('id').insertAfter(this);
									if (cp>1) {
										cell.attr('colspan', cp);
									}
								}
							}
							if (!target) {
								target = $this;
							} else {
								html += $this.html();
								$this.remove();
							}
						} else if (accept) {
							if (i == 0) {
								length += parseInt($this.attr('colspan')||1);
							}
							html += $this.html();
							$this.remove();
							

						}
					})
					html += _l!=html.length ? '<br />' : '';
				});

			target.removeAttr('colspan').removeAttr('rowspan').html(target.html()+html)
			if (length>1) {
				target.attr('colspan', length);
			}
			if (rl>1) {
				target.attr('rowspan', rl);
			}
			// sometimes when merge cells with different rowspans we get "lost" cells in rows 
			// this add cells if needed
			this.rte.dom.fixTable($(cells[0]).parents('table').get(0));
		}
	}
	
	this.update = function() {
		if (selectedCells()) {
			this.domElem.removeClass('disabled');
		} else {
			this.domElem.addClass('disabled');
		}
	}
}

