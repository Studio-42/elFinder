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
		
		/**
		 * Translate message into options.lang lang, or return original message
		 * @return String
		 */
		function i18n(m) {
			return msgs[options.lang] && msgs[options.lang][m] ? msgs[options.lang][m] : m;
		}
		

		function ui(fm) {
			var self  = this;
			this.fm   = fm;
			this.tree = null;
			
			this.init = function() {
				this.initTree();
			}
			
			this.initTree = function() {
				this.tree = this.fm.view.nav.children('ul');
				
				this.tree.find('a').bind('click', self.cd)
					.end()
					.children('li').find('li:has(ul)').each(function() {
						$(this).children('ul').hide().end()
							.children('div').click(function() {
								$(this).toggleClass('dir-expanded').nextAll('ul').toggle(300);
							});
					});
			}
			
			this.cd = function(e) {
				e.preventDefault();
				self.tree.find('a').removeClass('selected');
				$(this).addClass('selected');
			}
		}

		
		return this.each(function() {
			var self  = fm  = this;
			/**
			 * Flag - do we create file manager
			 */
			this._init = false;
			/**
			 * Object. Info about current directory
			 */
			this.cwd   = {};
			/**
			 * Object. Folders/files in current directory
			 */
			this.files = {};
			/**
			 * Selected view mode (icons/list)
			 */
			this.viewMode = 'icons';

			this.history = []

			this.actions = {};

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


			var actions = {
				back : function() {
					var self = this;
					this.button = $('<li/>').addClass('back rounded-3').click(function() {
						// !$(this).hasClass('disabled') && fm.history.length &&  
						self.command();
					}).appendTo(fm.view.tb);
					
					this.command = function() {
						window.console.log('back command');
						// window.console.log(self)
					}

					this.update = function() {
						// window.console.log('cd update');
						if (fm.history.length) {
							this.button.removeClass('disabled');
						} else {
							this.button.addClass('disabled');
						}
					}
				},
				
				open : function() {
					var self = this;
					this.button = $('<li/>').addClass('open rounded-3').click(function() {
						self.command();	
					}).appendTo(fm.view.tb);
					

					this.command = function(id) {
						window.console.log('open command');
						// window.console.log(self)
					}

					this.update = function() {
						window.console.log('cd update');
					}
				},
				
				mkdir : function() {
					
				}
				
			};

			/**
			 * Init file manager
			 */
			if (!this._init) {
				
				/**
				 * View. Render and update file manager view
				 * @constructor
				 */
				this.view = new function() {
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
					this.win = $(self).empty().addClass('el-finder rounded-5')
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
					this.fatal = function(e) {
						$('<p />').addClass('el-finder-fatal rounded-5').text(i18n('Error')+': '+e).appendTo(this.wz);
					}

					/**
					 * Update navigation panel and current working directory content
					 */
					this.update = function(tree) {
						this.updateNav(tree);
						this.updateCwd();
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
						this.updatePath('/'+fm.cwd.name);
						this.st.text(fm.files.length+' '+i18n('items')+', '+fm.formatSize(self.cwd.size));
						this.cwd.empty();
						
						if (fm.viewMode == 'icons') {
							var ul = $('<ul />').appendTo(this.cwd);
							var h = 0;
							for (var i in fm.files) {
								// log(self.files[i])
								var f = fm.files[i];
								var c1 = c2 = '';
								if (f.mime == 'directory') {
									c1 = c2 = 'directory';
								} else {
									var p = f.mime.indexOf('/');
									c1 = f.mime.substr(0, p);
									c2 = f.mime.substr(p+1);
								}
								var l = fm.files[i].name.length;
								var n = l > 10 
									? fm.files[i].name.substr(0, 12)+'<br />'+fm.files[i].name.substr(12)
									: fm.files[i].name;
								var li = $('<li />').attr({'id' : fm.files[i].hash, title : fm.files[i].name})
									.addClass('rounded-5')
									.append($('<div />').addClass('el-finder-icon '+c1+' '+c2))
									.append($('<div />').addClass('el-finder-filename').html(n))
									.appendTo(ul);
								if (li.height() > h) {
									h = li.height();
								}
							}
							ul.children(li).height(h)
						} else {
							
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
				
				this.ui = new function() {
					var ui = this;
					this.tree = null;
					this.buttons = {
						'back' : 'Back'
					}
					
					this.init = function() {

						this.tree = self.view.nav.children('ul');

						this.tree.find('a').bind('click', function(e) {
							e.preventDefault();
							ui.tree.find('a').removeClass('selected');
							$(this).addClass('selected');
							self.actions.cd($(this).attr('id').replace('nav', ''));
						})
						.end()
						.children('li').find('li:has(ul)').each(function() {
							$(this).children('ul').hide().end()
								.children('div').click(function() {
									$(this).toggleClass('dir-expanded').nextAll('ul').toggle(300);
								});
						});
					}
				}
				
				this._init = true;
				this.lock();
				
				$.ajax({
					url      : options.url,
					dataType : 'json',
					error    : function(t) {
						self.unlock();  
						self.view.fatal(i18n(t.status == 200 ? 'Invalid data recieved! Check backend configuration!' : 'Unable to connect to backend!'));
					},
					success  : function(data) {
						
						return self.update(data)
						if (data.error) {
							return self.view.fatal(i18n(data.error));
						}
						self.cwd   = data.cwd;
						self.files = data.files;
						self.view.update(data.tree);
						self.ui.init();

						for (var i in actions) {
							if (!options.disabled || $.inArray(i, options.disabled) ==-1) {
								self.actions[i] = new actions[i]
							} 
						}
						log(self.actions)
						data.debug && log(data.debug)
					}
				});
				
			}

			this.update = function(data) {
				self.unlock();
				if (data.error) {
					return self.view.fatal(i18n(data.error));
				}
				this.cwd   = data.cwd;
				this.files = data.files;
				this.view.update(data.tree);
				
				if (!this.actions.cd) {
					for (var i in actions) {
						if (!options.disabled || $.inArray(i, options.disabled) ==-1) {
							this.actions[i] = new actions[i]
						} 
					}
				}

				this.initNav();
				
				this.view.cwd.bind(window.opera?'click':'contextmenu', function(e) {
					log(e.target)
					e.preventDefault();
					if(e.target == fm.view.cwd.get(0)) {
						log('cwd')
					} else {
						log($(e.target).parents('li').eq(0))
					}
				});
				
				this.view.cwd.find('li').click(function(e) {
					log(e)
					if (e.ctrlKey || e.metaKey) {
						$(this).toggleClass('selected');
					} else if (e.shiftKey) {
						
					} else {
						$(this).parent('ul').children('li').removeClass('selected').end().end().toggleClass('selected');
					}
					
				})
				data.debug && log(data.debug);
			}
			
			this.initNav = function() {
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
			
			// this.ui        = new ui(this);
			this.selection = {}
			this.buffer    = {}
			this._lock     = false;

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
		disabled       : ['mkdir'],
		editorCallback : null,
		editTextFiles  : true
	};

	$.fn.elfinder.i18Messages = {};

})(jQuery);