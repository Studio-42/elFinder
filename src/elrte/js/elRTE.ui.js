/**
 * @class elRTE User interface controller
 *
 * @param  elRTE  rte объект-редактор
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 * Copyright: Studio 42, http://www.std42.ru
 **/
elRTE.prototype.ui = function(rte) {
	var self      = this;
	this.rte      = rte;
	this._buttons = [];
	
	for (var i in this.buttons) {
		if (i != 'button') {
			this.buttons[i].prototype = this.buttons.button.prototype;
		}
	}
	
	// создаем панели и кнопки
	var toolbar = rte.options.toolbar && rte.options.toolbars[rte.options.toolbar] ? rte.options.toolbar : 'normal';
	var panels  = this.rte.options.toolbars[toolbar];
	for (var i in panels) {
		var name = panels[i];
		
		var panel = $('<ul />').addClass('panel-'.name).appendTo(this.rte.toolbar);
		if (i == 0) {
			panel.addClass('first');
		}
		for (var j in this.rte.options.panels[name]) {
			var n = this.rte.options.panels[name][j];
			var c = this.buttons[n] || this.buttons.button; 
			var b = new c(this.rte, n);
			panel.append(b.domElem);
			this._buttons.push(b);
		}
	}

	/**
	 * Переключает вид редактора между окном редактирования и исходника
	 **/
	this.rte.tabsbar.children('.tab').click(function(e) {
		if (!$(e.currentTarget).hasClass('active')) {
			self.rte.tabsbar.children('.tab').toggleClass('active');
			self.rte.workzone.children().toggle();
			if ($(e.currentTarget).hasClass('editor')) {
				self.rte.updateEditor();
			} else {
				self.rte.updateSource();
				$.each(self._buttons, function() {
					!this.active && this.domElem.addClass('disabled');
				});
				self.rte.source.focus();
			}
			
		}
	});

	this.update();
}

/**
 * Обновляет кнопки - вызывает метод update() для каждой кнопки
 *
 * @return void
 **/
elRTE.prototype.ui.prototype.update = function(cleanCache) {
	cleanCache && this.rte.selection.cleanCache();
	var n    = this.rte.selection.getNode();
	var p    = this.rte.dom.parents(n, '*');
	var path = '';
	if (p.length) {
		$.each(p.reverse(), function() {
			path += ' &raquo; '+ this.nodeName.toLowerCase();
		});
	}
	if (n.nodeType == 1 && n.nodeName != 'BODY') {
		path += ' &raquo; '+ n.nodeName.toLowerCase();
	}
	this.rte.statusbar.html(path)
	$.each(this._buttons, function() {
		this.update();
	});
	this.rte.window.focus();
}



elRTE.prototype.ui.prototype.buttons = {
	
	/**
	 * @class кнопка на toolbar редактора 
	 * реализует поведение по умолчанию и является родителей для других кнопок
	 *
	 * @param  elRTE  rte   объект-редактор
	 * @param  String name  название кнопки (команда исполняемая document.execCommand())
	 **/
	button : function(rte, name) {
		var self     = this;
		this.rte     = rte;
		this.active = false;
		this.name    = name;
		this.val     = null;
		this.domElem = $('<li />')
			.addClass(name+' rounded-3')
			.attr({name : name, title : this.rte.i18n(this.rte.options.buttons[name] || name), unselectable : 'on'})
			.hover(
				function() { $(this).addClass('hover'); },
				function() { $(this).removeClass('hover'); }
			)
			.click( function(e) {
				e.stopPropagation();
				e.preventDefault();
				if (!$(this).hasClass('disabled')) {
					self.command();
				}
			});
	}
}

/**
 * Обработчик нажатия на кнопку на тулбаре. Выполнение команды или открытие окна|меню и тд
 *
 * @return void
 **/
elRTE.prototype.ui.prototype.buttons.button.prototype.command = function() {
	try {
		this.rte.doc.execCommand(this.name, false, this.val);
	} catch(e) {
		this.rte.log('commands failed: '+this.name);
	}
	this.rte.ui.update(true);
}

/**
 * Обновляет состояние кнопки
 *
 * @return void
 **/
elRTE.prototype.ui.prototype.buttons.button.prototype.update = function() {
	try {
		if (!this.rte.doc.queryCommandEnabled(this.name)) {
			return this.domElem.addClass('disabled');
		} else {
			this.domElem.removeClass('disabled');
		}
	} catch (e) {
		return;
	}
	try {
		if (this.rte.doc.queryCommandState(this.name)) {
			this.domElem.addClass('active');
		} else {
			this.domElem.removeClass('active');
		}
	} catch (e) { }
}

