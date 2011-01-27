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
				'SPACE'      : 32
			},
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
											self.view.tmb(d.images);
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
		 * Is browser on Mac OS?
		 * 
		 * @type Boolean
		 */
		this.macos = navigator.userAgent.indexOf('Mac') != -1;
		
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
		this.selected = [];
		this.history  = [];
		this.buffer   = [];
		this.shortcuts = {};
		
		
		/**
		 * Flags indicates what functionality disabled now
		 *
		 * @type Object
		 **/
		this.locks = { 
			ui        : false, 
			shortcuts : false
		};
		
		/**
		 * Cwd view type
		 *
		 * @type String
		 **/
		this._view = this.viewType('icons');

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
		 *    elfinder.shortcut({ pattern : 'ctrl+a', 'Select all files', callback : function(e) { ... }, keypress : true|false (bind to keypress instead of keydown) })
		 *
		 * @param  Object  shortcut config
		 * @return elFinder
		 */
		this.shortcut = function(s) {
			var p, c;
			var codes = {
				'ARROWLEFT' : 37,
				'ARROWUP'   : 38,
				'ARROWRIGHT' : 39,
				'ARROWDOWN' : 40,
				'ESC' : 27,
				'ENTER' : 13
			}
			if (!this.options.disableShortcuts && s.pattern && typeof(s.callback) == 'function') {
				s.pattern = s.pattern.toUpperCase();
				
				if (!this.shortcut[s.pattern]) {
					p = s.pattern.split('+');
					c = p.pop();
					
					s.keyCode = codes[c] || c.charCodeAt(0);
					if (s) {
						s.altKey = $.inArray('ALT', p) != -1;
						s.ctrlKey = $.inArray('CTRL', p) != -1;
						s.shiftKey = $.inArray('SHIFT', p) != -1;
						s.type = s.keypress ? 'keypress' : 'keydown';
						this.shortcuts[s.pattern] = s;
						this.debug('shortcat-add', s)
					}
				}
			}
			return this
		}
		
		/**
		 * Produce ajax request
		 * 
		 * @param  Object  options
		 * @return elFinder
		 */
		this.ajax = function(opts) {
			var o = {
					url      : this.options.url,
					async    : true,
					type     : 'get',
					data     : opts.data,
					dataType : 'json',
					cache    : false,
					error    : function(r) {  
						self.trigger('ajaxerror', { status : r.status, error : r.status == '404' ? 'Unable to connect to backend' : 'Invalid backend configuration' }); 
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
	
		this.get = function(key) {
			
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
		

		
		this.cd = function(key, tree, init) {
			var o = {
					data : {cmd : 'open', target : key},
					success : function(d) { self.time('cd'); self.trigger('cd', d); delete d; self.timeEnd('cd'); }
			};
			
			if (!this.locks.ui) {
				
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
		
		this.back = function() {
			
		}
		
		this.reload = function(key) {
			return this.open(key, true);
		}
		
		this.copy = function(keys, cut) {
			
		}
		
		this.cut = function(keys) {
			return this.copy(keys, true);
		}
		
		this.paste = function(keys) {
			
		}
		
		this.i18n = function(m) {
			return this.messages[m] || m;
		}
		
		this.bind('cd', function(e) {
			var l;
			if (e.data.cdc) {
				self.cwd = e.data.cwd;
				self.cdc = {};
				l = e.data.cdc.length;
				while (l--) {
					self.cdc[e.data.cdc[l].hash] = e.data.cdc[l];
					self.cwd.size += e.data.cdc[l].size;
				}

			}
		}).bind('ajaxstart ajaxerror ajaxstop', function(e) {
			var l = e.type != 'ajaxstop';
			self.lock({ ui : l, shortcuts : l });
		}).bind('select', function() {
			self.selected = [];

			$.each(self.view.selected(), function(i, n) {
				self.cdc[n.id] && self.selected.push(self.cdc[n.id]);
			});
		}).bind('focus', function() {
			self.locks.shortcuts = false;
			$('texarea,:text').blur()
		}).bind('blur', function() {
			self.locks.shortcuts = true;
		});


		// bind to keydown/keypress if shortcuts allowed
		if (!this.options.disableShortcuts) {
			$(document).bind('keydown keypress', function(e) {
				var c = e.keyCode,
					ctrlKey = e.ctrlKey||e.metaKey;

				$.each(self.shortcuts, function(i, s) {
					if (s.type == e.type && c == s.keyCode && s.shiftKey == e.shiftKey && s.ctrlKey == ctrlKey && s.altKey == e.altKey) {
						self.debug('shortcut', s.pattern)
						s.callback(e);
						e.preventDefault();
						return false;
					}
				});
			});
		}
		
		

		this.view = new this.view(this, $el);
		// this.viewType('icons')
		
		
		$(document).click(function() {
			self.trigger('blur');
		});
		
		
		
		this.cd(this.last() || '', true, true);
		this.trigger('focus')
		// cookie(this.cookies.view, 'list')
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