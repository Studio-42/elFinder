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
			 * "sync" requiest blocked othe requests until complete
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
			 * Parameters got from connctor on init requiest.
			 * Do not changed in session
			 *
			 * @type Object
			 **/
			coreParams = {},
			
			/**
			 * In new api any volume can has own parameters, 
			 * so here store united parameters
			 *
			 * @type Object
			 **/
			params = {},
			
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
				date   : '',
				read   : 1,
				write  : 1,
				rm     : 1,
				params : {},
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
			clipboard = {
				files : [],
				src   : null, // required for old api
				cut   : false
			},
			
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
			
			/**
			 * Notification dialog
			 *
			 * @type  jQuery
			 */
			notifyDialog = $('<div/>'), 
			
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
					for (i in files) {
						if (files.hasOwnProperty(i) && files[i].mime != 'directory' && files[i].phash != cwd.hash) {
							delete files[i];
						}
					}
				}

				while (l--) {
					f = data[l];
					if (self.oldAPI) {
						f.phash = cwd.hash;
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
							d.phash = phash;
							d.mime  = 'directory';
							d.rm    = 1;
							delete d.dirs;
							files[d.hash] = d;
						}
					};

				add(dir);
				phash = dir.hash; 
				
				while (l--) {
					dir = childs[l];
					dir.dirs && dir.dirs.length ? cacheTree(ddir, phash) : add(dir);
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
							self.log(i)
							shortcut.callback(e, self);
							return false;
						}
					});
				}
			},
			
			resetClipboard = function() {
				clipboard = {
					files : [],
					src   : null, // required for old api
					cut   : false
				}
				
				self.trigger('changeClipboard', {clipboard : clipboard});
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
						window.console && window.console.error && window.console.error(ex);
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
		 * Return parameter value
		 * 
		 * @param  String  param name
		 * @return mixed
		 */
		this.param = function(n) {

			return params[n];
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
		
		this.clipboard = function() {
			return $.extend({}, clipboard);
		}
		
		/**
		 * Copy files into buffer
		 * 
		 * @param  Array    files hashes array
		 * @param  String   files parent dir hash (required by old api)
		 * @param  Boolean  cut files?
		 * @param  Boolean  method called from drag&drop - required for correct error message
		 * @return Boolean
		 */
		this.copy = function(files, src, cut, dd) {
			var self   = this,
				_files = [],
				errors = [],
				file;
			
			resetClipboard();
			
			$.each(files||[], function(i, hash) {
				if (file = self.file(hash)) {
					if (!file.read || (cut && !file.rm)) {
						errors.push(file.name);
					} else {
						_files.push(hash);
					}
				}
			})
			
			if (errors.length) {
				return !!this.trigger('error', {
					error : [
						[cut ? (dd ? 'Unable to move "$1".' : 'Unable to cut "$1".') : 'Unable to copy "$1".', errors.join(', ')], 
						'Not enough permission.'
					]
				});
			}
			
			if (_files.length) {
				clipboard = {
					src   : src || this.cwd().hash,
					cut   : cut,
					files : _files
				};

				return !!this.trigger('changeclipboard', {clipboard : clipboard});
			}
			
			return false;
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
		 * Open notification dialog 
		 * and append/update message for required notification type.
		 *
		 * @param  String  notification type (@see elFinder.notifyType)
		 * @param  Number  notification counter (how many files to work with)
		 * @return elFinder
		 */
		this.notify = function(type, cnt) {
			var msg    = this.notifyType[type], 
				nclass = 'elfinder-notify',
				tclass = nclass+'-text',
				place;
				
			if (msg) {
				place = notifyDialog.find('.'+nclass);
				
				if (place.length) {
					cnt += parseInt(place.data('cnt'));
				} else {
					place = $('<div class="'+nclass+' '+nclass+'-'+type+'"><span class="'+tclass+'"/><div class="elfinder-notify-spinner"/><span class="elfinder-dialog-icon"/></div>').appendTo(notifyDialog);
				}
				if (cnt > 0) {
					place.data('cnt', cnt).children('.'+tclass).text(this.i18n(msg)+' ('+cnt+')');
					notifyDialog.dialog('open');
				} else {
					place.remove();
					!notifyDialog.children().length && notifyDialog.dialog('close');
				}
			}
			return this;
		}
		
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
			cursorAt   : {left : 60, top : 47},
			refreshPositions : true,
			start      : function() { self.trigger('focus'); },
			drag       : function(e, ui) { ui.helper.toggleClass('elfinder-drag-helper-plus', e.shiftKey||e.ctrlKey||e.metaKey); }
		};
		
		this.droppable = {
				tolerance : 'pointer',
				// accept : 'a',
				drop : function(e, ui) {
					var $this = $(this), 
						src   = ui.helper.data('src'),
						files = ui.helper.data('files')||[],
						l = files.length,
						dst;
					
					if (!l) {
						return;
					}
					self.cleanBuffer();
					// self.log(this)
					if ($this.is('.elfinder-cwd')) {
						dst = cwd.hash;
						
					} else if ($this.is('.elfinder-cwd-file')) {
						dst = this.id;
					} else {
						dst = this.id.substr(4);
					}
					
					while (l--) {
						
					}
					
					ui.helper.hide();
					// self.log(src+' '+dst)

					if (self.copy(files, src, !(e.shiftKey || e.ctrlKey || e.metaKey), true)) {
						self.paste(dst).cleanBuffer();
						// self.cleanBuffer();
					}
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
			.bind('ajaxerror error', function(e) {
				var text = (function(error) {
						text = [];
						$.each($.isArray(error) ? error : [error], function(i,e) {
							text.push(self.i18n(e));
						});
						
						return text.join('<br/>');
					})(e.data.error||'');

				if (self.isVisible()) {
					self.dialog(text, {
						title : 'Error',
						modal : true,
						closeOnEscape : false,
						buttons : {
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
			
			.one('ajaxstop', function(e) {
				self.trigger('load', e.data.response);
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

				self.api    = (data.files ? parseFloat(data.api) : 2) || 1;
				self.newAPI = self.api > 1;
				self.oldAPI = !self.newAPI;
				rules       = self[self.newAPI ? 'newAPIRules' : 'oldAPIRules'];
				
				// store core params
				coreParams = e.data.params;
				// fix params for old api
				if (self.oldAPI) {
					params  = coreParams;
					cwd.url = coreParams.url;
				}
				
				dir.elfindercwd(self).attr('id', 'elfindercwd-'+self.id);
				
				self.options.allowNav && nav.show().append($('<ul/>').elfindertree(self));
				
				notifyDialog = self.dialog('', {
					closeOnEscape : false,
					autoOpen      : false,
					close         : function() { }
				}, 'notify');

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
						// self.log(cmd)
						cmd.prototype = base;
						commands[name] = new cmd();
						commands[name]._super = base;
						commands[name].setup(name);
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
				// set current directory data
				cwd = e.data.cwd;
				// update params for current directory (new api)
				params = $.extend({}, coreParams, e.data.cwd.params||{});

				if (self.newAPI) {
					if (self.options.sync > 3000) {
						setInterval(function() {
							self.sync();
						}, self.options.sync);
					}
				} else {					
					cwd.tmb = !!e.data.tmb;
					// old api: if we get tree - reset cache
					if (e.data.tree) {
						files = {};
						cacheTree(e.data.tree);
					}
					// var id;
					// 
					// if (!cwd.phash && typeof((id = nav.find('#nav-'+cwd.hash).parents('ul:first').prev('[id]').attr('id'))) == 'string') {
					// 	cwd.phash = id.substr(4);
					// }
				}
				
				cache(e.data.files || e.data.cdc, true);

				// remember last dir
				self.lastDir(cwd.hash);

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
				self.log(selected)
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
						}
						delete files[h];
						
					});
				}

			})
			/**
			 * Update files cache - add new files
			 */
			.bind('added', function(e) {
				update(e.data.added);
			});
		
		start();
		
		// this.shortcut({
		// 		pattern     : 'ctrl+backspace',
		// 		description : 'Delete files',
		// 		callback    : function() { 
		// 			self.trigger('confirm', {title : 'Delete', text : 'Do you want to delete files', cb : function(result, all) {
		// 				self.log(result).log(all)
		// 			}})
		// 		}
		// })
		
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
							$(this).dialog('close');
							callback(checkbox.is(':checked'));
						},
						Cancel : function() { $(this).dialog('close'); }
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
			rm     : 'Delete files'
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
		 * Copy files into buffer and mark for delete after paste
		 * Wrapper for copy method
		 * 
		 * @param  Array  files hashes array
		 * @return elFinder
		 */
		cut : function(files, src) { 
			return this.copy(files, src, true); 
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
		 * @clean  Boolean  clean buffer after paste - required by drag&drop
		 * @return elFinder
		 */
		paste : function(dst) {
			var cwd   = this.cwd().hash,
				dst   = dst || cwd,
				b     = this.buffer,
				l     = b.files.length,
				paste = [],
				dpl   = [], 
				file, hash;

			while (l--) {
				hash = b.files[l];
				file = this.file(hash);				
				
				if (file && !this.hasParent(dst, hash)) {
					if (file.phash == dst) {
						dpl.push(hash)
					} else {
						paste.push(hash);
					}
				}
			}
			
			if (paste.length) {
				this.ajax({
					cmd     : 'paste',
					current : cwd,
					src     : b.src,
					dst     : dst,
					cut     : b.cut ? 1 : 0,
					targets : paste
				}, 'bg');
			}
			
			this.log(paste).log(dpl)
			if (dpl.length) {
				this.duplicate(dpl);
			}
			b.cut && this.cleanBuffer();
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
			var self = this,
				errors = [], 
				cnt;
			
			files = $.map($.isArray(files) ? files : [files], function(hash) {
				var file = self.file(hash);

				if (file && !file.rm) {
					errors.push(file.name);
				}
				return file ? hash : null;
			});
			
			if (errors.length) {
				return this.trigger('error', {error : [['Unable to delete "$1".', errors.join(', ')], 'Not enough permission.']});
			}

			return (cnt = files.length) > 0 
				? self.ajax({
						data       : {cmd : 'rm', targets : files, current : this.cwd().hash},
						beforeSend : function() { self.notify('rm', cnt); },
						complete   : function() { self.notify('rm', -cnt); }
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
		
		duplicate : function(files) {
			var self = this,
				error, cnt;
			
			files = $.map($.isArray(files) ? files : [files], function(hash) {
				var file = self.file(hash);
				
				if (file && !error && !file.read) {
					error = [self.i18n(['Unable to duplicate "$1".', file.name]), 'Not enough permission.'];
				}
				return file ? hash : null;
			});
			
			if (error) {
				return this.trigger('error', {error : error});
			}

			cnt = files.length;

			return cnt 
				? self.ajax({
						data       : {cmd : 'duplicate', target : this.newAPI ? files : files.shift(), current : this.cwd().hash},
						beforeSend : function() { self.ui.notify('duplicate', cnt); },
						complete   : function() { self.ui.notify('duplicate', -cnt); }
					}, 'bg') 
				: this;
			
			
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
		mime2kind : function(mime) {
			return this.i18n(this.kinds[mime]||'unknown');
		},
		
		/**
		 * Return localized date
		 * 
		 * @param  String  date
		 * @return String
		 */
		formatDate : function(d) {
			var self = this;
			return d.replace(/([a-z]+)\s/i, function(a1, a2) { return self.i18n(a2)+' '; });
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
			var r  = !!f.read,
				w  = !!f.read,
				rm = !!f.rm,
				p  = [];
				
			r  && p.push(this.i18n('read'));
			w  && p.push(this.i18n('write'));
			rm && p.push(this.i18n('remove'));
			return p.join('/');
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
				files  : {req : true, valid : $.isArray},
				params : {req : false, valid : $.isPlainObject}
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