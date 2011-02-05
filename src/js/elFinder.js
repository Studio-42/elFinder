(function($) {
	
	elFinder = function(el, o) {
		window.console.time('create')
		var self = this,
			/**
			 * Target node
			 *
			 * @type jQuery
			 **/
			$el = $(el),
			/**
			 * Key codes for special keys
			 *
			 * @type Object
			 **/
			codes = {
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
			/**
			 * Default error handler for paste/delete etc methods
			 * Display error message and return true to call success method
			 *
			 * @param String error message
			 * @type Boolean  always true
			 **/
			error = function(m) { self.trigger('error', {error : m}); return true; },
			/**
			 * Default ajax handler for paste/delete etc methods
			 * Trigger "cd" event
			 *
			 * @param Object  data recievied from ajax request
			 * @type void
			 **/
			success = function(d) { self.trigger('cd', d); },
			/**
			 * Load images thumbnails in background
			 *
			 * @param String  current dir hash
			 * @return void
			 */
			tmb = function(key) {
				self.ajax({
						// do not trigger ajaxstart event
						silent : true,
						data : {cmd : 'tmb', current : key},
						ajax : {
								// ajax error handler
								error : function(r) {
									self.debug('error', r.status);
								},
								// request handler
								success : function(d) {
									if (!d || d.error) {
										return self.debug('error', d ? d.error : 'Uknown error');
									}

									if (d.images && d.current == self.cwd.hash && self._view == 'icons') {
										d.tmb && tmb(self.cwd.hash);
										self.ui.tmb(d.images);
										self.debug('tmb', d);
									}
								}
							}
					});
			}
			;
			
		/**
		 * Application version
		 *
		 * @type String
		 **/
		this.version = '1.2 beta';
		
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
		 * Flags indicates what functionality disabled now
		 *
		 * @type Object
		 **/
		this.locks = {ui : false, shortcuts : false};
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
			load   : [],
			focus  : [  ],
			blur   : [  ],
			cd     : [],
			select : [],
			error  : [],
			ajaxstart : [],
			ajaxstop : [],
			ajaxerror : [],
			lock   : []
		};
		
		
		/**
		 * Create/normalize event - add event.data object if not exists and
		 * event.data.elfinder - current elfinder instance
		 * 
		 * @param  jQuery.Event|String  event or event name
		 * @return jQuery.Event
		 */
		this.event = function(e, data) {
			if (!e.type) {
				e = $.Event(e.toLowerCase());
			}
			e.data = $.extend(e.data, data, { elfinder : this });
			return e;
		}
		
		/**
		 * Add event listener
		 * 
		 * @param  jQuery.Event|String  event or event name
		 * @param  Object  event handler
		 * @return elFinder
		 */
		this.bind = function(e, c) {
			if (typeof(c) == 'function') {
				$.each(e.toLowerCase().split(/\s+/), function(i, e) {
					if (self.listeners[e] === void(0)) {
						self.listeners[e] = [];
					}
					self.listeners[e].push(c);
				});
			}
			return this;
		}
		
		/**
		 * Send notification to all event subscribers
		 *
		 * @param  jQuery.Event|String  event or event type
		 * @param  Object        extra parameters
		 * @return elFinder
		 */
		this.trigger = function(e, d) {
			var e = this.event(e, d),
				l = this.listeners[e.type]||[], i;

			this.debug('event-'+e.type, d);
			// d && this.debug('event-data', d);

			for (i = 0; i < l.length; i++) {
				if (e.isPropagationStopped()) {
					break;
				}
				try {
					l[i](e);
				} catch (ex) {
					window.console && window.console.error && window.console.error(ex);
				}
			}
			return this;
		}
		
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
		this.shortcut = function(s) {
			var p, c;

			if (this.options.allowShortcuts && s.pattern && typeof(s.callback) == 'function') {
				s.pattern = s.pattern.toUpperCase();
				
				if (!this.shortcut[s.pattern]) {
					p = s.pattern.split('+');
					c = p.pop();
					
					s.keyCode = codes[c] || c.charCodeAt(0);
					if (s) {
						s.altKey   = $.inArray('ALT', p) != -1;
						s.ctrlKey  = $.inArray('CTRL', p) != -1;
						s.shiftKey = $.inArray('SHIFT', p) != -1;
						s.type     = s.keypress ? 'keypress' : 'keydown';
						this.shortcuts[s.pattern] = s;
						this.debug('shortcat-add', s)
					}
				}
			}
			return this
		}
		
		/**
		 * Produce ajax request
		 * Argment:
		 * { 
		 *     data : {}, data to send
		 *     error : function(message) { return true|false }, hadlers for connector sended error (ajax request in this case is ok).
		 *			return false - for fatal errors, true - for non fatal
		 *     success : function(data) { }, response data handler,
		 *     ajax : { if set - overwrite default ajax settings
		 *         error : function(r) {}, ajax error handler
		 *         success : function(data) { } response handler
		 *         etc...
		 *     }
		 * }
		 * 
		 * @param  Object  options
		 * @return elFinder
		 */
		this.ajax = function(opts) {
			var o = {
					url      : this.options.url,
					async    : true,
					type     : 'get',
					data     : $.extend({}, this.options.customData, opts.data),
					dataType : 'json',
					cache    : false,
					error    : function(r) {  
						var s = r && r.status ? r.status : 0;
						
						self.trigger('ajaxerror', { 
							status : s, 
							error : s == '404' ? 'Unable to connect to backend' : 'Invalid backend configuration' 
						}); 
					},
					success  : function(d) {
						var err = d ? d.error : 'Unknown error';
						
						!opts.silent && self.trigger('ajaxstop', d);

						if (err && !(opts.error || function(m) { self.trigger('error', {error : m}); })(err)) {
							// by default do not proccess data on error
							return;
						}
						
						// if connector die we get null instead of json
						// so check it
						if (d) {
							d.tmb && d.cwd && tmb(d.cwd.hash);
							opts.success && opts.success(d);
						}
					}
				};
			
			if (!this.locks.ui) {
				$.extend(o, opts.ajax);
				!opts.silent && this.trigger('ajaxstart', o);
				$.ajax(o);
			}
			return this;
		}
		

		/**
		 * Lock/unlock some functionality
		 * 
		 * @param  Object  options
		 * @return elFinder
		 */
		this.lock = function(o) {
			if (o === void(0)) {
				return this.locks;
			}
			$.extend(this.locks, o);
			this.trigger('lock', { locks : this.locks });
		}
	
		/**
		 * Return file/dir from current dir by it's hash
		 * 
		 * @param  String  file hash
		 * @return Object
		 */
		this.get = function(key) {
			return this.cdc[key];
		}
	
		this.getByName = function(name) {
			
		}
	
		this.exec = function(cmd) {
			
		}
	
		/**
		 * Get/set last opened directory
		 * 
		 * @param  String  dir hash
		 * @return String|undefined
		 */
		this.last = function(key) {
			return this.options.rememberLastDir ? this.cookie('el-finder-last', key) : void(0);
		}
		
		this.resize = function(w, h) {
			
		}
		
		this.getSelected = function() {
			var s = [], l = this.selected.length;
			
			while (l--) {
				if (this.cdc[this.selected[l]]) {
					s.unshift(this.cdc[this.selected[l]])
				}
			}
			return s;
		}

		/**
		 * Change current directory
		 * 
		 * @param  String   dir hash
		 * @param  Boolean  update nav dire tree?
		 * @param  Boolean  send init flag?
		 * @return elFinder
		 */
		this.cd = function(key, tree, init) {
			var o = {
					data    : {cmd : 'open', target : key},
					success : function(d) { 
						self.trigger('cd', d); 
						delete d; 
					}
				};
			
			if (!this.locks.ui) {
				if (this.cdc[key] && !this.cdc[key].read) {
					this.trigger('error', {error : 'Access denied'});
				} else {
					if (tree) {
						o.data.tree = true;
					}
					if (init) {
						o.data.init = true;
					}
					this.selected = [];
					this.ajax(o);
				}
			}
			return this;
		}
		

		/**
		 * Reload current directory
		 * 
		 * @return elFinder
		 */
		this.reload = function() {
			this.buffer = {};
			return this.cd(this.cwd.hash, true);
		}
		
		this.open = function(hash) {
			if (!this.locks.ui) {
				if (this.cdc[hash] && this.cdc[hash].mime != 'directory') {
					this.log('open file')
				} else {
					this.cd(hash);
				}
			}
			return this;
		}
		
		/**
		 * Go to previous opened directory
		 * 
		 * @return elFinder
		 */
		this.back = function() {
			if (this.history.length > 1) {
				// drop current dir
				this.history.pop();
				this.cd(this.history.pop());
			}
			return this;
		}
		
		/**
		 * Copy files into buffer
		 * 
		 * @param  Array    files hashes array
		 * @param  String   files parent dir hash
		 * @param  Boolean  cut files?
		 * @return elFinder
		 */
		this.copy = function(files, src, cut) {
			this.buffer   = {
				src   : src || this.cwd.hash,
				cut   : cut,
				files : files
			};
			return this;
		}
		
		/**
		 * Copy files into buffer and mark for delete after paste
		 * Wrapper for copy method
		 * 
		 * @param  Array  files hashes array
		 * @return elFinder
		 */
		this.cut = function(files, src) {
			return this.copy(files, src, true);
		}
		
		/**
		 * Paste files from buffer into required directory
		 * 
		 * @param  String - directory hash, if not set - paste in current working directory
		 * @return elFinder
		 */
		this.paste = function(dst) {
			var b = this.buffer, o;
			this.log(dst)
			dst = dst || this.cwd.hash;
			
			if (b.src == dst) {
				this.trigger('error', {error : 'Unable to copy into itself'});
			} else if (b.files && b.files.length) {
				this.ajax({
					error   : error,
					success : success,
					data    : {
						cmd     : 'paste',
						current : this.cwd.hash,
						src     : b.src,
						dst     : dst,
						cut     : b.cut ? 1 : 0,
						targets : b.files
					}});
			}
			
			return this;
		}
		
		/**
		 * Paste copied files in directory
		 * Wrapper for copy method
		 * 
		 * @param  String - directory hash, if not set - paste in current working directory
		 * @return elFinder
		 */
		this.rm = function(files) {
			var o = {
				error : error,
				success : success,
				data : {cmd : 'rm', current : this.cwd.hash, targets : []}
			};
			
			
			if (!this.locks.ui) {
				$.each(files||this.selected, function(i, f) {
					o.data.targets.push(f.hash);
				});
				
				o.data.targets.length && this.ajax(o);
			}
		}
		
		this.rename = function(file, name) {
			
		}
		
		this.duplicate = function(file) {
			
		}
		
		this.i18n = function(m) {
			return this.messages[m] || m;
		}
		
		this.bind('cd', function(e) {
			var d = e.data, l;
			
			if (d.cdc) {
				self.cwd = d.cwd;
				self.cdc = {};
				l = d.cdc.length;
				while (l--) {
					self.cdc[d.cdc[l].hash] = d.cdc[l];
					self.cwd.size += d.cdc[l].size;
				}
				if (d.customData) {
					self.options.customData = $.extend({}, self.options.customData, d.customData);
				}
				self.last(d.cwd.hash);
				// update history if its empty or this event is not reload current dir
				if (!self.history.length || self.history[self.history.length-1] != d.cwd.hash) {
					self.history.push(d.cwd.hash);
				}
				// self.log(self.cwd)
				// self.log(self.history)
			}
		})
		.bind('ajaxstart ajaxerror ajaxstop', function(e) {
			var l = e.type != 'ajaxstop';
			self.lock({ ui : l, shortcuts : l });
		}).bind('focus', function() {
			if (self.locks.shortcuts) {
				self.locks.shortcuts = false;
				$('texarea,:text').blur();
			}
		}).bind('blur', function() {
			self.locks.shortcuts = true;
		});


		// bind to keydown/keypress if shortcuts allowed
		if (this.options.allowShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;

				$.each(self.shortcuts, function(i, s) {
					if (s.type == e.type && c == s.keyCode && s.shiftKey == e.shiftKey && s.ctrlKey == ctrlKey && s.altKey == e.altKey) {
						e.preventDefault();
						e.data = {elfinder : self};
						s.callback(e);
						
						self.debug('shortcut', s.pattern);
						return false;
					}
				});
			});
		}
		
		

		this.ui = new this.ui(this, $el);
		this.ui.init()
		// this.viewType('icons')
		
		
		$(document).click(function() {
			self.trigger('blur');
		});
		
		
		
		this.cd(this.last() || '', true, true);
		this.trigger('focus')
		// cookie(this.cookies.view, 'list')
		window.console.timeEnd('create')
	}
	
	elFinder.prototype.log = function(m) {
		window.console && window.console.log && window.console.log(m);
	}
	
	elFinder.prototype.debug = function(type, m) {
		var d = this.options.debug;
		
		if (d == 'all' || d === true || ($.isArray(d) && $.inArray(type, d) != -1)) {
			window.console && window.console.log && window.console.log('elfinder debug: ['+type+'] ', m);
		} 
		return this;
	}
	
	elFinder.prototype.time = function(l) {
		window.console && window.console.time && window.console.time(l);
	}
	
	elFinder.prototype.timeEnd = function(l) {
		window.console && window.console.timeEnd && window.console.timeEnd(l);
	}
	
	elFinder.prototype.viewType = function(t) {
		var c = 'el-finder-view';
		
		if (t && /^icons|list$/i.test(t)) {
			this.cookie(c, (this._view = t));
		} else if (!this._view) {
			t = this.cookie(c);
			return /^icons|list$/i.test(t) ? t : 'icons'
		}
		return this._view;
	}
	
	elFinder.prototype.cookie = function(name, value) {
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
	
	elFinder.prototype.i18 = {
		en : {
			_translator  : '',
			_translation : 'English localization',
			dir          : 'ltr',
			messages     : {}
		}
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
	
	$.fn.elfinderallattr = function(attr) {
		var a = [];
		
		this.each(function() {
			a.push($(this).attr(attr));
		});
		
		return a;
	}
	
	
})(jQuery);