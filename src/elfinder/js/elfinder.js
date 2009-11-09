(function($) {
	/*
	 * elFinder - File manager for web
	 *
	 * Usage:
	 * var opts = {
	 *	url            : 'http://site.com/elfinder/connector.php', // connector URL
	 *	dialog         : null, // open in dialog window
	 *	height         : 450,  
	 *	lang           : 'en', // language (required translations files for connector and js)
	 *	editorCallback : function(url) { do_smth_with_file_url(url) }, // callback for work with web-editors
	 *	editTextFiles  : true // allow edit text files
	 * }
	 * $('#my-id').elfinder(opts);
	 *
	 * @author:    Dmitry Levashov (dio) dio@std42.ru
	 * Copyright: Studio 42, http://www.std42.ru
	 */

	$.fn.elfinder = function(o) {
		var options = {};	
		var version = '1.01';
		/* варианты вида теkущей директории */
		var views   = ['list', 'ismall', 'ibig'];

		if (o && o.constructor == Object) {
			options = $.extend({}, $.fn.elfinder.defaults, o);
		}
				
		if (!options.url) {
			alert('Invalid configuration! Connector URL required!');
			return;
		}
				
		return this.each(function() {
			var self     = this;
			var $self    = $(this);
			var id       = $self.attr('id');
			/* дерево дир (jQuery) */
			this.tree    = null;
			/* навигация по дереву дир (jQuery) */
			this.nav     = null;
			/* панель со списком файлов в дир (jQuery) */
			this.cwd     = null;
			/* элемент для отображения кол-ва файлов в дир (jQuery) */
			this.fnum    = null;
			/* элемент для отображения размера файлов в дир (jQuery) */
			this.fsize   = null;
			/* информация о текущей директории */
			this.info    = {};
			/* История перемещений по директориям */
			this.history = [];
			/* Кнопки на тулбаре */
			this.buttons = {};
			/* Буффер для копирования файлов */
			this.buffer  = [];
			/* Объект - переводчик */
			this._i18n   = new eli18n({textdomain : 'elfinder', messages : { elfinder : $.fn.elfinder.i18Messages[options.lang] || {}} });	
			/* Куки для хранения выбраного вида директории */
			this.cookieView = 'elfinder-view-'+id;
			/* Куки, хранят инф - отображать или нет отчеты о выполненных командах */
			this.cookieReports = 'elfinder-reports-'+id;
			
			/**
			 * Возвращает перевод на текущий язык или само сообщение
			 *
			 * @param  String  msg
			 * @return String
			 **/
			this.i18n = function(msg) {
				return self._i18n.translate(msg);
			}

			/* Вид текущей директории  */
			var v = elcookie(this.cookieView);
			this.view = v && $.inArray(v, views) ? v : 'list';

			var r = elcookie(this.cookieReports);
			this.showReports = r ? (r>0?1:0) : 1;

			/* селекторы контекстного меню */
			var selectors = {
				'.dir-r' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.dir-rw' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{label : '<span class="icon icon-rename"></span>'+this.i18n("Rename"), action : function(o) { self.rename($(o))} },
					{label : '<span class="icon icon-rm"></span>'+this.i18n("Delete"),     action : function(o) { self.rm()} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{label : '<span class="icon icon-cut"></span>'+this.i18n("Cut"),       action : function(o) { self.copy(true)} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.file-r' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.file-rw' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{label : '<span class="icon icon-rename"></span>'+this.i18n("Rename"), action : function(o) { self.rename($(o))} },
					{label : '<span class="icon icon-rm"></span>'+this.i18n("Delete"),     action : function(o) { self.rm()} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{label : '<span class="icon icon-cut"></span>'+this.i18n("Cut"),       action : function(o) { self.copy(true)} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.image-r' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.image-rw' : [
					{label : '<span class="icon icon-open"></span>'+this.i18n("Open"),     action : function(o) { self._open($(o))} },
					{label : '<span class="icon icon-rename"></span>'+this.i18n("Rename"), action : function(o) { self.rename($(o))} },
					{label : '<span class="icon icon-rm"></span>'+this.i18n("Delete"),     action : function(o) { self.rm()} },
					{},
					{label : '<span class="icon icon-copy"></span>'+this.i18n("Copy"),     action : function(o) { self.copy()} },
					{label : '<span class="icon icon-cut"></span>'+this.i18n("Cut"),       action : function(o) { self.copy(true)} },
					{},
					{label : '<span class="icon icon-info"></span>'+this.i18n("Get info"), action : function(o) { self.getInfo($(o))} }
				],
				'.el-finder-cwd' : [ ]
			};

			if (options.editorCallback) {
				var s = { label : '<span class="icon icon-select"></span>'+this.i18n("Select file"),  action : function(o) { self.selectFile($(o)); } };
				selectors['.file-r'].unshift(s);
				selectors['.file-rw'].unshift(s);
				selectors['.image-r'].unshift(s);
				selectors['.image-rw'].unshift(s);
			}

			if (!this.loaded) {
				if (!this.options) {
					this.options = options;
					if (this.options.dialog) {
						$.extend(this.options.dialog, { close : function() { self.loaded = false; $self.dialog('destroy') }})
					}
				}
				
				$.ajax({
					url     : this.options.url,
					cache   : false,
					data    : {view : this.view},
					error   : function(r, t, e) { alert(t+' '+e) },
					success : function(data) { self.init(data); }
				});
			}

			if (o == 'open') {
				this.open();
			} else if (o == 'close') {
				this.close()
			}

			/**
			 * Открывает файловый менеджер
			 *
			**/
			this.open = function() {
				if (this.options.dialog) {
					$self.dialog('open');
				} else {
					$self.show();
				}
			}
			
			/**
			 * Закрывает файловый менеджер
			 *
			**/
			this.close = function() {
				if (this.options.dialog) {
					this.loaded = false;
					$self.dialog('close');
				} else {
					$self.hide();
				}
			}
			
			/**
			 * Загружает файловый менеджер
			 *
			**/
			this.init = function(html) {
				$self.empty().html(html);
				if (!$self.children('.el-finder').length) {
					return $self.empty().html(this.i18n('Invalid backend configuration'));
				}
				this.loaded = true;

				var m = $self.find('ul.el-finder-toolbar');
				this.buttons = {
					back    : m.children('.button-back'  ).click(function() { !$(this).hasClass('disabled') && self.back(); }),
					reload  : m.children('.button-reload').bind('click', self.reload),
					select  : m.children('.button-select' ).click(function() { !$(this).hasClass('disabled') && self.selectFile(self._selected(true)); }),
					open    : m.children('.button-open' ).click(function() { !$(this).hasClass('disabled')  && self._open(self._selected(true)); }),
					edit    : m.children('.button-edit' ).click(function() { !$(this).hasClass('disabled') && self.edit(self._selected(true)); }),
					rename  : m.children('.button-rename').click(function() { !$(this).hasClass('disabled') && self.info.write && self.rename(self._selected(true)); }),
					rm      : m.children('.button-rm').click(function() { !$(this).hasClass('disabled') && self.info.write && self.rm(); }),
					info    : m.children('.button-info' ).click(function() { !$(this).hasClass('disabled') && self.getInfo(self._selected(true)); }),
					mkdir   : m.children('.button-mkdir' ).click(function() { !$(this).hasClass('disabled') && self.info.write && self.mkdir(); }),
					upload  : m.children('.button-upload').click(function() { !$(this).hasClass('disabled') && self.info.write && self.upload(); }),
					copy    : m.children('.button-copy').click(function() { !$(this).hasClass('disabled') && self.copy(); }),
					cut     : m.children('.button-cut').click(function() { !$(this).hasClass('disabled') && self.copy(self.info.write); }),
					paste   : m.children('.button-paste').click(function() { !$(this).hasClass('disabled') && self.info.write && self.paste(); }),
					ibig    : m.children('.button-ibig').click(function() { !$(this).hasClass('disabled') && self.swithchView('ibig'); }),
					ismall  : m.children('.button-ismall').click(function() { !$(this).hasClass('disabled') && self.swithchView('ismall'); }),
					list    : m.children('.button-list').click(function() { !$(this).hasClass('disabled') && self.swithchView('list'); }),
					reports : m.children('.button-reports').bind('click', self.switchReports),
					help    : m.children('.button-help').bind('click', self.help)
				}
				
				if (!this.options.editorCallback) {
					this.buttons.select.hide();
				}
				if (!this.options.editTextFiles) {
					this.buttons.edit.hide();
				}
				this.fnum  = $self.find('.files-num');
				this.fsize = $self.find('.files-size');

				this.cwd = $self.find('.el-finder-cwd')
					.click(function(e) {
						if (e.target == this) {
							self.cwd.find('.selected').removeClass('selected');
							self.updateToolbar();
						}
					})
					.bind('update', function() {
						self.info = self.cwd.children().eq(0).metadata();

						/** да, live было бы лучше но когда диалог в диалоге - в сафари live не работает **/
						$(this).find('.item')
							.bind('dblclick', function(e) {
								e.stopPropagation()
								var $this = $(this);
								if (!$this.hasClass('disabled')) {
									self._open($(this));
								}
							})
							.bind('click', function(e) {
								var $this = $(this);
								var s = $this.hasClass('selected');
								if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
									self.cwd.find('.selected').removeClass('selected');
								} else if (e.shiftKey) {
									var prev = $this.prevAll('.selected').get(0);
									var next = $this.nextAll('.selected').get(0);
									var stop = false;
									if (prev) {
										$this.prevAll('.item').each(function() {
											if (this == prev) {
												stop = true;
												$(this).addClass('selected');
											} else if (!stop) {
												$(this).addClass('selected');
											} else {
												$(this).removeClass('selected');
											}
										});
										$this.nextAll('.selected').removeClass('selected');
									} else if (next) {
										$this.nextAll('.item').each(function() {
											if (this == next) {
												stop = true;
												$(this).addClass('selected');
											} else if (!stop) {
												$(this).addClass('selected');
											} else {
												$(this).removeClass('selected');
											}
										});
										$this.prevAll('.selected').removeClass('selected');
									}
								}
								if (!s) {
									$this.addClass('selected');
								} else {
									$this.removeClass('selected');
								}
								self.updateToolbar();
							});

						if (!self.info.write) {
							selectors['.el-finder-cwd'] = [{label : '<span class="icon icon-reload"></span>'+self.i18n("Reload"), action : function(o) { self.reload(); } }];
						} else {
							selectors['.el-finder-cwd'] = [
								{label : '<span class="icon icon-reload"></span>'+self.i18n("Reload"),          action : function(o) { self.reload(); } },
								{},
								{label : '<span class="icon icon-paste"></span>'+self.i18n("Paste"),            action : function(o) { self.paste(); } },
								{},
								{label : '<span class="icon icon-mkdir"></span>'+self.i18n("Create directory"), action : function(o) { self.mkdir(); } },
								{label : '<span class="icon icon-upload"></span>'+self.i18n("Upload files"),    action : function(o) { self.upload(); } }
							]
						}
						
						$.elcontextmenu(selectors, self, function(e) { 
							if (window.opera && !e.ctrlKey) { 
								return;  
							}
							if (!$(e.currentTarget).hasClass('el-finder-cwd')) {
								$(e.currentTarget).addClass('selected');
							}
						});
						
						self.updateToolbar();
						self._unlock();
						self.fnum.text(self.info.filesNum);
						self.fsize.text(self.info.filesSize);
						
					});
				
				this.nav = $self.find('.el-finder-nav')
					.bind('update', function() {
						self.tree = $self.find('.el-dir-tree').eldirtree({callback : self.cd });
						self.tree.find('[key="'+self.info.key+'"]').trigger('cd');
						self._unlock();
					});
			
				if (this.options.height) {
					this.cwd.css('height', this.options.height+'px');
					this.nav.css('height', this.options.height+'px');
				}
				this.cwd.trigger('update');
				this.nav.trigger('update');
				
				if(this.options.dialog) {
					$self.dialog(this.options.dialog).parent().find('.ui-dialog-content').css('padding', '0');
				} 
				
				$(document).bind('keydown', function(e) {
					if (e.keyCode == 46 || (e.metaKey && e.keyCode == 8)) {
						self.rm();
					} else if (e.ctrlKey||e.metaKey) {
						if (e.keyCode == 67) {
							self.copy()
						} else if (e.keyCode == 88) {
							self.copy(true)
						} else if (e.keyCode == 86) {
							self.paste();
						}
					}
				});
			}
		
			/**
			 * Обновляет кнопки на тулбаре
			 *
			**/
			this.updateToolbar = function() {
				if (self.history.length) {
					self.buttons.back.removeClass('disabled');
				} else {
					self.buttons.back.addClass('disabled');
				}
				var s = this._selected();
				if (this.options.editorCallback) {
					if (s && s.length==1 && !s.eq(0).hasClass('dir-r') && !s.eq(0).hasClass('dir-rw')) {
						self.buttons.select.removeClass('disabled');
					} else {
						self.buttons.select.addClass('disabled');
					}
				}
				
				if (this.options.editTextFiles ) {
					if (s && s.length==1 && s.eq(0).attr('class').match(/text/)) {
						self.buttons.edit.removeClass('disabled');
					} else {
						self.buttons.edit.addClass('disabled');
					}
				} 
				
				if (s) {
					self.buttons.open.removeClass('disabled');
					self.buttons.info.removeClass('disabled');
					self.buttons.copy.removeClass('disabled');
					if (self.info.write) {
						self.buttons.rename.removeClass('disabled');
						self.buttons.rm.removeClass('disabled');
						self.buttons.cut.removeClass('disabled');
					}
				} else {
					self.buttons.open.addClass('disabled');
					self.buttons.info.addClass('disabled');
					self.buttons.rename.addClass('disabled');
					self.buttons.copy.addClass('disabled');
					self.buttons.rm.addClass('disabled');
					self.buttons.cut.addClass('disabled');
				}
				
				if (self.buffer.length) {
					self.buttons.paste.removeClass('disabled');
				} else {
					self.buttons.paste.addClass('disabled');
				}
				
				if (self.info.write) {
					self.buttons.mkdir.removeClass('disabled');
					self.buttons.upload.removeClass('disabled');
					
				} else {
					self.buttons.rename.addClass('disabled');
					self.buttons.mkdir.addClass('disabled');
					self.buttons.upload.addClass('disabled');
					self.buttons.paste.addClass('disabled');
				}
				
				for (var i=0; i < views.length; i++) {
					var view = views[i];
					if (view == self.view) {
						self.buttons[view].addClass('disabled');
					} else {
						self.buttons[view].removeClass('disabled');
					}
				};
				if (self.showReports>0) {
					self.buttons.reports.removeClass('disabled');
				} else {
					self.buttons.reports.addClass('disabled');
				}
			}

			/**
			 * Переход в директорию или открытие файла
			 *
			 * @param  DOMElement o
			**/
			this._open = function(o) {
				if (o) {
					if (o.hasClass('dir-r') || o.hasClass('dir-rw')) {
						this.cd(o);
					} else {
						window.open(options.url+'?cmd=open&current='+this.info.key+'&target='+o.attr('key'), null, 'top=50,left=50,scrollbars=yes,resizable=yes');
					}
				}
			}

			/**
			 * Переход в директорию
			 *
			 * @param  DOMElement||number o
			**/
			this.cd = function(o) {
				self._lock();
				self.history.push(self.info.key);
				var t = typeof(o) == 'object' ? o.attr('key') : o;
				$.ajax({
					url     : options.url,
					cache   : false,
					data    : {cmd : 'cd', target : t, view : self.view},
					error   : function(r, t, e) { self._showError(t+' '+e); self._unlock(); },
					success : function(cwd) {
						self.cwd.empty().html(cwd).trigger('update');
						self.nav.trigger('update');
					}
				});
			}
			
			/**
			 * Обновление текущей директории
			 *
			**/
			this.reload = function() {
				self.cd(self.info.key);
				$.ajax({
					url     : options.url,
					data    : {cmd : 'tree', target : self.info.key},
					error   : function(r, t, e) { self._showError(t+' '+e); self._unlock(); },
					success : function(tree) { self.nav.html(tree).trigger('update'); }
				});
			}
			
			/**
			 * History go back
			 *
			**/
			this.back = function() {
				if (!this.buttons.back.hasClass('disabled') && this.history.length) {
					this.cd(this.history.pop());
					this.history.pop();
				}
			}
			
			/**
			 * Select file for editor (elRTE)
			 * Call options.editorCallback(fileURL)
			 *
			**/
			this.selectFile = function(o) {
				if (options.editorCallback) {
					$.ajax({
						url      : options.url,
						dataType : 'json',
						data     : {cmd : 'url', current : self.info.key, target : $(o).attr('key')},
						error    : function(r, t, e) { self._showError(t+' '+e) },
						success  : function(data) { 
							options.editorCallback(data.url); 
							if (self.options.dialog) {
								self.close(); 
							}
						}
					});
				}
			}
			
			/**
			 * Информация о файле/директории
			 *
			 * @param  DOMElement o
			**/
			this.getInfo = function(o) {
				if (o) {
					self._lock();
					$.ajax({
						url     : options.url,
						data    : {cmd : 'info', current : self.info.key, target : o.attr('key')},
						error   : function(r, t, e) { self._showError(t+' '+e); self._unlock(); },
						success : function(data) { 
							var d = new elDialogForm({
								dialog : {
									title : self.i18n('File info'),
									buttons : {	Ok : function() { d.close(); } }
								}
							});
							d.append(data).open();
							self._unlock(); 
						}
					});
				}
			}
			
			/**
			 * Copy/cut files/dirs
			 *
			**/
			this.copy = function(cut) {
				this.buffer = [];
				var s = this._selected();
				if (s) {
					this.buffer = [this.info.key, [], !!(this.info.write && cut)];
					$.each(s, function() {
						self.buffer[1].push($(this).attr('key'));
					});
				}
				this.updateToolbar();
			}
			
			/**
			 * Paste files/dirs
			 *
			**/
			this.paste = function() {
				if (this.buffer.length) {
					self._lock();
					$.ajax({
						url      : options.url,
						dataType : 'json',
						data     : {
							cmd       : 'copy', 
							current   : self.info.key, 
							source    : self.buffer[0],
							'files[]' : self.buffer[1],
							move      : self.buffer[2]
							},
						error   : function(r, t, e) { self._showError(t+' '+e); self._unlock(); },
						success : function(data) {  
							self._unlock();
							if (data.error) {
								self._showError(data.error);
								self.buffer = [];
								self.updateToolbar();
							} else if (self.showReports) {
								self._showMessage(data.message);
							} else {
								self.reload();
							}
						}
					});
				}
			}
			
			/**
			 * Переименование файла/директории
			 *
			 * @param  DOMElement o
			**/
			this.rename = function(o) {
				if (o) {
					var b    = o.find('.basename').eq(0); 
					var name = b.text();
					var real = b.attr('title');

					var input = $('<input type="text" />').val(real)
						.keyup(function(e) {
							if (e.keyCode == 27) {
								restore();
							} else if (e.keyCode == 13) {
								rename();
							}
						})
						.bind('change blur', function() { rename(); })
						.click(function(e) { e.stopPropagation(); });

					b.empty().append(input);
					input.select();
					if (!$.browser.safari) {
						input.focus();
					}
				}
				
				function restore() {
					b.empty().text(name);
				}
				
				function rename() {
					var newname = $.trim(input.val());
					if (!self._checkName(newname)) {
						b.empty().text(name);
						return self._showError(self.i18n('Invalid name'), null, true);
					} else if (newname == real) {
						return restore();
					}
					
					b.empty().text(newname);
					
					$.ajax({
						url      : options.url,
						dataType : 'json',
						data     : {cmd : 'rename', current : self.info.key, target : o.attr('key'), newname : newname},
						error    : function(r, t, e) { self._showError(t||e); },
						success  : function(data) { 
							if (data.error) {
								self._showError(data.error);
							} else if (self.showReports) {
								self._showMessage(data.message);
							} else {
								self.reload();
							}
						}
					});
				}
			}
			
			/**
			 * Edit text file
			 *
			 * @param  DOMElement o
			**/
			this.edit = function(o) {
				var name = o.find('.basename').eq(0).attr('title')
				function edit(data) {
					var d = new elDialogForm({
						submit   : function() {  },
						form     : { action : options.url },
						dialog   : { title : name, width : 800 },
						ajaxForm : {
							dataType : 'json',
							beforeSubmit : function() { d.showSpinner(self.i18n('Sending data'), true); return true},
							error    : function(r, t, e) { self._showError(t||e, d); self._unlock(); },
							success : function(data) {  
								self._unlock();
								if (data.error) {
									self._showError(data.error, d);
									self.buffer = [];
									self.updateToolbar();
								} else if (self.showReports) {
									self._showMessage(data.message, d);
								} else {
									self.reload();
									d.close();
								}
							}
						}
					});

					d.append($('<input type="hidden" />').attr('name', 'cmd').val('edit'))
						.append($('<input type="hidden" />').attr('name', 'current').val(self.info.key))
						.append($('<input type="hidden" />').attr('name', 'target').val(o.attr('key')))
						.append($('<input type="hidden" />').attr('name', 'cmd').val('edit'))
						.append($('<textarea />').attr({name : 'content', rows : 20}).css('width', '99%').val(data))
						.open();
				}
				
				$.ajax({
					url     : self.options.url,
					data    : {cmd : 'open', current : self.info.key, target : o.attr('key')},
					error   : function(r, t, e) { self._showError(t+' '+e); self._unlock(); },
					success : function(data) {  edit(data); }
				});
				
				
				
				
			}
			
			/**
			 * Удаление файлов/директорий
			 *
			 * @param  DOMElement o
			**/
			this.rm = function() {
				var o = this._selected();
				if (o) {
					var d = new elDialogForm({
						submit : function(e) { e.preventDefault(); rm(); },
						dialog : { title : self.i18n('Confirmation required') }
					});
					d.showError(self.i18n('Are you shure you want to remove files?<br /> This cannot be undone!')).open();
				} 
				
				function rm() {
					d.showSpinner(self.i18n('Sending data'));

					var t = [];
					o.each(function() { t.push($(this).attr('key')) });

					$.ajax({
						url      : options.url,
						dataType : 'json',
						data     : {cmd : 'rm', current : self.info.key, 'target[]' : t},
						error    : function(r, t, e) { self._showError(t||e, d); },
						success  : function(data) { 
								if (data.error) {
									self._showError(data.error, d);
								} else if (self.showReports) {
									self._showMessage(data.message, d);
								} else {
									self.reload();
									d.close();
								}
							}
					});
				}
			}
			
			/**
			 * Новая директория
			 *
			**/
			this.mkdir = function() {
				var n = $('<input type="text" />');
				var d = new elDialogForm({
					submit : function(e) { e.preventDefault(); mkdir(); },
					dialog : { title : self.i18n('Create directory') }
				});
				
				d.append([self.i18n('Directory name'), n], false, true).open();
				
				function mkdir() {
					var name = $.trim(n.val());
					if (!name) {
						d.close();
					} else if (!self._checkName(name)) {
						d.showError(self.i18n('Invalid directory name'))
							.option('buttons', {
								Cancel : function() { d.close(); },
								Ok     : function() { d.form.trigger('submit'); }
							});
					} else {
						d.showSpinner(self.i18n('Sending data'), true);
						$.ajax({
							url      : options.url,
							dataType : 'json',
							data     : {cmd : 'mkdir', current : self.info.key, dirname : name},
							error    : function(r, t, e) { self._showError(t||e, d); },
							success  : function(data) { 
								if (data.error) {
									d.showError(data.error)
										.option('buttons', {
											Cancel : function() { d.close(); },
											Ok     : function() { d.form.trigger('submit'); }
										});
								} else if (self.showReports) {
									self._showMessage(data.message, d);
								} else {
									self.reload();
									d.close();
								}
							}
						});
					}
				}
			}
		
			/**
			 * Загрузка файлов
			 *
			**/
			this.upload = function() {

				var d = new elDialogForm({
					submit   : function() {  },
					form     : { action : options.url, enctype : 'multipart/form-data'},
					dialog   : { title : self.i18n('Upload files') },
					ajaxForm : {
						beforeSubmit : function(formData, jqForm, options) {
							var submit = false
							$('input[name="fm-file\[\]"]', jqForm).each( function() { 
								if ($(this).val().length){ 
									submit = true;
								} 
							});
							if (!submit) {
								d.showError(self.i18n('Select at least one file to upload'));
							} else {
								d.showSpinner(self.i18n('Sending data'), true);
							}
							return submit;
						},
						dataType : 'json',
						error    : function(r, t, e) { self._showError(t||e, d) },
						success  : function(data) {
							if (data.error) {
								self._showError(data.error+'<br />'+data.failed.join('<br />'), d);
							} else if (self.showReports || data.failed.length) {
								var err = !data.failed.length 
									? ''
									: '<div class="el-dialogform-error">'+self.i18n('Following files was not uploaded:<br />')+data.failed.join('<br />')+'</div>';
								d.showMessage(data.message + err, true).option('buttons', { Ok : function() { self.reload(); d.close(); } });
							} else {
								self.reload();
								d.close();
							}
						}
					}
				});
				
				var i = $('<input type="file" name="fm-file[]" />');
				var b = $('<span />').css('cursor', 'default')
					.append($('<span />').addClass('ui-icon ui-icon-circle-plus').css({'float' : 'left', 'margin-right' : '.3em'}))
					.append(self.i18n('Add field'))
					.click(function() {
						d.append(i.clone(), false, true);
					});
					
				if (self.info.allowed) {
					d.append(self.i18n('You can upload only files with following types: ')+self.info.allowed).separator();
				}		
				d.append(self.i18n('Maximum allowed files size is ')+self.info.postMaxSize)
					.separator()
					.append($('<input type="hidden" />').attr('name', 'current').val(self.info.key))
					.append($('<input type="hidden" />').attr('name', 'cmd').val('upload'))
					.append(i.clone(), false, true)
					.append(i.clone(), false, true)
					.append(i.clone(), false, true)
					.separator()
					.append(b)
					.open();

				
				function send() {
					d.showSpinner(self.i18n('Sending data'), true);
				}
			}
		
			/**
			 * Переключение внешнего вида
			 *
			 * @param  String v
			**/
			this.swithchView = function(v) {
				self.view = v;
				elcookie(self.cookieView, v, {expires: 1, path : '/'});
				self.reload();
			}
			
			/**
			 * Включение/выключение показа отчетов о успешных действиях
			 *
			**/
			this.switchReports = function() {
				self.showReports = self.showReports ? 0 : 1;
				elcookie(self.cookieReports, self.showReports, {expires: 1, path : '/'});
				self.buttons.reports.toggleClass('disabled');
			}
			
			/**
			 * Display help window
			 *
			**/
			this.help = function() {
				var d = new elDialogForm({
					dialog : {
						width : 500,
						title : self.i18n('Help'),
						buttons : { Ok : function() { d.close(); } }
					}
				});
				var h = '<b>'+self.i18n('elFinder: Web file manager')+'.<br /> '+self.i18n('Version')+': '+version+'</b><br />';
				if (options.lang=='en') {
					h += 'elFinder works similar to file manager on your computer. <br /> To make actions on files/folders use icons on top panel. If icon action it is not clear for you, hold mouse cursor over it to see the hint. <br /> Manipulations with existing files/folders can be done through the context menu (mouse right-click). <br /> To copy/delete a group of files/folders, select them using Shift/Alt(Command) + mouse left-click.';
				} else {
					h += '<br />'+self.i18n('helpText');
				}
				
				var a = self.i18n('Copyright: Studio 42 LTD')+', 2009<br />'
						+self.i18n('Programming: Dmitry (dio) Levashov, dio@std42.ru')+'<br />'
						+self.i18n('Techsupport, make file and testing: Troex Nevelin, troex@fury.scancode.ru')+'<br />'
						+self.i18n('Design: Valentin Razumnih')+'<br />'
						+self.i18n('License: BSD License')+'<br /><a href="http://www.elrte.ru">www.elrte.ru</a><br />dev@std42.ru'
				d.tab('help', self.i18n('Help')).tab('authors', self.i18n('Authors'))
					.append(h, 'help')
					.append(a, 'authors')
					.open();
					
			}
			
			/*******************************************/
			//     вспомогательные методы
			/*******************************************/
			
			this._selected = function(first) {
				var s = self.cwd.find('.selected');
				if (s.length) {
					return first ? s.eq(0) : s;
				}
				return null;
			}
			
			this._lock = function() {
				self.nav.addClass('disabled');
				self.cwd.addClass('disabled');
			}

			this._unlock = function() {
				self.nav.removeClass('disabled');
				self.cwd.removeClass('disabled');
			}

			this._showMessage = function(msg, d) {
				if (!d) {
					d = new elDialogForm({ dialog : { title : self.i18n('Message') } });
				}
				d.showMessage(msg, true).open().option('buttons', { Ok : function() { self.reload(); d.close(); } });
			}
			
			this._showError = function(msg, d, noReload) {
				if (!d) {
					d = new elDialogForm({ dialog : { title : self.i18n('Error') } });
				}
				d.showError(msg, true).open().option('buttons', { Ok : function() { self.reload(); d.close(); } });
			}
			
			/**
			 * Проверяет имя на допустимые символы
			 *
			**/
			this._checkName = function(name) {
				return name.search('^[^\/@\!%"\']+$') != -1;
			}
		});
		
		function log(msg) {
			window.console && window.console.log && window.console.log(msg);
		}
		return this;
	}	
	
	
	$.fn.elfinder.defaults = {
		url            : '',
		dialog         : null,
		height         : 450,
		lang           : 'en',
		editorCallback : null,
		editTextFiles  : true
	};
	
	$.fn.elfinder.i18Messages = {};
	
})(jQuery);