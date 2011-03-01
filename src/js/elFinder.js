(function($) {
	
	elFinder = function(el, o) {
		var self = this,
			/**
			 * If false - no ajax requests allowed
			 *
			 * @type Boolean
			 **/
			ajax = true,
			/**
			 * shortcuts lock
			 *
			 * @type Boolean
			 **/
			lock = false,
			loaded = false,
			/**
			 * Target node
			 *
			 * @type jQuery
			 **/
			$el = $(el),
			file = function(file, replace) {
				var hash = file.hash;

				if (hash && file.name) {

					if (file.mime && (replace || !self.cdc[hash])) {
						self.cdc[hash] = $.extend({}, file);
						delete self.cdc[hash].hash;
						delete self.cdc[hash].tmb;
					}

					if ((!file.mime || file.mime == 'directory') && (replace || !self.tree[hash])) {
						self.tree[hash] = $.extend({mime : 'directory'}, file);
						delete self.tree[hash].hash;
						delete self.tree[hash].phash;
						delete self.tree[hash].childs;
						delete self.tree[hash].size;
					}
				}
			},
			remove = function(files) {
				var i = files.length, hash;
				
				while (l--) {
					hash = files[i];
					if (self.cdc[hash]) {
						delete self.cdc[hash];
					}
					if (self.tree[hash]) {
						delete self.tree[hash];
					}
				}
			}
			;
			
		/**
		 * Application version
		 *
		 * @type String
		 **/
		this.version = '2.0 beta';
		
		this.api = 1;
		
		/**
		 * Configuration options
		 *
		 * @type Object
		 **/
		this.options = $.extend({}, this.options, o||{});
		
		if (!this.options.url) {
			alert('Invalid configuration! You have to set URL option.');
			return;
		}
		
		/**
		 * Some options from connector
		 *
		 * @type Object
		 **/
		this.params = { dotFiles : false, arc : '', uplMaxSize : '' };
		
		/**
		 * ID. Requeried to get/set elfinder instance cookies
		 *
		 * @type String
		 **/
		this.id = $el.attr('id') || '';
		
		/**
		 * Interface language
		 *
		 * @type String
		 * @default "en"
		 **/
		this.lang = this.i18[this.options.lang] ? this.options.lang : 'en';
		
		/**
		 * Interface direction
		 *
		 * @type String
		 * @default "ltr"
		 **/
		this.dir = this.i18[this.lang].dir;
		// this.dir = 'rtl'
		/**
		 * i18 messages
		 *
		 * @type Object
		 **/
		this.messages = this.i18[this.lang].messages;
		
		/**
		 * Current working directory info
		 *
		 * @type Object
		 **/
		this.cwd      = {};
		
		/**
		 * Current directory content
		 *
		 * @type Object
		 **/
		this.cdc      = {};
		this.files = {};
		this.tree = {};
		
		/**
		 * Cach of selected files
		 * Contains objects from this.cdc
		 *
		 * @type Array
		 **/
		this.selected = [];
		/**
		 * History, contains hashs of last opened directories
		 *
		 * @type Array
		 **/
		this.history  = [];
		/**
		 * Buffer for copied files
		 *
		 * @type Object
		 **/
		this.buffer   = {files : [], cut : false};
		/**
		 * Registered shortcuts
		 *
		 * @type Object
		 **/
		this.shortcuts = {};
		/**
		 * Cwd view type
		 *
		 * @type String
		 **/
		this.view = this.viewType('icons');
		/**
		 * Events listeners
		 *
		 * @type Object
		 **/
		this.listeners = {
			load      : [],
			focus     : [],
			blur      : [],
			lock      : [],
			ajaxstart : [],
			ajaxstop  : [],
			ajaxerror : [],
			error     : [],
			cd        : [],
			select    : []
		};
		
		this.lock = function(l) {
			return l === void(0) ? lock : lock = !!l;
		}
		
		this.ajaxAllowed = function() {
			return ajax;
		}
		
		
		
		this.one('ajaxerror error', function(e) {
				if (!loaded) {
					e.stopPropagation();
					self.listeners = {};
				}
			})
			.bind('ajaxstart ajaxstop', function(e) {
				var l = e.type == 'ajaxstop';
				ajax = l;
				lock = !l;
			})
			.bind('focus', function() {
				if (lock) {
					$('texarea,:text').blur();
					lock = false;
				}
			})
			.bind('blur', function() {
				lock = true;
			})
			.bind('select', function(e) {
				if ($.isArray(e.data.selected)) {
					self.selected = e.data.selected;
				}
			})
			.bind('open', function(e) {
				var cdc = e.data.cdc,
					i   = cdc.length,
					h   = self.history,
					hl  = h.length,
					i, d;

				// init or reload
				if (self.params) {
					$.extend(self.params, e.data.params||{});
					self.tree = {};
				}
				// old api
				if (self.api < 2) {
					self.tree = {}; 
				}
				
				// update curent dir info
				$.extend(self.cwd, e.data.cwd);	
				// remember last dir
				self.last(self.cwd.hash);
				
				// update directory content
				self.cdc = {};
				while (i--) {
					file(cdc[i], true);
				}
				self.log(self.cdc)
				// self.log(self.tree)
				// update history if required
				if (!hl || h[hl - 1] != self.cwd.hash) {
					h.push(self.cwd.hash);
				}
				// reset selected files
				self.selected = [];
				
				// initial loading
				if (!loaded) {
					loaded = true;
					self.api = parseFloat(e.data.api) || 1;
					self.debug('api-version', self.api);
					self.trigger('load');
					delete self.listeners.load;
				}
			})
			.bind('open tree', function(e) {
				var i, f;

				if (!self.tree[self.cwd.hash]) {
					file(self.cwd);
				}
				if (e.data.tree && self.api > 1) {
					i = e.data.tree.length;
					while (i--) {
						!self.tree[e.data.tree[i].hash] && file(e.data.tree[i]);
					}
				}
			})
			.bind('mkdir', function(e) {
				self.log(e.data)
				if (e.data.dir) {
					file(e.data.dir)
				}
				// self.log(self.cdc)
				// self.log(self.tree)
			})
			.bind('rm', function(e) {
				self.log(e.data);
				if (self.api > 1) {
					
				} else {
					e.stopPropagation();
					self.trigger('open', e.data);
				}
			})
			;
			
		// bind to keydown/keypress if shortcuts allowed
		if (this.options.allowShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;
		
				if (!lock) {
					c == 9 && e.preventDefault();
					$.each(self.shortcuts, function(i, s) {
						if (s.type == e.type && c == s.keyCode && s.shiftKey == e.shiftKey && s.ctrlKey == ctrlKey && s.altKey == e.altKey) {
							e.preventDefault();
							s.callback(e, self);
							return false;
						}
					});
				}
			});
		}
		
		$(document).click(function() {
			!lock & self.trigger('blur');
		});
		
		this.ui = new this.ui(this, $el);
		this.ui.init();
		
		this.open(this.last() || '', true, true);

	}
	
	
	elFinder.prototype = {
		/**
		 * Get/set cookie
		 *
		 * @param  String       cookie name
		 * @param  String|void  cookie value
		 * @return Strng|void
		 */
		cookie : function(name, value) {
			var d, o;

			if (value === void(0)) {
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
			} 

			o = $.extend({}, this.options.cookie);
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
		},
		
		/**
		 * Get/set view type (icons | list)
		 *
		 * @param  String|void  type
		 * @return Strng
		 */
		viewType : function(t) {
			var c = 'el-finder-view';

			if (t && /^icons|list$/i.test(t)) {
				this.cookie(c, (this._view = t));
			} else if (!this._view) {
				t = this.cookie(c);
				return /^icons|list$/i.test(t) ? t : 'icons'
			}
			return this._view;
		},
		
		/**
		 * Return true if connector use new (>=2.0) api version
		 *
		 * @return Boolean
		 */
		isNewApi : function() {
			return this.api > 1;
		},
		
		/**
		 * Get/set last opened directory
		 * 
		 * @param  String  dir hash
		 * @return String|undefined
		 */
		last : function(key) { 
			return this.options.rememberLastDir ? this.cookie('el-finder-last', key) : void(0); 
		},
		
		/**
		 * Create/normalize event - add event.data object if not exists and
		 * event.data.elfinder - current elfinder instance
		 * 
		 * @param  jQuery.Event|String  event or event name
		 * @return jQuery.Event
		 */
		event : function(e, data) {
			if (!e.type) {
				e = $.Event(e.toLowerCase());
			}
			e.data = $.extend(e.data||{}, data, {elfinder : this});

			return e;
		},
		
		/**
		 * Add event listener
		 * 
		 * @param  String  event(s) name(s)
		 * @param  Object  event handler
		 * @return elFinder
		 */
		bind : function(e, c) {
			var e = e.toLowerCase().split(/\s+/), i;
			
			if (typeof(c) == 'function') {
				for (i = 0; i < e.length; i++) {
					if (this.listeners[e[i]] === void(0)) {
						this.listeners[e[i]] = [];
					}
					this.listeners[e[i]].push(c);
				}
			}
			return this;
		},
		
		/**
		 * Remove event listener if exists
		 *
		 * @param  String    event name
		 * @param  Function  callback
		 * @return elFinder
		 */
		unbind : function(e, c) {
			var l = this.listeners[e.toLowerCase()] || [],
				i = l.indexOf(c);

			i > -1 && l.splice(i, 1);
			return this;
		},
		
		/**
		 * Bind callback to event(s) The callback is executed at most once per event.
		 * To bind multiply events at once, separate events names by space
		 *
		 * @param  String    event name
		 * @param  Function  callback
		 * @return elFinder
		 */
		one : function(e, c) {
			var self = this,
				h = $.proxy(c, function(e) {
					setTimeout(function() {self.unbind(e.type, h);}, 3);
					return c.apply(this, arguments);
				});
			return this.bind(e, h);
		},
		
		/**
		 * Send notification to all event subscribers
		 *
		 * @param  jQuery.Event|String  event or event type
		 * @param  Object        extra parameters
		 * @return elFinder
		 */
		trigger : function(e, d) {
			var e = this.event(e, d||{}),
				l = this.listeners[e.type]||[], i;

			this.debug('event-'+e.type, e.data);

			for (i = 0; i < l.length; i++) {
				if (e.isPropagationStopped()) {
					break;
				}
				try {
					l[i](e, this);
				} catch (ex) {
					window.console && window.console.error && window.console.error(ex);
				}
			}
			
			delete e;
			return this;
		},
		
		/**
		 * Bind keybord shortcut to keydown event
		 *
		 * @example
		 *    elfinder.shortcut({ 
		 *       pattern : 'ctrl+a', 
		 *       description : 'Select all files', 
		 *       callback : function(e) { ... }, 
		 *       keypress : true|false (bind to keypress instead of keydown) 
		 *    })
		 *
		 * @param  Object  shortcut config
		 * @return elFinder
		 */
		shortcut : function(s) {
			var p, c;

			if (this.options.allowShortcuts && s.pattern && typeof(s.callback) == 'function') {
				s.pattern = s.pattern.toUpperCase();
				
				if (!this.shortcut[s.pattern]) {
					p = s.pattern.split('+');
					c = p.pop();
					
					s.keyCode = this.keyCodes[c] || c.charCodeAt(0);
					if (s) {
						s.altKey   = $.inArray('ALT', p)   != -1;
						s.ctrlKey  = $.inArray('CTRL', p)  != -1;
						s.shiftKey = $.inArray('SHIFT', p) != -1;
						s.type     = s.keypress ? 'keypress' : 'keydown';
						this.shortcuts[s.pattern] = s;
						// this.debug('shortcat-add', s)
					}
				}
			}
			return this;
		},
		
		/**
		 * Proccess ajax request
		 *
		 * @param  Object  data to send to connector or options for ajax request
		 * @param  String  mode. "bg" - do not fired "ajaxstart/ajaxstop", show errors, "silent" - do not fired "ajaxstart/ajaxstop", errors - to debug
		 * @return elFinder
		 */
		ajax : function(opts, mode) {
			var self = this,
				cmd = opts.data ? opts.data.cmd : opts.cmd,
				options = {
					url      : this.options.url,
					async    : true,
					type     : 'get',
					dataType : 'json',
					cache    : false,
					data     : $.extend({}, this.options.customData || {}, opts.data || opts),
					// timeout  : 100,
					error    : function(xhr, status) { 
						var error;
						
						switch (status) {
							case 'abort':
								error = ['Unable to connect to backend', 'Connection aborted'];
								break;
							case 'timeout':
								error = ['Unable to connect to backend', 'Connection timeout'];
								break;
							case 'parsererror':
								error = 'Invalid backend response';
								break;
							default:
								error = xhr && parseInt(xhr.status) > 400 ? 'Unable to connect to backend' : 'Invalid backend response';
						}
						self[mode == 'silent' ? 'debug' : 'trigger']('ajaxerror', {error : error});

					},
					success  : function(data) {
						var req = self.required[cmd] || [],
							i = req.length,
							error;
						
						!mode && self.trigger('ajaxstop', data);

						if (!data) {
							error = 'Invalid backend response';
						} else if (data.error) {
							error = data.error;
						} else {
							while (i--) {
								if (data[req[i]] === void(0)) {
									error = 'Invalid backend response';
									break;
								}
							}
						}

						if (error) {
							return self[mode == 'silent' ? 'debug' : 'trigger']('error', {error : error});
						}

						self.trigger(cmd, data).trigger('updateSelected');
						// delete data
					}
				};
				
			opts.data && $.extend(options, opts)
			
			if (this.ajaxAllowed()) {
				!mode && self.trigger('ajaxstart', options);
				if (this.api < 2) {
					options.data = $.extend({current : this.cwd.hash}, options.data);
				}
				$.ajax(options);
			}
			
			return this;
		},
		
		/**
		 * Return file/dir from current dir by it's hash
		 * 
		 * @param  String  file hash
		 * @return Object
		 */
		get : function(hash) { return this.cdc[hash] || this.tree[hash]; },
		
		exists : function(name) {
			var hash;
			
			for (hash in this.cdc) {
				if (this.cdc.hasOwnProperty(hash) && this.cdc[hash].name == name) {
					return true;
				}
			}
			return false;
		},
		
		getSelected : function() {
			var s = [], 
				l = this.selected.length;
			
			while (l--) {
				if (this.cdc[this.selected[l]]) {
					s.unshift(this.cdc[this.selected[l]]);
				}
			}
			return s;
		},
		
		/**
		 * Change current directory
		 * 
		 * @param  String   dir hash
		 * @param  Boolean  update nav dir tree?
		 * @param  Boolean  send init flag?
		 * @return elFinder
		 */
		open : function(hash, tree, init) {
			var file,  isdir, error;
			
			if (!this.lock()) {
				if (hash && this.cdc[hash]) {
					file   = this.cdc[hash];
					isdir = file.mime == 'directory';
					if (!file.read) {
						error = (isdir ? 'The folder' : 'The file') + ' "$1" can’t be opened because you don’t have permission to see its contents.';
						return this.trigger('error', {error : [[error, file.name]]});
					}
					
					if (!isdir) {
						// open file in new window
						if (file.url || this.cwd.url) {
							// old api store url in file propery
							// new api store only cwd url
							url = file.url || this.cwd.url + encodeURIComponent(file.name);
						} else {
							// urls diabled - open connector
							url = this.options.url 
								+ (this.options.url.indexOf('?') === -1 ? '?' : '&') 
								+(this.api < 2 ? 'cmd=open&current=' + this.cwd.hash : 'cmd=file')
								+ '&target=' + hash;

						}
						if (file.dim) {
							// image - set window size
							s = file.dim.split('x');
							w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
						}

						if (!window.open(url, '_blank', w + 'top=50,left=50,scrollbars=yes,resizable=yes')) {
							// popup blocks
							this.trigger('error', {error : 'Unable to open file in new window.'});
						}
						return this;
					}
				}
				
				data = {
					cmd    : 'open',
					target : hash,
					mimes  : this.options.onlyMimes || [],
					sort   : this.sort[this.options.sort] || 1
				};
				if (tree && this.options.allowNavbar) {
					data.tree = true;
				}
				if (init) {
					data.init = true;
				}
				
				this.ajax(data);
			}
			
			return this;
		},
		
		/**
		 * Reload current directory
		 * 
		 * @return elFinder
		 */
		reload : function() {
			this.buffer = {};
			return this.open(this.cwd.hash, true);
		},
		
		/**
		 * Go into previous folder
		 * 
		 * @return elFinder
		 */
		back : function() {
			if (this.history.length > 1) {
				// drop current dir
				this.history.pop();
				this.open(this.history.pop());
			}
			return this;
		},
		
		/**
		 * Copy files into buffer
		 * 
		 * @param  Array    files hashes array
		 * @param  String   files parent dir hash
		 * @param  Boolean  cut files?
		 * @param  Boolean  method called from drag&drop - required for correct error message
		 * @return Boolean
		 */
		copy : function(files, src, cut, dd) {
			var self = this, 
				tmp  = [], 
				file, error;
			
			// check read/rm permissions
			$.each(files || this.selected, function(i, hash) {
				file = self.cdc[hash] || self.tree[hash];
				if (file) {
					if (!file.read) {
						error = 'Unable to copy "$1". Not enough permission.';
					} else if (cut && !file.rm) {
						error = dd ? 'Unable to move "$1". Not enough permission.' : 'Unable to cut "$1". Not enough permission.';
					}
					if (error) {
						self.trigger('error', {error : [[error, file.name]]});
						return false;
					}
					tmp.push(hash);
				}
			});
			
			if (tmp.length) {
				this.buffer = {
					src   : src || this.cwd.hash,
					cut   : !!cut,
					files : tmp
				};
				this.trigger(cut ? 'cut' : 'copy', this.buffer);
				return true;
			} 
			this.cleanBuffer();	
			return false;
		},
		
		/**
		 * Copy files into buffer and mark for delete after paste
		 * Wrapper for copy method
		 * 
		 * @param  Array  files hashes array
		 * @return elFinder
		 */
		cut : function(files, src) { return this.copy(files, src, true); },
		
		/**
		 * Paste files from buffer into required directory
		 * 
		 * @param  String   directory hash, if not set - paste in current working directory
		 * @clean  Boolean  clean buffer after paste - required by drag&drop
		 * @return elFinder
		 */
		paste : function(dst) {
			var dst = dst || this.cwd.hash,
				b = this.buffer;

			if (b.src == dst) {
				this.trigger('error', {error : 'Unable to copy into itself'});
			} else if (b.files && b.files.length) {
				this.ajax({
					cmd     : 'paste',
					current : this.cwd.hash,
					src     : b.src,
					dst     : dst,
					cut     : b.cut ? 1 : 0,
					targets : b.files
				});
			}
			return this;
		},
		
		/**
		 * Reset files buffer
		 * 
		 * @return elFinder
		 */
		cleanBuffer : function() {
			this.buffer = {files : [], cut : false, src : ''};
			return this;
		},
		
		/**
		 * Remove directories / files
		 * 
		 * @param  Array  files hashes
		 * @return elFinder
		 */
		rm : function(files) {
			var files = $.isArray(files) ? files : [files],
				targets = [],
				i, f;
			
			for (i = 0; i < files.length; i++) {
				if ((f = this.get(files[i]))) {
					if (!f.rm) {
						return this.trigger('error', {error : [['Unable to delete '+(f.mime == 'directory' ? 'folder' : 'file')+' "$1".', f.name], 'Not enough permissions.']});
					}
					targets.push(files[i]);
				}
			}
			
			return targets.length ? this.ajax({cmd : 'rm', targets : targets}, 'nonblocked') : this;
		},
		
		mkdir : function(name) {
			this.ajax({
				cmd     : 'mkdir',
				current : this.cwd.hash,
				name    : name || this.uniqueName('folder')
			})
			
			return this;
		},
		
		mkfile : function(name) {
			var self = this;
			if (!this.locks.ui) {
				this.ajax({
					cmd : 'mkfile',
					current : this.cwd.hash,
					name : name || this.uniqueName('file')
				}, {
					error : function(xhr) { self.log(xhr) },
					success : function(data) { self.log(data); }
				})
			}
			return this;
		},
		
		duplicate : function(files) {
			var self = this, target = [];
			
			$.each(files || this.selected, function(i, hash) {
				if (self.cdc[hash]) {
					// @TODO check for readonly/na files
					target.push(hash);
				}
			});
			
			this.log(target)
			
			if (!this.locks.ui) {
				this.ajax({
					current : this.cwd.hash,
					target : this.api > 1 ? target : target.shift()
				}, {
					error : function(xhr) { self.log(xhr) },
					success : function(data) { self.log(data); }
				})
			}
			
		},
		
		uniqueName : function(prefix) {
			var i = 0, name;
			
			if (!this.exists(prefix)) {
				return prefix;
			}
			while (i < 100) {
				if (!this.exists((name = prefix + ' '+(++i)))) {
					return name;
				}
			}
			return prefix + Math.random();
		},
		
		/**
		 * Return message translated onto current language
		 *
		 * @param  String|Array  message[s]
		 * @return String
		 **/
		i18n : function(m) { 
			var self = this, msg;

			if ($.isArray(m)) {
				msg = m.shift();
				msg = this.messages[msg] || msg;
				return msg.replace(/\$(\d+)/g, function(a, num) { return m[num-1] || ''; });
			}
			return (this.messages[m] || m).replace(/\$(\d+)/g, ''); 
		},
		
		required : {
			open : ['cwd', 'cdc'],
			tree : ['tree'],
			tmb  : ['current', 'images']
 		},
		
		sort : {
			nameDirsFirst : 1,
			kindDirsFirst : 2,
			sizeDirsFirst : 3,
			name : 4,
			kind : 5,
			size : 6
		},
		
		/**
		 * Key codes for non alfanum keys
		 *
		 * @type Object
		 **/
		keyCodes : {
			'ARROWLEFT'  : 37,
			'ARROWUP'    : 38,
			'ARROWRIGHT' : 39,
			'ARROWDOWN'  : 40,
			'ESC'        : 27,
			'ENTER'      : 13,
			'SPACE'      : 32,
			'DELETE'     : 46,
			'BACKSPACE'  : 8
		},
		
		i18 : {
			en : {
				_translator  : '',
				_translation : 'English localization',
				dir          : 'ltr',
				messages     : {}
			}
		},
		
		log : function(m) { window.console && window.console.log && window.console.log(m); },
		
		debug : function(type, m) {
			var d = this.options.debug;

			if (d == 'all' || d === true || ($.isArray(d) && $.inArray(type, d) != -1)) {
				window.console && window.console.log && window.console.log('elfinder debug: ['+type+'] ', m);
			} 
			return this;
		},
		time : function(l) { window.console && window.console.time && window.console.time(l); },
		timeEnd : function(l) { window.console && window.console.timeEnd && window.console.timeEnd(l); }
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
					
				case'destroy':
					this.elfinder.destroy();
					break;
			}
			
		})
	}
	
	$.fn.getElFinder = function() {
		var instance;
		
		this.each(function() {
			if (this.elfinder) {
				instance = this.elfinder;
				return false;
			}
		});
		
		return instance;
	}
	
	
})(jQuery);