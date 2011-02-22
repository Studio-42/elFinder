(function($) {
	
	elFinder = function(el, o) {
		var self = this,
			/**
			 * Target node
			 *
			 * @type jQuery
			 **/
			$el = $(el);
			
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
				self.api = parseFloat(e.data.api) || 1;
				// self.log(self.api)
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
				}
				
				// remember last dir
				self.last(self.cwd.hash);
				
				// update history if required
				if (!hl || h[hl - 1] != self.cwd.hash) {
					h.push(self.cwd.hash);
				}
				self.selected = [];
				self.log(e.data.debug.time);
			});
			
		// bind to keydown/keypress if shortcuts allowed
		if (this.options.allowShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;
		
				if (!self.locks.shortcuts) {
					$.each(self.shortcuts, function(i, s) {
						if (s.type == e.type && c == s.keyCode && s.shiftKey == e.shiftKey && s.ctrlKey == ctrlKey && s.altKey == e.altKey) {
							e.preventDefault();
							s.callback(e, self);
							self.debug('shortcut', s.pattern);
							return false;
						}
					});
				}
			});
		}
		
		this.ui = new this.ui(this, $el);
		this.ui.init();
		
		
		// this.one('cd', function(e) {
		// 	var error = ['Error 1', ['Error $1 $2 $1 $4', 'one', 'two'], 'Error 3'];
		// 	self.trigger('error', {error : error})
		// })
		
		// this.cd(this.last() || '', true, true);
		this.cd('', true, true);
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

						if (typeof(data) != 'object' || data.error) {
							return self.trigger('error', {error : data && data.error ? data.error : 'Unknown error'});
						}
						
						self.trigger('cd', data);
					}
				};
				
			if (!this.locks.ui) {
				// mimetypes filter
				data['mimes[]'] = this.options.onlyMimes;
				// sort type
				data.sort = this.sort[this.options.sort] || 1;
				// custom data
				$.each(this.options.customData || {}, function(k, v) {
					if (data[k] === void(0)) {
						data[k] = v;
					} 
				});
				
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
		cd : function(hash, tree, init) {
			var data = {cmd : 'open', target : hash};
			
			if (!this.locks.ui) {
				
				if (this.cdc[hash] && !this.cdc[hash].read) {
					// return this.trigger('error', {error : 'Access denied'});
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
		 * @TODO - check file read permissions
		 * @param  String  file/dir hash
		 * @return elFinder
		 */
		open : function(hash) {
			var f = this.cdc[hash], url, s, w = '', h;
			
			if (!this.locks.ui && f) {
				
				if (f.mime == 'directory') {
					return this.cd(hash);
				}
				
				if (f.url || this.cwd.url) {
					// old api store url in file propery
					// new api store only cwd url
					url = f.url || this.cwd.url + encodeURIComponent(f.name);
				} else {
					// urls diabled - open connector
					url = this.options.url 
						+ (this.options.url.indexOf('?') === -1 ? '?' : '&') 
						+(this.api < 2 ? 'cmd=open&current=' + this.cwd.hash : 'cmd=file')
						+ '&target=' + hash;
						
				}
				if (f.dim) {
					// image - set window size
					s = f.dim.split('x');
					w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
				}

				if (!window.open(url, '_blank', w + 'top=50,left=50,scrollbars=yes,resizable=yes')) {
					// popup block
					this.trigger('error', {error : 'Unable to open new window.'});
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
			var b = this.buffer, o, self = this;

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
				}, {
					error : function(xhr) { self.log(xhr)},
					success : function(data) { self.log(data)}
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
			var self = this, f,
				data = {
					cmd : 'rm',
					targets : []
				},
				opts = {
					error : function(xhr) { self.log(xhr) },
					success : function(data) { self.log(data)}
				};
			
			if (!this.locks.ui) {
				$.each(files || [], function(i, hash) {
					if ((f = self.cdc[hash])) {
						if (!f.rm) {
							// self.trigger('error', {error : ['Access denied', f.name + ' ' + self.i18n('can not be removed')]});
							// return false;
						}
						data.targets.push(hash);
					} 
				});
				
				if (data.targets.length) {
					
					this.ajax(data, opts)
					
				}
				
			}
			
			return this;
		},
		
		mkdir : function(name) {
			var self = this;
			if (!this.locks.ui) {
				this.ajax({
					cmd : 'mkdir',
					current : this.cwd.hash,
					name : name || this.uniqueName('folder')
				}, {
					error : function(xhr) { self.log(xhr) },
					success : function(data) { self.log(data); }
				})
			}
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
		 * @param  String  message
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
	
	$.fn.elfinderallattr = function(attr) {
		var a = [];
		
		this.each(function() {
			a.push($(this).attr(attr));
		});
		
		return a;
	}
	
	
})(jQuery);