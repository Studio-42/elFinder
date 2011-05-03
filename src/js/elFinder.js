(function($) {

	elFinder = function(node, opts) {
		
		var self = this,
			/**
			 * Is shortcuts/commands enabled
			 *
			 * @type Boolean
			 **/
			enabled = false,
			
			/**
			 * On click inside elFinder we set this flag to false so when event bubbled to document no blur event fired
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
			 * Some ajax requests and every modal dialog required to show overlay,
			 * so we count it to not enable shortcuts until any requests complete and any dialogs closed
			 *
			 * @type Number
			 **/
			overlayCnt = 0,
			
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
			cwd = {
				hash     : '',
				phash    : '',
				name     : '',
				path     : '',
				url      : '',
				tmbUrl   : '',
				disabled : [],
				date     : '',
				read     : 1,
				write    : 1,
				locked   : 1,
				files    : 0,
				size     : 0
			},
			
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
			
			prevContent = $('<div/>').append(node.contents()),
			
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
				if (clear && self.options.clearCache) {
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
						f.locked = !f.rm;
						delete f.rm;
					}
					files[f.hash] = f;
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

				while (l--) {
					dir = childs[l];
					if (!cwd.phash && dir.hash == cwd.hash) {
						cwd.phash = phash;
					}
					dir.dirs && dir.dirs.length ? cacheTree(dir, phash) : add(dir);
				}
			},
			
			
			/**
			 * Send init ajax request
			 *
			 * @return void
			 */
			init = function() {
				var opts = {
						data : {
							cmd    : 'open',
							target : self.lastDir(),
							tree   : true, // required for old api to get cwd parent hash
							init   : true
							
						},
						error : function() {
							self.lastDir('');
							setTimeout(function() {
								self.destroy(true);
							}, 20);
						},
						success : function(data) {
							var base = new self.command(self),
								opts = self.options,
								cmds = opts.commands || [],
								cmd,
								l, 
								tb = 'elfindertoolbar'+opts.toolbar;
							
							if (!data) {
								data = {};
							}
								
							self.api    = parseFloat(data.api)|| 1;
							self.newAPI = self.api > 1;
							self.oldAPI = !self.newAPI;
							rules       = self.rules[self.newAPI ? 'newapi' : 'oldapi'];

							if (data.error || !rules.open(data)) {
								self.lastDir('');
								setTimeout(function() {
									self.destroy(true);
								}, 20);
								return;
							}

							if (opts.sync >= 3000) {
								setInterval(function() {
									self.sync('silent');
								}, self.options.sync);
							}
							
							dir.elfindercwd(self).attr('id', 'elfindercwd-'+self.id);
							self.options.allowNavbar && nav.show().append($('<ul/>').elfindertree(self));

							self.history = new self.history(self);

							$(document)
								// blur elfinder on document click
								.bind('mousedown.'+self.namespace, function(e) {
									blur && enabled && self.trigger('blur');
									blur = true;
								})
								// exec shortcuts
								.bind('keydown.'+self.namespace+' keypress.'+self.namespace, execShortcut);

							$.each(['open', 'back', 'forward', 'up', 'home'], function(i, name) {
								$.inArray(name, cmds) === -1 && cmds.push(name)
							});

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
							
							if (!$.fn[tb]) {
								tb = 'elfindertoolbar';
							}
							toolbar[tb](opts.toolbarConf, commands)

							self.resize(width, height);
							self.debug('api', self.api);
							self.trigger('load')
							delete listeners.load;
							loaded = true;
						}
					}, 
					interval;
				
				if (self.visible()) {
					return self.trigger('focus').ajax(opts);
				} 
				interval = setInterval(function() {
					if (self.visible()) {
						self.trigger('focus').ajax(opts);
						interval && clearInterval(interval);
					}
				}, 100);
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
		
		this.customData = $.isPlainObject(this.options.customData) ? this.options.customData : {};
		
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
		 * Flag - allow sync reuqest?
		 * Required to aviod several sync at once
		 *
		 * @type Boold
		 **/
		this.allowSync = true;
		
		/**
		 * Return true if filemanager is active
		 *
		 * @return Boolean
		 **/
		this.isEnabled = function() {
			return this.isVisible() && enabled;
		}
		
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
		 * Return file path
		 * 
		 * @param  Object  file
		 * @return String
		 */
		this.path = function(file) {
			return cwd.path + (file.hash == cwd.hash ? '' : cwd.separator+file.name);
		}
		
		/**
		 * Return file url if set
		 * 
		 * @param  Object  file
		 * @return String
		 */
		this.url = function(file) {
			var path = '';
			if (this.isNewApi) {
				if (cwd.url) {
					path = this.path(file).replace(cwd.separator, '/');
					return cwd.url + path.substr(path.indexOf('/')+1);
				}
			}
			return file.url;
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
		 * Proccess ajax request.
		 * Fired events :
		 *  - "ajaxstart" before request,
		 *  - "ajaxstop"  on request complete,
		 *  - "ajaxerror" on request failed
		 *  - "error" on error from backend
		 *  - event with command name on request success
		 *  - "added"/"removed" if response contains data with this names
		 *
		 * @example
		 * 1. elfinder.ajax({cmd : 'open', init : true}) - request lock interface till request complete
		 * 2. elfinder.ajax({data : {...}, comlete : function() { ... }}, 'bg') 
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
		 * @return elFinder
		 */
		this.ajax = function(opts, mode) {
			var self    = this,
				options = this.options,
				mode    = /^sync|bg|silent$/.test(mode) ? mode : 'sync',
				cmd     = '',
				jqxhr,
				params  = {
					url      : options.url,
					async    : true,
					type     : 'get',
					dataType : 'json',
					cache    : false,
					// timeout  : 100,
					data     : {}
				},
				error = function(xhr, status) {
					var errors = self.errors, error;
					
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
					self[mode == 'silent' ? 'debug' : 'trigger']('error', {error : error, mode : mode});
					
				},
				success = function(response) {
					var errors = self.errors, error;

					if (!response) {
						error = [errors.invResponse, errors.emptyData];
					} else if (response.error) {
						error = response.error;
					} else if (rules[cmd] && !rules[cmd](response)) {
						error = [errors.invResponse, errors.invData];
					}

					if (error) {
						return mode == 'silent'
							? self.debug('error', self.i18n(error))
							: self.trigger('error', {error : error, response : response});
						return self[mode == 'silent' ? 'debug' : 'trigger']('error', {error : error, response : response});
					}

					if (response.warning) {
						self.trigger('warning', {warning : response.warning});
					}

					// fire some event to update cache/ui
					response.removed && response.removed.length && self.trigger('removed', response);
					response.added   && response.added.length   && self.trigger('added', response);
					
					// fire event with command name
					self.trigger(cmd, response);
				};
				
			params.data = $.extend({}, this.customData);
			if (opts.data) {
				params = $.extend(true, params, opts);
			} else {
				$.extend(params.data, opts);
			}

			if (!params.data.cmd) {
				this.debug('error', 'elFinder.ajax() required data.cmd.');
				return $.Deferred().reject();
			}
				
			params.data.mimes = options.onlyMimes || [];
			cmd = params.data.cmd;

			if (this.visible()) {
				if (params.data.init) {
					self.log('clean cahe');
					files = {}
				}
				jqxhr = $.ajax(params).fail(error).success(success);
				if (mode == 'sync') {
					prevEnabled = enabled;
					enabled = false;
					showOverlay();
					showSpinner();
					
					jqxhr.complete(function() {
						hideSpinner();
						hideOverlay();
						prevEnabled && self.trigger('focus');
					});
				}
				return jqxhr;
			}
			
			return $.Deferred().reject();
			
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
			delete callback; // need this?
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
		
		/**
		 * Destroy this elFinder instance
		 *
		 * @return void
		 **/
		this.destroy = function(notRestoreNode) {
			if (this.node && this.node[0].elfinder) {
				this.trigger('destroy');
				listeners = {};
				shortcuts = {};
				enabled   = false;
				ajax      = false;
				this.node.children().remove();
				!notRestoreNode && this.node.append(prevContent.contents()).removeClass(this.cssClass);

				// prevContent.unwrap()
				$(document).unbind('.'+this.namespace);
				delete this.node[0].elfinder;
				delete this;
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
		
		prevContent.append(node.contents());

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
				if (self.visible() && !enabled && !overlayCnt) {
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
			 * Show error dialog
			 */
			.bind('error warning', function(e) {
				if (self.visible()) {
					self.dialog(self.i18n(e.data.error || e.data.warning), {
						title         : 'Error',
						modal         : true,
						closeOnEscape : false,
						buttons       : {
							Ok : function() { $(this).dialog('close'); }
						}
					}, 'error');
				}
			})
			/**
			 * Set params if required and update files cache
			 */
			.bind('open', function(e) {
				var data = e.data;

				cwd = $.extend(cwd, self.newAPI ? data.options : data.params, data.cwd);
				// old api - if we get tree - reset cache
				if (self.oldAPI && data.tree) {
					files = {};
					cacheTree(data.tree);
				}
				cache(self.newAPI ? data.files : data.cdc, true);
				
				// remember last dir
				self.lastDir(cwd.hash);

				// fix cwd for old api
				if (self.oldAPI) {
					cwd.tmb = !!data.tmb;
					
					// find cwd in cached files and set parent hash
					cwd.phash  = files[cwd.hash].phash;
					// if cwd is root - locked it
					cwd.locked = cwd.phash ? !cwd.rm : true;
					delete cwd.rm;
					
					cwd.path = cwd.rel;
					delete cwd.rel;

					if (cwd.path.indexOf('\\') != -1) {
						cwd.separator = '\\';
					} else if (cwd.path.indexOf('/') != -1 || !cwd.separator) {
						cwd.separator = '/';
					} 
				}
				// self.log(files[cwd.hash])
				data.debug && self.debug('backend-debug', data.debug);
				// self.trigger('error', {error : [self.errors.notRead, cwd.name]});
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
		
		
		init();
		
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
				open    : function(data) { return data.cwd && data.files && $.isPlainObject(data.cwd) && $.isArray(data.files); },
				tree    : function(data) { return data.tree && $.isArray(data.tree); },
				parents : function(data) { return data.tree && $.isArray(data.tree); },
				tmb     : function(data) { return data.current && data.images && $.isPlainObject(data.images); }
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
		 * Return true if filemanager is visible
		 *
		 * @return Boolean
		 **/
		visible : function() {
			return this.node && this.node.is(':visible');
		},
		
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
		 * Sync files with connector if other sync request not in progress
		 * Return true on send requiest
		 *
		 * @param  String  request mode (sync|bg|silent)
		 * @return $.Deferred
		 **/
		sync : function(mode) {
			var self    = this, 
				cwd     = this.cwd(),
				targets = {};
			
			if (this.oldAPI) {
				return this.openDir(this.lastDir(), true, true);
			}
			if (this.allowSync) {
				this.allowSync = false;
				$.each(this.files(), function(hash, file) {
					delete file['hash'];
					delete file['phash'];
					delete file['tmb']
					targets[hash] = file;
					// targets.push(hash);
				});

				return this.ajax({
						data : {cmd : 'sync', current : cwd.hash, targets : targets},
						type : 'post'
					},
					mode
				).then(function(data) {
					// alert('fuck')
					self.allowSync = true;
					if (data && data.error) {
						if (data.current == cwd.hash) {
							self.lastDir('');
							self.openDir('', true, true);
						}
					}
				});
			}
			return $.Deferred().reject();
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
			
			return this.openDir(hash, tree, init);
		},
	
		/**
		 * Open directory
		 * 
		 * @param  String   directory hash or empty string to open last opened dir
		 * @param  Boolean  update nav dir tree? 
		 * @param  Boolean  send init flag? (
		 * @return $.Deferred
		 */
		openDir : function(hash, tree, init) {
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
			
			if ((this.newAPI && tree && this.options.allowNavbar) || this.oldAPI) {
				opts.tree = 1;
			}

			if (init) {
				opts.init =1;
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
			
			this.trigger('reload').clipboard([], false, true);
			
			return this.sync("sync");
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
		 * Return message translated onto current language
		 *
		 * @param  String|Array  message[s]
		 * @return String
		 **/
		i18n : function(msg) { 
			var messages = this.messages, ignore = [], i;
			var self = this;
			
			// this.log(msg)
			// this.log($.isArray(msg))
			
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