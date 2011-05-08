(function($) {

	elFinder = function(node, opts) {
		
		var self = this,
			/**
			 * Is shortcuts/commands enabled
			 *
			 * @type Boolean
			 **/
			enabled = true,
			
			/**
			 * Store enabled value before ajax requiest
			 *
			 * @type Boolean
			 **/
			prevEnabled = true,
			
			/**
			 * Rules to validate data from backend
			 *
			 * @type Object
			 **/
			rules = {},
			
			/**
			 * Current working directory
			 *
			 * @type Object
			 **/
			cwdOptions = {
				path     : '',
				url      : '',
				tmbUrl   : '',
				disabled : [],
				uplMaxSize : '',
				separator : '/'
			},
			
			cwd = '',
			
			/**
			 * Files/dirs cache
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
			listeners = {},
			
			/**
			 * Shortcuts
			 *
			 * @type Object
			 **/
			shortcuts = {},
			
			/**
			 * Loaded commands
			 *
			 * @type Object
			 **/
			commands = {},
			
			/**
			 * Buffer for copied files
			 *
			 * @type Object
			 **/
			clipboard = [],
			
			node = $(node),
			
			id = node.attr('id') || '',
			
			namespace = 'elfinder'+(id || Math.random().toString().substr(2, 7)),
			
			mousedown = 'mousedown.'+namespace,
			
			keydown = 'keydown.'+namespace,
			
			keypress = 'keypress.'+namespace,
			
			prevContent = $('<div/>').append(node.contents()),
			
			workzone = $('<div class="ui-helper-clearfix ui-corner-all elfinder-workzone"/>'),
			
			nav = $('<div class="ui-state-default elfinder-nav"/>').hide().appendTo(workzone),
			
			dir = $('<div/>').appendTo(workzone),
			
			toolbar = $('<div/>').hide(),
			
			statusbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-statusbar"/>').hide(),
			
			overlay = $('<div/>').elfinderoverlay(),
			
			width, height,
			
			/**
			 * Store info about files/dirs in "files" object.
			 * Here we proccess data.files for new api or data.cdc for old api.
			 * Files from data.tree for old api adds in cacheTree()
			 *
			 * @param  Array  files
			 * @return void
			 **/
			cache = function(data) {
				var l = data.length, f;

				while (l--) {
					f = data[l];
					if (f.name && f.hash && f.mime) {
						// delete f.tmb;
						files[f.hash] = f;
					}
				}
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
							shortcut.callback(e, self);
							return false;
						}
					});
				}
			},
			
			setAPI = function(ver) {
				self.api    = parseFloat(ver) || 1;
				self.newAPI = self.api > 1;
				self.oldAPI = !self.newAPI;
				rules       = self.rules[self.newAPI ? 'newapi' : 'oldapi'];
			}
			
			/**
			 * On load failed make elfinder inactive
			 *
			 * @return void
			 */
			loadfail = function() {
				self.disable().lastDir('');
				listeners = {};
				shortcuts = {};
				$(document).add(node).unbind('.'+this.namespace);
				self.trigger = function() { }
			},
			
			load = function(data) {
				var base = new self.command(self),
					opts = self.options,
					cmds = opts.commands || [],
					tb   = 'elfindertoolbar'+opts.toolbar,
					cmd,
					l;
				
				setAPI(data.api);
				
				if (!self.validResponse('open', data)) {
					self.error([self.errors.invResponse, self.errors.invData]);
					return onloadfail();
				}
				
				
				self.history = new self.history(self);
				dir.elfindercwd(self).attr('id', 'elfindercwd-'+self.id);
				self.options.allowNavbar && nav.show().append($('<ul/>').elfindertree(self));

				$.each(['open', 'back', 'forward', 'up', 'home'], function(i, name) {
					$.inArray(name, cmds) === -1 && cmds.push(name)
				});

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
				
				if (!$.fn[tb]) {
					tb = 'elfindertoolbar';
				}
				toolbar[tb](opts.toolbarConf, commands)

				self.debug('api', self.api)
					.resize(width, height)
					.load();

				responseHandlers.open($.extend(true, data))
				self.trigger('open', data);

				// self.trigger('open', data);
				// if (opts.sync >= 3000) {
				// 	setInterval(function() {
				// 		self.sync('silent');
				// 	}, self.options.sync);
				// }
				
			},
			
			responseHandlers = {
				open : function(data) {
					if (data.api || data.params) {
						// init - reset cache
						files = {};
					} else {
						// remove only files from prev cwd
						for (i in files) {
							if (files.hasOwnProperty(i) && files[i].mime != 'directory' && files[i].phash == cwd) {
								delete files[i];
							}
						}
					}

					cwd = data.cwd.hash;

					if (self.newAPI) {
						cwdOptions = $.extend({}, cwdOptions, data.options);
						data.files.push(data.cwd);
						cache(data.files);
					} else {
						data.tree && cache(self.normalizeOldTree(data.tree));
						cache($.map(data.cdc, function(f) { return self.normalizeOldFile(f, cwd); }));

						if (!files[cwd]) {
							files[cwd] = self.normalizeOldFile(data.cwd);
						}

						cwdOptions = self.normalizeOldOptions(data);

						if (cwdOptions.path.indexOf('\\') != -1) {
							cwdOptions.separator = '\\';
						} else if (cwdOptions.path.indexOf('/') != -1) {
							cwdOptions.separator = '/';
						}

					}
					// self.log(cwdOptions)
					self.lastDir(cwd);
					data.debug && self.debug('backend-debug', data.debug);
					
					return self
				},
				tree : function(data) {
					cache(data.tree || []);
					return self;
				},
				parents : function(data) {
					cache(data.tree || []);
					return self;
				},
				
				add : function(data) {
					
				},
				
				remove : function(data) {
					
				}, 
				
				change : function(data) {
					
				},
				
				sync : function(data) {
					var raw = [data.cwd].concat(data.files).concat(data.tree||[]),
						state   = {},
						removed = [],
						added   = [],
						changed = [], i, f;

					cwdOptions = $.extend({}, cwdOptions, data.options);
					self.log(data)
					for (i = 0; i < raw.length; i++) {
						f = raw[i];
						if (f.hash && f.name && !state[f.hash]) {
							state[f.hash] = f;
						}
					}

					$.each(files, function(hash, f) {
						if (!state[hash]) {
							removed.push(hash);
						}
					});

					$.each(state, function(hash, file) {
						var prev = files[hash];

						if (!prev) {
							added.push(file)
						} else if (prev.name != file.name 
						|| prev.phash  != file.phash
						|| prev.mime   != file.mime
						|| prev.read   != file.read
						|| prev.write  != file.write
						|| prev.locked != file.locked
						|| prev.date   != file.date
						|| prev.dirs   != file.dirs
						|| prev.size   != file.size) {
							// self.log(file)
							changed.push(file);
						}

					})
					self.log(removed).log(added).log(changed)
					return self
					removed && self.trigger('removed', {removed : removed});
					added   && self.trigger('added',   {added : added});
					changed && self.trigger('changed', {changed : changed});
					
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
		
		this.requestType = /^(get|post)$/i.test(this.options.requestType) ? this.options.requestType.toLowerCase() : 'get',
		
		this.customData = $.isPlainObject(this.options.customData) ? this.options.customData : {};
		
		/**
		 * ID. Required to create unique cookie name
		 *
		 * @type String
		 **/
		this.id = id;
		
		/**
		 * Events namespace
		 *
		 * @type String
		 **/
		this.namespace = namespace;

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
		 * Sort files type
		 *
		 * @type String
		 **/
		this.sort = this.sortType();
		
		/**
		 * Return true if filemanager is active
		 *
		 * @return Boolean
		 **/
		this.enabled = function() {
			return node.is(':visible') && enabled;
		}
		
		/**
		 * Return true if filemanager is visible
		 *
		 * @return Boolean
		 **/
		this.visible = function() {
			return node.is(':visible');
		}
		
		/**
		 * Return root dir hash for current working directory
		 * 
		 * @return String
		 */
		this.root = function() {
			var dir = files[cwd];
			
			while (dir && dir.phash) {
				dir = files[dir.phash]
			}
			return dir.hash;
		}
		
		/**
		 * Return current working directory info
		 * 
		 * @return Object
		 */
		this.cwd = function() {
			return files[cwd];
		}
		
		/**
		 * Return required cwd option
		 * 
		 * @param  String  option name
		 * @return mixed
		 */
		this.option = function(name) {
			return cwdOptions[name]||'';
		}
		
		/**
		 * Return true if command enabled
		 * 
		 * @param  String  command name
		 * @return Boolean
		 */
		this.isCommandEnabled = function(name) {
			return commands[name] ? $.inArray(name, cwdOptions.disabled) === -1 : true;
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
		 * Return file path
		 * 
		 * @param  Object  file
		 * @return String
		 */
		this.path = function(file) {
			return cwdOptions.path + (file.hash == cwd ? '' : cwdOptions.separator+file.name);
		}
		
		/**
		 * Return file url if set
		 * 
		 * @param  Object  file
		 * @return String
		 */
		this.url = function(file) {
			var path = '';

			if (cwdOptions.url) {
				path = this.path(file).replace(cwdOptions.separator, '/');
				return cwdOptions.url + path.substr(path.indexOf('/')+1);
			}
			return '';
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
		 * Return selected files info
		 * 
		 * @return Array
		 */
		this.selectedFiles = function() {
			return $.map(selected, function(hash) { return files[hash] || null });
		};
		
		/**
		 * Return true if file with required name existsin required folder
		 * 
		 * @param  String  file name
		 * @param  String  parent folder hash
		 * @return Boolean
		 */
		// this.exists = function(name, phash) {
		// 	var hash;
		// 
		// 	for (hash in files) {
		// 		if (files.hasOwnProperty(hash) && files[hash].phash == phash && files[hash].name == name) {
		// 			return true;
		// 		}
		// 	}
		// };
		
		/**
		 * Valid data for required command based on rules
		 * 
		 * @param  String  command name
		 * @param  Object  cammand's data
		 * @return Boolean
		 */
		this.validResponse = function(cmd, data) {
			return rules[cmd] ? rules[cmd](data) : true;
		}
		/**
		 * Proccess ajax request.
		 * Fired events :
		 *  - "error" on error from backend
		 *  - event with command name on request success
		 *  - "added"/"removed" if response contains data with this names
		 *
		 * @example
		 * 1. elfinder.ajax({cmd : 'open', init : true}) - request lock interface till request complete
		 * 2. elfinder.ajax({data : {...}, complete : function() { ... }}, 'bg') 
		 *        - add handler to request 'complete' event 
		 *          and produce request without lock interface,
		 *          but errors will shown
		 * 3. elfinder.ajax({...}, 'silent') - all errors will be send to debug
		 *
		 * @param  Object  data to send to connector or options for ajax request
		 * @param  String  request mode. 
		 * 		"sync"   - does not create real sync request, only block other elFinder requests until end
		 * 		"bg"     - do not block other requests, on error - show message
		 * 		"silent" - do not block other requests, send error message to debug
		 * @return $.Deferred
		 */
		this.ajax = function(options, freeze) {
			var self    = this,
				o       = this.options,
				errors  = this.errors,
				dfrd    = $.Deferred(),
				data    = $.extend({}, o.customData, {mimes : o.onlyMimes}, options.data || options),
				cmd     = data.cmd,
				deffail = !(options.preventDefault || options.preventFail),
				defdone = !(options.preventDefault || options.preventDone),
				options = $.extend({
					url      : o.url,
					async    : true,
					type     : this.requestType,
					dataType : 'json',
					cache    : false,
					// timeout  : 100,
					data     : data
				}, options.options || {}),
				fail = function(error) {
					self.error(error)
				},
				done = function(data) {
					data.warning && self.error(data.warning);

					if (responseHandlers[cmd]) {
						responseHandlers[cmd]($.extend({}, data))
					}

					// fire some event to update cache/ui
					data.removed && data.removed.length && self.trigger('removed', data);
					data.added   && data.added.length   && self.trigger('added',   data);
					data.changed && data.changed.length && self.trigger('changed', data);
					
					// fire event with command name
					self.trigger(cmd, data);
				},
				error = function(xhr, status) {
					var error;
					
					switch (status) {
						case 'abort':
							error = [errors.noConnect, errors.connectAborted];
							break;
						case 'timeout':
							error = [errors.noConnect, errors.connectTimeout];
							break;
						case 'parsererror':
							error = [errors.invResponse, errors.notJSON];
							break;
						default:
							error = xhr && parseInt(xhr.status) > 400 ? errors.noConnect : errors.invResponse;
					}
					
					dfrd.reject(error);
				},
				success = function(response) {
					var error;

					if (!response) {
						error = [errors.invResponse, errors.emptyData];
					} else if (response.error) {
						error = response.error;
					} else if (!self.validResponse(response)) {
						error = [errors.invResponse, errors.invData];
					}
					
					error ? dfrd.reject(error) : dfrd.resolve(response);
				}
				;
			// self.log(deffail).log(defdone)
			deffail && dfrd.fail(fail);
			defdone && dfrd.done(done);
			o.debug && dfrd.fail(function(error) { self.debug('error', self.i18n(error)); });
			
			if (!cmd) {
				return dfrd.reject(errors.cmdRequired);
			}	
			
			if (freeze) {
				// prevEnabled = enabled;
				// enabled = false;
				this.disable()
				overlay.show()
				// showOverlay();
				// showSpinner();
				
				dfrd.always(function() {
					// hideSpinner();
					overlay.hide()
					// hideOverlay();
					prevEnabled && self.enable();
				});
			}
			
			$.ajax(options).fail(error).success(success);
			
			return dfrd;
		};
		
		
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
			var l = listeners[('' + event).toLowerCase()] || [],
				i = l.indexOf(callback);

			i > -1 && l.splice(i, 1);
			//delete callback; // need this?
			callback = null
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
					// to avoid data modifications. remember about "sharing" passing arguments in js :) 
					event.data = $.extend(true, {}, data);
					try {
						if (handlers[i](event, this) === false 
						|| event.isDefaultPrevented()) {
							break;
						}
					} catch (ex) {
						window.console && window.console.log && window.console.log(ex);
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
				// node    = this.node,
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
						// showOverlay();
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
					// modal && hideOverlay();
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
		
		this.getUIDir = function() {
			return dir;
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
			node.width(w).height(h);
			return this.updateHeight();
		}
		
		this.updateHeight = function() {
			var h = node.height() - (toolbar.is(':visible') ? toolbar.outerHeight(true) : 0) - (statusbar.is(':visible') ? statusbar.outerHeight(true) : 0);
			workzone.height(h);
			h = workzone.height();
			nav.height(h - 2 - (nav.innerHeight() - nav.height()));
			dir.height(h - (dir.innerHeight() - dir.height()));
			return this;
		}
		
		this.restoreSize = function() {
			return this.resize(width, height);
		}
		
		this.sync = function(freeze) {
			var self    = this,
				raw     = {},
				removed = [],
				added   = [],
				changed = [],
				dfrd    = $.Deferred(),
				opts1   = {
					data : {cmd : 'open', init : 1, target : cwd, tree : 1},
					preventDefault : true
				},
				opts2 = {
					data : {cmd : 'parents', target : cwd},
					preventDefault : true
				};
			
			$.when(
				this.ajax(opts1, freeze),
				this.ajax(opts2, freeze)
			)
			.fail(function(error) {
				freeze && self.error(error);
				dfrd.reject()
			})
			.then(function(odata, pdata) {
				setAPI(odata.api);

				if (!(self.validResponse('open', odata) 
				&& (self.oldAPI || self.validResponse('parents', pdata)))) {
					self.error([self.errors.invResponse, self.errors.invData]);
					return dfrd.reject();
				}
				
				if (self.newAPI) {
					cwdOptions = $.extend({}, cwdOptions, odata.options);
					$.each(odata.files.concat(pdata.tree), function(i, f) {
						if (f.hash && f.name && f.mime) {
							raw[f.hash] = f;
						}
					})
				} else {
					cwdOptions = $.extend({}, cwdOptions, self.normalizeOldOptions(odata));
					raw = self.normalizeOldTree(data.tree);
					$.each(data.cdc, function(i, f) {
						if (f.hash && f.name && f.mime) {
							raw[f.hash] = self.normalizeOldFile(f, cwd);
						}
					});
				}

				$.each(files, function(hash, f) {
					!raw[hash] && removed.push(hash);
				})
				
				$.each(raw, function(hash, file) {
					var origin = files[hash];
					
					if (!origin) {
						added.push(file);
					} else {
						$.each(file, function(prop) {
							if (file[prop] != origin[prop]) {
								changed.push(file)
								return false;
							}
						})
					}
					
					
				})
				
				self.log(removed).log(added).log(changed)
				
			});
			
			return dfrd;
		}
		
		/**
		 * Destroy this elFinder instance
		 *
		 * @return void
		 **/
		this.destroy = function(notRestoreNode) {
			if (node && node[0].elfinder) {
				this.trigger('destroy');
				onloadfail();
				node.children().remove();
				!notRestoreNode && node.append(prevContent.contents()).removeClass(this.cssClass);
				node[0].elfinder = null;
			}
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
			return alert(this.i18n(this.errors.jquiInvalid));
		}

		if (!node.length) {
			return alert(this.i18n(this.errors.nodeRequired));
		}
		
		if (!this.options.url) {
			return alert(this.i18n(this.errors.urlRequired));
		}
		
		this.cssClass = 'ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+(this.direction == 'rtl' ? 'rtl' : 'ltr')+' '+this.options.cssClass;
		
		node.addClass(this.cssClass)
			.append(toolbar)
			.append(workzone)
			.append(statusbar)
			.append(overlay)
			.bind(mousedown, function() {
				!enabled && self.enable();
			});
		
		width  = self.options.width || 'auto'; 
		height = self.options.height || 300;
		this.resize(width, height);
		node[0].elfinder = this;
		
		this.options.resizable 
		&& $.fn.resizable 
		&& node.resizable({
				resize    : function() { self.updateHeight(); },
				minWidth  : 300,
				minHeight : 200
			});
		
		// attach events to document
		$(document)
			// disable elfinder on click outside elfinder
			.bind(mousedown, function(e) { enabled && !$(e.target).closest(node).length && self.disable(); })
			// exec shortcuts
			.bind(keydown+' '+keypress, execShortcut);
		
		// create methods
		$.each(['enable', 'disable', 'load', 'select', 'error'], function(i, name) {
			self[name] = function() {
				var arg = arguments[0];
				return arguments.length == 1 && typeof(arg) == 'function'
					? self.bind(name, arg)
					: self.trigger(name, $.isPlainObject(arg) ? arg : {value : arg});
			}
		})
		
		// bind event handlers
		this.enable(function() {
			if (!enabled && self.visible() && overlay.is(':hidden')) {
				enabled = true;
				$('texarea,input,button').blur();
			}
		})
		.disable(function() {
			prevEnabled = enabled;
			enabled = false;
			
		})
		.select(function(e) {
			selected = $.map(e.data.selected || e.data.value|| [], function(hash) {
				return files[hash] ? hash : null;
			});
		})
		.error(function(e) { 
			alert(self.i18n(e.data.error || e.data.value))
		})
		
		
		this
			/**
			 * Show error dialog
			 */
			// .bind('error warning', function(e) {
			// 	if (self.visible()) {
			// 		self.dialog(self.i18n(e.data.error || e.data.warning), {
			// 			title         : 'Error',
			// 			modal         : true,
			// 			closeOnEscape : false,
			// 			buttons       : {
			// 				Ok : function() { $(this).dialog('close'); }
			// 			}
			// 		}, 'error');
			// 	}
			// })
			
			.bind('sync_', function(e) {
				var data = e.data,
					raw = [data.cwd].concat(data.files).concat(data.tree||[]),
					state   = {},
					removed = [],
					added   = [],
					changed = [], i, f;

				cwdOptions = $.extend({}, cwdOptions, data.options);
				self.log(data)
				for (i = 0; i < raw.length; i++) {
					f = raw[i];
					if (f.hash && f.name && !state[f.hash]) {
						state[f.hash] = f;
					}
				}
				
				$.each(files, function(hash, f) {
					if (!state[hash]) {
						removed.push(hash);
					}
				});
				
				$.each(state, function(hash, file) {
					var prev = files[hash];
					
					if (!prev) {
						added.push(file)
					} else if (prev.name != file.name 
					|| prev.phash  != file.phash
					|| prev.mime   != file.mime
					|| prev.read   != file.read
					|| prev.write  != file.write
					|| prev.locked != file.locked
					|| prev.date   != file.date
					|| prev.dirs   != file.dirs
					|| prev.size   != file.size) {
						// self.log(file)
						changed.push(file);
					}
					
				})
				self.log(removed).log(added).log(changed)
				removed && self.trigger('removed', {removed : removed});
				added   && self.trigger('added',   {added : added});
				changed && self.trigger('changed', {changed : changed});
			})
			.bind('changed', function(e) {
				cache(e.data.changed||[])
				// $.each(e.data.changed||[], function(i, file) {
				// 	files[file.hash] && $.extend(files[file.hash], file);
				// });
			})
			/**
			 * Update files cache - remove not existed files
			 */
			.bind('removed', function(e) {
				var rm = e.data.removed,
					l  = rm.length, 
					remove = function(hash) {
						var file = files[hash];
						if (file) {
							if (file.mime == 'directory' && file.dirs) {
								$.each(files, function(h, f) {
									f.phash == hash && remove(h);
								});
							}
							delete files[hash];
						}
					};
					
				while (l--) {
					remove(rm[l]);
				}
			})
			/**
			 * Update files cache - add new files
			 */
			.bind('added', function(e) {
				cache(e.data.added);
			});
		
		this.ajax({data : {cmd : 'open', target : self.lastDir(), init : 1, tree : 1}, preventDone : true}, true)
			.fail(loadfail)
			.done(load)
			
	}
	
	
	elFinder.prototype = {
		
		i18 : {
			en : {
				_translator  : '',
				_translation : 'English localization',
				direction    : 'ltr',
				messages     : {}
			}
		},
		
		errors : {
			jquiInvalid  : 'Invalid jQuery UI configuration. Check selectable, draggable, draggable and dialog components included.',
			nodeRequired : 'elFinder required DOM Element to be created.',
			urlRequired  : 'Invalid elFinder configuration! You have to set URL option.',
			noConnect    : 'Unable to connect to backend. $1',
			connectAborted      : 'Connection aborted.',
			connectTimeout : 'Connection timeout.',
			invResponse : 'Invalid backend response. $1',
			notJSON : 'Data is not JSON.',
			emptyData : 'Data is empty.',
			invData : 'Invalid data.',
			cmdRequired : 'Backend request required command name.',
			
			notFound     : 'File not found.',
			notDir       : '"$1" is not a folder.',
			notFile      : '"$1" is not a file.',
			notRead      : '"$1" can’t be opened because you don’t have permission to see its contents.',
			notRm        : '"$1" is locked and can not be removed.',
			notCopy      : '"$1" can’t be copied because you don’t have permission to see its contents.',
			popupBlocks  : 'Unable to open file in new window. Allow popup window in your browser.',
			invalidName  : 'Invalid file name.',
			fileLocked   : 'File "$1" locked and can’t be removed or renamed.'
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
			duplicate : 'Duplicate files',
			rename : 'Rename files'
		},
		
		rules : {
			oldapi : {
				open    : function(data) { return data.cwd && data.cdc && $.isPlainObject(data.cwd) && $.isArray(data.cdc); },
				tmb     : function(data) { return data.current && data.images && $.isPlainObject(data.images); }
			},
			
			newapi : {
				open    : function(data) { return data && data.cwd && data.files && $.isPlainObject(data.cwd) && $.isArray(data.files); },
				tree    : function(data) { return data && data.tree && $.isArray(data.tree); },
				parents : function(data) { return data && data.tree && $.isArray(data.tree); },
				tmb     : function(data) { return data && data.current && data.images && $.isPlainObject(data.images); }
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
		
		/**
		 * Commands costructors
		 *
		 * @type Object
		 */
		commands : {},
		
		plugins : {},
		
		
		
		/**
		 * Make filemanager active
		 *
		 * @return elFinder
		 **/
		enable : function() {
			return this.trigger('focus');
		},
		
		/**
		 * Make filemanager not active
		 *
		 * @return elFinder
		 **/
		disable : function() {
			return this.trigger('blur');
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
		
		_node : $('<span/>'),
		
		escape : function(name) {
			return this._node.text(name).html();
		},
		
		/**
		 * Convert old api tree into plain array of dirs
		 *
		 * @param  Object  root dir
		 * @return Array
		 */
		normalizeOldTree : function(root) {
			var self     = this,
				result   = [],
				traverse = function(dirs, phash) {
					var i, dir;
					
					for (i = 0; i < dirs.length; i++) {
						dir = dirs[i];
						result.push(self.normalizeOldFile(dir, phash))
						dir.dirs.length && traverse(dir.dirs, dir.hash);
					}
				};

			traverse([root]);

			return result;
		},
		
		/**
		 * Convert file info from old api format into new one
		 *
		 * @param  Object  file
		 * @param  String  parent dir hash
		 * @return Object
		 */
		normalizeOldFile : function(file, phash) {
			var info = {
				hash : file.hash,
				phash : phash,
				name : file.name,
				mime : file.mime || 'directory',
				date : file.date || 'unknown',
				size : file.size || 0,
				read : file.read,
				write : file.write,
				locked : phash ? !file.rm : true
			}
			if (file.dirs && file.dirs.length) {
				info.dirs = true;
			}
			if (file.dim) {
				info.dim = file.dim;
			}
			if (file.resize) {
				info.resize = file.resize;
			}
			return info;
		},
		
		normalizeOldOptions : function(data) {
			return $.extend(data.params, {path : data.cwd.rel, disabled : data.disabled, tmb : !!data.tmb});
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
			var file;
			
			if (hash) {
				file = this.file(hash);
				if (!file) {
					return this;
				}
				if (file.mime != 'directory') {
					return this.openFile(hash);
				}
			}
			
			return this.openDir(hash);
		},
	
		/**
		 * Open directory
		 * 
		 * @param  String   directory hash or empty string to open last opened dir
		 * @param  Boolean  update nav dir tree? 
		 * @param  Boolean  send init flag? (
		 * @return $.Deferred
		 */
		openDir : function(hash, init) {
			var self = this,
				opts = {cmd : 'open'}, 
				dir, jqxhr;
			
			hash = hash||this.lastDir();
			if (hash && (dir = this.file(hash))) {
				if (dir.mime != 'directory') {
					return this.trigger('error', {error : [this.errors.notDir, dir.name]});
				}
				if (!dir.read) {
					return this.trigger('error', {error : [this.errors.notRead, dir.name]});
				}
			}
			opts.target = hash;
			

			if (init) {
				opts.init =1;
				if (this.options.allowNavbar || this.oldAPI) {
					opts.tree = 1;
				}

			}

			jqxhr = this.ajax(opts);
			
			return init
				? jqxhr
				: jqxhr.then(function(data) {
					// on 'open' failed try sync current dir
					if (data && data.error) {
						self.sync('silent');
					}
				});
		},
		
		/**
		 * Open file in new window
		 * 
		 * @param  String   file hash
		 * @return elFinder
		 */
		openFile : function(hash) {
			var file = this.file(hash), url;
			if (!file) {
				return this.trigger('error', {error : this.errors.notFound});
			}
			if (file.mime == 'directory') {
				return this.trigger('error', {error : [this.errors.notFile, file.name]});
			}
			if (!file.read) {
				return this.trigger('error', {error : [this.errors.notRead, file.name]});
			}
			
			url = this.url(file);
			if (!url) {
				// urls diabled - redirect to connector
				url = this.options.url 
					+ (this.options.url.indexOf('?') === -1 ? '?' : '&') 
					+(this.oldAPI ? 'cmd=open&current=' + this.cwd().hash : 'cmd=file')
					+ '&target=' + hash;
			}

			// image - set window size
			if (file.dim) {
				s = file.dim.split('x');
				w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
			}

			if (!window.open(url, '_blank', w + ',top=50,left=50,scrollbars=yes,resizable=yes')) {
				// popup blocks
				this.trigger('error', {error : this.errors.popupBlocks});
			}
			return this;
		},
		
		
		
		/**
		 * Reload current directory
		 * 
		 * @return $.Deferred
		 */
		reload : function() {
			var self = this;
			
			// this.trigger('reload').clipboard([], false, true);
			
			return this.sync(true)
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
			var validator = this.options.validName;
			
			if (!name 
			|| typeof(name) != 'string' 
			|| /^\.\.?$/.test(name)
			|| name.indexOf(this.cwd().separator) !== -1
			) {
				return false;
			}
			
			if (validator) {
				if (validator instanceof RegExp) {
					return validator.test(name);
				} 
				if (typeof(validator) == 'function') {
					return validator(name);
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
			var self    = this,
				files   = $.isArray(files) ? files : [],
				cnt     = files.length,
				lock    = {files : files},
				current = this.cwd().hash,
				hash, file, i;
			
			for (i = 0; i < cnt; i++) {
				hash = files[i];
				if (!(file = this.file(hash))) {
					return this.trigger('error', {error : this.errors.notFound});
				}
				if (file.locked) {
					return this.trigger('error', {error : [this.errors.notRm, file.name]});
				}
			}
			
			return cnt > 0 
				? self.ajax({
						data       : {cmd : 'rm', targets : files, current : current},
						beforeSend : function() { self.notify('rm', cnt).trigger('lockfiles', lock); },
						complete   : function(v) { 
							var data, error; 
							
							self.notify('rm', -cnt).trigger('unlockfiles', lock); 
							// if remove failed with "File not found" error in current dir - reload it
							if (self.cwd().hash == current && v && v.responseText) {
								data = $.parseJSON(v.responseText);
								data && data.error == self.errors.notFound && self.reload();
							}
						}
					}, 'bg') 
				: this;
			
		},
		
		rename : function(hash, name) {
			var self = this,
				file = this.file(hash), error;
			
			if (!file) {
				error = this.errors.notFound;
			}
			
			if (!this.validName(name)) {
				error = this.errors.invalidName;
			}
			
			if (file.locked) {
				error = [this.errors.fileLocked, file.name];
			}
			
			if (error) {
				this.trigger('error', {error : error});
				return false;
			}
			
			var data = {
				cmd     : 'rename',
				current : this.cwd().hash, // old api
				target  : hash,
				name    : name
			}

			this.ajax({
				data : {
					cmd     : 'rename',
					current : this.cwd().hash, // old api
					target  : hash,
					name    : name
				},
				beforeSend : function() { self.notify('rename', 1); },
				complete   : function() { self.notify('rename', -1); }
			}, 'bg');
			
			return true;
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
				cnt   = files.length,
				i, file;
			
			for (i = 0; i < cnt; i++) {
				file = this.file(files[i]);
				if (!file) {
					return this.trigger('error', {error : this.errors.notFound});
				}
				
				if (!file.read) {
					return this.trigger('error', {error : [this.errors.notCopy, file.name]});
				}
			}
			
			return cnt
				? self.ajax({
						data : {
							cmd     : 'duplicate', 
							target  : this.newAPI ? files : files.shift(), // old connector support only one file duplicate at once
							current : this.cwd().hash
						},
						beforeSend : function() { self.notify('duplicate', cnt); },
						complete   : function() { self.notify('duplicate', -cnt); }
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
		 * Compare two files based on elFinder.sort
		 *
		 * @param Object  file
		 * @param Object  file
		 * @return Number
		 */
		compare : function(f1, f2) {
			var m1 = f1.mime,
				m2 = f2.mime,
				d1 = m1 == 'directory',
				d2 = m2 == 'directory',
				n1 = f1.name,
				n2 = f2.name,
				s1 = f1.size || 0,
				s2 = f2.size || 0;
			// this.log(f1).log(f2).log(this.sort)
			// dir first	
			if (this.sort <= 3) {
				if (d1 && !d2) {
					return -1;
				}
				if (!d1 && d2) {
					return 1;
				}
			}
			// by mime
			if ((this.sort == 2 ||this. sort == 5) && m1 != m2) {
				return m1 > m2 ? 1 : -1;
			}
			// by size
			if ((this.sort == 3 || this.sort == 6) && s1 != s2) {
				return s1 > s2 ? 1 : -1;
			}
			
			return f1.name.localeCompare(f2.name);
		},
		

		/**
		 * Return message translated onto current language
		 *
		 * @param  String|Array  message[s]
		 * @return String
		 **/
		i18n : function(msg) { 
			var messages = this.messages, ignore = [], i;
			
			if ($.isArray(msg)) {
				if (msg.length == 1) {
					msg = msg[0];
				} else {
					i = msg.length-1;
					while (i--) {
						// this.log(msg[i])
						msg[i] = msg[i].replace(/\$(\d+)/g, function(m, num) { 
							num = i + parseInt(num);
							if (num > 0 && msg[num]) {
								ignore.push(num)
								return msg[num];
							}
							return '';
						});
						
					}
					msg = $.map(msg, function(e, i) { return $.inArray(i, ignore) === -1 ? e : null; }).join(' ');
					
				}
			}
			
			if (typeof(msg) != 'string') {
				msg = msg.toString();
				this.debug('error', 'Invalid message : '+msg)
			}
			
			return msg.replace(/\$(\d+)/g, '');
			
			var msg = $.isArray(msg) ? msg : [msg],
				messages = this.messages;
			
			msg = $.map(msg, function(m) { return messages[m] || m; });
			return msg[0].replace(/\$(\d+)/g, function(m, num) { return msg[num] || ''; });
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
		
		

		
		log : function(m) { window.console && window.console.log && window.console.log(m); return this; },
		
		debug : function(type, m) {
			var d = this.options.debug;

			if (d == 'all' || d === true || ($.isArray(d) && $.inArray(type, d) != -1)) {
				window.console && window.console.log && window.console.log('elfinder debug: ['+type+'] ['+this.id+']', m);
			} 
			return this;
		},
		time : function(l) { window.console && window.console.time && window.console.time(l); },
		timeEnd : function(l) { window.console && window.console.timeEnd && window.console.timeEnd(l); }
		

	}
	
	
	
})(jQuery);