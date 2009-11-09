/**
 * @class button - switch to fullscreen mode and back
 *
 * @param  elRTE  rte   объект-редактор
 * @param  String name  название кнопки 
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * @copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui.prototype.buttons.fullscreen = function(rte, name) {
	this.constructor.prototype.constructor.call(this, rte, name);
	this.active  = true;
	this.parents = [];
	this.height  = 0;
	var self     = this;
	
	this.command = function() {
		
		if (this.rte.editor.hasClass('el-fullscreen')) {
			for (var i=0; i < this.parents.length; i++) {
				$(this.parents[i]).css('position', 'relative');
			};
			this.parents = [];
			this.rte.editor.removeClass('el-fullscreen');
			this.rte.workzone.height(this.height);
			this.domElem.removeClass('active');
		} else {
			this.parents = [];
			var p = this.rte.editor.parents().each(function() {
				
				if (this.nodeName != 'BODY' && this.name != 'HTML' && $(this).css('position') == 'relative') {
					self.parents.push(this);
					$(this).css('position', 'static');
				}
			});
			this.height = this.rte.workzone.height();
			this.rte.editor.addClass('el-fullscreen');
			var h = parseInt(this.rte.editor.height() - this.rte.toolbar.height() - this.rte.statusbar.height() - this.rte.tabsbar.height() - 17);
			h>0 && this.rte.workzone.height(h);
			this.domElem.addClass('active');
		}
	}
	
	this.update = function() {
		this.domElem.removeClass('disabled');
	}
}

