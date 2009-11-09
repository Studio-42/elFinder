/**
 * @class кнопка "вставить только текст" 
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.pastetext = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	this.input = $('<textarea />').addClass('el-rte-paste-input');
	var self   = this;
	
	this.command = function() {
		this.rte.browser.msie && this.rte.selection.saveIERange();
		var opts = {
			submit : function(e, d) {
				e.stopPropagation();
				e.preventDefault();
				self.paste();
				d.close();
			},
			dialog : {
				width : 500,
				title : this.rte.i18n('Paste only text')
			}
		}
		var d = new elDialogForm(opts);
		d.append(this.input).open();
	}
	
	this.paste = function() {
		var txt = $.trim(this.input.val());
		if (txt) {
			this.rte.browser.msie && this.rte.selection.restoreIERange();
			this.rte.selection.insertText(txt.replace(/\r?\n/g, '<br />'), true);
			this.rte.ui.update(true);
		}
		this.input.val('');
	}

	this.update = function() {
		this.domElem.removeClass('disabled');
	}
	
}

