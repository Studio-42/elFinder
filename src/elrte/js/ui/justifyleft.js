/**
 * @class button - justify text
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.justifyleft = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);

	this.command = function() {
		this.constructor.prototype.command.call(this);

		var v = this.name == 'justifyfull' ? 'justify' : this.name.replace('justify', '');
		// в опере заменяем align на style
		// if (this.rte.browser.opera || this.rte.browser.msie) {
			$(this.rte.doc.body).find('[align]').each(function() {
				$(this).removeAttr('align').css('text-align', v);
			});
		// }
		// в фф убираем пустые дивы
		if (this.rte.browser.mozilla) {
			$(this.rte.doc.body).find("div[style]").each(function() {
				var $this = $(this);
				if ($this.attr('style') == 'text-align: '+v+';' && !$this.children().length && $.trim($this.text()).length == 0) {
					$this.remove();
				}
			});
		}
	}
}

elRTE.prototype.ui.prototype.buttons.justifycenter = elRTE.prototype.ui.prototype.buttons.justifyleft;
elRTE.prototype.ui.prototype.buttons.justifyright  = elRTE.prototype.ui.prototype.buttons.justifyleft;
elRTE.prototype.ui.prototype.buttons.justifyfull   = elRTE.prototype.ui.prototype.buttons.justifyleft;

