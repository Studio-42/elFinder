(function($) {
	
	elFinder = function(el, o) {
		var self = this,
			
			/**
			 * Flag to fire "load" event
			 *
			 * @type Boolean
			 **/
			loaded = false,
			
			/**
			 * Permissions to exec ajax requests and build-in shortcuts
			 *
			 * @type Object
			 **/
			permissions = {
				ajax : true,
				shortcuts : true
			},
			
			/**
			 * Core parameters from connctor
			 *
			 * @type Object
			 **/
			params = {},
			
			cwd = {
				hash   : '',
				phash  : '',
				name   : '',
				path   : '',
				url    : '',
				date   : '',
				read   : 1,
				write  : 1,
				rm     : 1,
				params : {}
			},
			
			files = {},
			
			tree = {},
			
			/**
			 * Selected files ids
			 *
			 * @type Array
			 **/
			selected = [],
			
			/**
			 * Events listeners
			 *
			 * @type Object
			 **/
			listeners = {
				load      : [],
				focus     : [],
				blur      : [],
				ajaxstart : [],
				ajaxstop  : [],
				ajaxerror : [],
				error     : [],
				select    : [],
				open      : []
				
			},
			
			/**
			 * Target node
			 *
			 * @type jQuery
			 **/
			$el = $(el)	;
			
		/**
		 * Application version
		 *
		 * @type String
		 **/
		this.version = '2.0 beta';
		
		/**
		 * Protocol version
		 *
		 * @type String
		 **/
		this.api = 1;
		
		/**
		 * Configuration options
		 *
		 * @type Object
		 **/
		this.options = $.extend({}, this.options, o||{});
		
		/**
		 * United core parameters from connector and from cwd (new api)
		 *
		 * @type Object
		 **/
		this.params = {};
		
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
		this.view = this.viewType();
		
		
		
		/**
		 * Enable ajax requests and shortcuts.
		 * Take effect only if fm loaded correctly.
		 *
		 * @return elFinder
		 **/
		this.activate = function() {
			if (loaded) {
				permissions = {
					ajax : true,
					shortcuts : true
				}
			}
			return this;
		}
		
		/**
		 * Disable ajax requests and shortcuts.
		 *
		 * @return elFinder
		 **/
		this.deactivate = function() {
			permissions = {
				ajax : false,
				shortcuts : false
			}
			return this;
		}
		
		/**
		 * Return true if build-in shortcuts enabled.
		 *
		 * @return Boolean
		 **/
		this.active = function() {
			return permissions.shortcuts;
		}
		
		/**
		 * Return selected files hashes
		 *
		 * @return Array
		 **/
		this.selected = function() {
			return selected;
		}
		
		/**
		 * Return number of selected files
		 *
		 * @return Number
		 **/
		this.countSelected = function() {
			return selected.length;
		}
		
		/**
		 * Proccess ajax request
		 *
		 * @param  Object  data to send to connector or options for ajax request
		 * @param  String  mode. "bg" - do not fired "ajaxstart/ajaxstop", show errors, "silent" - do not fired "ajaxstart/ajaxstop", errors - to debug
		 * @return elFinder
		 */
		this.ajax = function(opts, mode) {
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
								error = ['Unable to connect to backend.', 'Connection aborted.'];
								break;
							case 'timeout':
								error = ['Unable to connect to backend.', 'Connection timeout.'];
								break;
							case 'parsererror':
								error = 'Invalid backend response';
								break;
							default:
								error = xhr && parseInt(xhr.status) > 400 ? 'Unable to connect to backend.' : 'Invalid backend response.';
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
			
			if (permissions.ajax) {
				!mode && self.trigger('ajaxstart', options);
				$.ajax(options);
			}
			
			return this;
		};
		
		/**
		 * Attach listener to events
		 * To bind to multiply events at once, separate events names by space
		 * 
		 * @param  String  event(s) name(s)
		 * @param  Object  event handler
		 * @return elFinder
		 */
		this.bind = function(e, c) {
			var e, i;
			
			if (typeof(c) == 'function') {
				e = ('' + e).toLowerCase().split(/\s+/)
				for (i = 0; i < e.length; i++) {
					if (listeners[e[i]] === void(0)) {
						listeners[e[i]] = [];
					}
					listeners[e[i]].push(c);
				}
			}
			return this;
		};
		
		/**
		 * Remove event listener if exists
		 *
		 * @param  String    event name
		 * @param  Function  callback
		 * @return elFinder
		 */
		this.unbind = function(e, c) {
			var l = listeners[('' + e).toLowerCase()] || [],
				i = l.indexOf(c);

			i > -1 && l.splice(i, 1);
			return this;
		};
		
		/**
		 * Send notification to all event listeners
		 *
		 * @param  jQuery.Event|String  event or event type
		 * @param  Object        extra parameters
		 * @return elFinder
		 */
		this.trigger = function(e, d) {
			var e = this.event(e, d||{}),
				l = listeners[e.type]||[], i;

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
		};
		
		/**
		 * Return current working directory info
		 * 
		 * @return Object
		 */
		this.cwd = function() {
			return cwd;
		}
		
		/**
		 * Return file data from current dir or tree by it's hash
		 * 
		 * @param  String  file hash
		 * @return Object
		 */
		this.file = function(hash) { 
			return files[hash] || tree[hash]; 
		};
		
		/**
		 * Return file data from current dir if file with required name exists
		 * 
		 * @param  String  file name
		 * @return Object
		 */
		this.fileByName = function(name) {
			var hash;
			
			for (hash in files) {
				if (files.hasOwnProperty(hash) && files[hash].name == name) {
					return files[hash];
				}
			}
		};
		
		/**
		 * Return file/dir info with required name
		 * 
		 * @param  String  file hash
		 * @return Object|Boolean
		 */
		this.fileExists = function(name) {
			return this.fileByName(name) !== void(0);
		};
		
		/**
		 * Return selected files info
		 * 
		 * @return Array
		 */
		this.selectedFiles = function() {
			return $.map(selected, function(hash) { return files[hash] || null });
		};
		
		this.newAPI = false;
		this.oldAPI = true;
		
		this
			// disable/enable ajax on ajaxstart/ajaxstop events
			.bind('ajaxstart ajaxstop', function(e) {
				permissions.ajax = e.type == 'ajaxstop';
			})
			// enable shortcuts on click inside file manager ui
			.bind('focus', function() {
				if (!permissions.shortcuts) {
					$('texarea,:text').blur();
					permissions.shortcuts = true;
				}
			})
			// disable shortcuts on click outside file manager ui
			.bind('blur', function() {
				lock = true;
			})
			// cache selected files hashes
			.bind('select', function(e) {
				var hashes = [];

				selected = $.map(e.data.selected || [], function(hash) { 
					if (files[hash] && $.inArray(hash, hashes) === -1) {
						hashes.push(hash);
						return hash;
					}
					return null;
				});
			})
			// set some params and cache directory content
			.bind('open', function(e) {
				var data = e.data,
					l = data.cdc.length, 
					f;

				// initial loading
				if (!loaded) {
					loaded   = true;
					self.api = parseFloat(e.data.api) || 1;
					self.newAPI = self.api > 1;
					self.oldAPI = !self.newAPI;
					
					if (data.params) {
						// remove disabled commands
						$.each(data.params.disabled || [], function(i, cmd) {
							self.commands[cmd] && delete self.commands[cmd];
						});
						data.params.disabled = [];
						// store core params
						params = data.params;
					}
				}
				
				// join core and cwd params
				self.params = $.extend({}, params, self.api > 1 ? data.cwd.params : {});

				cwd = data.cwd;

				if (self.api < 2) {
					cwd.url = params.url;
				}

				// remember last dir
				self.lastDir(cwd.hash);

				// cache directory content
				files = {};
				while(l--) {
					f = data.cdc[l];
					if (f.name && f.hash) {
						files[f.hash] = f;
					}
				}

				// clean selected files cache
				selected = [];
				
				// fire "load" event and remove its listeners
				if (listeners.load) {
					self.trigger('load').debug('api-version', self.api);
					delete listeners.load;
				}
				
			})
			// cache directories tree data
			.bind('open tree', function(e) {
				var src = e.data.tree || [],
					l = src.length,
					f,
					traverse = function(dir) {
						var l, d;

						function add(d) {
							if (d.name && d.hash && !tree[d.hash]) {
								d = $.extend({mime : 'directory', rm : 1}, d);
								delete d.dirs;
								tree[d.hash] = d;
							}
						}

						add(dir);

						if (dir.dirs && dir.dirs.length) {
							l = dir.dirs.length;
							while (l--) {
								d = dir.dirs[l];
								d.dirs && d.dirs.length ? traverse(d) : add(d);
							}
						}
					};
					
				// init/reload or old api - clean tree cache
				if (self.oldAPI && e.type =='open' && e.data.tree) {
					tree = {};
					traverse(src);
					self.log(tree)
				} else if (self.newAPI) {
					while (l--) {
						f = src[l];
						if (f.hash && f.name && !tree[f.hash]) {
							f.mime = 'directory';
							tree[f.hash] = f;
						}
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
			.bind('paste', function(e) {
				self.log(e.data)
				if (self.oldAPI) {
					// e.stopPropagation()
					self.trigger('open', e.data)
				}
			})
			;
			
		// bind to keydown/keypress if shortcuts allowed
		if (this.options.allowShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;
		
				if (permissions.shortcuts) {
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
		
		this.one('ajaxerror error', function(e) {
			// fm not correctly loaded
			if (!loaded) {
				e.stopPropagation();
				self.deactivate();
				listeners = {};
			}
		});
		
		if (!this.options.url) {
			return this.deactivate().trigger('error', {error : 'Invalid configuration! You have to set URL option.'});
		}
		
		this.open(this.lastDir(), true, true);

	}
	
	
	elFinder.prototype = {
		/**
		 * Return true if connector use new (>=2.0) api version
		 *
		 * @return Boolean
		 */
		isNewApi : function() {
			return this.api > 1;
		},
		
		/**
		 * Get/set cookie
		 *
		 * @param  String       cookie name
		 * @param  String|void  cookie value
		 * @return String|void
		 */
		cookie : function(name, value) {
			var d, o, c, i;

			if (value === void(0)) {
				if (document.cookie && document.cookie != '') {
					c = document.cookie.split(';');
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
			if (value === null) {
				value = '';
				o.expires = -1;
			}
			if (typeof(o.expires) == 'number') {
				d = new Date();
				d.setTime(d.getTime()+(o.expires * 86400000));
				o.expires = d;
			}
			document.cookie = name+'='+encodeURIComponent(value)+'; expires='+o.expires.toUTCString()+(o.path ? '; path='+o.path : '')+(o.domain ? '; domain='+o.domain : '')+(o.secure ? '; secure' : '');
			return value;
		},
		
		/**
		 * Get/set view type (icons | list)
		 *
		 * @param  String|void  type
		 * @return Strng
		 */
		viewType : function(t) {
			var c = 'el-finder-view',
				r = /^icons|list$/i;

			if (t && r.test(t)) {
				this.cookie(c, (this.view = t));
			} else if (!this.view) {
				t = this.cookie(c);
				this.view = r.test(t) ? t : 'icons'
			}
			return this.view;
		},
		
		/**
		 * Get/set last opened directory
		 * 
		 * @param  String|undefined  dir hash
		 * @return String
		 */
		lastDir : function(key) { 
			return this.options.rememberLastDir ? this.cookie('el-finder-last', key) : ''; 
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
		 * Bind callback to event(s) The callback is executed at most once per event.
		 * To bind to multiply events at once, separate events names by space
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
		 * Open directory/file
		 * 
		 * @param  String   file hash
		 * @param  Boolean  update nav dir tree? (for open dir only)
		 * @param  Boolean  send init flag? (for open dir only)
		 * @return elFinder
		 */
		open : function(hash, tree, init) {
			var file  = this.file(hash), 
				isdir = !file || file.mime == 'directory',
				error;
			
			if (file && !file.read) {
				error = (isdir ? 'The folder' : 'The file') + ' "$1" can’t be opened because you don’t have permission to see its contents.';
				return this.trigger('error', {error : [[error, file.name]]});
			}	
			
			// change directory
			if (isdir) {
				data = {
					cmd    : 'open',
					target : hash || '',
					mimes  : this.options.onlyMimes || [],
					sort   : this.sort[this.options.sort] || 1
				};

				if (tree && this.options.allowNavbar) {
					data.tree = true;
				}
				if (init) {
					data.init = true;
				}

				return this.ajax(data);
			}
			
				
			// open file in new window
			if (this.cwd().url) {
				// old api store url in file propery
				// new api store only cwd url
				url = file.url || this.cwd().url + encodeURIComponent(file.name);
			} else {
				// urls diabled - open connector
				url = this.options.url 
					+ (this.options.url.indexOf('?') === -1 ? '?' : '&') 
					+(this.api < 2 ? 'cmd=open&current=' + this.cwd().hash : 'cmd=file')
					+ '&target=' + hash;
			}
			// image - set window size
			if (file.dim) {
				s = file.dim.split('x');
				w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
			}

			if (!window.open(url, '_blank', w + 'top=50,left=50,scrollbars=yes,resizable=yes')) {
				// popup blocks
				this.trigger('error', {error : ['Unable to open file in new window.', 'Allow popup window in your browser.']});
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
			return this.open(this.cwd().hash, true);
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
		 * @param  String   files parent dir hash (required by old api)
		 * @param  Boolean  cut files?
		 * @param  Boolean  method called from drag&drop - required for correct error message
		 * @return Boolean
		 */
		copy : function(files, src, cut, dd) {
			var self  = this, 
				error = '',
				files = $.map(files, function(hash) {
					var file = self.file(hash);
					
					if (file && !error && (!file.read || (cut ? !file.rm : false))) {
						error = (cut ? (dd ? 'Unable to move "$1"' : 'Unable to cut "$1"') : 'Unable to copy "$1"') + '. Not enough permission.';
						error = self.i18n([error, file.name]);
					}
					return file ? hash : null;
				});
				
			if (error) {
				self.trigger('error', {error : error});
				
			} else if (files.length) {
				this.buffer = {
					src   : src || this.cwd().hash,
					cut   : cut ? 1 : 0,
					files : files
				};
				this.trigger(cut ? 'cut' : 'copy', {buffer : this.buffer});
				return true;
			}
			
			return false;
		},
		
		/**
		 * Copy files into buffer and mark for delete after paste
		 * Wrapper for copy method
		 * 
		 * @param  Array  files hashes array
		 * @return elFinder
		 */
		cut : function(files, src) { 
			return this.copy(files, src, true); 
		},
		
		/**
		 * Paste files from buffer into required directory
		 * 
		 * @param  String   directory hash, if not set - paste in current working directory
		 * @clean  Boolean  clean buffer after paste - required by drag&drop
		 * @return elFinder
		 */
		paste : function(dst) {
			var cwd = this.cwd().hash,
				dst = dst || cwd,
				b = this.buffer;

			if (b.src == dst) {
				this.trigger('error', {error : 'Unable to copy into itself'});
			} else if (b.files && b.files.length) {
				this.ajax({
					cmd     : 'paste',
					current : cwd,
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
		timeEnd : function(l) { window.console && window.console.timeEnd && window.console.timeEnd(l); },
		
		commands : {}
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