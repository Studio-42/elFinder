(function($) {

	elFinder = function(node, opts) {
		
		var self = this,
			/**
			 * Flag to not fire "load" event twice
			 *
			 * @type Boolean
			 **/
			loaded = false,
			
			/**
			 * Is shortcuts/commands enabled
			 *
			 * @type Boolean
			 **/
			enabled = false,
			
			/**
			 * On click inside elFinder we set this flag to false so when event bubbled to document no blur fired
			 *
			 * @type Boolean
			 **/
			blur = true,
			
			/**
			 * Store enabled value before ajax requiest
			 *
			 * @type Boolean
			 **/
			prevEnabled = false,
			
			/**
			 * Is ajax requiest allowed.
			 * "sync" requiest blocked others requests until complete
			 *
			 * @type Boolean
			 **/
			ajax = true,
			
			/**
			 * Some ajax requests and every modal dialog required to show overlay,
			 * so we count it to not enable shortcuts until any requests complete and any dialogs closed
			 *
			 * @type Number
			 **/
			overlayCnt = 0,
			
			/**
			 * Rules for ajax data validate
			 *
			 * @type Object
			 **/
			rules = {},
			
			
			/**
			 * Current working directory
			 *
			 * @type Object
			 **/
			cwd = {
				hash   : '',
				phash  : '',
				name   : '',
				path   : '',
				url    : '',
				tmbUrl : '',
				disabled : [],
				date   : '',
				read   : 1,
				write  : 1,
				locked     : 1,
				files  : 0,
				size   : 0
			},
			
			/**
			 * All files/dirs "visible" for this moment
			 *
			 * @type Object
			 **/
			files = {},
			
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
			
			shortcuts = {},
			
			commands = {},
			
			/**
			 * Buffer for copied files
			 *
			 * @type Object
			 **/
			clipboard = [],
			// clipboard = {
			// 	files : [],   // files hashes
			// 	names : {},   // files names - required for error message
			// 	src   : null, // files parent folder hash
			// 	cut   : false // cut files
			// },
			
			node = $(node),
			
			prevContent = $('<div/>'),
			
			workzone = $('<div class="ui-helper-clearfix ui-corner-all elfinder-workzone"/>'),
			
			nav = $('<div class="ui-state-default elfinder-nav"/>').hide().appendTo(workzone),
			
			dir = $('<div/>').appendTo(workzone),
			
			toolbar = $('<div/>').hide(),
			
			statusbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-statusbar"/>').hide(),
			
			overlay = $('<div class="ui-widget-overlay elfinder-overlay"/>')
				.hide()
				.mousedown(function(e) {
					e.preventDefault();
					e.stopPropagation();
				}),
			
			spinner = $('<div class="elfinder-spinner"/>').hide(),
			
			width, height,
			
			/**
			 * Increase overlayCnt and show overlay
			 *
			 * @return void
			 */
			showOverlay = function() {
				overlayCnt++;
				if (overlay.is(':hidden')) {
					overlay.css('zIndex', 1 + overlay.zIndex()).show();
				}
			},
			
			/**
			 * Decrease overlayCnt and if its == 0 hide overlay
			 *
			 * @return void
			 */
			hideOverlay = function() {
				if (--overlayCnt == 0) {
					overlay.hide();
				}
			},
			
			/**
			 * Show spinner above overlay
			 *
			 * @return void
			 */
			showSpinner = function() {
				spinner.css('zIndex', 1 + overlay.css('zIndex')).show();
			},
			
			/**
			 * Hide spinner
			 *
			 * @return void
			 */
			hideSpinner = function() {
				spinner.hide();
			},
			
			/**
			 * Valid data for command based on rules
			 *
			 * @param  String  command name
			 * @param  Object  command data
			 * @return Boolean
			 **/
			validCmdData = function(cmd, d) {
				var rule = rules[cmd] || {}, i;

				for (i in rule) {
					if (rule.hasOwnProperty(i)) {
						if ((d[i] === void(0) && rule[i].req)
						|| (d[i] !== void(0) && rule[i].valid && !rule[i].valid(d[i]))) {
							return false;
						}
					}
				}
				return true;
			},
			
			/**
			 * Store info about files/dirs in "files" object.
			 * Here we get data.files for new api or data.cdc for old api.
			 * Files from data.tree for old api adds in cacheTree()
			 *
			 * @param  Array    files
			 * @param  Boolean  remove files does not belongs current working directory?
			 * @return void
			 **/
			cache = function(data, clear) {
				var l = data.length, f, i;
				
				// remove only files does not belongs current dir
				if (clear) {
					cwd.size  = 0;
					cwd.files = 0;
					if (self.options.clearCache) {
						for (i in files) {
							if (files.hasOwnProperty(i) && files[i].mime != 'directory' && files[i].phash != cwd.hash) {
								delete files[i];
							}
						}
					}
				}

				while (l--) {
					f = data[l];
					if (self.oldAPI) {
						f.phash = cwd.hash;
						f.locked = !f.rm;
						delete f.rm;
					}
					files[f.hash] = f;
					if (f.phash == cwd.hash) {
						cwd.files++;
						cwd.size += parseInt(f.size) || 0;
					}
				}
			},
			
			/**
			 * Store info about dirs form data.tree for old api.
			 *
			 * @param  Object   dire tree
			 * @return void
			 **/
			cacheTree = function(dir, phash) {
				var childs = dir.dirs || [],
					l = childs.length, 
					add = function(d) {
						if (d.name && d.hash && !files[d.hash]) {
							d.phash  = phash;
							d.mime   = 'directory';
							d.locked = false;
							delete d.dirs;
							files[d.hash] = d;
						}
					};

				add(dir);
				phash = dir.hash; 
				// self.log(dir.name+' '+dir.hash)
				while (l--) {
					dir = childs[l];
					dir.dirs && dir.dirs.length ? cacheTree(dir.dirs, phash) : add(dir);
					if (!cwd.phash && dir.hash == cwd.hash) {
						cwd.phash = phash;
					}
				}
			},
			
			/**
			 * Send init ajax request
			 *
			 * @return void
			 */
			start = function() {
				var opts = {
						cmd    : 'open',
						target : self.lastDir() || '',
						mimes  : self.options.onlyMimes || [],
						init   : true,
						tree   : !!self.options.allowNavbar
					},
					interval;
				
				if (self.isVisible()) {
					return self.ajax(opts).node.mousedown();
				} 
				
				interval = setInterval(function() {
					if (self.isVisible()) {
						clearInterval(interval);
						self.ajax(opts).node.mousedown();
					}
				}, 100);
				return;
				// focus current instances and blur other elFinder instances if exists
				self.node.mousedown();

				// start loading only visible filemanager
				if (this.isVisible()) {
					start();
				} else {
					sInterval = setInterval(function() {
						if (self.isVisible()) {
							clearInterval(sInterval);
							start();
						}
					}, 100);
				}

				self.ajax({
						cmd    : 'open',
						target : self.lastDir() || '',
						mimes  : self.options.onlyMimes || [],
						init   : true,
						tree   : !!self.options.allowNavbar
					});
				
			},

			/**
			 * Exec shortcut
			 *
			 * @param  jQuery.Event  keydown/keypress event
			 * @return void
			 */
			execShortcut = function(e) {
				var code    = e.keyCode,
					ctrlKey = e.ctrlKey || e.metaKey;
				
				if (enabled) {
					// prevent tab out of elfinder
					code == 9 && e.preventDefault();
					$.each(shortcuts, function(i, shortcut) {
						if (shortcut.type == e.type 
						&& shortcut.keyCode == code 
						&& shortcut.shiftKey == e.shiftKey 
						&& shortcut.ctrlKey == ctrlKey 
						&& shortcut.altKey == e.altKey) {
							e.preventDefault();
							// self.log(i)
							shortcut.callback(e, self);
							return false;
						}
					});
				}
			}
			;

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
		
		this.newAPI = false;
		this.oldAPI = true;
		
		this.uploadMaxSize = '';
		
		/**
		 * Configuration options
		 *
		 * @type Object
		 **/
		this.options = $.extend({}, this.options, opts||{});
		
		/**
		 * ID. Required to create unique cookie name
		 *
		 * @type String
		 **/
		this.id = node.attr('id') || '';
		
		/**
		 * Events namespace
		 *
		 * @type String
		 **/
		this.namespace = 'elfinder'+(this.id || Math.random().toString().substr(2, 7));
		
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
		this.direction = this.i18[this.lang].direction;
		// this.dir = 'rtl'
		/**
		 * i18 messages
		 *
		 * @type Object
		 **/
		this.messages = this.i18[this.lang].messages;
		
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
		
		this.sort = this.sortType();
		
		/**
		 * Return true if filemanager is visible
		 *
		 * @return Boolean
		 **/
		this.isVisible = function() {
			return this.node.is(':visible');
		}
		
		/**
		 * Return true if filemanager is active
		 *
		 * @return Boolean
		 **/
		this.isEnabled = function() {
			return this.isVisible() && enabled;
		}
		
		/**
		 * Make filemanager active
		 *
		 * @return elFinder
		 **/
		this.enable = function() {
			return this.trigger('focus');
		}
		
		/**
		 * Make filemanager not active
		 *
		 * @return elFinder
		 **/
		this.disable = function() {
			return this.trigger('blur');
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
		 * @param  String  request mode. 
		 * 		"sync"   - does not create real sync request, only block other elFinder requests until end
		 * 		"bg"     - do not block other requests, on error - show message
		 * 		"silent" - do not block other requests, send error message to debug
		 * @return elFinder
		 */
		this.ajax = function(opts, mode) {
			var self    = this,
				request = $.extend({}, this.options.customData || {}, opts.data || opts), 
				cmd     = request.cmd,
				mode    = /^sync|bg|silent$/.test(mode) ? mode : 'sync',
				options = {
					url      : this.options.url,
					async    : true,
					type     : 'get',
					dataType : 'json',
					cache    : false,
					data     : request,
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
						self[mode == 'silent' ? 'debug' : 'trigger']('ajaxerror', {error : error, request : request, mode : mode});

					},
					success  : function(data) {
						var error;

						self.trigger('ajaxstop', {request : request, response : data, mode : mode});

						if (!data) {
							error = 'Invalid backend response';
						} else if (data.error) {
							error = data.error;
						} else if (!validCmdData(cmd, data)) {
							error = 'Invalid backend response';
						}

						if (error) {
							return self[mode == 'silent' ? 'debug' : 'trigger']('error', {error : error, response : data, request : request});
						}

						if (data.warning) {
							self.trigger('warning', {warning : data.warning});
						}

						// fire some event to update ui
						data.removed && data.removed.length && self.trigger('removed', data);
						data.added   && data.added.length   && self.trigger('added', data);
						
						// fire event with command name
						self.trigger(cmd, data);
					}
				};
				
			// ajax allowed - fire events and send request
			if (ajax && this.isVisible()) {
				self.trigger('ajaxstart', {request : request, mode : mode});
				opts.data && $.extend(options, opts);
				$.ajax(options);
			}
			
			return this;
		};
		
		/**
		 * Sync files with connector
		 *
		 * @param  Boolean  do it in background?
		 * @return elFinder
		 **/
		this.sync = function(silent) {
			var data = {
				cmd     : 'sync',
				current : cwd.hash,
				targets : [],
				mimes   : self.options.onlyMimes || []
			};
			
			$.each(files, function(hash, f) {
				data.targets.push(hash);
			});

			return self.ajax({data : data, type : 'post'}, silent ? 'silent' : '');
		}
		
		/**
		 * Attach listener to events
		 * To bind to multiply events at once, separate events names by space
		 * 
		 * @param  String  event(s) name(s)
		 * @param  Object  event handler
		 * @return elFinder
		 */
		this.bind = function(event, callback) {
			var i;
			
			if (typeof(callback) == 'function') {
				event = ('' + event).toLowerCase().split(/\s+/);
				
				for (i = 0; i < event.length; i++) {
					if (listeners[event[i]] === void(0)) {
						if (event[i] == 'load') {
							continue;
						}
						listeners[event[i]] = [];
					}
					listeners[event[i]].push(callback);
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
		this.unbind = function(event, callback) {
			var event = ('' + event).toLowerCase(),
				l = listeners[event] || [],
				i = l.indexOf(callback);

			i > -1 && l.splice(i, 1);
			return this;
		};
		
		/**
		 * Send notification to all event listeners
		 *
		 * @param  String   event type
		 * @param  Object   data to send across event
		 * @return elFinder
		 */
		this.trigger = function(event, data) {
			var event    = event.toLowerCase(),
				handlers = listeners[event] || [], i, j;
			
			this.debug('event-'+event, data)
			
			if (handlers.length) {
				event = $.Event(event);
				for (i = 0; i < handlers.length; i++) {
					// to avoid data modifications, remember about "sharing" passing arguments in js :) 
					event.data = $.extend(true, {}, data);
					try {
						handlers[i](event, this);
					} catch (ex) {
						window.console && window.console.log && window.console.log(ex);
					}
					
					if (event.isPropagationStopped()) {
						break;
					}
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
			var patterns, pattern, code, i, parts;
			
			if (this.options.allowShortcuts && s.pattern && $.isFunction(s.callback)) {
				patterns = s.pattern.toUpperCase().split(/\s+/);
				
				for (i= 0; i < patterns.length; i++) {
					pattern = patterns[i]
					parts   = pattern.split('+');
					code    = (code = parts.pop()).length == 1 
						? code.charCodeAt(0) 
						: $.ui.keyCode[code];

					if (code) {
						shortcuts[pattern] = {
							keyCode  : code,
							altKey   : $.inArray('ALT', parts)   != -1,
							ctrlKey  : $.inArray('CTRL', parts)  != -1,
							shiftKey : $.inArray('SHIFT', parts) != -1,
							type     : s.type || 'keydown',
							callback : s.callback
						}
					}
				}
			}
			return this;
		}
		
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
			return files[hash]; 
		};
		
		/**
		 * Return all cached files
		 * 
		 * @return Array
		 */
		this.files = function() {
			return $.extend({}, files);
		}
		
		/**
		 * Return true if file with required name existsin required folder
		 * 
		 * @param  String  file name
		 * @param  String  parent folder hash
		 * @return Boolean
		 */
		this.exists = function(name, phash) {
			var hash;

			for (hash in files) {
				if (files.hasOwnProperty(hash) && files[hash].phash == phash && files[hash].name == name) {
					return true;
				}
			}
		};
		
		/**
		 * Return file path relative to root folder
		 * 
		 * @param  String  file name
		 * @return String
		 */
		this.path = function(file) {
			return cwd.path + (file.hash == cwd.hash ? '' : cwd.separator+file.name);
			return this.isNewApi 
				? cwd.path + (file.hash == cwd.hash ? '' : cwd.separator+file.name)
				: file.rel;
		}
		
		this.url = function(file) {
			var path = '';
			if (this.isNewApi) {
				if (cwd.url) {
					path = this.path(file).replace(cwd.separator, '/');
					return cwd.url + path.substr(path.indexOf('/')+1)
				}
			}
			return file.url;
		}
		
		/**
		 * Return selected files info
		 * 
		 * @return Array
		 */
		this.selectedFiles = function() {
			return $.map(selected, function(hash) { return files[hash] || null });
		};
		
		/**
		 * Return root dir hash for current working directory
		 * 
		 * @return String
		 */
		this.root = function() {
			var dir = files[cwd.hash];
			
			while (dir && dir.phash) {
				dir = files[dir.phash]
			}
			return dir.hash;
		}
		
		/**
		 * Get/set clipboard content.
		 * Return new clipboard content.
		 *
		 * @example
		 *   this.clipboard([]) - clean clipboard, all previous cutted files will be unlocked
		 *   this.clipboard([{...}, {...}], true) - put 2 files in clipboard and mark it as cutted
		 * 
		 * @param  Array    new files hashes
		 * @param  Boolean  cut files?
		 * @param  Boolean  if true previous cutted files not be unlocked
		 * @return Array
		 */
		this.clipboard = function(files, cut, quiet) {
			var map = function(f) { return f.hash; },
				i, hash, file;
			
			if ($.isArray(files)) {
				clipboard.length && !quiet && this.trigger('unlockfiles', {files : $.map(clipboard, map)});

				clipboard = [];
				
				for (i = 0; i < files.length; i++) {
					hash = files[i];
					if ((file = this.file(hash)) && file.read) {
						clipboard.push({
							hash  : hash,
							phash : file.phash,
							name  : file.name,
							cut   : !!cut
						});
					}
				}

				this.trigger('changeClipboard', {clipboard : clipboard})
				cut && !quiet && this.trigger('lockfiles', {files : $.map(clipboard, map)});
			}
			// return copy of clipboard instead of refrence
			return $.map(clipboard, function(f) { return f; });
		}
		
		/**
		 * Create and return jQuery UI dialog.
		 *
		 * @param  String|DOMElement  dialog content
		 * @param  Object             dialog options
		 * @param  String             dialog type for error|notify|confirm dialogs 
		 * @return jQuery
		 */
		this.dialog = function(content, options, type) {
			var self    = this,
				node    = this.node,
				options = options || {},
				open = options.open,
				modal   = !!options.modal,
				buttons = options.buttons,
				dialog  = $('<div/>').append(content);
				
			options.modal = false;
			options.buttons = {};
			
			options = $.extend({
				title         : '',
				resizable     : false,
				minHeight     : 100,
				closeOnEscape : true,
				open : function() {
					var o = node.offset(),
						nw = node.width(),
						dw = dialog.width(),
						nh = node.height(),
						dh = dialog.height(),
						p = type == 'notify'
							? [parseInt(o.left + nw - dw-7), parseInt(o.top+7)]
							: [parseInt(o.left + (nw/2) - (dw/2)), parseInt(o.top + (nh/2) - (dh/2)) ];
					
					dialog.dialog({position : p});
					
					if (modal) {
						showOverlay();
						self.trigger('blur');
					}
					if (open) {
						self.log(open)
						// options.open()
					} 
				},
				create : function() {
					var $this = $(this);
					$this.nextAll('.ui-dialog-buttonpane').addClass('ui-corner-bottom');
					if (!options.closeOnEscape) {
						$this.prev().children('.ui-dialog-titlebar-close').remove();
					}
				},
				close : function() {
					modal && hideOverlay();
					self.trigger('focus');
					$(this).dialog('destroy');
					dialog.remove();
				}
			}, options, {
				dialogClass : 'std42-dialog elfinder-dialog'
				
			});
			
			options.title = this.i18n(options.title);
			
			if (type) {
				type != 'notify' && dialog.append('<span class="elfinder-dialog-icon"/>');
				options.dialogClass += ' elfinder-dialog-'+type;
			}

			if (buttons) {
				$.each(buttons, function(name, cb) {
					options.buttons[self.i18n(name)] = cb;
				});
			}
			
			
			
			return dialog.dialog(options);
		}
		
		/**
		 * Exec command and return result;
		 *
		 * @param  String  command name
		 * @param  mixed   command argument
		 * @return mixed
		 */		
		this.exec = function(cmd, value) {
			if (commands[cmd]) {
				return commands[cmd].exec(value);
			}
		}
		
		/**
		 * Resize elfinder window
		 * 
		 * @param  String|Number  width
		 * @param  Number         height
		 * @return elFinder
		 */
		this.resize = function(w, h) {
			this.node.width(w).height(h);
			return this.updateHeight();
		}
		
		this.updateHeight = function() {
			var h = this.node.height() - (toolbar.is(':visible') ? toolbar.outerHeight(true) : 0) - (statusbar.is(':visible') ? statusbar.outerHeight(true) : 0);
			workzone.height(h);
			h = workzone.height();
			nav.height(h - 2 - (nav.innerHeight() - nav.height()));
			dir.height(h - (dir.innerHeight() - dir.height()));
			return this;
		}
		
		this.restoreSize = function() {
			return this.resize(width, height);
		}
		
		this.draggable = {
			appendTo   : 'body',
			addClasses : true,
			delay      : 30,
			revert     : true,
			cursor     : 'move',
			cursorAt   : {left : 50, top : 47},
			refreshPositions : true,
			start      : function() { self.trigger('focus'); },
			drag       : function(e, ui) { ui.helper.toggleClass('elfinder-drag-helper-plus', e.shiftKey||e.ctrlKey||e.metaKey); }
		};
		
		this.droppable = {
				tolerance : 'pointer',
				accept : ':not(.ui-dialog)',
				drop : function(e, ui) {
					var $this = $(this), 
						src   = ui.helper.data('src'),
						files = ui.helper.data('files')||[],
						l     = files.length,
						dst;
					
					if (!l) {
						return;
					}

					if ($this.is('.elfinder-cwd')) {
						// drop onto current directory
						dst = cwd.hash;
					} else if ($this.is('.elfinder-cwd-file')) {
						// drop on folder in current directory
						dst = this.id;
					} else {
						// drop onto directory in tree
						dst = this.id.substr(4);
					}

					while (l--) {
						// avoid to copy into itself
						if (files[l] == dst) {
							return;
						}
					}
					
					ui.helper.hide();
					self.copy(files, !(e.shiftKey || e.ctrlKey || e.metaKey), true) && self.paste(dst, true);
				}
			};
		
		
		if (!($.fn.selectable && $.fn.draggable && $.fn.droppable && $.fn.dialog)) {
			return alert(this.i18n('Invalid jQuery UI configuration. Check selectable, draggable, draggable and dialog components included.'));
		}

		if (!node.length) {
			return alert(this.i18n('elFinder required DOM Element to be created.'));
		}
		
		if (!this.options.url) {
			return alert(this.i18n('Invalid elFinder configuration! You have to set URL option.'));
		}
		
		
		$.each(node.contents(), function() {
			prevContent.append(this);
		});
		
		this.cssClass = 'ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+(this.direction == 'rtl' ? 'rtl' : 'ltr');
		
		if (this.options.cssClass) {
			this.cssClass += ' '+this.options.cssClass;
		}
		
		this.node = node.addClass(this.cssClass)
			.append(toolbar)
			.append(workzone)
			.append(statusbar)
			.append(overlay)
			.append(spinner)
			.bind('mousedown.elfinder', function() {
				blur = false;
				!enabled && self.trigger('focus');
			})
		
		
		width  = self.options.width || 'auto'; 
		height = self.options.height || 300;
		this.resize(width, height);
		this.node[0].elfinder = this;
		
		if (this.options.resizable) {
			this.node.resizable({
				resize : function() { self.updateHeight(); },
				minWidth : 300,
				minHeight : 200
			});
		}
		
		this
			/**
			 * Enable elFinder shortcuts if no "sync" ajax request in progress or modal dialog opened
			 */
			.bind('focus', function() {
				if (self.isVisible() && !enabled && !overlayCnt) {
					$('texarea,input,button').blur();
					enabled = true;
					self.node.removeClass(self.options.blurClass);
				}
			})
			/**
			 * Disable elFinder shortcuts
			 */
			.bind('blur', function() {
				if (enabled) {
					enabled = false;
					prevEnabled = false;
					// overlayCnt ==0 && 
					self.node.addClass(self.options.blurClass);
				}
			})
			/**
			 * On "sync" ajax start disable ajax requests, shortcuts and show overlay/spinner.
			 * Store current "enabled" to restore after request complete
			 */
			.bind('ajaxstart', function(e) {
				var en = enabled;
				if (e.data.mode == 'sync') {
					ajax = false;
					showOverlay();
					showSpinner();
					self.trigger('blur');
					prevEnabled = en;
				}
			})
			/**
			 * On "sync" ajax complete enable ajax requests, 
			 * restore "enabled" to value before requests if no modal dialogs opened or "blur" events occured.
			 * Hide overlay/spinner
			 */
			.bind('ajaxstop ajaxerror', function(e) {
				if (e.data.mode == 'sync') {
					ajax = true;
					hideSpinner();
					hideOverlay();
					prevEnabled && self.trigger('focus');
				}
			})
			/**
			 * Show error dialog
			 */
			.bind('ajaxerror error warning', function(e) {
				if (self.isVisible()) {
					self.dialog(self.i18n(e.data.error || e.data.warning), {
						title         : 'Error',
						modal         : true,
						closeOnEscape : false,
						buttons       : {
							Ok : function() { $(this).dialog('close'); }
						}
					}, 'error');
				}
					
				// fm not correctly loaded
				if (!loaded) {
					self.trigger('failed');
					listeners = {};
					enabled   = false;
				}

			})
			/**
			 * Fire "load" event if first ajax request succesfull
			 */
			.one('ajaxstop', function(e) {
				!e.data.response.error && self.trigger('load', e.data.response);
			})
			/**
			 * On first success ajax request complete 
			 * set api version, json validation rules
			 * and init ui.
			 */
			.bind('load', function(e) {
				var data = e.data,
					base = new self.command(self),
					opts = self.options,
					cmds = opts.commands || [],
					cmd,
					l, tb = 'elfindertoolbar'+opts.toolbar;

				self.api    = parseFloat(data.api)|| 1;
				self.newAPI = self.api > 1;
				self.oldAPI = !self.newAPI;
				rules       = self[self.newAPI ? 'newAPIRules' : 'oldAPIRules'];

				self.uploadMaxSize = data.uploadMaxSize;
				
				if (self.oldAPI) {
					cwd.url = e.data.params.url;
				}
				
				dir.elfindercwd(self).attr('id', 'elfindercwd-'+self.id);
				
				self.options.allowNav && nav.show().append($('<ul/>').elfindertree(self));
				
				self.history = new self.history(self);
				
				$(document)
					// blur elfinder on document click
					.bind('mousedown.elfinder', function(e) {
						blur && enabled && self.trigger('blur');
						blur = true;
					})
					// exec shortcuts
					.bind('keydown keypress', execShortcut);
				
				// $.each(['open', 'back', 'forward', 'up', 'home'], function(i, name) {
				// 	$.inArray(name, cmds) === -1 && cmds.push(name)
				// });
				
				// self.log(cmds)
				
				$.each(cmds, function(i, name) {
					var cmd = self.commands[name];
					if ($.isFunction(cmd) && !commands[name]) {
						var _super = $.extend({}, base, cmd.prototype);
						// cmd.prototype = base;
						cmd.prototype = _super;
						commands[name] = new cmd();
						commands[name]._super = _super;
						commands[name].setup(name, self.options[name]||{});
					}
				});
				// self.log(commands)
				if (!$.fn[tb]) {
					tb = 'elfindertoolbar';
				}
				toolbar[tb](opts.toolbarConf, commands)
				
				
				self.resize(width, height);
				self.debug('api', self.api);
				delete listeners.load;
				loaded = true;
				// self.notify('rm', 1)
			})
			/**
			 * Set params if required and update files cache
			 */
			.bind('open', function(e) {
				var data = e.data;
				
				// set current directory data
				// if (self.oldAPI) {
				// 	data.cwd.locked = !!data.cwd.rm;
				// 	delete data.cwd.rm;
				// }
				cwd = $.extend(cwd, e.data.cwd)
				
				if (self.newAPI) {
					if (self.options.sync > 3000) {
						setInterval(function() {
							self.sync();
						}, self.options.sync);
					}
				} else {					
					cwd.tmb = !!data.tmb;
					// old api: if we get tree - reset cache
					if (data.tree) {
						files = {};
						cacheTree(data.tree);
					} 
					cwd.path = cwd.rel;
					delete cwd.rel;
					// find cwd in cached files and set parent hash
					cwd.phash  = files[cwd.hash].phash;
					// if cwd is root - locked it
					cwd.locked = cwd.phash ? !cwd.rm : true;
					delete cwd.rm;

					if (cwd.path.indexOf('\\') != -1) {
						cwd.separator = '\\';
					} else if (cwd.path.indexOf('/') != -1 || !cwd.separator) {
						cwd.separator = '/';
					} 
				}
				
				cache(self.newAPI ? e.data.files : e.data.cdc, true);
				self.log(files)
				// remember last dir
				self.lastDir(cwd.hash);

			})
			/**
			 * Clean clipboard on reload
			 */
			.bind('reload', function() {
				self.clipboard([], false, true);
			})
			/**
			 * Update files cache
			 */
			.bind('tree parents', function(e) {
				cache(e.data.tree || []);
			})
			/**
			 * Update thumbnails names in files cache
			 */
			.bind('tmb', function(e) {
				$.each(e.data.images, function(hash, url) {
					if (files[hash]) {
						files[hash].tmb = url;
					}
				});
			})
			/**
			 * cache selected files hashes
			 */
			.bind('select', function(e) {
				selected = $.map(e.data.selected || [], function(hash) {
					return files[hash] ? hash : null;
				});
			})
			
			/**
			 * Update files cache - remove not existed files
			 */
			.bind('removed', function(e) {
				var rm   = e.data.removed,
					l    = rm.length,  
					childs = function(hash) {
						var ret = [hash];
						
						$.each(files, function(h, f) {
							if (f.phash == hash) {
								ret.push(f.hash);
								if (f.childs) {
									ret.concat(childs(h));
								}
							}
						});
						return ret;
					};

				while (l--) {
					$.each(childs(rm[l].hash), function(i, h) {
						var file = self.file(h);
						if (file.phash == cwd.hash) {
							cwd.size -= file.size;
							cwd.files--;
						}
						delete files[h];
						
					});
				}

			})
			/**
			 * Update files cache - add new files
			 */
			.bind('added', function(e) {
				cache(e.data.added);
			});
		
		start();
		
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
			var c = 'elfinder-view-'+this.id,
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
		 * Get/set view type (icons | list)
		 *
		 * @param  String|void  type
		 * @return Strng
		 */
		sortType : function(t) {
			var c = 'elfinder-sort-'+this.id;

			if (t && this.sorts[t]) {
				this.cookie(c, (this.sort = t));
			} else if (!this.sort) {
				t = this.cookie(c);
				this.sort = this.sorts[t] ? t : this.sorts[this.options.sort] || 1;
			}
			return this.sort;
		},
		
		/**
		 * Get/set last opened directory
		 * 
		 * @param  String|undefined  dir hash
		 * @return String
		 */
		lastDir : function(key) { 
			return this.options.rememberLastDir ? this.cookie('el-finder-last-'+this.id, key) : ''; 
		},
		
		/**
		 * Open confiration dialog
		 * 
		 * @param  String    dialog title
		 * @param  String    dialog text
		 * @param  Function  Ok button callback
		 * @param  Boolean   Show "Apply to all" checkbox
		 * @return String
		 */
		confirm : function(title, text, callback, applytoall) {
			var node = this.node,
				self = this,
				checkbox = $('<input type="checkbox"/>'),
				opts = {
					title : title,
					modal : true,
					buttons : {
						Ok : function() {
							callback(true, checkbox.is(':checked'));
							$(this).dialog('close');
						},
						Cancel : function() { 
							$(this).dialog('close'); 
							callback(false, checkbox.is(':checked'));
						}
					}
				
				},
				dialog = this.dialog(text, opts, 'confirm');
			
			if (applytoall) {
				dialog.parents('.elfinder-dialog')
					.find('.ui-dialog-buttonpane')
					.prepend($('<label> '+this.i18n('Apply to all')+'</label>').prepend(checkbox));
			}
		},
		
		/**
		 * Notifications messages by types
		 *
		 * @type  Object
		 */
		notifyType : {
			mkdir  : 'Creating directory',
			mkfile : 'Creating files',
			rm     : 'Delete files',
			copy   : 'Copy files',
			move   : 'Move files',
			prepareCopy : 'Prepare to copy files',
			duplicate : 'Duplicate files'
		},
		
		/**
		 * Create new notification type.
		 * Required for future (not included in core elFinder) commands/plugins
		 *
		 * @param  String    notification type
		 * @param  String  notification message
		 * @return elFinder
		 */
		registerNotification : function(type, msg) {
			if (!notifyType[type] && type && msg) {
				this.notifyType[type] = msg;
			}
			return this;
		},
		
		/**
		 * Open notification dialog 
		 * and append/update message for required notification type.
		 *
		 * @param  String  notification type (@see elFinder.notifyType)
		 * @param  Number  notification counter (how many files to work with)
		 * @return elFinder
		 */
		notify : function(type, cnt) {
			var msg    = this.notifyType[type], 
				nclass = 'elfinder-notify',
				tclass = nclass+'-text',
				dialog,
				place;
				
			if (msg) {
				if (!this.notifyDialog) {
					this.notifyDialog = this.dialog('', {
						closeOnEscape : false,
						autoOpen      : false,
						close         : function() { }
					}, 'notify');
				}
				dialog = this.notifyDialog;
				place = dialog.find('.'+nclass);
				
				if (place.length) {
					cnt += parseInt(place.data('cnt'));
				} else {
					place = $('<div class="'+nclass+' '+nclass+'-'+type+'"><span class="'+tclass+'"/><div class="elfinder-notify-spinner"/><span class="elfinder-dialog-icon"/></div>').appendTo(dialog);
				}
				if (cnt > 0) {
					place.data('cnt', cnt).children('.'+tclass).text(this.i18n(msg)+' ('+cnt+')');
					dialog.dialog('open');
				} else {
					place.remove();
					!dialog.children().length && dialog.dialog('close');
				}
			}
			return this;
		},
		
		
		/**
		 * Bind callback to event(s) The callback is executed at most once per event.
		 * To bind to multiply events at once, separate events names by space
		 *
		 * @param  String    event name
		 * @param  Function  callback
		 * @return elFinder
		 */
		one : function(event, callback) {
			var self = this,
				h = $.proxy(callback, function(event) {
					setTimeout(function() {self.unbind(event.type, h);}, 3);
					return callback.apply(this, arguments);
				});
			return this.bind(event, h);
		},
		
		
		
		/**
		 * Open directory/file
		 * 
		 * @param  String   file hash
		 * @param  Boolean  update nav dir tree? (for open dir only)
		 * @param  Boolean  send init flag? (for open dir only)
		 * @return elFinder
		 */
		open : function(hash) {
			var file  = this.file(hash), 
				isdir = !file || file.mime == 'directory',
				error;
			
			if (file && !file.read) {
				error = (isdir ? 'The folder' : 'The file') + ' "$1" can’t be opened because you don’t have permission to see its contents.';
				return this.trigger('error', {error : [[error, file.name]]});
			}	
			
			// change directory
			if (isdir) {
				return this.ajax({
					cmd    : 'open',
					target : hash || '',
					mimes  : this.options.onlyMimes || []
				});
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
			
			this.trigger('reload');
			
			return this.newAPI 
				? this.sync(false)
				: this.ajax({
					cmd    : 'open',
					target : this.lastDir() || '',
					tree   : !!this.options.allowNavbar
				});
		},
		
		/**
		 * Go into previous folder
		 * 
		 * @return elFinder
		 */
		back : function() {
			this.history.back();
			return this;
		},
		
		/**
		 * Go into previous folder
		 * 
		 * @return elFinder
		 */
		fwd : function() {
			this.history.fwd();
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
		copy : function(files, cut, dd) {
			var files = $.isArray(files) ? files : [],
				error = 'Unable to copy "$1".',
				i, hash, file;
			
			this.clipboard([]);
			
			for (i = 0; i < files.length; i++) {
				hash = files[i];
				if ((file = this.file(hash)) && (!file.read || (cut && !file.rm))) {
					if (cut) {
						error = dd ? 'Unable to move "$1".' : 'Unable to cut "$1".';
					}
					return !!this.trigger('error', {error : [error, file.name]});
				}
			}
			
			return !!this.clipboard(files, cut).length;
		},
		
		/**
		 * Copy files into buffer and mark for deletion after paste
		 * Wrapper for copy method
		 * 
		 * @param  Array  files hashes array
		 * @return Boolean
		 */
		cut : function(files) { 
			return this.copy(files, true); 
		},
		
		hasParent : function(hash, phash) {
			var file = this.file(hash);
			
			do {
				if (hash == phash || file.phash == phash) {
					return true;
				}
				hash = file.phash;
			} while ((file = this.file(hash)));
			return false;
		},
		
		/**
		 * Paste files from buffer into required directory
		 * 
		 * @param  String   directory hash, if not set - paste in current working directory
		 * @clean  Boolean  clean buffer after paste - required to not store in clipboard files moved by drag&drop
		 * @return elFinder
		 */
		paste : function(dst, clean) {
			var self    = this,
				cwd     = this.cwd().hash,  // current dir hash
				dst     = dst || cwd,       // target dir hash
				files   = this.clipboard(), // files to paste
				num     = files.length,
				exists  = [],               // files with names existed in target dir
				msg     = 'An item named "$1" already exists in this location. Do you want to replace it?',
				content = [],               // target dir files, if target != cwd
				/**
				 * Find file with required name in target directory files
				 *
				 * @param  String  file name
				 * @return Boolean
				 */
				find = function(name) {
					var i;
					
					// target == current - search in files
					if (dst == cwd) { 
						return self.exists(name, dst);
					} 
					
					// target dir != current - search in cache
					i = content.length;
					while (i--) {
						if (content[i].name == name) {
							return true;
						}
					}
				},
				/**
				 * Send ajax request to exec "paste" command
				 *
				 * @return void
				 */
				paste = function() {
					var targets = [], 
						l = files.length, 
						i, cut, ntype;
						
					if (l) {
						cut = files[0].cut;
						ntype = cut ? 'move' : 'copy';
						(cut || clean) && self.clipboard([], false, true); // clean clipboard
						
						for (i = 0; i < l; i++) {
							targets.push(files[i].hash);
						}
						
						self.ajax({
							data : {
								cmd     : 'paste',
								current : cwd,
								src     : files[0].phash,
								dst     : dst,
								targets : targets,
								cut     : cut ? 1 : 0
							},
							beforeSend : function() { self.notify(ntype, l); },
							complete   : function() { self.notify(ntype, -l).trigger('unlockfiles', {files : targets}); }
						}, 'bg');
					}
				},
				/**
				 * Check files, open confirm dialogs if required and exec paste()
				 *
				 * @return void
				 */
				proccess = function() {
					var ndx = 0,
						callback = function(replace, all) {
							var l = exists.length,
								remove = function() {
									var i;
									
									if ((i = $.inArray(exists[ndx], files)) !== -1) {
										files.splice(i, 1);
										self.trigger('unlockfiles', {files : [exists[ndx].hash]})
									}
								};

							if (all) {
								if (replace) {
									ndx = exists.length;
								} else {
									while (ndx < l) {
										remove();
										ndx++;
									}
								}
							} else if (!replace) {
								remove();
							}
							
							if (++ndx < exists.length) {
								self.confirm('', self.i18n([msg, exists[ndx].name]), callback,true)
							} else {
								paste()
							}
						};
					
					for (i = 0; i < num; i++) {
						file = files[i];
						
						// paste in file parent dir not allowed
						if (file.phash == dst) { 
							return;
						}
						
						// paste into itself not allowed
						if (self.hasParent(dst, file.hash)) { 
							return self.trigger('error', {error : ['You can’t paste "$1" at this location because you can’t paste an item into itself.', name]});
						}
						
						// file with same name exists
						if (find(file.name)) {
							exists.push(file);
						}
					}
					
					if (exists.length) {
						self.confirm('', self.i18n([msg, exists[0].name]), callback, true);
					} else {
						paste();
					}
				}
				
			if (dst == cwd) {
				// paste into current dir
				proccess();
			} else {
				// get target dir content
				this.ajax({
					data : {
						cmd : 'open',
						tree : false,
						target : dst
					},
					success : function(data) {
						var src;
						if (data && (src = self.isNewApi ? data.files : data.cwd) && $.isArray(src)) {
							content = src; 
						}
						proccess();
					},
					beforeSend : function() { self.notify('prepareCopy', num); },
					complete   : function() { self.notify('prepareCopy', -num); }
				}, 'silent')
			}
				
		},
		
		/**
		 * Valid file name
		 * 
		 * @param  String  name to test
		 * @return Boolean
		 */
		validName : function(name) {
			if (!name 
			|| typeof(name) != 'string' 
			|| name == '..' 
			|| (!this.cwd().params.dotFiles && name.indexOf('.') === 0)) {
				return false;
			}

			if (this.options.validName) {
				if (this.options.validName instanceof RegExp) {
					return this.options.validName.test(name);
				} 
				if (typeof(this.options.validName) == 'function') {
					return this.options.validName(name)
				}
			}
			return true;
		},
		
		/**
		 * Remove directories / files
		 * 
		 * @param  Array  files hashes
		 * @return elFinder
		 */
		rm : function(files) {
			var self   = this,
				errors = [], 
				cnt, data;
			
			files = $.map($.isArray(files) ? files : [], function(hash) {
				var file = self.file(hash);

				if (file && !file.rm) {
					errors.push(file.name);
				}
				return file ? hash : null;
			});
			
			if (errors.length) {
				return this.trigger('error', {error : ['Unable to delete "$1".', errors.join(', ')]});
			}
			
			data = {files : files};

			return (cnt = files.length) > 0 
				? self.ajax({
						data       : {cmd : 'rm', targets : files, current : this.cwd().hash},
						beforeSend : function() { self.notify('rm', cnt).trigger('lockfiles', data); },
						complete   : function() { self.notify('rm', -cnt).trigger('unlockfiles', data); }
					}, 'bg') 
				: this;
		},
		
		make : function(name, type) {
			var self = this,
				cmd = type == 'file' ? 'mkfile' : 'mkdir';
				
			if (!this.validName(name)) {
				return this.trigger('error', {error : 'Unacceptable name.'});
			}
			
			if (this.fileByName(name)) {
				return this.trigger('error', {error : 'File with the same name already exists.'});
			}
			if (!this.cwd().write) {
				return this.trigger('error', {error : [cmd == 'mkdir' ? 'Unable to create directory' : 'Unable to create file', 'Not enough permission.']});
			}
			
			return this.ajax({
				data : {cmd : cmd, current : this.cwd().hash, name : name},
				beforeSend : function() { self.ui.notify(cmd, 1); },
				complete   : function() { self.ui.notify(cmd, -1); }
			}, 'bg');	
		},
		
		mkdir : function(name) {
			return this.make(name);
		},
		
		mkfile : function(name) {
			return this.make(name, 'file');
		},
		
		/**
		 * Create duplicates for required files
		 *
		 * @param  Array  files
		 * @return elFinder
		 **/
		duplicate : function(files) {
			var self  = this,
				files = $.isArray(files) ? files : [],
				l     = files.length,
				i, f;
			
			for (i = 0; i < l; i++) {
				if (!(f = this.file(files[i])) || !f.read) {
					return this.trigger('error', {error : ['Unable to duplicate "$1".', f.name]});
				}
			}
			
			return l 
				? self.ajax({
						data : {
							cmd     : 'duplicate', 
							target  : this.newAPI ? files : files.shift(), // old connector support only one file duplicate at once
							current : this.cwd().hash
						},
						beforeSend : function() { self.notify('duplicate', l); },
						complete   : function() { self.notify('duplicate', -l); }
					}, 'bg') 
				: this;
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
		i18n : function(msg) { 
			var msg = $.isArray(msg) ? msg : [msg],
				messages = this.messages;
			
			msg = $.map(msg, function(m) { return messages[m] || m; });
			return msg[0].replace(/\$(\d+)/g, function(m, num) { return msg[num] || ''; });
		},
		
		/**
		 * File mimetype to kind mapping
		 * 
		 * @type  Object
		 */
		kinds : {
			'unknown'                       : 'Unknown',
			'directory'                     : 'Folder',
			'symlink'                       : 'Alias',
			'symlink-broken'                : 'Broken alias',
			'application/x-empty'           : 'Plain text',
			'application/postscript'        : 'Postscript document',
			'application/octet-stream'      : 'Application',
			'application/vnd.ms-office'     : 'Microsoft Office document',
			'application/vnd.ms-word'       : 'Microsoft Word document',  
		    'application/vnd.ms-excel'      : 'Microsoft Excel document',
			'application/vnd.ms-powerpoint' : 'Microsoft Powerpoint presentation',
			'application/pdf'               : 'Portable Document Format (PDF)',
			'application/vnd.oasis.opendocument.text' : 'Open Office document',
			'application/x-shockwave-flash' : 'Flash application',
			'application/xml'               : 'XML document', 
			'application/x-bittorrent'      : 'Bittorrent file',
			'application/x-7z-compressed'   : '7z archive',
			'application/x-tar'             : 'TAR archive', 
		    'application/x-gzip'            : 'GZIP archive', 
		    'application/x-bzip2'           : 'BZIP archive', 
		    'application/zip'               : 'ZIP archive',  
		    'application/x-rar'             : 'RAR archive',
			'application/javascript'        : 'Javascript application',
			'text/plain'                    : 'Plain text',
		    'text/x-php'                    : 'PHP source',
			'text/html'                     : 'HTML document', 
			'text/javascript'               : 'Javascript source',
			'text/css'                      : 'CSS style sheet',  
		    'text/rtf'                      : 'Rich Text Format (RTF)',
			'text/rtfd'                     : 'RTF with attachments (RTFD)',
			'text/x-c'                      : 'C source', 
			'text/x-c++'                    : 'C++ source', 
			'text/x-shellscript'            : 'Unix shell script',
		    'text/x-python'                 : 'Python source',
			'text/x-java'                   : 'Java source',
			'text/x-ruby'                   : 'Ruby source',
			'text/x-perl'                   : 'Perl script',
		    'text/xml'                      : 'XML document', 
			'image/x-ms-bmp'                : 'BMP image',
		    'image/jpeg'                    : 'JPEG image',   
		    'image/gif'                     : 'GIF Image',    
		    'image/png'                     : 'PNG image',
			'image/x-targa'                 : 'TGA image',
		    'image/tiff'                    : 'TIFF image',   
		    'image/vnd.adobe.photoshop'     : 'Adobe Photoshop image',
			'audio/mpeg'                    : 'MPEG audio',  
			'audio/midi'                    : 'MIDI audio',
			'audio/ogg'                     : 'Ogg Vorbis audio',
			'audio/mp4'                     : 'MP4 audio',
			'audio/wav'                     : 'WAV audio',
			'video/x-dv'                    : 'DV video',
			'video/mp4'                     : 'MP4 video',
			'video/mpeg'                    : 'MPEG video',  
			'video/x-msvideo'               : 'AVI video',
			'video/quicktime'               : 'Quicktime video',
			'video/x-ms-wmv'                : 'WM video',   
			'video/x-flv'                   : 'Flash video',
			'video/x-matroska'              : 'Matroska video'
		},
		
		/**
		 * Convert mimetype into css classes
		 * 
		 * @param  String  file mimetype
		 * @return String
		 */
		mime2class : function(mime) {
			return 'elfinder-cwd-icon-'+mime.replace('/' , ' elfinder-cwd-icon-').replace(/\./g, '-');
		},
		
		/**
		 * Return localized kind of file
		 * 
		 * @param  String  file mimetype
		 * @return String
		 */
		mime2kind : function(f) {
			var kind = '';
			if (typeof(f) == 'object') {
				kind = f.link ? 'Alias' : this.kinds[f.mime]||'unknown';
			} else {
				this.log('mime2kind required file')
				kind = this.kinds[f]||'unknown';
			}
			return this.i18n(kind);
		},
		
		/**
		 * Return localized date
		 * 
		 * @param  String  date
		 * @return String
		 */
		formatDate : function(d) {
			var self = this;
			return d == 'unknown' ? self.i18n(d) : d.replace(/([a-z]+)\s/i, function(a1, a2) { return self.i18n(a2)+' '; });
		},
		
		/**
		 * Return css class marks file permissions
		 * 
		 * @param  Object  file 
		 * @return String
		 */
		perms2class : function(o) {
			var c = '';
			
			if (!o.read && !o.write) {
				c = 'elfinder-na';
			} else if (!o.read) {
				c = 'elfinder-wo';
			} else if (!o.write) {
				c = 'elfinder-ro';
			}
			return c;
		},
		
		/**
		 * Return localized string with file permissions
		 * 
		 * @param  Object  file
		 * @return String
		 */
		formatPermissions : function(f) {
			var p  = [];
				
			f.read && p.push(this.i18n('read'));
			f.write && p.push(this.i18n('write'));	

			return p.length ? p.join(' '+this.i18n('and')+' ') : this.i18n('no access');
		},
		
		/**
		 * Return formated file size
		 * 
		 * @param  Number  file size
		 * @return String
		 */
		formatSize : function(s) {
			var n = 1, u = 'bytes';
			
			if (s > 1073741824) {
				n = 1073741824;
				u = 'Gb';
			} else if (s > 1048576) {
	            n = 1048576;
	            u = 'Mb';
	        } else if (s > 1024) {
	            n = 1024;
	            u = 'Kb';
	        }
	        return (s > 0 ? Math.round(s/n) : 0) +' '+u;
		},
		
		oldAPIRules : {
			open : {
				cwd    : {req : true,  valid : $.isPlainObject},
				tree   : {req : false, valid : $.isPlainObject},
				params : {req : false, valid : $.isPlainObject}
			},
			tree : {
				tree : {req : true, valid : function() { return false; }}
			},
			parents : {
				tree : {req : true, valid : function() { return false; }}
			},
			tmb : {
				current : {req : true},
				images  : {req : true, valid : $.isPlainObject}
			}
		},
		
		newAPIRules : {
			open : {
				cwd    : {req : true,  valid : $.isPlainObject},
				files  : {req : true, valid : $.isArray}
			},
			tree : {
				tree : {req : true	}
			},
			parents : {
				tree : {req : true, valid : $.isArray}
			},
			tmb : {
				current : {req : true},
				images  : {req : true, valid : $.isPlainObject}
			},
			rm : {
				removed : {req : true, valid : $.isArray}
			},
			mkdir : {
				added : {req : true, valid : $.isArray}
			}
		},
		
		sorts : {
			nameDirsFirst : 1,
			kindDirsFirst : 2,
			sizeDirsFirst : 3,
			name : 4,
			kind : 5,
			size : 6
		},
		
		i18 : {
			en : {
				_translator  : '',
				_translation : 'English localization',
				direction    : 'ltr',
				messages     : {}
			}
		},
		
		log : function(m) { window.console && window.console.log && window.console.log(m); return this; },
		
		debug : function(type, m) {
			var d = this.options.debug;

			if (d == 'all' || d === true || ($.isArray(d) && $.inArray(type, d) != -1)) {
				window.console && window.console.log && window.console.log('elfinder debug: ['+type+'] ['+this.id+']', m);
			} 
			return this;
		},
		time : function(l) { window.console && window.console.time && window.console.time(l); },
		timeEnd : function(l) { window.console && window.console.timeEnd && window.console.timeEnd(l); },
		
		/**
		 * Commands costructors
		 *
		 * @type Object
		 */
		commands : {}
	}
	
	
	
	
	
	$.fn.elfinder = function(o) {
		
		if (o == 'instance') {
			return this.getElFinder();
		}
		
		return this.each(function() {
			
			var cmd = typeof(o) == 'string' ? o : '';
			if (!this.elfinder) {
				new elFinder(this, typeof(o) == 'object' ? o : {})
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