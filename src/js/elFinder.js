(function($) {
	
	elFinder = function(el, o) {
		var self = this,
			/**
			 * Target node
			 *
			 * @type jQuery
			 **/
			$el = $(el),
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
		this.locks = {
			// user actions and comands execution disabled (while ajax request)
			ui : false, 
			// shortcuts disabled
			shortcuts : false
		};
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
		
		
		this.bind('focus', function() {
				if (self.locks.shortcuts && !self.locks.ui) {
					self.locks.shortcuts = false;
					$('texarea,:text').blur();
				}
			})
			.bind('blur', function() {
				self.locks.shortcuts = true;
			})
			.one('cd', function(e, fm) {
				// @TODO - disabled
				$.extend(self.params, e.data.params);
			})
			.bind('cd', function(e) {
				var cdc = e.data.cdc,
					l   = cdc.length,
					h   = self.history,
					hl  = h.length;
				
				// update curent dir info and content	
				self.cwd = e.data.cwd;
				self.cdc = {};
				while (l--) {
					self.cdc[cdc[l].hash] = cdc[l];
					self.cwd.size += cdc[l].size;
				}
				
				// remember last dir
				self.last(self.cwd.hash);
				
				// update history if required
				if (!hl || h[hl - 1] != self.cwd.hash) {
					h.push(self.cwd.hash);
				}
				
				self.selected = [];
			});
			
		// bind to keydown/keypress if shortcuts allowed
		if (this.options.allowShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;
		
				$.each(self.shortcuts, function(i, s) {
					if (s.type == e.type && c == s.keyCode && s.shiftKey == e.shiftKey && s.ctrlKey == ctrlKey && s.altKey == e.altKey) {
						e.preventDefault();
						s.callback(e, self);
						self.debug('shortcut', s.pattern);
						return false;
					}
				});
			});
		}
		
		this.ui = new this.ui(this, $el);
		this.ui.init();
		
		// $.each(this.listeners, function(e, c) {
		// 	// self.log(e)
		// 	self.bind(e, function() {
		// 		self.log(e)
		// 		self.log(self.buffer.files)
		// 	})
		// })
		
		
		this.cd(this.last() || '', true, true);
		// this.trigger('focus')

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
		 * Get/set last opened directory
		 * 
		 * @param  String  dir hash
		 * @return String|undefined
		 */
		last : function(key) { return this.options.rememberLastDir ? this.cookie('el-finder-last', key) : void(0); },
		
		/**
		 * Lock/unlock some functionality
		 * 
		 * @param  Object  options { ui : true|false, shortcuts : true|false }
		 * @return elFinder
		 */
		lock : function(o) {
			if (o === void(0)) {
				return this.locks;
			}
			$.extend(this.locks, o);
			this.trigger('lock', { locks : this.locks });
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
			e.data = $.extend(e.data, data);
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
			var e = this.event(e, d),
				l = this.listeners[e.type]||[], i;

			this.debug('event-'+e.type, d);

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
						this.debug('shortcat-add', s)
					}
				}
			}
			return this;
		},
		
		/**
		 * Proccess ajax request
		 *
		 * @param  Object  data to send to connector
		 * @param  Object  ajax options
		 * @param  Boolean if set - "ajaxstart" event not fired
		 * @return elFinder
		 */
		ajax : function(data, opts, silent) {
			var self = this,
				o = {
					url      : this.options.url,
					async    : true,
					type     : 'get',
					dataType : 'json',
					cache    : false,
					// timeout  : 1000,
					error    : function(xhr, status) { 
						var msg = status == 'timeout' || status == 'abort' || (xhr ? parseInt(xhr.status) : 0) > 400
								? 'Unable to connect to backend' 
								: 'Invalid backend configuration';
						
						self.trigger('ajaxerror', {error : msg}).debug('ajaxerror', xhr);
					},
					success  : function(data) {
						self.trigger('ajaxstop', data);

						if (!data || data.error) {
							return self.trigger('error', {error : data ? data.error : 'Unknown error'});
						}
						
						self.trigger('cd', data);
					}
				};
				
			if (!this.locks.ui) {
				o = $.extend(o, opts, {data : data});
				!silent && self.trigger('ajaxstart', o);
				$.ajax(o);
			}
			
			return this;
		},
		
		/**
		 * Return file/dir from current dir by it's hash
		 * 
		 * @param  String  file hash
		 * @return Object
		 */
		get : function(hash) { return this.cdc[hash]; },
		
		
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
		 * @param  Boolean  update nav dire tree?
		 * @param  Boolean  send init flag?
		 * @return elFinder
		 */
		cd : function(hash, tree, init) {
			var data = {cmd : 'open', target : hash};
			
			if (!this.locks.ui) {
				
				if (this.cdc[hash] && !this.cdc[hash].read) {
					return this.trigger('error', {error : 'Access denied'});
				} 
				if (tree) {
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
		 * Open file or directory
		 * 
		 * @param  String  file/dir hash
		 * @return elFinder
		 */
		open : function(hash) {
			if (!this.locks.ui) {
				if (this.cdc[hash] && this.cdc[hash].mime != 'directory') {
					this.log('open file')
				} else {
					this.cd(hash);
				}
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
			return this.cd(this.cwd.hash, true);
		},
		
		/**
		 * Go to previous opened directory
		 * 
		 * @return elFinder
		 */
		back : function() {
			if (this.history.length > 1) {
				// drop current dir
				this.history.pop();
				this.cd(this.history.pop());
			}
			return this;
		},
		
		/**
		 * Copy files into buffer
		 * 
		 * @param  Array    files hashes array
		 * @param  String   files parent dir hash
		 * @param  Boolean  cut files?
		 * @return elFinder
		 */
		copy : function(files, src, cut) {
			files = ($.isArray(files) ? files : this.selected).slice(0);

			this.cleanBuffer();			
			if (files.length) {
				this.buffer = {
					src   : src || this.cwd.hash,
					cut   : !!cut,
					files : files
				};
			}
			return this;
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
		paste : function(dst, clean) {
			var b = this.buffer, o;

			dst = dst || this.cwd.hash;
			
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
				clean && this.cleanBuffer();
			}
			return this;
		},
		
		/**
		 * Reset files buffer
		 * 
		 * @return elFinder
		 */
		cleanBuffer : function() {
			this.buffer = { files : [], cut : false };
			return this;
		},
		
		/**
		 * Remove directories / files
		 * 
		 * @param  Array  files hashes
		 * @return elFinder
		 */
		rm : function(files) {
			if (files.length && !this.locks.ui) {
				this.ajax({
					error : error,
					success : success,
					data : {
						cmd : 'rm', 
						current : this.cwd.hash, 
						targets : files
					}	
				});
			}
			return this;
		},
		
		i18n : function(m) { return this.messages[m] || m; },
		
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
	
	$.fn.elfinderallattr = function(attr) {
		var a = [];
		
		this.each(function() {
			a.push($(this).attr(attr));
		});
		
		return a;
	}
	
	
})(jQuery);