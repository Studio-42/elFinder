(function($) {

	/**
	 * @class  File manager (main controller)
	 * @author dio dio@std42.ru
	 **/
	elFinder = function(el, o) {
		var self      = this;
		/**
		 * String. Version number;
		 **/
		this.version  = '1.1 beta2';
		/**
		 * Object. Current Working Dir info
		 **/
		this.cwd      = {};
		/**
		 * Object. Current Dir Content. Files/folders info
		 **/
		this.cdc      = {};
		/**
		 * Object. Buffer for copied files
		 **/
		this.buffer   = {};
		/**
		 * Array. Selected files IDs
		 **/
		this.selected = [];
		/**
		 * Array. Folder navigation history
		 **/
		this.history  = [];
		/**
		 * Boolean. File manager init?
		 **/
		this.loaded   = false;
		/**
		 * Boolean. Enable/disable actions
		 **/
		this.locked   = false;
		this.zIndex = 2;
		this.dialog = null;
		this.anchor = null;
		/**
		 * Object. Some options get from server
		 **/
		this.params = { dotFiles : false, arc : '', uplMaxSize : '' };
		/**
		 * Object. File manager configuration
		 **/
		this.options = $.extend({}, this.options, o);
		
		if (!this.options.url) {
			alert('Invalid configuration! You have to set URL option.');
			return;
		}
		
		
		this.view = new this.view(this, el);
		
		this.quickLook = new this.quickLook(this);
		
		this.ui = new this.ui(this)
		
		this.eventsManager = new this.eventsManager(this);
		self.eventsManager.init();
		
		
		this.log = function(m) {
			window.console && window.console.log && window.console.log(m)
		}

		/**
		 * Set/get cookie value
		 *
		 * @param  String  name  cookie name
		 * @param  String  value cookie value, null to unset
		 **/
		this.cookie = function(name, value) {
			if (typeof value == 'undefined') {
				if (document.cookie && document.cookie != '') {
					var i, c = document.cookie.split(';');
					name += '=';
					for (i=0; i<c.length; i++) {
						c[i] = $.trim(c[i]);
						if (c[i].substring(0, name.length) == name) {
							return decodeURIComponent(c[i].substring(name.length));
						}
					}
				}
				return '';
			} else {
				var d, o = $.extend({}, this.options.cookie);
				if (value===null) {
					value = '';
					o.expires = -1;
				}
				if (typeof(o.expires) == 'number') {
					d = new Date();
					d.setTime(d.getTime()+(o.expires * 24 * 60 * 60 * 1000));
					o.expires = d;
				}
				document.cookie = name+'='+encodeURIComponent(value)+'; expires='+o.expires.toUTCString()+(o.path ? '; path='+o.path : '')+(o.domain ? '; domain='+o.domain : '')+(o.secure ? '; secure' : '');
			}
		}

		

		/**
		 * Set/unset this.locked flag
		 *
		 * @param  Boolean  state
		 **/
		this.lock = function(l) {
			this.view.spinner((this.locked = l||false));
			this.eventsManager.lock = this.locked;
		}

		/**
		 * Set/unset lock for keyboard shortcuts
		 *
		 * @param  Boolean  state
		 **/
		this.lockShortcuts = function(l) {
			this.eventsManager.lock = l;
		}
		
		/**
		 * Set file manager view type (list|icons)
		 *
		 * @param  String  v  view name
		 **/
		this.setView = function(v) {
			if (v == 'list' || v == 'icons') {
				this.options.view = v;
				this.cookie('el-finder-view', v);
			}
		}
		
		/**
		 * make ajax request, show message on error, call callback on success
		 *
		 * @param  Object.  data for ajax request
		 * @param  Function  
		 * @param  Boolean  call callback on error?
		 * @param  Object   overrwrite some ajax options (type/async)
		 * @param  Boolean  do not lock fm before ajax?
		 */
		this.ajax = function(data, callback, force, options, noLock) {
			!noLock && this.lock(true);

			var opts = {
				// cmd      : '',
				url      : this.options.url,
				async    : true,
				type     : 'GET',
				data     : data,
				dataType : 'json',
				cache    : false,
				error    : self.view.fatal,
				success  : function(data) {
					self.lock();

					if (data.error) {
						self.view.error(data.error, data.errorData);
						if (!force) {
							return;
						}
					}
					callback(data);
					data.debug && self.log(data.debug);
					/* tell connector to generate thumbnails */
					if (!self.locked && self.options.view == 'icons') {
						data.tmb && self.tmb();
					}
					delete data;
					if (data.select && self.cdc[data.select]) {
						self.selectById(data.select);
					}
				}
			}
			if (typeof(options) == 'object') {
				opts = $.extend({}, opts, options);
			}
			
			$.ajax(opts);
		}
		
		/**
		 * Load generated thumbnails in background
		 *
		 **/
		this.tmb = function() {
			this.ajax({cmd : 'tmb', current : self.cwd.hash}, function(data) {
				if (self.options.view == 'icons' && data.images) {
					var i, el;
					for (i in data.images) {
						$('div[key="'+i+'"]>p', self.view.cwd).css('background', ' url("'+data.images[i]+'") 0 0 no-repeat');
					}
				}
			}, false, null, true);
		}
		
		/**
		 * Return folders in places IDs
		 *
		 * @return Array
		 **/
		this.getPlaces = function() {
			var pl = [], p = this.cookie('el-finder-places');
			if (p.length) {
				if (p.indexOf(':')!=-1) {
					pl = p.split(':');
				} else {
					pl.push(p);
				}
			}
			return pl;
		}
		
		/**
		 * Add new folder to places
		 *
		 * @param  String  Folder ID
		 * @return Boolean
		 **/
		this.addPlace = function(id) {
			var p = this.getPlaces();
			if ($.inArray(id, p) == -1) {
				p.push(id);
				this.savePlaces(p);
				return true;
			}
		}
		
		/**
		 * Remove folder from places
		 *
		 * @param  String  Folder ID
		 * @return Boolean
		 **/
		this.removePlace = function(id) {
			var p = this.getPlaces();
			if ($.inArray(id, p) != -1) {
				this.savePlaces($.map(p, function(o) { return o == id?null:o; }));
				return true;
			}
		}
		
		/**
		 * Save new places data in cookie
		 *
		 * @param  Array  Folders IDs
		 **/
		this.savePlaces = function(p) {
			this.cookie('el-finder-places', p.join(':'));
		}
		
	
		
		/**
		 * Update file manager content
		 *
		 * @param  Object  Data from server
		 **/
		this.reload = function(data) {
			this.cwd = data.cwd;
			this.cdc = {};
			for (var i=0; i<data.cdc.length ; i++) {
				// data.cdc[i].hash += ''
				// data.cdc[i].hash.toString()
				this.cdc[data.cdc[i].hash] = data.cdc[i];
				this.cwd.size += data.cdc[i].size;
			}
			
			if (data.tree) {
				this.view.renderNav(data.tree);
				this.eventsManager.updateNav();
			}
			this.updateCwd();
		}
		
		/**
		 * Redraw current directory
		 *
		 */
		this.updateCwd = function() {
			this.lockShortcuts();
			this.selected = [];
			
			this.view.renderCwd();
			this.view.tree.find('a[key="'+this.cwd.hash+'"]').trigger('select');
			this.eventsManager.updateCwd();
		}
		
		
		
		/**
		 * Execute after files was dropped onto folder
		 *
		 * @param  Object  drop event
		 * @param  Object  drag helper object
		 * @param  String  target folder ID
		 */
		this.drop = function(e, ui, target) {
			if (ui.helper.find('[key="'+target+'"]').length) {
				return self.view.error('Unable to copy into itself');
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
					/* some strange jquery ui bug (in list view) */
					setTimeout(function() {self.ui.exec('paste'); self.buffer = {}}, 500);
				}
			} else {
				$(this).removeClass('el-finder-droppable');
			}
		}
		
		/**
		 * Return selected files data
		 *
		 * @param  Number  if set, returns only element with this index or empty object 
		 * @return Array|Object
		 */
		this.getSelected = function(ndx) {
			var i, s = [];
			if (ndx>=0) {
				return this.cdc[this.selected[ndx]]||{};
			}
			for (i=0; i<this.selected.length; i++) {
				this.cdc[this.selected[i]] && s.push(this.cdc[this.selected[i]]);
			}
			return s;
		}
		
		this.select = function(el, reset) {
			reset && $('.ui-selected', self.view.cwd).removeClass('ui-selected');
			el.addClass('ui-selected');
			self.updateSelect();
		}

		this.selectById = function(id) {
			var el = $('[key="'+id+'"]', this.view.cwd);
			if (el.length) {
				this.select(el);
				this.checkSelectedPos();
			}
		}

		this.unselect = function(el) {
			el.removeClass('ui-selected');
			self.updateSelect();
		}

		this.toggleSelect = function(el) {
			el.toggleClass('ui-selected');
			this.updateSelect();
		}

		this.selectAll = function() {
			$('[key]', self.view.cwd).addClass('ui-selected')
			self.updateSelect();
		}

		this.unselectAll = function() {
			$('.ui-selected', self.view.cwd).removeClass('ui-selected');
			self.updateSelect();
		}

		this.updateSelect = function() {
			self.selected = [];
			$('.ui-selected', self.view.cwd).each(function() {
				self.selected.push($(this).attr('key'));
			});
			self.view.selectedInfo();
			self.ui.update();
			self.quickLook.update();
		}

		/**
		 * Scroll selected element in visible position
		 *
		 * @param  Boolean  check last or first selected element?
		 */
		this.checkSelectedPos = function(last) {
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

		this.time = function() {
			var d = new Date()
			return d.getMilliseconds();
		}
		
		/**
		 * Add files to clipboard buffer
		 *
		 * @param  Array   files IDs
		 * @param  Boolean copy or cut files?
		 * @param  String  destination folder ID
		 */
		this.setBuffer = function(files, cut, dst) {
			var i, id, f;
			this.buffer = {
				src   : this.cwd.hash,
				dst   : dst,
				files : [],
				names : [],
				cut   : cut||0
			};
			
			for (i=0; i<files.length; i++) {
				id = files[i]; 
				f = this.cdc[id];
				if (f && f.read && f.type != 'link') {
					this.buffer.files.push(f.hash);
					this.buffer.names.push(f.name);
				}
			}
			
			if (!this.buffer.files.length) {
				this.buffer = {};
			}
		}
		
		/**
		 * Return true if file name is acceptable
		 *
		 * @param  String  file/folder name
		 * @return Boolean
		 */
		this.isValidName = function(n) {
			if (!this.cwd.dotFiles && n.indexOf('.') == 0) {
				return false;
			}
			return n.match(/^[^\\\/\<\>:]+$/);
		}
		
		/**
		 * Return true if file with this name exists
		 *
		 * @param  String  file/folder name
		 * @return Boolean
		 */
		this.fileExists = function(n) {
			for (var i in this.cdc) {
				if (this.cdc[i].name == n) {
					return i;
				}
			}
			return false;
		}
		
		/**
		 * Return file URL. If URL is not set, make sync ajax request to get it.
		 *
		 * @return String
		 */
		this.fileURL = function() {
			var url = '', s = this.getSelected();
			
			if (s.length == 1 && s[0].mime != 'directory' && !s['broken']) {
				if (s[0].url) {
					url = s[0].url;
				} else {
					this.ajax({
							cmd     : 'geturl', 
							current : self.cwd.hash, 
							file    : s[0].hash
						}, 
						function(data) { url = data.url||''; }, 
						true, {async : false });
				}
			}
			return url;		
		}
		
		/**
		 * Return name for new file/folder
		 *
		 * @param  String  base name (i18n)
		 * @param  String  extension for file
		 * @return String
		 */
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
		
		/* here we init file manager */
		// if (!this.loaded) {

			this.setView(this.cookie('el-finder-view'));
			this.loaded = true;
			
			if (this.options.dialog) {

				if (this.options.dialog.width != 'auto' && isNaN(parseInt(this.options.dialog.width))) {
					this.options.dialog.width = 570;
				}
				if (!this.options.dialog.dialogClass) {
					this.options.dialog.dialogClass = '';
				}
				this.options.dialog.dialogClass += 'el-finder-outer-dialog';
				if (!this.options.docked) {
					this.dialog = $('<div/>').append(el).dialog(this.options.dialog);
				} 
			}
			
			$('*', document.body).each(function() {
				z = parseInt($(this).css('z-index'));
				if (z >= self.zIndex) {
					self.zIndex = z+1;

				}
			});
			self.log(this.zIndex)
			this.ajax({ cmd: 'open', init : true, tree: true }, function(data) {
				
				self.reload(data);
				self.log(self.cdc)
				self.params = data.params;
				self.ui.init(data.disabled);
			});
			
			
			
		// }
		
		
		
		this.open = function() {
			if (this.dialog) {
				this.dialog.dialog('open');
			} else {
				this.view.win.show();
			}
			
		}
		
		this.close = function() {
			if (this.dialog) {
				this.dialog.dialog('close');
			} else {
				this.view.win.hide();
			}
		}
		
		this.dock = function() {
			if (this.options.docked && this.anchor) {
				$(el).insertAfter(this.anchor);
				this.anchor.remove();
				this.anchor = null;
				this.dialog.dialog('destroy')
				this.dialog = null
			}
		}
		
		this.undock = function() {
			if (this.options.docked && !this.anchor) {
				this.anchor = $('<div/>').hide().insertBefore(el);
				this.dialog = $('<div/>').append(el).dialog({
					dialogClass : 'el-finder-outer-dialog',
					width : 570,
					close : function() { self.dock() }
				})
			} 
		}
		
	}
	
	/**
	 * Translate message into selected language
	 *
	 * @param  String  message in english
	 * @param  String  translated or original message
	 */
	elFinder.prototype.i18n = function(m) {
		return this.options.i18n[this.options.lang] && this.options.i18n[this.options.lang][m] ? this.options.i18n[this.options.lang][m] :  m;
	}
	
	/**
	 * Default config
	 *
	 */
	elFinder.prototype.options = {
		url            : '',
		lang           : 'en',
		cssClass       : '',
		wrap           : 14,
		places         : 'Places',
		placesFirst    : true,
		editorCallback : null,
		i18n           : {},
		view           : 'icons',
		cookie         : {
			expires : 30,
			domain  : '',
			path    : '/',
			secure  : false
		},
		toolbar        : [
			['back', 'reload'],
			['select', 'open'],
			['mkdir', 'mkfile', 'upload'],
			['copy', 'paste', 'rm'],
			['rename', 'edit'],
			['info', 'help'],
			['icons', 'list']
		],
		contextmenu : {
			'cwd'   : ['reload', 'delim', 'mkdir', 'mkfile', 'upload', 'delim', 'paste', 'delim', 'info'],
			'file'  : ['select', 'open', 'delim', 'copy', 'cut', 'rm', 'delim', 'duplicate', 'rename', 'edit', 'resize', 'archive', 'extract', 'delim', 'info'],
			'group' : ['copy', 'cut', 'rm', 'delim', 'archive', 'extract', 'delim', 'info']
		},
		dialog : null,
		docked : false
	}

	
	$.fn.elfinder = function(o) {
		
		return this.each(function() {
			
			var cmd = typeof(o) == 'string' ? o : '';
			if (!this.elfinder) {
				this.elfinder = new elFinder(this, typeof(o) == 'object' ? o : {})
			}
			
			switch(cmd) {
				case 'close':
					this.elfinder.close();
					break;
					
				case 'open':
					this.elfinder.open();
					break;
				
				case 'dock':
					this.elfinder.dock();
					break;
					
				case 'undock':
					this.elfinder.undock();
					break;
			}
			
		})
	}
	
})(jQuery);