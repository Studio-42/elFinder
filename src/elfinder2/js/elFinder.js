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
		
		this.options = $.extend({}, this.options, o);
		
		if (!this.options.url) {
			alert('Invalid configuration! You need to set url option.');
			return;
		}
		
		
		
		this.view = new this.view(this, el);
		
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
		this.ajax = function(data, callback) {
			this.lock(true);

			$.ajax({
				url      : this.options.url,
				data     : data,
				dataType : 'json',
				cache    : false,
				error    : self.view.fatal,
				success  : function(data) {
					self.lock();
					if (data.error) {
						return self.view.error(data.error, data.errorData);
					}
					if (data.warning) {
						self.view.warning(data.warning, data.errorData);
					}
					callback(data);
					data.debug && self.log(data.debug);
					
					/* tell to connector to generate thumbnails */
					if (data.tmb) {
						$.ajax({
							url      : self.options.url,
							data     : {cmd : 'tmb', current : self.cwd.hash},
							dataType : 'json',
							success  : function(data) {
								if (self.viewMode() == 'icons' && data.images) {
									var i, el;
									for (i in data.images) {
										el = self.view.cwd.find('div[key="'+i+'"]:has(:not(span))').children('p');
										el.length && self.view.tmb(el, data.images[i]);
									}
								}
								data.debug && self.log(data.debug);
							}
						});
					}
				}
			});
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
		
		this.setNav = function(tree) {
			this.view.renderNav(tree);

			this.view.tree.find('a').bind('click', function(e) {
				e.preventDefault();
				self.ui.exec('open', $(this).trigger('select').attr('key'));
			})
			.bind('select', function() {
				if (!$(this).hasClass('selected')) {
					self.view.tree.find('a').removeClass('selected');
					$(this).addClass('selected').parents('li:has(ul)').children('ul').show().end().children('div').addClass('dir-expanded');
				}
			})
			.filter(':not([class="ro"])')
			.droppable({
				over : function() { $(this).addClass('el-finder-droppable'); },
				out  : function() { $(this).removeClass('el-finder-droppable'); },
				drop : function(e, ui) { $(this).removeClass('el-finder-droppable'); self.drop(e, ui, $(this).attr('key')); }
			})
			.end().end()
			.find('li:has(ul)').each(function() {
				$(this).children('ul').hide().end()
					.children('div').click(function() {
						$(this).toggleClass('dir-expanded').nextAll('ul').toggle(300);
					});
			})
			.end()
			.children('li').children('div').addClass('dir-expanded').next().next().show();
			
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
		 * @param Object cwd
		 * @param Object cdc
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
				.filter('.directory:not(:has(em[class="ro"],em[class=""]))')
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
			ui.helper.find('div:has(>label):not(:has(em[class="wo"],em[class=""]))').each(function() {
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
		
		this.getSelected = function() {
			var i, s = [];
			for (i=0; i<this.selected.length; i++) {
				var f = this.cdc[this.selected[i]];
				f && s.push(f);
			}
			return s;
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
		}
		
		this.unselectAll = function() {
			self.view.cwd.find('[class*="ui-selected"]').removeClass('ui-selected');
		}
		
		this.setBuffer = function(files, cut, target) {
			this.buffer = {
				src    : this.cwd.hash,
				target : target,
				files  : [],
				names  : [],
				cut    : cut||0
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
			return n.match(/^[^\.\\\/\<\>][^\\\/\<\>]/g);
		}
		
		this.fileExists = function(n) {
			for (var i in this.cdc) {
				if (this.cdc[i].name == n) {
					return i;
				}
			}
			return false;
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
				self.log(data)
				self.setNav(data.tree)
				self.setCwd(data.cwd, data.cdc);
				self.lock();
				self.ui.init(data.disabled);
				
				self.view.cwd
					.bind('click', function(e) {
						self.ui.hideMenu();
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
						/* if editorCallback is set and dblclick on file */
						if (self.options.editorCallback && !$(this).hasClass('directory')) {
							self.ui.exec('select');
						} else {
							self.ui.exec('open');
						}
					});
					
					/* bind shortcuts */
					$(document).keydown(function(e) {

						if ((e.ctrlKey || e.metaKey)) {
							self.log(e.keyCode)
							switch (e.keyCode) {
								case 67:
									self.ui.isCmdAllowed('copy') && self.ui.exec('copy');
									break;
								case 88:
									self.ui.isCmdAllowed('cut') && self.ui.exec('cut');
									break;
								case 86:
									self.ui.isCmdAllowed('paste') && self.ui.exec('paste');
									break;
								case 73:
									e.preventDefault();
									self.ui.exec('info');
									break;
								case 65:
									e.preventDefault();
									self.view.cwd.find('(div,tr)[key]').addClass('ui-selected');
									self.updateSelected();
									break;
								case 8:
									e.preventDefault();
									self.ui.isCmdAllowed('rm') && self.ui.exec('rm');
									break;
								case 37:
									e.preventDefault();
									self.history.length && self.ui.exec('back');
									break;
								case 85:
									if (self.ui.isCmdAllowed('upload')) {
										e.preventDefault();
										self.ui.exec('upload');
									}
									break;
								case 40:
									self.selected.length == 1 && self.ui.exec('open');
									break;
							} 
						} else {
							if ((e.keyCode == 37 || e.keyCode == 38) && self.selected.length == 1) {
								var p, e = self.view.cwd.find('[key="'+self.selected[0]+'"]');
								if (e) {
									p = e.prev('[key]');
									if (p.length) {
										e.removeClass('ui-selected');
										p.addClass('ui-selected');
										self.updateSelected();
									}
								}
							} else if ((e.keyCode == 39 || e.keyCode == 40) && self.selected.length == 1) {
								var n, e = self.view.cwd.find('[key="'+self.selected[0]+'"]');
								if (e) {
									n = e.next('[key]');
									if (n.length) {
										e.removeClass('ui-selected');
										n.addClass('ui-selected');
										self.updateSelected();
									}
								}
							}
						}
					});
				
			});

			
		}
		
		
		
		this.open = function() {}
		
		this.close = function() {}
	}
	
	elFinder.prototype.i18n = function(m) {
		return m;
	}
	
	elFinder.prototype.options = {
		url  : '',
		lang : 'en',
		cssClass : '',
		wrap : 14,
		places : 'Places',
		placesFirst : true,
		editorCallback : null,
		toolbar : [
			['back', 'reload'],
			['select', 'open'],
			['mkdir', 'mkfile', 'upload'],
			['copy', 'paste', 'rm'],
			['rename', 'edit'],
			['info', 'help'],
			
			
			['icons', 'list'],
			['help'], ['uncompress']
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