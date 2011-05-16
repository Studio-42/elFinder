"use strict";
(function($) {

	window.elFinder = function(node, opts) {
		
		var self = this,
			
			/**
			 * Node on which elfinder creating
			 *
			 * @type jQuery
			 **/
			node = $(node),
			
			/**
			 * Store node contents.
			 *
			 * @see this.destroy
			 * @type jQuery
			 **/
			prevContent = $('<div/>').append(node.contents()),
			
			/**
			 * Store node inline styles
			 *
			 * @see this.destroy
			 * @type String
			 **/
			prevStyle = node.attr('style'),
			
			/**
			 * Instance ID. Required to get/set cookie
			 *
			 * @type String
			 **/
			id = node.attr('id') || '',
			
			/**
			 * Events namespace
			 *
			 * @type String
			 **/
			namespace = 'elfinder'+(id || Math.random().toString().substr(2, 7)),
			
			/**
			 * Mousedown event
			 *
			 * @type String
			 **/
			mousedown = 'mousedown.'+namespace,
			
			/**
			 * Keydown event
			 *
			 * @type String
			 **/
			keydown = 'keydown.'+namespace,
			
			/**
			 * Keypress event
			 *
			 * @type String
			 **/
			keypress = 'keypress.'+namespace,
			
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
			 * List of build-in events which mapped into methods with same names
			 *
			 * @type Array
			 **/
			events = ['enable', 'disable', 'load', 'open', 'reload', 'select',  'add', 'remove', 'change', 'dblclick', 'getfile', 'lockfiles', 'unlockfiles'],
			
			/**
			 * Rules to validate data from backend
			 *
			 * @type Object
			 **/
			rules = {},
			
			/**
			 * Current working directory hash
			 *
			 * @type String
			 **/
			cwd = '',
			
			/**
			 * Current working directory options
			 *
			 * @type Object
			 **/
			cwdOptions = {
				path       : '',
				url        : '',
				tmbUrl     : '',
				disabled   : [],
				uplMaxSize : '',
				separator  : '/'
			},
			
			/**
			 * Files/dirs cache
			 *
			 * @type Object
			 **/
			files = {},
			
			/**
			 * Selected files hashes
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
			 * Buffer for copied files
			 *
			 * @type Array
			 **/
			clipboard = [],
			
			/**
			 * Commands prototype
			 *
			 * @type Object
			 **/
			base = new self.command(self),
			
			/**
			 * elFinder node width
			 *
			 * @type String
			 * @default "auto"
			 **/
			width  = this.options.width || 'auto',
			
			/**
			 * elFinder node height
			 *
			 * @type Number
			 * @default 300
			 **/
			height = parseInt(this.options.height) || 300,
			
			/**
			 * Methods to update cache after get some data from backend
			 *
			 * @type Object
			 **/
			responseHandlers = {
				open    : function(data) {
					if (data.api || data.params) {
						// init - reset cache
						files = {};
					} else {
						// remove only files from prev cwd
						for (var i in files) {
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

					self.lastDir(cwd);
					data.debug && self.debug('backend-debug', data.debug);
					
					return self
				},
				tree    : function(data) {
					cache(data.tree || []);
					return self;
				},
				parents : function(data) {
					cache(data.tree || []);
					return self;
				},
				add     : function(data) {
					cache(data.added);
					return self;
				},
				remove  : function(data) {
					var removed = data.removed,
						l  = removed.length, 
						rm = function(hash) {
							var file = files[hash];
							if (file) {
								if (file.mime == 'directory' && file.dirs) {
									$.each(files, function(h, f) {
										f.phash == hash && rm(h);
									});
								}
								delete files[hash];
							}
						};

					while (l--) {
						rm(removed[l]);
					}
					return self;
				}, 
				change  : function(data) {
					cache(data.changed);
					return self;
				}
				
			},
			
			/**
			 * Set api version number and ajax data validation rules.
			 *
			 * @param  String api version
			 * @return void
			 */
			setAPI = function(ver) {
				self.api    = parseFloat(ver) || 1;
				self.newAPI = self.api > 1;
				self.oldAPI = !self.newAPI;
				rules       = self.rules[self.newAPI ? 'newapi' : 'oldapi'];
			},
			
			/**
			 * On load failed make elfinder inactive
			 *
			 * @return void
			 */
			loadfail = function() {
				self.trigger('fail').disable().lastDir('');
				listeners = {};
				shortcuts = {};
				$(document).add(node).unbind('.'+this.namespace);
				self.trigger = function() { }
			},
			
			/**
			 * On success load set api, valid data and fire "open" event
			 *
			 * @param  Object  data from backend
			 * @return void
			 */
			load = function(data) {
				var opts = self.options;
				
				setAPI(data.api);
				
				if (!self.validResponse('open', data)) {
					self.error([self.errors.invResponse, self.errors.invData]);
					return onloadfail();
				}

				self.load().debug('api', self.api);

				responseHandlers.open($.extend(true, {}, data));
				self.open(data);

				// self.trigger('open', data);
				// if (opts.sync >= 3000) {
				// 	setInterval(function() {
				// 		self.sync('silent');
				// 	}, self.options.sync);
				// }
				
			},
			
			/**
			 * Store info about files/dirs in "files" object.
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
		
		/**
		 * elFinder use new api
		 *
		 * @type Boolean
		 **/
		this.newAPI = false;
		
		/**
		 * elFinder use old api
		 *
		 * @type Boolean
		 **/
		this.oldAPI = true;
		
		/**
		 * Configuration options
		 *
		 * @type Object
		 **/
		this.options = $.extend({}, this.options, opts||{});
		
		/**
		 * Css classes 
		 *
		 * @type String
		 **/
		this.cssClass = 'ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+(this.direction == 'rtl' ? 'rtl' : 'ltr')+' '+this.options.cssClass;
		
		/**
		 * Ajax request type
		 *
		 * @type String
		 * @default "get"
		 **/
		this.requestType = /^(get|post)$/i.test(this.options.requestType) ? this.options.requestType.toLowerCase() : 'get',
		
		/**
		 * Any data to send across every ajax request
		 *
		 * @type Object
		 * @default {}
		 **/
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
		 * Delay in ms before open notification dialog
		 *
		 * @type Number
		 * @default 500
		 **/
		this.notifyDelay = this.options.notifyDelay > 0 ? parseInt(this.options.notifyDelay) : 500;
		
		/**
		 * Base draggable options
		 *
		 * @type Object
		 **/
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
		
		/**
		 * Base droppable options
		 *
		 * @type Object
		 **/
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
			return dir ? dir.hash : '';
		}
		
		/**
		 * Return current working directory info
		 * 
		 * @return Object
		 */
		this.cwd = function() {
			return files[cwd] || {};
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
		this.path = function(hash) {
			var file = files[hash];
			return file ? cwdOptions.path + (file.hash == cwd ? '' : cwdOptions.separator+file.name) : '';
		}
		
		/**
		 * Return file url if set
		 * 
		 * @param  Object  file
		 * @return String
		 */
		this.url = function(hash) {
			var path = '';

			if (cwdOptions.url && (path = this.path(hash))) {
				path = path.replace(cwdOptions.separator, '/');
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
			return selected.slice(0);
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
		this.fileByName = function(name, phash) {
			var hash;
		
			for (hash in files) {
				if (files.hasOwnProperty(hash) && files[hash].phash == phash && files[hash].name == name) {
					return files[hash];
				}
			}
		};
		
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
		this.ajax = function(options) {
			var self    = this,
				o       = this.options,
				errors  = this.errors,
				dfrd    = $.Deferred(),
				data    = $.extend({}, o.customData, {mimes : o.onlyMimes}, options.data || options),
				cmd     = data.cmd,
				deffail = !(options.preventDefault || options.preventFail),
				defdone = !(options.preventDefault || options.preventDone),
				notify  = $.extend({}, options.notify),
				freeze  = options.freeze,
				timeout,
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
					// data = $.extend(true, {}, data)

					if (responseHandlers[cmd]) {
						responseHandlers[cmd]($.extend(true, {}, data))
					}

					// fire some event to update cache/ui
					data.removed && data.removed.length && responseHandlers.remove(data).remove(data);
					data.added   && data.added.length   && responseHandlers.add(data).add(data);
					data.changed && data.changed.length && responseHandlers.change(data).change(data);
					
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
					} else if (!self.validResponse(cmd, response)) {
						error = [errors.invResponse, errors.invData];
					}

					error ? dfrd.reject(error) : dfrd.resolve(response);
				}
				;

			deffail && dfrd.fail(fail);
			defdone && dfrd.done(done);
			o.debug && dfrd.fail(function(error) { self.debug('error', self.i18n(error)); });
			
			if (!cmd) {
				return dfrd.reject(errors.cmdRequired);
			}	

			// "freeze" interface
			if (freeze) {
				this.ui.overlay.elfinderoverlay('show');
				dfrd.always(function() {
					self.ui.overlay.elfinderoverlay('hide');
				});
			}
			
			if (notify.type && notify.cnt) {
				
				timeout = setTimeout(function() {
					self.notify(notify);
					dfrd.always(function() {
						notify.cnt = -(parseInt(notify.cnt)||0);
						self.notify(notify);
					})
				}, self.notifyDelay)
				
				dfrd.always(function() {
					clearTimeout(timeout)
				})
				
			}
			
			$.ajax(options).fail(error).success(success);
			
			return dfrd;
		};
		
		/**
		 * Sync content
		 * 
		 * @param  Boolean  freeze interface untill complete
		 * @return jQuery.Deferred
		 */
		this.sync = function(freeze) {
			var self  = this,
				dfrd  = $.Deferred(),
				opts1 = {
					data : {cmd : 'open', init : 1, target : cwd, tree : !!(this.oldAPI || this.ui.tree)},
					preventDefault : true,
					freeze : true
				},
				opts2 = {
					data : {cmd : 'parents', target : cwd},
					preventDefault : true,
					freeze : true
				},
				doSync = function(odata, pdata) {
					var raw     = {},
						removed = [],
						added   = [],
						changed = [],
						isChanged = function(hash) {
							var l = changed.length;

							while (l--) {
								if (changed[l].hash == hash) {
									return true;
								}
							}
						};

					setAPI(odata.api);

					// valid data
					if (!self.validResponse('open', odata)) {
						return dfrd.reject([self.errors.invResponse, self.errors.invData]);
					}
					
					if (self.newAPI && !self.validResponse('parents', pdata)) {
						return dfrd.reject([self.errors.invResponse, self.errors.invData])
					}
					

					// create new files list
					if (self.newAPI) {
						cwdOptions = $.extend({}, cwdOptions, odata.options);
						$.each(odata.files.concat(pdata.tree), function(i, f) {
							if (f.hash && f.name && f.mime) {
								raw[f.hash] = f;
							}
						});
					} else {
						cwdOptions = $.extend({}, cwdOptions, self.normalizeOldOptions(odata));
						$.each(self.normalizeOldTree(odata.tree), function(i, f) {
							if (f.hash && f.name) {
								raw[f.hash] = f;
							}
						});
						$.each(odata.cdc, function(i, f) {
							if (f.hash && f.name && f.mime) {
								raw[f.hash] = self.normalizeOldFile(f, cwd);
							}
						});
					}

					// find removed
					$.each(files, function(hash, f) {
						!raw[hash] && removed.push(hash);
					});

					// compare files
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
							});
						}
					});

					// parents of removed dirs mark as changed (required for tree correct work)
					$.each(removed, function(i, hash) {
						var file  = files[hash], 
							phash = file.phash;

						if (phash && file.mime == 'directory' && $.inArray(phash, removed) === -1 && raw[phash] && !isChanged(phash)) {
							changed.push(raw[phash]);
						}
					});

					// self.log(removed.length).log(added.length).log(changed.length)
					removed.length && responseHandlers.remove(removed).remove({removed : removed});
					added.length   && responseHandlers.add(added).add({added : added});
					changed.length && responseHandlers.change(changed).change({changed : changed});
					dfrd.resolve();
					
				},
				timeout;
			
			if (freeze) {
				timeout = setTimeout(function() {
					self.notify({type : 'reload', cnt : 1, hideCnt : true});
			
					dfrd.always(function() {
						self.notify({type : 'reload', cnt  : -1});
					})
				}, self.notifyDelay);
				
				dfrd.always(function() {
					clearTimeout(timeout);
				});
			}
			
			if (this.newAPI) {
				$.when(
					this.ajax(opts1),
					this.ajax(opts2)
				)
				.fail(function(error) {
					dfrd.reject(error)
				})
				.then(doSync);
			} else {
				this.ajax(opts1).fail(function(error) {
					dfrd.reject(error)
				})
				.then(doSync);
			}
			return dfrd;
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
		 * Fire event - send notification to all event listeners
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

					if (code && !shortcuts[pattern]) {
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
		 * Return true if command enabled
		 * 
		 * @param  String  command name
		 * @return Boolean
		 */
		this.isCommandEnabled = function(name) {
			return this._commands[name] ? $.inArray(name, cwdOptions.disabled) === -1 : false;
		}
		
		/**
		 * Exec command and return result;
		 *
		 * @param  String  command name
		 * @param  mixed   command argument
		 * @return $.Deferred
		 */		
		this.exec = function(cmd, value) {
			return this._commands[cmd] ? this._commands[cmd].exec(value) : $.Deferred().reject('No such command');
		}
		
		/**
		 * Create and return dialog.
		 *
		 * @param  String|DOMElement  dialog content
		 * @param  Object             dialog options
		 * @return jQuery
		 */
		this.dialog = function(content, options) {
			return $('<div/>').append(content).appendTo(node).elfinderdialog(options);
		}
		
		/**
		 * Return UI widget or node
		 *
		 * @param  String  ui name
		 * @return jQuery
		 */
		this.getUI = function(ui) {
			return this.ui[ui] || node;
		}
		
		/**
		 * Resize elfinder node
		 * 
		 * @param  String|Number  width
		 * @param  Number         height
		 * @return void
		 */
		this.resize = function(w, h) {
			node.css('width', w).height(h).trigger('resize');
		}
		
		/**
		 * Restore elfinder node size
		 * 
		 * @return elFinder
		 */
		this.restoreSize = function() {
			this.resize(width, height);
		}
		
		/**
		 * Destroy this elFinder instance
		 *
		 * @return void
		 **/
		this.destroy = function() {
			if (node && node[0].elfinder) {
				this.trigger('destroy').disable();
				listeners = {};
				shortcuts = {};
				$(document).add(node).unbind('.'+this.namespace);
				self.trigger = function() { }
				node.children().remove();
				node.append(prevContent.contents()).removeClass(this.cssClass).attr('style', prevStyle);
				node[0].elfinder = null;
			}
		}
		
		/*************  init stuffs  ****************/
		
		// check jquery ui
		if (!($.fn.selectable && $.fn.draggable && $.fn.droppable && $.fn.dialog)) {
			return alert(this.i18n(this.errors.jquiInvalid));
		}
		// check node
		if (!node.length) {
			return alert(this.i18n(this.errors.nodeRequired));
		}
		// check connector url
		if (!this.options.url) {
			return alert(this.i18n(this.errors.urlRequired));
		}
		
		/**
		 * Alias for this.trigger('error', {error : 'message'})
		 *
		 * @param  String  error message
		 * @return elFinder
		 **/
		this.error = function() {
			var arg = arguments[0];
			return arguments.length == 1 && typeof(arg) == 'function'
				? self.bind('error', arg)
				: self.trigger('error', {error : arg});
		}
		
		// create bind/trigger aliases for build-in events
		$.each(events, function(i, name) {
			self[name] = function() {
				var arg = arguments[0];
				return arguments.length == 1 && typeof(arg) == 'function'
					? self.bind(name, arg)
					: self.trigger(name, $.isPlainObject(arg) ? arg : {});
			}
		});
		
		// bind core event handlers
		this
			.enable(function() {
				if (!enabled && self.visible() && self.ui.overlay.is(':hidden')) {
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
				var opts = {
					cssClass  : 'elfinder-dialog-error',
					title     : self.i18n('Error'),
					modal     : true,
					resizable : false,
					close     : function() { $(this).elfinderdialog('destroy') },
					buttons   : {
						Ok : function() { $(this).elfinderdialog('close'); }
					}
				};
				
				self.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-error"/>'+self.i18n(e.data.error), opts);
			});

		// bind external event handlers
		$.each(this.options.handlers, function(event, callback) {
			self.bind(event, callback);
		});

		/**
		 * History object. Store visited folders
		 *
		 * @type Object
		 **/
		this.history = new this.history(this);
		
		/**
		 * Loaded commands
		 *
		 * @type Object
		 **/
		this._commands = {};
		
		// command "open" required always
		$.inArray('open', this.options.commands) === -1 && this.options.commands.push('open');
		// load commands
		$.each(this.options.commands, function(i, name) {
			var cmd = self.commands[name];
			if ($.isFunction(cmd) && !self._commands[name]) {
				cmd.prototype = base;
				self._commands[name] = new cmd();
				self._commands[name].setup(name, self.options.commandsOptions[name]||{});
			}
		});
		
		// prepare node
		node.addClass(this.cssClass)
			.bind(mousedown, function() {
				!enabled && self.enable();
			});
		
		/**
		 * UI nodes
		 *
		 * @type Object
		 **/
		this.ui = {
			// container for nav panel and current folder container
			workzone : $('<div/>').appendTo(node).elfinderworkzone(this),
			// overlay
			overlay : $('<div/>').appendTo(node).elfinderoverlay({
				show : function() { self.disable(); },
				hide : function() { prevEnabled && self.enable(); },
			}),
			// current folder container
			cwd : $('<div/>').appendTo(node).elfindercwd(this),
			// notification dialog window
			notify : this.dialog('', {
				cssClass  : 'elfinder-dialog-notify',
				position  : {top : '12px', right : '12px'},
				resizable : false,
				autoOpen  : false,
				title     : '&nbsp;'
			})
		}
		
		// load required ui
		$.each(this.options.ui || [], function(i, ui) {
			var name = 'elfinder'+ui,
				opts = self.options.uiOptions[ui] || {};

			if (!self.ui[ui] && $.fn[name]) {
				self.ui[ui] = $('<'+(opts.node || 'div')+'/>').appendTo(node)[name](self, opts);
			}
		});
		
		// update size
		this.resize(width, height);
		
		// store instance in node
		node[0].elfinder = this;
		
		// make node resizable
		this.options.resizable 
		&& $.fn.resizable 
		&& node.resizable({
			alsoResize : self.ui.workzone,
			minWidth  : 300,
			minHeight : 200
		});

		// attach events to document
		$(document)
			// disable elfinder on click outside elfinder
			.bind(mousedown, function(e) { enabled && !$(e.target).closest(node).length && self.disable(); })
			// exec shortcuts
			.bind(keydown+' '+keypress, execShortcut);
		
		// send initial request and start to pray >_<
		this.ajax({
				data        : {cmd : 'open', target : self.lastDir(), init : 1, tree : 1}, 
				preventDone : true,
				notify      : {type : 'open', cnt : 1, hideCnt : true},
				freeze      : true
			})
			.fail(loadfail)
			.done(load)
			.always(function() {
				loadfail = load = null;
			});
			
	}
	
	/**
	 * Prototype
	 * 
	 * @type  Object
	 */
	elFinder.prototype = {
		/**
		 * Internationalization object
		 * 
		 * @type  Object
		 */
		i18 : {
			en : {
				_translator  : '',
				_translation : 'English localization',
				direction    : 'ltr',
				messages     : {}
			}
		},
		
		/**
		 * Errors messages
		 * 
		 * @type  Object
		 */
		errors : {
			jquiInvalid    : 'Invalid jQuery UI configuration. Check selectable, draggable, draggable and dialog components included.',
			nodeRequired   : 'elFinder required DOM Element to be created.',
			urlRequired    : 'Invalid elFinder configuration! You have to set URL option.',
			noConnect      : 'Unable to connect to backend. $1',
			connectAborted : 'Connection aborted.',
			connectTimeout : 'Connection timeout.',
			invResponse    : 'Invalid backend response. $1',
			notJSON        : 'Data is not JSON.',
			emptyData      : 'Data is empty.',
			invData        : 'Invalid data.',
			cmdRequired    : 'Backend request required command name.',
			
			invOpenArg   : 'Unable to open required files/filders',
			notFound     : 'File not found.',
			notDir       : '"$1" is not a folder.',
			notFile      : '"$1" is not a file.',
			notRead      : '"$1" can’t be opened because you don’t have permission to see its contents.',
			notRm        : '"$1" is locked and can not be removed.',
			notCopy      : '"$1" can’t be copied because you don’t have permission to see its contents.',
			notDuplicate : 'Unable to duplicate "$1" because you have not permission to read it',
			popupBlocks  : 'Unable to open file in new window. Allow popup window in your browser.',
			invName      : 'Name "$1" is not allowed.',
			fileLocked   : 'File "$1" locked and can’t be removed or renamed.',
			invParams    : 'Invalid parameters.',
			nameExists   : 'Object named "$1" already exists at this location. Select another name.'
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
			'application/rtf'               : 'Rich Text Format (RTF)',
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
		 * Ajax request data validation rules
		 * 
		 * @type  Object
		 */
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
		
		/**
		 * Sort types for current directory content
		 * 
		 * @type  Object
		 */
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
				h    = $.proxy(callback, function(event) {
					setTimeout(function() {self.unbind(event.type, h);}, 3);
					return callback.apply(this, arguments);
				});
			return this.bind(event, h);
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
		 * Node for escape html entities in texts
		 * 
		 * @type jQuery
		 */
		_node : $('<span/>'),
		
		/**
		 * Replace not html-safe symbols to html entities
		 * 
		 * @param  String  text to escape
		 * @return String
		 */
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
			var mime = file.mime || 'directory',
				size = mime == 'directory' && !file.linkTo ? 0 : file.size,
				info = {
					hash   : file.hash,
					phash  : phash,
					name   : file.name,
					mime   : mime,
					date   : file.date || 'unknown',
					size   : size,
					read   : file.read,
					write  : file.write,
					locked : phash ? !file.rm : true
				};
			
			if (file.link) {
				info.link = file.link;
			}

			if (file.linkTo) {
				info.linkTo = file.linkTo;
			}
			
			if (file.tmb) {
				info.tmb = file.tmb;
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
		
		/**
		 * Convert old api options
		 *
		 * @param  Object  options
		 * @return Object
		 */
		normalizeOldOptions : function(data) {
			return $.extend(data.params, {path : data.cwd.rel, disabled : data.disabled, tmb : !!data.tmb});
		},
		
		/**
		 * Compare files based on elFinder.sort
		 *
		 * @param  Object  file
		 * @param  Object  file
		 * @return Number
		 */
		compare : function(f1, f2) {
			var m1 = f1.mime,
				m2 = f2.mime,
				d1 = m1 == 'directory',
				d2 = m2 == 'directory',
				n1 = f1.name.toLowerCase(),
				n2 = f2.name.toLowerCase(),
				s1 = d1 ? 0 : f1.size || 0,
				s2 = d2 ? 0 : f2.size || 0,
				sort = this.sort;

			// dir first	
			if (sort <= 3) {
				if (d1 && !d2) {
					return -1;
				}
				if (!d1 && d2) {
					return 1;
				}
			}
			// by mime
			if ((sort == 2 || sort == 5) && m1 != m2) {
				return m1 > m2 ? 1 : -1;
			}
			// by size
			if ((sort == 3 || sort == 6) && s1 != s2) {
				return s1 > s2 ? 1 : -1;
			}

			return f1.name.localeCompare(f2.name);
			
		},
		
		/**
		 * Sort files based on elFinder.sort
		 *
		 * @param  Array  files
		 * @return Array
		 */
		sortFiles : function(files) {
			return files.sort($.proxy(this.compare, this));
		},
		
		/**
		 * Notifications messages by types
		 *
		 * @type  Object
		 */
		notifyType : {
			open   : 'Open folder',
			reload : 'Reload folder content',
			mkdir  : 'Creating directory',
			mkfile : 'Creating files',
			rm     : 'Delete files',
			copy   : 'Copy files',
			move   : 'Move files',
			prepareCopy : 'Prepare to copy files',
			duplicate : 'Duplicate files',
			rename : 'Rename files'
		},
		
		/**
		 * Create new notification type.
		 * Required for future (not included in core elFinder) commands/plugins
		 *
		 * @param  String    notification type
		 * @param  String  notification message
		 * @return elFinder
		 */
		registerNotifyType : function(type, msg) {
			if (!this.notifyType[type] && type && msg) {
				this.notifyType[type] = msg;
			}
			return this;
		},
		
		/**
		 * Open notification dialog 
		 * and append/update message for required notification type.
		 *
		 * @param  Object  options
		 * @example  
		 * this.notify({
		 *    type : 'copy',
		 *    msg : 'Copy files', // not required for known types @see this.notifyType
		 *    cnt : 3,
		 *    hideCnt : false, // true for not show count
		 * })
		 * @return elFinder
		 */
		notify : function(opts) {
			var ndialog = this.ui.notify,
				ntpl    = '<div class="elfinder-notify elfinder-notify-{type}"><span class="elfinder-dialog-icon elfinder-dialog-icon-{type}"/><span class="elfinder-notify-msg">{msg}</span> <span class="elfinder-notify-cnt"/><div class="elfinder-notify-spinner"/></div>',
				type    = opts.type,
				msg     = opts.msg || this.i18n(this.notifyType[type]), 
				cnt     = opts.cnt,
				notify  = ndialog.children('.elfinder-notify-'+type);
			
			if (!type) {
				return this;
			}
			
			if (notify.length) {
				cnt += parseInt(notify.data('cnt')) || 0;
			} else if (cnt > 0) {
				notify = $(ntpl.replace(/\{type\}/g, type).replace(/\{msg\}/g, msg)).appendTo(ndialog)
			} else {
				return;
			}
			
			if (cnt > 0) {
				notify.data('cnt', cnt)
				!opts.hideCnt && notify.children('.elfinder-notify-cnt').text('('+cnt+')');
				ndialog.is(':hidden') && ndialog.elfinderdialog('open');
			} else {
				notify.remove();
				!ndialog.children().length && ndialog.elfinderdialog('close');
			}
			
			return this;
		},
		
		/**
		 * Open confirmation dialog 
		 *
		 * @param  Object  options
		 * @example  
		 * this.confirm({
		 *    title : 'Remove files',
		 *    text  : 'Here is question text',
		 *    accept : {  // accept callback - required
		 *      label : 'Continue',
		 *      callback : function(applyToAll) { fm.log('Ok') }
		 *    },
		 *    cancel : { // cancel callback - required
		 *      label : 'Cancel',
		 *      callback : function() { fm.log('Cancel')}
		 *    },
		 *    reject : { // reject callback - optionally
		 *      label : 'No',
		 *      callback : function(applyToAll) { fm.log('No')}
		 *   },
		 *   all : true  // display checkbox "Apply to all"
		 * })
		 * @return elFinder
		 */
		confirm : function(opts) {
			var complete = false,
				options = {
					cssClass  : 'elfinder-dialog-confirm',
					modal     : true,
					resizable : false,
					title     : this.i18n(opts.title || 'Confirmation required'),
					buttons   : {},
					close     : function() { 
						!complete && opts.cancel.callback();
						$(this).elfinderdialog('destroy');
					}
				},
				apply = this.i18n('Apply to all'),
				checkbox;

			
			if (opts.reject) {
				options.buttons[this.i18n(opts.reject.label)] = function() {
					opts.reject.callback(!!(checkbox && checkbox.prop('checked')))
					complete = true;
					$(this).elfinderdialog('close')
				};
			}
			
			options.buttons[this.i18n(opts.cancel.label)] = function() {
				$(this).elfinderdialog('close')
			};
			options.buttons[this.i18n(opts.accept.label)] = function() {
				opts.accept.callback(!!(checkbox && checkbox.prop('checked')))
				complete = true;
				$(this).elfinderdialog('close')
			};
			
			if (opts.all) {
				if (opts.reject) {
					options.width = 330;
				}
				options.create = function() {
					checkbox = $('<input type="checkbox" />');
					$(this).next().children().before($('<label>'+apply+'</label>').prepend(checkbox));
				}
				
				options.open = function() {
					var pane = $(this).next(),
						width = parseInt(pane.children(':first').outerWidth() + pane.children(':last').outerWidth());

					if (width > parseInt(pane.width())) {
						$(this).closest('.elfinder-dialog').width(width+30);
					}
				}
			}
			
			return this.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-confirm"/>' + this.i18n(opts.text), options);
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
		
		
		uniqueName : function(prefix, phash) {
			var i = 0, name;
			
			if (!phash) {
				phash = this.cwd().hash;
			}
			
			prefix = this.i18n(prefix);
			
			if (!this.fileByName(prefix, phash)) {
				return prefix;
			}
			while (i < 10000) {
				if (!this.fileByName((name = prefix + ' '+(++i)), phash)) {
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

			if ($.isArray(msg)) {
				if (msg.length == 1) {
					msg = msg[0];
				} else {
					i = msg.length-1;
					while (i--) {
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
				this.debug('error', 'Invalid message : '+msg);
				return '';
			}
			
			return msg.replace(/\$(\d+)/g, '');
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