(function($) {

	/**
	 * @class  File manager (main controller)
	 * @author dio dio@std42.ru
	 **/
	elFinder = function(el, o) {
		var self = this, id;
		
		this.log = function(m) {
			window.console && window.console.log && window.console.log(m);
		}
		/**
		 * Object. File manager configuration
		 **/
		this.options = $.extend({}, this.options, o||{});
		
		if (!this.options.url) {
			alert('Invalid configuration! You have to set URL option.');
			return;
		}
		/**
		 * String. element id, create random if not set;
		 **/
		this.id = '';
		if ((id = $(el).attr('id'))) {
			this.id = id;
		} else {
			this.id = 'el-finder-'+Math.random().toString().substring(2);
		}
		
		/**
		 * String. Version number;
		 **/
		this.version  = '1.1 RC3';
		/**
		 * String. jQuery version;
		 **/
		this.jquery = $.fn.jquery.split('.').join('');

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
		 * Boolean. Enable/disable actions
		 **/
		this.locked   = false;
		/**
		 * Number. Max z-index on page + 1, need for contextmenu and quicklook
		 **/
		this.zIndex = 2;
		/**
		 * DOMElement. jQueryUI dialog
		 **/
		this.dialog = null;
		/**
		 * DOMElement. For docked mode - place where fm is docked
		 **/
		this.anchor = this.options.docked ? $('<div/>').hide().insertBefore(el) : null;
		/**
		 * Object. Some options get from server
		 **/
		this.params = { dotFiles : false, arc : '', uplMaxSize : '' };
		this.vCookie = 'el-finder-view-'+this.id;
		this.pCookie = 'el-finder-places-'+this.id;
		this.lCookie = 'el-finder-last-'+this.id;
		/**
		 * Object. View. After init we can accessel as this.view.win
		 **/
		this.view = new this.view(this, el);
		/**
		 * Object. User Iterface. Controller for commands/buttons/contextmenu
		 **/
		this.ui = new this.ui(this);
		/**
		 * Object. Set/update events
		 **/
		this.eventsManager = new this.eventsManager(this);
		/**
		 * Object. Quick Look like in MacOS X :)
		 **/
		this.quickLook = new this.quickLook(this);

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
				this.cookie(this.vCookie, v);
			}
		}
		
		/**
		 * make ajax request, show message on error, call callback on success
		 *
		 * @param  Object.  data for ajax request
		 * @param  Function  
		 * @param  Object   overrwrite some options 
		 */
		this.ajax = function(data, callback, options) {

			var opts = {
				url      : this.options.url,
				async    : true,
				type     : 'GET',
				data     : data,
				dataType : 'json',
				cache    : false,
				lock     : true,
				force    : false,
				silent   : false
			}
			if (typeof(options) == 'object') {
				opts = $.extend({}, opts, options);
			}
			if (!opts.silent) {
				opts.error = self.view.fatal;
			}
			opts.success = function(data) {
				opts.lock && self.lock();
				data.debug && self.log(data.debug);
				if (data.error) {
					!opts.silent && self.view.error(data.error, data.errorData);
					if (!opts.force) {
						return;
					}
				}
				callback(data);
				
				delete data;
			}
			opts.lock && this.lock(true);
			$.ajax(opts);
		}
		
		/**
		 * Load generated thumbnails in background
		 *
		 **/
		this.tmb = function() {
			this.ajax({cmd : 'tmb', current : self.cwd.hash}, function(data) {
				if (self.options.view == 'icons' && data.images && data.current == self.cwd.hash) {
					for (var i in data.images) {
						if (self.cdc[i]) {
							self.cdc[i].tmb = data.images[i];
							$('div[key="'+i+'"]>p', self.view.cwd).css('background', ' url("'+data.images[i]+'") 0 0 no-repeat');
						}
						
					}
					data.tmb && self.tmb();
				}
			}, {lock : false, silent : true});
		}
		
		/**
		 * Return folders in places IDs
		 *
		 * @return Array
		 **/
		this.getPlaces = function() {
			var pl = [], p = this.cookie(this.pCookie);
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
			this.cookie(this.pCookie, p.join(':'));
		}
		
		/**
		 * Update file manager content
		 *
		 * @param  Object  Data from server
		 **/
		this.reload = function(data) {
			var i;
			this.cwd = data.cwd;
			this.cdc = {};
			for (i=0; i<data.cdc.length ; i++) {
				this.cdc[data.cdc[i].hash] = data.cdc[i];
				this.cwd.size += data.cdc[i].size;
			}

			if (data.tree) {
				this.view.renderNav(data.tree);
				this.eventsManager.updateNav();
			}

			this.updateCwd();
			
			/* tell connector to generate thumbnails */
			if (data.tmb && !self.locked && self.options.view == 'icons') {
				self.tmb();
			}
			/* have to select some files */
			if (data.select && data.select.length) {
				var l = data.select.length;
				while (l--) {
					this.cdc[data.select[l]] && this.selectById(data.select[l]);
				}
			}
			this.lastDir(this.cwd.hash);
			if (this.options.autoReload>0) {
				this.iID && clearInterval(this.iID);
				this.iID = setInterval(function() {	!self.locked && self.ui.exec('reload'); }, this.options.autoReload*60000);
			}
		}
		
		/**
		 * Redraw current directory
		 *
		 */
		this.updateCwd = function() {
			this.lockShortcuts();
			this.selected = [];
			this.view.renderCwd();
			this.eventsManager.updateCwd();
			this.view.tree.find('a[key="'+this.cwd.hash+'"]').trigger('select');
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
					setTimeout(function() {self.ui.exec('paste'); self.buffer = {}}, 300);
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

		/**
		 * Get/set last opened dir
		 *
		 * @param  String  dir hash
		 * @return String
		 */
		this.lastDir = function(dir) {
			if (this.options.rememberLastDir) {
				return dir ? this.cookie(this.lCookie, dir) : this.cookie(this.lCookie);
			}
		}

		/**
		 * Resize file manager
		 *
		 * @param  Number  width
		 * @param  Number  height
		 */
		function resize(w, h) {
			w && self.view.win.width(w);
			h && self.view.nav.add(self.view.cwd).height(h);
		}
		
		/**
		 * Resize file manager in dialog window while it resize
		 *
		 */
		function dialogResize() {
			resize(null, self.dialog.height()-self.view.tlb.parent().height()-($.browser.msie ? 47 : 32))
		}

		this.time = function() {
			return new Date().getMilliseconds();
		}

		/* here we init file manager */
		
		this.setView(this.cookie(this.vCookie));
		resize(self.options.width, self.options.height);
		
		/* dialog or docked mode */
		if (this.options.dialog || this.options.docked) {
			this.options.dialog = $.extend({width : 570, dialogClass : '', minWidth : 480, minHeight: 330}, this.options.dialog || {});
			this.options.dialog.dialogClass += 'el-finder-dialog';
			this.options.dialog.resize = dialogResize;
			if (this.options.docked) {
				/* docked mode - create dialog and store size */
				this.options.dialog.close = function() { self.dock(); };
				this.view.win.data('size', {width : this.view.win.width(), height : this.view.nav.height()});
			} else {
				this.dialog = $('<div/>').append(this.view.win).dialog(this.options.dialog);
			}
		}

		this.ajax({ 
			cmd    : 'open', 
			target : this.lastDir()||'', 
			init   : true, 
			tree   : true 
			}, 
			function(data) {
				if (data.cwd) {
					self.eventsManager.init();
					self.reload(data);
					self.params = data.params;
					// self.log(self.params)
					$('*', document.body).each(function() {
						var z = parseInt($(this).css('z-index'));
						if (z >= self.zIndex) {
							self.zIndex = z+1;
						}
					});
					self.ui.init(data.disabled);
				}
				
		}, {force : true});
			
		
		this.open = function() {
			this.dialog ? this.dialog.dialog('open') : this.view.win.show();
			this.eventsManager.lock = false;
		}
		
		this.close = function() {
			if (this.options.docked && this.view.win.attr('undocked')) {
				this.dock();
			} else {
				this.dialog ? this.dialog.dialog('close') : this.view.win.hide();
			}
			this.eventsManager.lock = true;
		}
		
		this.dock = function() {
			if (this.options.docked && this.view.win.attr('undocked')) {
				var s =this.view.win.data('size');
				this.view.win.insertAfter(this.anchor).removeAttr('undocked');
				resize(s.width, s.height);
				this.dialog.dialog('destroy');
				this.dialog = null;
			}
		}
		
		this.undock = function() {
			if (this.options.docked && !this.view.win.attr('undocked')) {
				this.dialog = $('<div/>').append(this.view.win.css('width', '100%').attr('undocked', true).show()).dialog(this.options.dialog);
				dialogResize();
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
		/* connector url. Required! */
		url            : '',
		/* interface language */
		lang           : 'en',
		/* additional css class for filemanager container */
		cssClass       : '',
		/* characters number to wrap file name in icons view. set to 0 to disable wrap */
		wrap           : 14,
		/* Name for places/favorites (i18n), set to '' to disable places */
		places         : 'Places',
		/* show places before navigation? */
		placesFirst    : true,
		/* callback to get file url (for wswing editors) */
		editorCallback : null,
		/* string to cut from file url begin before pass it to editorCallback. variants: '' - nothing to cut, 'root' - cut root url, 'http://...' - string if it exists in the beginig of url  */
		cutURL         : '',
		/* close elfinder after editorCallback */
		closeOnEditorCallback : true,
		/* i18 messages. not set manually! */
		i18n           : {},
		/* fm view (icons|list) */
		view           : 'icons',
		/* width to overwrite css options */
		width          : '',
		/* height to overwrite css options. Attenion! this is heigt of navigation/cwd panels! not total fm height */
		height         : '',
		/* disable shortcuts exclude arrows/space */
		disableShortcuts : false,
		/* open last visited dir after reload page or close and open browser */
		rememberLastDir : true,
		/* cookie options */
		cookie         : {
			expires : 30,
			domain  : '',
			path    : '/',
			secure  : false
		},
		/* buttons on toolbar */
		toolbar        : [
			['back', 'reload'],
			['select', 'open'],
			['mkdir', 'mkfile', 'upload'],
			['copy', 'paste', 'rm'],
			['rename', 'edit'],
			['info', 'quicklook'],
			['icons', 'list'],
			['help']
		],
		/* contextmenu commands */
		contextmenu : {
			'cwd'   : ['reload', 'delim', 'mkdir', 'mkfile', 'upload', 'delim', 'paste', 'delim', 'info'],
			'file'  : ['select', 'open', 'quicklook', 'delim', 'copy', 'cut', 'rm', 'delim', 'duplicate', 'rename', 'edit', 'resize', 'archive', 'extract', 'delim', 'info'],
			'group' : ['copy', 'cut', 'rm', 'delim', 'archive', 'extract', 'delim', 'info']
		},
		/* jqueryUI dialog options */
		dialog : null,
		/* docked mode */
		docked : false,
		/* auto reload time (min) */
		autoReload : 0
	}

	
	$.fn.elfinder = function(o) {
		
		return this.each(function() {
			
			var cmd = typeof(o) == 'string' ? o : '';
			if (!this.elfinder) {
				this.elfinder = new elFinder(this, typeof(o) == 'object' ? o : {})
			}
			
			switch(cmd) {
				case 'close':
				case 'hide':
					this.elfinder.close();
					break;
					
				case 'open':
				case 'show':
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