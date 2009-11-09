/**
 * @class кнопка - Закладка (открывает диалоговое окно)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.anchor = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	this.input = $('<input type="text" />').attr('name', 'anchor').attr('size', '16')
	var self = this;
	
	this.command = function() {
		var opts = {
			submit : function(e, d) { e.stopPropagation(); e.preventDefault(); d.close(); self.set();  },
			dialog : {
				title : this.rte.i18n('Bookmark')
			}
		}

		this.anchor = this.rte.dom.selfOrParentAnchor(this.rte.selection.getEnd()) || rte.dom.create('a');
		!this.rte.selection.collapsed() && this.rte.selection.collapse(false);
		this.input.val($(this.anchor).addClass('el-rte-anchor').attr('name'));
		this.rte.selection.saveIERange();
		var d = new elDialogForm(opts);
		d.append([this.rte.i18n('Bookmark name'), this.input], null, true).open();
	}
	
	this.update = function() {
		var n = this.rte.selection.getNode();
		if (this.rte.dom.selfOrParentLink(n)) {
			this.domElem.addClass('disabled');
		} else if (this.rte.dom.selfOrParentAnchor(n)) {
			this.domElem.removeClass('disabled').addClass('active');
		} else {
			this.domElem.removeClass('disabled').removeClass('active');
		}
	}
	
	this.set = function() {
		var n = $.trim(this.input.val());
		this.rte.selection.restoreIERange();
		this.rte.log(this.anchor.parentNode)
		if (n) {
			if (!this.anchor.parentNode) {
				this.rte.selection.insertHtml('<a name="'+n+'" title="'+this.rte.i18n('Bookmark')+': '+n+'" class="el-rte-anchor"></a>');
			} else {
				this.anchor.name = n;
				this.anchor.title = this.rte.i18n('Bookmark')+': '+n;
			}
		} else if (this.anchor.parentNode) {
			this.anchor.parentNode.removeChild(this.anchor);
		}
	}
}

