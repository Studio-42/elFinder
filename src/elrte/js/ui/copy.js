/**
 * @class кнопки "копировать/вырезать/вставить" 
 * в firefox показывает предложение нажать Ctl+c, в остальных - копирует
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
(function($) {
elRTE.prototype.ui.prototype.buttons.copy = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	
	this.command = function() {
		
		if (this.rte.browser.mozilla) {
			try {
				this.rte.doc.execCommand(this.name, false, null);
			} catch (e) {
				var s = ' Ctl + C';
				if (this.name == 'cut') {
					s = ' Ctl + X';
				} else if (this.name == 'paste') {
					s = ' Ctl + V';
				}
				var opts = {
					dialog : {
						title   : this.rte.i18n('Warning'),
						buttons : { Ok : function() { $(this).dialog('close'); } }
					}
				}

				var d = new elDialogForm(opts);
				d.append(this.rte.i18n('This operation is disabled in your browser on security reason. Use shortcut instead.')+': '+s).open();
			}
		} else {
			this.constructor.prototype.command.call(this);
		}
	}
}

elRTE.prototype.ui.prototype.buttons.cut   = elRTE.prototype.ui.prototype.buttons.copy;
elRTE.prototype.ui.prototype.buttons.paste = elRTE.prototype.ui.prototype.buttons.copy;

})(jQuery);