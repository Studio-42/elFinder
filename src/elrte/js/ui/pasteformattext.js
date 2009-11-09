/**
 * @class button - insert formatted text (open dialog window)
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.pasteformattext = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	this.iframe = $(document.createElement('iframe')).addClass('el-rte-paste-input')
	this.doc    = null;
	var self    = this;
	
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
				title : this.rte.i18n('Paste formatted text')
			}
		}
		var d = new elDialogForm(opts);
		d.append(this.iframe).open();
		this.doc = this.iframe.get(0).contentWindow.document;
		html = this.rte.options.doctype
			+'<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';
		if (this.rte.options.cssfiles.length) {
			$.each(this.rte.options.cssfiles, function() {
				html += '<link rel="stylesheet" type="text/css" href="'+this+'" />';
			});
		}
		html += '</head><body>  </body></html>';	
		
		this.doc.open();
		this.doc.write(html);
		this.doc.close();
		if (!this.rte.browser.msie) {
			try { this.doc.designMode = "on"; } 
			catch(e) { }
		} else {
			this.doc.body.contentEditable = true;
		}
		this.iframe.get(0).contentWindow.focus();

	}
	
	this.paste = function() {
		var html = $.trim($(this.doc.body).html());
		if (html) {
			this.rte.browser.msie && this.rte.selection.restoreIERange();
			this.rte.selection.insertHtml(this.rte.filter(html), true);
			this.rte.ui.update(true);
		}
	}

	this.update = function() {
		this.domElem.removeClass('disabled');
	}
}

