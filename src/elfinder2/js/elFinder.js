(function($) {

	elFinder = function(el, o) {
		var self = this;
		this.cwd = {};
		this.dirs = {};
		this.cdc = {};
		this.places = [];
		this.buffer = {}
		this.places = [];
		this.selected = [];
		this.history = [];
		this.vm = '';
		this.loaded = false;
		this.locked = false;
		this.keydown = true;
		
		this.options = $.extend({}, this.options, o);
		
		if (!this.options.url) {
			alert('Invalid configuration! You need to set URL option.');
			return;
		}
		
		
		
		this.view = new this.view(this, el);
		
		this.quickLook = new this.quickLook(this, el);
		
		this.ui = new this.ui(this)
		
		this.log = function(m) {
			window.console && window.console.log && window.console.log(m)
		}
		
		/**
		 * make ajax request, show message on error, call callback on success
		 * @param  data  Object  data for ajax request
		 * @param  callback Function  
		 *
		 */
		this.ajax = function(data, callback, continueOnErr, post, sync) {
			this.lock(true);

			$.ajax({
				async    : !sync,
				url      : this.options.url,
				type     : post ? 'POST' : 'GET',
				data     : data,
				dataType : 'json',
				cache    : false,
				error    : self.view.fatal,
				success  : function(data) {
					self.lock();

					if (data.error) {
						self.view.error(data.error, data.errorData) 
						if (!continueOnErr) {
							return;
						}
					}
					callback(data);
					data.debug && self.log(data.debug);
					/* tell connector to generate thumbnails */
					data.tmb && self.tmb();
				}
			});
		}
		
		this.tmb = function() {
			if (!self.locked && self.viewMode() == 'icons') {
				$.ajax({
					url      : self.options.url,
					data     : {cmd : 'tmb', current : self.cwd.hash},
					dataType : 'json',
					success  : function(data) {
						if (self.viewMode() == 'icons' && data.images) {
							var i, el;
							for (i in data.images) {
								el = self.view.cwd.find('div[key="'+i+'"]').children('p:not(:has(span))');
								el.length && el.append($('<span/>').addClass('rnd-5').css('background', ' url("'+data.images[i]+'") 0 0 no-repeat'));
							}
							data.debug && self.log(data.debug);
							data.tmb && self.tmb();
						}
					}
				});
			}
		}
		
		
		this.cookie = function(name, value, opts) {
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
		
		this.lock = function(lock) {
			this.view.spinner( (this.locked = lock) );
			this.keydown = !lock; 
		}
		
		
		this.viewMode = function(m) {
			if (!m) {
				if (!this.vm) {
					m = this.cookie('el-finder-view');
					this.vm = m == 'list' || m == 'icons' ? m : 'list';
				}
			} else {
				if (m  == 'list' || m == 'icons') {
					this.vm = m;
					this.cookie('el-finder-view', m, {expires : 1, path : '/'});
				}
			}
			return this.vm;
		}
		
		/**
		 * Create directory tree, and bind click and drop events
		 * @param  Array  tree
		 */
		this.setNav = function(tree) {
			this.view.renderNav(tree);
			
			this.view.tree
				.find('li').children('ul').each(function(i) {
					var ul = $(this);
					i>0 && ul.hide();
					ul.parent().children('div').click(function() {
						$(this).toggleClass('dir-expanded');
						ul.toggle(300);
					});
				}).end().end()
				.find('a')
					.bind('click', function(e) {
						e.preventDefault();
						var t = $(this), id = t.attr('key'); 
						if (id != self.cwd.hash && !t.hasClass('noaccess') && !t.hasClass('dropbox') ) {
							t.trigger('select');
							self.ui.exec('open', id);
						}
					})
					.bind('select', function() {
						self.view.tree.find('a').removeClass('selected');
						$(this).addClass('selected').parents('li:has(ul)').children('ul').show().end().children('div').addClass('dir-expanded');
					})
					.filter(':not(.noaccess,.readonly)')
					.droppable({
						over : function() { $(this).addClass('el-finder-droppable'); },
						out  : function() { $(this).removeClass('el-finder-droppable'); },
						drop : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.drop(e, ui, $(this).attr('key')); }
					});
			
			if (this.view.places) {
				/* bind click once, when places created */
				this.view.places.click(function(e) {
					e.preventDefault();
					if (e.target.nodeName == 'A') {
						self.ui.exec('open', $(e.target).attr('key'));
					} else if (e.target.nodeName == 'STRONG') {
						$(e.target).prev('.dir-collapsed').toggleClass('dir-expanded').nextAll('ul').toggle(300);
					} else if ($(e.target).hasClass('dir-collapsed')) {
						$(e.target).toggleClass('dir-expanded').nextAll('ul').toggle(300);
					}
				})
				.droppable({
					accept : 'div',
					over   : function() { $(this).addClass('hover'); },
					out    : function() { $(this).removeClass('hover'); },
					drop   : function(e, ui) {
						var upd = false;
						$(this).removeClass('hover');
						/* only readable dirs appends to places */
						ui.helper.children('div.el-finder-cwd').children('div.directory').each(function() {
							var id = $(this).attr('key');
							if (self.dirs[id] && self.dirs[id].read && $.inArray(id, self.places) == -1) {
								self.places.push(id);
								upd = true;
								$(this).hide();
							}
						});
						/* update places id's and view */
						if (upd) {
							self.cookie('el-finder-places', self.places.join(':'), {expires : 1, path : '/'});
							self.updatePlaces();
						}
						/* hide helper if empty */
						if (!ui.helper.children('div.el-finder-cwd').children('div:visible').length) {
							ui.helper.hide();
						}
					}
				});
				
				this.updatePlaces();
				
			}
			
		}
		
		/**
		 * Redraw places, make folders in it draggable
		 *
		 */
		this.updatePlaces = function() {
			this.view.updatePlaces();
			$('li>ul>li', this.view.places).draggable({
				scroll : false,
				stop   : function() {
					var id = $(this).children('a').attr('key');
					self.places = $.map(self.places, function(o) { return o == id ? null : o; })
					self.cookie('el-finder-places', self.places.join(':'), {expires : 1, path : '/'});
					$(this).remove();
				}
			});
		}
		
		/**
		 * Set current working directory data and current directory content and redraw its
		 *
		 * @param Object cwd  - Current Working Directory data
		 * @param Object cdc  - Current Directory Content
		 */
		this.setCwd = function(cwd, cdc) {
			this.cwd = cwd;
			this.cdc = {};
			
			for (var i=0; i< cdc.length; i++) {
				this.cdc[''+cdc[i].hash] = cdc[i];
				this.cwd.size += cdc[i].size;
			}
			this.updateCwd();
			/* open current dir and all parents in nav  */
			this.view.nav.find('a[key="'+this.cwd.hash+'"]').trigger('select');
		}
		
		/**
		 * Redraw current directory and make files/folders draggable
		 *
		 */
		this.updateCwd = function() {
			this.view.renderCwd();
			this.selected = [];

			this.view.cwd.find('(div,tr)[key]')
				.draggable({
					drag : function(e, ui) {
						if (e.shiftKey) {
							ui.helper.addClass('el-finder-drag-copy');
						} else {
							ui.helper.removeClass('el-finder-drag-copy');
						}
					},
					addClasses : false,
					revert     : true,
					helper     : function() {
						var h = $('<div/>').addClass('el-finder-cwd')
						self.view.cwd.find('.ui-selected').each(function(i) {
							h.append(self.vm == 'icons' ? $(this).clone().removeClass('ui-selected') : self.view.renderIcon(self.cdc[$(this).attr('key')]));
						})
						return $('<div/>').addClass('el-finder-drag-helper').append(h);
					}
				})
				.draggable('disable').removeClass('ui-state-disabled')
				.filter('.directory:not(.noaccess:has(em[class="readonly"],em[class=""]))')
				.droppable({
					over : function() { $(this).addClass('el-finder-droppable'); },
					out  : function() { $(this).removeClass('el-finder-droppable'); },
					drop : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.drop(e, ui, $(this).attr('key')); }
				});

		}
		
		this.drop = function(e, ui, target) {
			if (ui.helper.find('[key="'+target+'"]').length) {
				return self.view.error('Unable to copy into itself!');
			}
			var ids = [];
			ui.helper.find('div:not(.noaccess):has(>label):not(:has(em[class="readonly"],em[class=""]))').each(function() {
				ids.push($(this).hide().attr('key'));
			});
		
			if (!ui.helper.find('div:has(>label):visible').length) {
				ui.helper.hide();
			}
			if (ids.length) {
				self.setBuffer(ids, e.shiftKey?0:1, target);
				if (self.buffer.files) {
					setTimeout(function() {self.ui.exec('paste'); self.buffer = {}}, 500);
				}
			} else {
				$(this).removeClass('el-finder-droppable');
			}
		}
		
		this.getSelected = function(ndx) {
			var i, s = [];
			for (i=0; i<this.selected.length; i++) {
				this.cdc[this.selected[i]] && s.push(this.cdc[this.selected[i]]);
			}
			return ndx>=0 && ndx<s.length ? s[ndx] : s;
		}
		
		this.updateSelected = function() {
			this.selected = [];
			this.view.cwd.find('(div,tr)[key]')
				.draggable('disable')
				.removeClass('ui-state-disabled')
				.filter('.ui-selected').each(function() {
					self.selected.push($(this).draggable('enable').attr('key'));
				});
			this.ui.update();
			this.view.updateSelected();
			this.quickLook.update()
		}
		
		this.unselectAll = function() {
			self.view.cwd.find('[class*="ui-selected"]').removeClass('ui-selected');
		}
		
		this.setBuffer = function(files, cut, dst) {
			this.buffer = {
				src   : this.cwd.hash,
				dst   : dst,
				files : [],
				names : [],
				cut   : cut||0
			};
			
			for (var i=0; i<files.length; i++) {
				var id = files[i], f = this.cdc[id];
				if (f && f.read && f.type != 'link') {
					this.buffer.files.push(f.hash);
					this.buffer.names.push(f.name);
				}
			}
			
			if (!this.buffer.files.length) {
				this.buffer = {};
			}
			
		}
		
		this.isValidName = function(n) {
			return self.dotFiles ? n.match(/^[^\\\/\<\>]+$/) : n.match(/^[^\.\\\/\<\>][^\\\/\<\>]*$/);
		}
		
		this.fileExists = function(n) {
			for (var i in this.cdc) {
				if (this.cdc[i].name == n) {
					return i;
				}
			}
			return false;
		}
		
		this.fileURL = function() {
			var url = '', s = this.getSelected();
			
			if (s.length == 1 && s[0].mime != 'directory' && !s['broken']) {
				if (s[0].url) {
					url = s[0].url;
				} else {
					this.ajax({cmd : 'geturl', current : self.cwd.hash, file : s[0].hash}, function(data) {
						url = data.url||'';
					}, true, false, true);
				}
			}
			return url;		
		}
		
		this.uniqueName = function(n, ext) {
			n = self.i18n(n);
			var name = n, i = 0, ext = ext||'';

			if (!this.fileExists(name+ext)) {
				return name+ext;
			}

			while (i++<100) {
				if (!this.fileExists(name+i+ext)) {
					return name+i+ext;
				}
			}
			return name.replace('100', '')+Math.random()+ext;
		}
		
		this.checkSelectedPos = function(last) {
			if (self.selected.length) {
				var s = self.view.cwd.find('.ui-selected:'+(last ? 'last' : 'first')).eq(0),
					p = s.position(),
					h = s.outerHeight(),
					ph = self.view.cwd.height();
				if (p.top < 0) {
					self.view.cwd.scrollTop(p.top+self.view.cwd.scrollTop()-2);
				} else if (ph - p.top < h) {
					self.view.cwd.scrollTop(p.top+h-ph+self.view.cwd.scrollTop());
				}
			}
		}
		
		if (!this.loaded) {
			// this.cookie('el-finder-places', '', {expires : -1, path : '/'});
			/* load places id's from cookie */
			var p = this.cookie('el-finder-places');
			if (p.length) {
				this.places = p.indexOf(':')!=-1 ? p.split(':') : [p];	
			}
		
			this.loaded = true;
			this.lock(true);

			this.ajax({}, function(data) {
				// self.log(data)
				self.setNav(data.tree)
				self.setCwd(data.cwd, data.cdc);
				self.lock();
				self.ui.init(data.disabled);
				self.dotFiles = data.dotFiles;
				
				
				self.view.cwd
					.bind('click', function(e) {
						self.ui.hideMenu();
						// self.view.quickLook('close');
						var tag = self.vm == 'icons' ? 'DIV' : 'TR';
						if (e.target == self.view.cwd.get(0)) {
							/* click on empty space */
							self.unselectAll() ;
						} else {
							/* click on folder/file */
							!e.ctrlKey && !e.metaKey && self.unselectAll();
							var t = $(e.target);
							(t.attr('key') ? t : t.parents('[key]').eq(0)).addClass('ui-selected');
						}
						self.updateSelected();
						self.view.quickLook(self.selected.length == 1 ? 'upd' : 'close')
						/* if other element editing */
						self.view.cwd.find('input').trigger('blur');
					})
					.bind(window.opera?'click':'contextmenu', function(e) {
						e.preventDefault();
						
						if (e.target == self.view.cwd.get(0)) {
							self.unselectAll();
						} else {
							var t = $(e.target);
							(t.attr('key') ? t : t.parents('[key]').eq(0)).addClass('ui-selected');
						}
						self.updateSelected();
						self.ui.showMenu(e);
					})
					.selectable({
						filter : 'div,tr',
						delay  : 1,
						stop   : function() { self.updateSelected(); }
					})
					.find('(div,tr)[key]').live('dblclick', function(e) {
						/* if editorCallback is set, dblclick on file call select command */
						if (self.ui.isCmdAllowed('select')) {
							self.ui.exec('select');
						} else {
							self.ui.exec('open');
						}
					});
					
					/* bind shortcuts */
					$(document).bind('keydown', function(e) {
						if (!self.keydown) {
							return;
						}
						// self.log(e.keyCode);
						var meta = e.ctrlKey||e.metaKey;
						switch (e.keyCode) {
							/* command+backspace - delete */
							case 8:
								if (meta && self.ui.isCmdAllowed('rm')) {
									e.preventDefault();
									self.ui.exec('rm');
								} 
								break;
							/* Enter - exec "select" command if enabled, otherwise exec "open" */	
							case 13:
								if (self.ui.isCmdAllowed('select')) {
									return self.ui.exec('select');
								}
								self.ui.execIfAllowed('open');
								break;
							case 27:
								self.quickLook.hide()
								break;
							case 32:
								if (self.selected.length == 1) {
									e.preventDefault();
									self.quickLook.toggle();
								}
								break;
								
							/* arrows left/up. with Ctrl - command "back", w/o - move selection */
							case 37:
							case 38:
								if (e.keyCode == 37 && meta) {
									return self.ui.execIfAllowed('back');
								}
								if (!self.selected.length) {
									self.view.cwd.find('[key]:last').addClass('ui-selected');
								} else {
									var id = self.selected[0],
										el = self.view.cwd.find('[key="'+id+'"]:first'),
										p  = el.prev();
									if (!e.shiftKey) {
										self.view.cwd.find('[key]').removeClass('ui-selected');
									}
									if (p.length) {
										p.addClass('ui-selected');
									} else {
										el.addClass('ui-selected');
									}
								}
								self.updateSelected();
								self.checkSelectedPos();
								break;
							/* arrows right/down. with Ctrl - command "open", w/o - move selection  */
							case 39:
							case 40:
								if (meta) {
									return self.ui.execIfAllowed('open');
								}
								if (!self.selected.length) {
									self.view.cwd.find('[key]:first').addClass('ui-selected');
								} else {
									var id = self.selected[self.selected.length-1],
										el = self.view.cwd.find('[key="'+id+'"]:last'),
										n  = el.next();
									if (!e.shiftKey) {
										self.view.cwd.find('[key]').removeClass('ui-selected');
									}
									if (n.length) {
										n.addClass('ui-selected');
									} else {
										el.addClass('ui-selected');
									}
								}
								self.updateSelected();
								self.checkSelectedPos(true);
								break;
							/* Delete */
							case 46:
								self.ui.execIfAllowed('rm');
								break;
							/* Ctrl+A */
							case 65:
								if (meta) {
									e.preventDefault();
									self.view.cwd.find('(div,tr)[key]').addClass('ui-selected');
									self.updateSelected();
								}
								break;
							/* Ctrl+C */
							case 67:
								meta && self.ui.execIfAllowed('copy');
								break;
							/* Ctrl+I - get info */	
							case 73:
								if (meta) {
									e.preventDefault();
									e.stopPropagation();
									self.ui.exec('info');
								}
								break;
							case 78:
								if (meta) {
									e.preventDefault();
									self.ui.execIfAllowed('mkdir');
								}
								break;
							/* Ctrl+U - upload files */
							case 85:
								if (meta) {
									e.preventDefault();
									self.ui.execIfAllowed('upload');
								}
								break;
							/* Ctrl+V */
							case 86:
								meta && self.ui.execIfAllowed('paste');
								break;
							/* Ctrl+X */
							case 88:
								meta && self.ui.execIfAllowed('cut');
								break;
						}
						
					});
				
			});

			
		}
		
		
		
		this.open = function() {}
		
		this.close = function() {}
	}
	
	elFinder.prototype.i18n = function(m) {
		return this.options.i18n[this.options.lang] && this.options.i18n[this.options.lang][m] ? this.options.i18n[this.options.lang][m] :  m;
	}
	
	elFinder.prototype.options = {
		url  : '',
		lang : 'en',
		cssClass : '',
		wrap : 14,
		places : 'Places',
		placesFirst : true,
		editorCallback : null,
		i18n : {},
		toolbar : [
			['back', 'reload'],
			['select', 'open'],
			['mkdir', 'mkfile', 'upload'],
			['copy', 'paste', 'rm'],
			['rename', 'edit'],
			['info', 'help'],
			['icons', 'list'],
			['help']
		]
		
	}

	
	$.fn.elfinder = function(o) {
		
		return this.each(function() {
			
			
			if (!this.elfinder) {
				this.elfinder = new elFinder(this, o||{})
			}
			
			// log(this.elfinder)
		})
	}
	
})(jQuery);