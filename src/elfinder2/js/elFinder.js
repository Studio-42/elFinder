(function($) {
	/**
     * jQuery plugin. File manager
	 * @requires jquery-ui
	 * @return jQuery
     */
	$.fn.elfinder = function(o) { 
		/**
		 * File manager configuration
		 */
		var options = $.extend(true, $.fn.elfinder.defaults, typeof(o) == 'object' ? o : {}),
	    
		/**
		 * L10n messages
		 */
		msgs = $.fn.elfinder.i18Messages;
		
		// log(msgs)
		
		function cookie(name, value, opts) {
			if (typeof value == 'undefined') {
				if (document.cookie && document.cookie != '') {
					var cookies = document.cookie.split(';');
					var test = name+'=';
					for (var i=0; i<cookies.length; i++) {
						var c = $.trim(cookies[i]);
						if (c.substring(0, name.length+1) == test) {
							return decodeURIComponent(c.substring(name.length+1));
						}
					}
				}
				return '';
			} else {
				opts = $.extend({expires : '', path : '', domain : '', secure : false}, opts);
				if (value===null) {
					value = '';
					opts.expires = -1;
				}
				var expires = '';
				if (opts.expires) {
					var d = opts.expires.toUTCString ? opts.expires : new Date();
					if (typeof opts.expires == 'number') {
						d.setTime(d.getTime() + (opts.expires * 24 * 60 * 60 * 1000));
					}
					expires = '; expires='+d.toUTCString();
				}
				document.cookie = name+'='+encodeURIComponent(value)+expires+(opts.path ? '; path='+opts.path : '')+(opts.domain ? '; domain='+opts.domain : '')+(opts.secure ? '; secure' : '');
			}
		}
		
		/**
		 * Translate message into options.lang lang, or return original message
		 * @return String
		 */
		function i18n(m) {
			// log(m)
			return msgs[options.lang] && msgs[options.lang][m] ? msgs[options.lang][m] : m;
		}
		
		
		var view = function(fm) {
			this.fm  = fm;
			var self = this;
			
			this.tb  = $('<ul />');
			this.nav = $('<div />').addClass('el-finder-nav');
			this.cwd = $('<div />').addClass('el-finder-cwd');
			this.sp  = $('<div />').addClass('el-finder-spinner rounded-5');
			this.wz  = $('<div />').addClass('el-finder-workzone')
				.append(this.nav)
				.append(this.cwd)
				.append(this.sp)
				.append('<div style="clear:both" />');
			this.st = $('<div />').addClass('stat');
			this.p  = $('<div />').addClass('path');
			this.sl = $('<div />').addClass('selected-files');
			this.sb = $('<div />').addClass('el-finder-statusbar')
				.append(this.p)
				.append(this.st)
				.append(this.sl);
			this.win = $(fm).empty().addClass('el-finder rounded-5')
				.append($('<div />').addClass('el-finder-toolbar').append(this.tb))
				.append(this.wz)
				.append(this.sb);
				
				
			/**
			 * Show/hide ajax spinner
			 */
			this.spinner = function(show) {
				if (show) {
					this.win.addClass('el-finder-disabled');
					this.sp.show();
				} else {
					this.win.removeClass('el-finder-disabled');
					this.sp.hide();
				}
			}
			
			/**
			 * Display fatal error
			 */
			this.fatal = function(t) {
				fm.unlock();
				self.error(t.status != '404' ? 'Invalid data recieved! Check backend configuration!' : 'Unable to connect to backend!');
			}
		
			this.error = function(m) {
				var e = $('<p />').addClass('el-finder-fatal rounded-5').text(i18n('Error')+': '+i18n(m)).appendTo(self.wz);
				setTimeout(function() { e.fadeOut('slow') }, 5000);
			}

			this.warning = function(m) {
				var e = $('<p />').addClass('el-finder-fatal rounded-5').text(i18n('Warning')+': '+i18n(m)).appendTo(self.wz);
				setTimeout(function() { e.fadeOut('slow') }, 3000);
			}

		
			/**
			 * Update navigation panel
			 */
			this.updateNav = function(tree) {
				this.nav.html('<ul style="margin-top:3px"><li><a href="#" id="nav'+fm.cwd.hash+'" class="root selected rounded-3">'
								+fm.cwd.name+'</a>'+traverse(tree)+'</li></ul>');

				function traverse(tree) {
					var html = '<ul>';
					for (var i in tree) {
						var p      = i.indexOf(':'), 
							hash   = i.substr(0, p), 
							name   = i.substr(p+1),
							childs = typeof(tree[i]) == 'object';

						html += '<li><div class="dir-handler'+(childs ? ' dir-collapsed' : '')+'"></div>'+
								'<a href="#" class="rounded-3" id="nav'+hash+'">'+name+'</a>'+(childs ? traverse(tree[i]) : '')+'</li>';
					}
					return html +'</ul>';
				}
			}
		
			/**
			 * Update current working directory content
			 */
			this.updateCwd = function() {
				
				
				this.cwd.empty();
				// log(fm.files);
				
				var num = 0, size =0, h = 0, container = $(fm.viewMode == 'icons' ? '<ul />' : '<table />').appendTo(this.cwd)

				if (fm.viewMode == 'list') {
					$('<tr/>')
						.append($('<th/>').text(i18n('Name')).attr('colspan', 2))
						.append($('<th/>').text(i18n('Permissions')))
						.append($('<th/>').text(i18n('Modified')))
						.append($('<th/>').text(i18n('Size')))
						.append($('<th/>').text(i18n('Kind')))
						.appendTo(container);
				}

				for (var hash in fm.files) {
					// log(fm.files[hash])
					num++;
					size += fm.files[hash].size;
					render(fm.files[hash]).attr('id', hash).appendTo(container);

				}
				
				this.updatePath(fm.cwd.rel);
				this.st.text(num+' '+i18n('items')+', '+fm.formatSize(size));
				
				function render(f) {
					var el, d, n, p;
					if (fm.viewMode == 'icons') {
						n = f.name;
						if (n.length > 28) {
							n = n.substr(0, 14)+' '+n.substr(14, 7)+'..'+n.substr(n.length-5);
						} else if (n.length > 14) {
							n = n.substr(0, 14)+' '+n.substr(14);
						} 
						// log(n)
						el = $('<li/>').attr('title', f.name)
							.addClass(f.css+' rounded-5')
							.append($('<div />'))
							.append($('<em />').text(n));
						if (f.kind == 'Alias') {
							el.append($('<span />').addClass('alias'))
						}
					} else {
						d = f.mdate.replace(/([a-z]+)\s/i, function(arg1, arg2) { return i18n(arg2)+' '; });
						p = [f.read ? 'read' : '', f.write ? 'write' : ''];
						el = $('<tr />')
								.addClass(f.css)
								.append($('<td />').text('').addClass('icons'))
								.append($('<td />').text(f.name+' / '+f.css))
								.append($('<td />').text(i18n(p.join('/'))))
								.append($('<td />').text(d))
								.append($('<td />').text(fm.formatSize(f.size)))
								.append($('<td />').text(i18n(f.kind)))
					}
					if (f.kind == 'Alias') {
						el.addClass('alias');
					}
					return el;
				}
				
			}

			/**
			 * Update current working directory path in statusbar
			 */
			this.updatePath = function(path) {
				this.p.text(path);
			}
			
			/**
			 * Update number of selected files/folders and size in statusbar
			 */
			this.updateSelected = function(num, size) {
				this.sl.text(num>0 ? i18n('selected')+': '+num+', '+fm.formatSize(size): '');
			}
			
				
		}
		
		var contextmenu = function(fm) {
			this.fm = fm;
			
		}
		
		
		var ui =function(fm, disabled) {
			var ui = this;
			
			this.back = new function() {
				this.button = true;
				var self = this;

				this.exec = function() {

					if (!self.button.hasClass('disabled') && fm.history.length) {
						// log(fm.history.pop())
						fm.commands.open.exec(fm.history.pop(), true);
					}
				}
				
				this.update = function() {
					// log(fm.history)
					if (fm.history.length) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}
			
			this.reload = new function() {
				this.button = true;

				this.exec = function() {
					fm.lock();
					$.ajax({
						url      : options.url,
						data     : { target: fm.cwd.hash||0 },
						dataType : 'json',
						error    : fm.view.fatal,
						success  : function(data) {
							if (data.error) {
								return fm.view.error(data.error);
							}
							fm.unlock();
							fm.cwd   = data.cwd;
							fm.files = data.files;
							fm.updateNav(data.tree);
							fm.updateCwd();
							fm.commands.updateButtons();
							data.debug && log(data.debug);
						}
					});
				}
			}
			
			this.open = new function() {
				var self = this;
				
				this.exec = function(id) {
					
					if (!fm.files[id] || fm.files[id].css == 'dir') {

						fm.lock();

						$.ajax({
							url : options.url,
							data : { target : id },
							dataType : 'json',
							error : fm.view.fatal,
							success : function(data) {
								fm.unlock();
								if (data.error) {
									return fm.view.error(data.error);
								}
								if (data.warning) {
									fm.view.warning(data.warning)
								}
								log(data)
								fm.updateCwd(data.cwd, data.files)
							}
						})
						
					} else {
						log('open file')
					}
					
					return;
					
					
					
					if (!fm.files[id] || fm.files[id].mime == 'directory') {
						fm.lock();
						$.ajax({
							url      : options.url,
							data     : { cmd : 'cd', target : id },
							dataType : 'json',
							error    : fm.view.fatal,
							success  : function(data) {
								if (data.error) {
									return fm.view.error(data.error);
								}
								fm.unlock();
								!n && fm.history.push(fm.cwd.hash)
								fm.cwd   = data.cwd;
								fm.files = data.files;
								fm.updateCwd();
								fm.commands.updateButtons();
								data.debug && log(data.debug);
							}
						});
					} else {
						var size = '',
							url = fm.files[id].url ? fm.files[id].url : options.url+'?cmd=open&current='+fm.cwd.hash+'&target='+id;
						if (fm.files[id].dimensions) {
							var s = fm.files[id].dimensions.split('x');
							size = 'width='+(parseInt(s[0])+20)+',height='+(parseInt(s[1])+20)+',';
						} 
						window.open(url, null, 'top=50,left=50,'+size+'scrollbars=yes,resizable=yes');
					}
					
					
				}
			}
			
			this.info = new function() {
				this.button = true;
				// var self = this;
				
				this.exec = function() {
					if (fm.selected.length && fm.files[fm.selected[0]] && !fm._lock) {
						fm._lock = true;
						var f = fm.files[fm.selected[0]], 
							perm = !f.read && !f.write ? 'no access' : (f.read ? i18n('read') : '')+' '+(f.write ? i18n('write') : '');
						$('<div/>').append(
							$('<table style="width:100%;border:1px solid #ccc" />')
								.append(
									$('<tr/>')
										.append($('<td/>').css('width', '40%').append(i18n('File name')))
										.append($('<td/>').css('width', '60%').append(f.name))
								).append(
									$('<tr/>')
										.append($('<td/>').append(i18n('Kind')))
										.append($('<td/>').append(i18n(f.kind)))	
								).append(
									$('<tr/>')
										.append($('<td/>').append(i18n('Size')))
										.append($('<td/>').append(fm.formatSize(f.size)))	
								).append(
									$('<tr/>')
										.append($('<td/>').append(i18n('Modified')))
										.append($('<td/>').append(f.mtime))	
								).append(
									$('<tr/>')
										.append($('<td/>').append(i18n('Last opened')))
										.append($('<td/>').append(f.atime))
								).append(
									$('<tr/>')
										.append($('<td/>').append(i18n('Permissions')))
										.append($('<td/>').append(perm))
								)
							).dialog({
								title   : i18n('File info'),
								modal : true,
								buttons : { Ok : function() { $(this).dialog('close'); fm._lock = false; } }
							});
					}
				}
			}
			
			this.copy = new function() {
				this.button = true;
				var self = this;
				
				this.exec = function() {
					// log(fm.selected)
					if (fm.selected.length) {
						fm.buffer = fm.selected;
						com.paste && com.paste.update();
					}
					log(fm.selected)
				}
				
				this.update = function() {
					if (fm.selected.length) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}
			
			this.paste = new function() {
				this.button = true;
				
				this.exec = function() {
					if (fm.buffer.length) {
						
					}
					fm.buffer = [];
					this.button.addClass('disabled');
				}
				
				this.update = function() {
					if (fm.buffer.length) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}
			
			
			
			this.mkdir = new function() {
				this.button = true;
				// var self = this;
				
				this.exec = function() {
					log('exec')
				}
				
				this.update = function() {
					// log('update')
					if(fm.cwd.write) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}

			this.upload = new function() {
				this.button = true;
				// var self = this;
				
				this.exec = function() {
					if(fm.cwd.write) {
						
					} else {
						alert('not writable')
					}
				}
				
				this.update = function() {
					// log('update')
					if(fm.cwd.write) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}

			

			this.rm = new function() {
				this.button = true;
				// var self = this;
				
				this.exec = function() {
					if(fm.cwd.write) {
						
					}
				}
				
				this.update = function() {
					if(fm.cwd.write && fm.selected.length) {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}

			this.list = new function() {
				this.button = true;
				
				this.exec = function() {
					fm.viewMode = 'list';
					cookie('elfinder-view', 'list');
					fm.commands.reload.exec();
				}
				
				this.update = function() {
					if (fm.viewMode != 'list') {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}
	
	
			this.icons = new function() {
				this.button = true;
				
				this.exec = function() {
					fm.viewMode = 'icons';
					cookie('elfinder-view', 'icons');
					fm.commands.reload.exec();
				}
				
				this.update = function() {
					// log(fm.viewMode)
					if (fm.viewMode != 'icons') {
						this.button.removeClass('disabled');
					} else {
						this.button.addClass('disabled');
					}
				}
			}
			
			for (var i in this) {
				if (typeof(this[i]) == 'object') {
					if (disabled.length && $.inArray(i, disabled) != -1) {
						delete this[i];
					} else if (this[i].button) {
						this[i].button = $('<li/>').addClass(i+' rounded-3 '+(this[i].update ? 'disabled' : '')).appendTo(fm.view.tb).bind('click', this[i].exec);
					}
				}
			}
			
			this.update = function() {
				$.each(this, function() {
					this.update && this.update();
				});
			}
		}
		
		var initNav = function() {
			var tree = this.view.nav.children('ul');

			tree.find('a').bind('click', function(e) {
				e.preventDefault();
				tree.find('a').removeClass('selected');
				$(this).addClass('selected');
				fm.actions.open.command($(this).attr('id').replace('nav', ''));

			})
			.end()
			.children('li').find('li:has(ul)').each(function() {
				$(this).children('ul').hide().end()
					.children('div').click(function() {
						$(this).toggleClass('dir-expanded').nextAll('ul').toggle(300);
					});
			});
		}
		
		return this.each(function() {
			var self = this;
			/**
			 * Flag - do we create file manager
			 */
			this.init = false;
			/**
			 * Prevent duplicate ajax requests
			 */
			this.lock = false;
			/**
			 * View mode (icons/list)
			 */
			this.viewMode = 'list';
			/**
			 * Object. Info about current directory
			 */
			this.cwd   = {};
			/**
			 * Object. Folders/files in current directory
			 */
			this.files = {};
			/**
			 * history
			 */
			this.history = [];
			/**
			 * Selected items
			 */
			this.selected = [];
			/**
			 * clipboard bufer (copy/paste)
			 */
			this.buffer    = {}

			this.view = null;
			
			this.ui = null;
			
			this.contextmenu = null;

			/**
			 * Called before do ajax requests. Disable interface and display spinner
			 */
			this.lock = function() {
				this._lock = true;
				this.view.spinner(true);
			}
			/**
			 * Remove lock, added by this.lock()
			 */
			this.unlock = function() {
				this._lock = false;
				this.view.spinner();
			}



			/**
			 * Init file manager
			 */
			if (!this.view) {
				
				this.viewMode = cookie('elfinder-view');
				// log(this.viewMode)
				
				this.view = new view(this);
				this.lock();
				$.ajax({
					url      : options.url,
					dataType : 'json',
					error    : self.view.fatal,
					success  : function(data) {
						log(data)
						self.unlock();
						if (data.error) {
							return self.view.error(data.error);
						}
						
						// log(data.files)
						
						self.updateCwd(data.cwd, data.files);
						self.updateNav(data.tree)
						
						self.ui = new ui(self, data.disabled);
						self.ui.update();
					}
				})
				// this.commands = new commands(this);
				// this.commands.reload.exec(0);
				// 
				// this.view.cwd
				// 	.bind(window.opera?'click':'contextmenu', function(e) {
				// 		log(e.target)
				// 
				// 	})
				// 	.bind('dblclick', function(e) {
				// 		e.stopPropagation();
				// 
				// 		if (e.target != self.view.cwd.get(0)) {
				// 			var t = e.target.nodeName == 'LI' ? $(e.target) : $(e.target).parents('li').eq(0);
				// 			self.commands.open.exec(t.attr('id'));
				// 		}
				// 	})
				// 	.bind('click', function(e) {
				// 		e.preventDefault()
				// 		e.stopPropagation();
				// 		if (e.target == self.view.cwd.get(0)) {
				// 
				// 			self.view.cwd.children('ul').children('li').removeClass('selected');
				// 			self.selected = [];
				// 		} else {
				// 			var t = e.target.nodeName == 'LI' ? $(e.target) : $(e.target).parents('li').eq(0);
				// 			if (e.ctrlKey || e.metaKey) {
				// 				t.toggleClass('selected');
				// 			} else if (e.shiftKey) {
				// 
				// 			} else {
				// 				t.toggleClass('selected').siblings('li').removeClass('selected');
				// 			}
				// 			self.selected = [];
				// 			self.view.cwd.children('ul').children('li').each(function() {
				// 				if ($(this).hasClass('selected')) {
				// 					self.selected.push($(this).attr('id'));
				// 				}
				// 			});
				// 		}
				// 		self.commands.updateButtons();
				// 	});
			}

			this.updateNav = function(tree) {
				this.view.updateNav(tree);
				
				var tree = this.view.nav.children('ul');
				tree.find('a').bind('click', function(e) {
					e.preventDefault();
					self.ui.open.exec($(this).trigger('select').attr('id').replace('nav', ''));
				})
				.bind('select', function() {
					if (!$(this).hasClass('selected')) {
						tree.find('a').removeClass('selected');
						$(this).addClass('selected').parents('li:has(ul)').children('ul').show().end().children('div').addClass('dir-expanded');
					}
				})
				.end()
				.children('li').find('li:has(ul)').each(function() {
					$(this).children('ul').hide().end()
						.children('div').click(function() {
							$(this).toggleClass('dir-expanded').nextAll('ul').toggle(300);
						});
				});
			}
			

			this.updateCwd = function(cwd, files) {
				self.cwd   = cwd;
				self.files = files;

				this.view.updateCwd();
				this.view.nav.find('a#nav'+this.cwd.hash).trigger('select');
				
			}

			this.formatSize = function(s) {
				var n = 1, u = '';
				if (s > 1073741824) {
					n = 1073741824;
					u = 'Gb';
				} else if (s > 1048576) {
		            n = 1048576;
		            u = 'Mb';
		        } else if (s > 1024) {
		            n = 1024;
		            u = 'Kb';
		        }
		        return parseInt(s/n)+' '+u;
			}

			
			this.type = function(id) {
				
			}

			
			
			
			this.open = function() {
				log('open')
			}
			
			this.close = function() {
				log('close')
			}

		});
		
		
	}

	var log = function(m) {
		window.console && window.console.log && window.console.log(m)
	}

	$.fn.elfinder.defaults = {
		url            : '',
		dialog         : null,
		height         : 450,
		lang           : 'en',
		disabled       : [],
		editorCallback : null,
		editTextFiles  : true
	};

	$.fn.elfinder.i18Messages = {};

})(jQuery);