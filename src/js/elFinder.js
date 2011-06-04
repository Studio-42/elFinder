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
			events = ['enable', 'disable', 'load', 'open', 'reload', 'select',  'add', 'remove', 'change', 'dblclick', 'getfile', 'lockfiles', 'unlockfiles', 'dragstart', 'dragstop'],
			
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
				path          : '',
				url           : '',
				tmbUrl        : '',
				disabled      : [],
				separator     : '/',
				archives      : [],
				extract       : [],
				copyOverwrite : true,
				tmb           : false // old API
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
			 * Queue for 'open' requests
			 *
			 * @type Array
			 **/
			queue = [],
			
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
			
			open = function(data) {
				if (data.init) {
					// init - reset cache
					files = {};
				} else {
					// remove only files from prev cwd
					for (var i in files) {
						if (files.hasOwnProperty(i) 
						&& files[i].mime != 'directory' 
						&& files[i].phash == cwd) {
							delete files[i];
						}
					}
				}

				cwd = data.cwd.hash;
				cache(data.files);
				if (!files[cwd]) {
					self.log('no cwd in cache')
					cache([data.cwd]);
				}
				self.lastDir(cwd);
				data.debug && self.debug('backend-debug', data.debug);
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
					
					$.each(shortcuts, function(i, shortcut) {
						if (shortcut.type    == e.type 
						&& shortcut.keyCode  == code 
						&& shortcut.shiftKey == e.shiftKey 
						&& shortcut.ctrlKey  == ctrlKey 
						&& shortcut.altKey   == e.altKey) {
							e.preventDefault()
							e.stopPropagation();
							shortcut.callback(e, self);
							self.debug('shortcut-exec', i+' : '+shortcut.description);
						}
					});
					
					// prevent tab out of elfinder
					code == 9 && e.preventDefault();
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
			refreshPositions : true,
			cursor     : 'move',
			cursorAt   : {left : 50, top : 47},
			drag       : function(e, ui) { ui.helper.toggleClass('elfinder-drag-helper-plus', e.shiftKey||e.ctrlKey||e.metaKey); },
			stop       : function() { self.trigger('focus').trigger('dragstop'); },
			helper     : function(e, ui) {
				var element = this.id ? $(this) : $(this).parents('[id]:first'),
					helper  = $('<div class="elfinder-drag-helper"><span class="elfinder-drag-helper-icon-plus"/></div>'),
					icon    = function(mime) { return '<div class="elfinder-cwd-icon '+self.mime2class(mime)+' ui-corner-all"/>'; },
					hashes, l;
				
				self.trigger('dragstart', {target : element[0], originalEvent : e});
				
				hashes = element.is('.elfinder-cwd-file') 
					? self.selected() 
					: [self.navId2Hash(element.attr('id'))];
				
				helper.append(icon(files[hashes[0]].mime)).data('files', hashes);

				if ((l = hashes.length) > 1) {
					helper.append(icon(files[hashes[l-1]].mime) + '<span class="elfinder-drag-num">'+l+'</span>');
				}
				
				return helper;
			}
		};
		
		/**
		 * Base droppable options
		 *
		 * @type Object
		 **/
		this.droppable = {
				tolerance  : 'pointer',
				accept     : ':not(.ui-dialog)',
				hoverClass : 'elfinder-dropable-active',
				drop : function(e, ui) {
					var dst     = $(this),
						targets = $.map(ui.helper.data('files')||[], function(h) { return h || null }),
						cnt, hash, i, h;
					
					if (dst.is('.elfinder-cwd')) {
						hash = cwd;
					} else if (dst.is('.elfinder-cwd-file')) {
						hash = dst.attr('id')
					} else if (dst.is('.elfinder-navbar-dir')) {
						hash = self.navId2Hash(dst.attr('id'));
					}

					cnt = targets.length;
					
					while (cnt--) {
						h = targets[cnt];
						if (h == hash || files[h].phash == hash) {
							return;
						}
					}
					
					if (targets.length) {
						ui.helper.hide();
						self.clipboard(targets, !(e.ctrlKey||e.shiftKey||e.metaKey));
						self.exec('paste', hash).always(function() {
							self.clipboard([]);
						});
						self.trigger('drop', {files : targets});
					}
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
		this.root = function(hash) {
			var dir = files[hash || cwd], i;
			
			while (dir && dir.phash) {
				dir = files[dir.phash]
			}
			if (dir) {
				return dir.hash;
			}
			
			while (i in files && files.hasOwnProperty(i)) {
				dir = files[i]
				if (!dir.phash && !dir.mime == 'directory' && dir.read) {
					return dir.hash
				}
			}
			
			return '';
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
			return $.extend(true, {}, files);
		}
		
		/**
		 * Return list of file parents hashes include file hash
		 * 
		 * @param  String  file hash
		 * @return Array
		 */
		this.parents = function(hash) {
			var parents = [],
				dir;
			
			while ((dir = this.file(hash))) {
				parents.unshift(dir.hash);
				hash = dir.phash;
			}
			return parents;
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
			return !!(data.error || rules[rules[cmd] ? cmd : 'defaults'](data));
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
					error && self.error(error);
				},
				done = function(data) {
					data.warning && self.error(data.warning);
					
					if (cmd == 'open') {
						open($.extend(true, {}, data))
					}

					// fire some event to update cache/ui
					data.removed && data.removed.length && self.remove(data);
					data.added   && data.added.length   && self.add(data);
					data.changed && data.changed.length && self.change(data);
					
					// fire event with command name
					self.trigger(cmd, data);
				},
				error = function(xhr, status) {
					var error;
					
					switch (status) {
						case 'abort':
							error = xhr.quiet ? '' : [errors.noConnect, errors.connectAborted];
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
					if (cmd == 'open' && (response.api || response.params)) {
						setAPI(response.api || 1);
					}

					if (!response) {
						return dfrd.reject([errors.invResponse, errors.emptyData]);
					} else if (response.error) {
						return dfrd.reject(response.error);
					} else if (!self.validResponse(cmd, response)) {
						return dfrd.reject([errors.invResponse, errors.invData]);
					}

					response = self.normalizeData(cmd, response);
					if (response.options) {
						cwdOptions = $.extend({}, cwdOptions, response.options);
					}
					dfrd.resolve(response);
				},
				xhr, _xhr
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
					clearTimeout(timeout);
				});
			}
			
			if (cmd == 'open') {
				options.data.count = 5 - queue.length;
				
				while ((_xhr = queue.pop()) && !_xhr.isRejected() && !_xhr.isResolved()) {
					_xhr.quiet = true;
					_xhr.abort();
				}
			}
			
			xhr = $.ajax(options).fail(error).success(success);
			
			if (cmd == 'open') {
				queue.unshift(xhr);
				dfrd.always(function() {
					queue.pop();
				});
			}
			
			return dfrd;
		};
		
		/**
		 * Compare current files cache with new files and return diff
		 * 
		 * @param  Array  new files
		 * @return Object
		 */
		this.diff = function(incoming) {
			var raw       = {},
				added     = [],
				removed   = [],
				changed   = [],
				isChanged = function(hash) {
					var l = changed.length;

					while (l--) {
						if (changed[l].hash == hash) {
							return true;
						}
					}
				};
				
			$.each(incoming, function(i, f) {
				raw[f.hash] = f;
			});
				
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

				if (phash 
				&& file.mime == 'directory' 
				&& $.inArray(phash, removed) === -1 
				&& raw[phash] 
				&& !isChanged(phash)) {
					changed.push(raw[phash]);
				}
			});
			
			return {
				added   : added,
				removed : removed,
				changed : changed
			};
		}
		
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
					var diff = self.diff(odata.files.concat(pdata && pdata.tree ? pdata.tree : []));

					self.log(diff.removed).log(diff.added).log(diff.changed);
					
					diff.removed.length && self.remove(diff);
					diff.added.length   && self.add(diff);
					diff.changed.length && self.change(diff);
					return dfrd.resolve(diff);
				},
				panic = function() {
					self.ajax({
						data : {cmd : 'open', target : self.root(), tree : 1, init : 1},
						notify : {type : 'open', cnt : 1, hideCnt : true}
					});
				},
				timeout;
			
			if (freeze) {
				timeout = setTimeout(function() {
					self.notify({type : 'reload', cnt : 1, hideCnt : true});
			
					dfrd.always(function() {
						self.notify({type : 'reload', cnt  : -1});
					});
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
					dfrd.reject(error);
					panic();
				})
				.done(doSync);
			} else {
				this.ajax(opts1)
					.fail(function(error) {
						dfrd.reject(error);
						panic();
					})
					.done(doSync);
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

					if (code/* && !shortcuts[pattern]*/) {
						shortcuts[pattern] = {
							keyCode     : code,
							altKey      : $.inArray('ALT', parts)   != -1,
							ctrlKey     : $.inArray('CTRL', parts)  != -1,
							shiftKey    : $.inArray('SHIFT', parts) != -1,
							type        : s.type || 'keydown',
							callback    : s.callback,
							description : s.description
						};
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
		 *   this.clipboard([]) - clean clipboard
		 *   this.clipboard([{...}, {...}], true) - put 2 files in clipboard and mark it as cutted
		 * 
		 * @param  Array    new files hashes
		 * @param  Boolean  cut files?
		 * @return Array
		 */
		this.clipboard = function(hashes, cut) {
			if (hashes !== void(0)) {
				clipboard = $.map(hashes||[], function(hash) {
					var file = files[hash];
					if (file) {
						return {
							hash   : hash,
							phash  : file.phash,
							name   : file.name,
							read   : file.read,
							locked : file.locked,
							cut    : !!cut
						}
					}
					return null;
				});
				this.trigger('changeclipboard', {clipboard : clipboard.slice(0, clipboard.length)});
			}

			// return copy of clipboard instead of refrence
			return clipboard.slice(0, clipboard.length);
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
				
				self.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-error"/>'+self.i18n(e.data.error || self.errors.unknown), opts);
			})
			.bind('tree parents', function(e) {
				cache(e.data.tree || []);
			})
			.bind('tmb', function(e) {
				$.each(e.data.images||[], function(hash, tmb) {
					if (files[hash]) {
						files[hash].tmb = tmb;
					}
				})
			})
			.add(function(e) {
				cache(e.data.added||[]);
			})
			.change(function(e) {
				$.each(e.data.changed||[], function(i, file) {
					var hash = file.hash;
					files[hash] = files[hash] ? $.extend(files[hash], file) : file;
				});
			})
			.remove(function(e) {
				var removed = e.data.removed||[],
					l       = removed.length, 
					rm      = function(hash) {
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
				
			})
			.bind('upload', function(data) {
				self.log('upload').log(data)
			})
			.bind('rm', function(e) {
				var audio = $('<audio autoplay="on"><source src="./images/rm.wav" type="audio/wav"></audio>');
				
				node.append(audio)
			})
			;

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
		
		if (!$.isArray(this.options.commands)) {
			this.options.commands = [];
		}
		// command "open" required always
		$.inArray('open', this.options.commands) === -1 && this.options.commands.push('open');
		$.inArray('help', this.options.commands) === -1 && this.options.commands.push('help');

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
			
			navbar : $('<div/>').appendTo(node).elfindernavbar(this),
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
				title     : '&nbsp;',
				width     : 280
			})
		}
		
		// load required ui
		$.each(this.options.ui || [], function(i, ui) {
			var name = 'elfinder'+ui,
				opts = self.options.uiOptions[ui] || {};

			if (!self.ui[ui] && $.fn[name]) {
				self.ui[ui] = $('<'+(opts.tag || 'div')+'/>').appendTo(node)[name](self, opts);
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
			handles : 'se',
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
			.fail(function() {
				self.trigger('fail').disable().lastDir('');
				listeners = {};
				shortcuts = {};
				$(document).add(node).unbind('.'+this.namespace);
				self.trigger = function() { };
			})
			.done(function(data) {
				self.load().debug('api', self.api);
				data = $.extend(true, {}, data);
				open(data);
				self.trigger('open', data);
				
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
			invParams      : 'Invalid parameters for command "$1".',
			popupBlocks    : 'Unable to open file in new window. Allow popup window in your browser.',
			unknown        : 'Unknown error.',
			
			fileNotFound : 'File not found.',
			fileNotFoundN : 'File "$1" not found.',
			dirNotFound  : 'Folder not found.',
			notDir       : '"$1" is not a folder.',
			notFile      : '"$1" is not a file.',
			read         : '"$1" can’t be opened because you don’t have permission to see its contents.',
			openDir      : 'Open folder error.',
			openFile     : 'Open file error.',
			write        :  'You don’t have permission to write into "$1".',
			locked       : 'Object "$1" locked and can’t be moved, removed or renamed.',
			invName      : 'Name "$1" is not allowed.',
			exists       : 'Object named "$1" already exists in this location.',
			copy         : 'Unable to copy "$1" in clipboard because you don’t have permission to read it.',
			clpEmpty     : 'There are no files in clipboard.',
			noDstDir     : 'Destination directory not defined.',
			pasteWrite   : 'Unable to move files into "$1" because you don’t have permission to write in this location.',
			pasteItself  : 'Unable to copy "$1" into itself or in child folder.'
		},

		/**
		 * File mimetype to kind mapping
		 * 
		 * @type  Object
		 */
		kinds : {
			'unknown'                       : 'Unknown type',
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
				defaults : function(data) { return data && data.cwd && data.cdc && $.isPlainObject(data.cwd) && $.isArray(data.cdc); },
				tmb      : function(data) { return data && data.images && ($.isPlainObject(data.images) || $.isArray(data.images)); },
				upload   : function(data) { return data && data.cwd && data.cdc && $.isPlainObject(data.cwd) && $.isArray(data.cdc); }
			},
			newapi : {
				defaults : function(data) {  
					if (!data) {
						return false;
					}
					if ((data.added && !$.isArray(data.added))
					||  (data.removed && !$.isArray(data.removed))
					||  (data.changed && !$.isArray(data.changed))) {
						return false;
					}
					return true;
				},
				open    : function(data) { return data && data.cwd && data.files && $.isPlainObject(data.cwd) && $.isArray(data.files); },
				tree    : function(data) { return data && data.tree && $.isArray(data.tree); },
				parents : function(data) { return data && data.tree && $.isArray(data.tree); },
				tmb     : function(data) { return data && data.images && ($.isPlainObject(data.images) || $.isArray(data.images)); },
				upload  : function(data) { return data && ($.isPlainObject(data.added) || $.isArray(data.added));}
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
		
		waterfall : function() {
			var steps   = [],
				dfrd    = $.Deferred(),
				pointer = 0;

			$.each(arguments, function(i, m) {
				steps.push(function() {
					var args = Array.prototype.slice.apply(arguments),
						d = m.apply(null, args);

					if (!d.promise) {
						d = $.Deferred().resolve(d);
					}

					d.fail(function(error) {
						dfrd.reject(error)
					})
					.done(function(data) {
						pointer++;
						args.push(data);

						if (pointer == steps.length) {
							dfrd.resolve.apply(dfrd, args)
						} else {
							steps[pointer].apply(null, args)
						}
					});
				});
			});

			steps[0]();

			return dfrd;
		},
		
		/**
		 * Cleanup ajax data.
		 * For old api convert data into new api format
		 * 
		 * @param  String  command name
		 * @param  Object  data from backend
		 * @return Object
		 */
		normalizeData : function(cmd, data) {
			var self   = this,
				files  = {},
				result = {}, 
				filter = function(file) { return file && file.hash && file.name && file.mime ? file : null; },
				phash, cwd;
			
			if (this.newAPI) {
				if (data.files) {
					data.files = $.map(data.files, filter);
				} 
				if (data.tree) {
					data.tree = $.map(data.tree, filter);
				}

				if (data.added) {
					data.added = $.map(data.added, filter);
				}
				if (data.changed) {
					data.changed = $.map(data.changed, filter);
				}
				if (data.api) {
					data.init = true;
				}
				return data;
			}
			
			if (/^(tmb|read|edit)$/i.test(cmd)) {
				return data;
			}
			// self.log(data)
			phash = data.cwd.hash;
			
			if (data.tree) {
				$.each(this.normalizeOldTree(data.tree), function(i, file) {
					files[file.hash] = file;
				});
			}
			
			$.each(data.cdc, function(i, file) {
				var hash = file.hash;
				
				if (files[hash]) {
					files[hash].date   = file.date;
					files[hash].locked = file.hash == phash ? true : file.rm === void(0) ? false : !file.rm;
				} else {
					files[hash] = self.normalizeOldFile(file, phash);
				}
			});

			if (!data.tree) {
				$.each(this.files(), function(hash, file) {
					if (file.phash != phash && file.mime == 'directory') {
						files[hash] = file;
					}
				})
			}

			if (data.error) {
				result.error = data.error;
			}
			if (data.warning) {
				result.warning = data.warning;
			}
			
			if (cmd == 'open') {
				return {
						cwd     : files[phash] || this.normalizeOldFile(data.cwd),
						files   : $.map(files, filter),
						options : self.normalizeOldOptions(data),
						init    : !!data.params,
						debug   : data.debug
					};
				return result;
			} 
			
			
			
			return $.extend({
				current : data.cwd.hash,
				error   : data.error,
				warning : data.warning,
				options : {tmb : !!data.tmb}
			}, this.diff($.map(files, filter)));
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
		normalizeOldFile : function(file, phash, tmb) {
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
					locked : !phash ? true : file.rm === void(0) ? false : !file.rm
				};
			
			if (file.link) {
				info.link = file.link;
			}

			if (file.linkTo) {
				info.linkTo = file.linkTo;
			}
			
			if (file.tmb) {
				info.tmb = file.tmb;
			} else if (info.mime.indexOf('image/') === 0 && tmb) {
				info.tmb = 1;
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
			var opts = {
					path          : data.cwd.rel,
					disabled      : data.disabled || [],
					tmb           : !!data.tmb,
					copyOverwrite : true
				};
			
			if (data.params) {
				opts.url = data.params.url;
				opts.archives = data.params.archives;
				opts.extract = data.params.extract;
			}
			
			if (opts.path.indexOf('/') !== -1) {
				opts.separator = '/';
			} else if (opts.path.indexOf('\\') !== -1) {
				opts.separator = '\\';
			}
			return opts;
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
			open        : 'Open folder',
			reload      : 'Reload folder content',
			mkdir       : 'Creating directory',
			mkfile      : 'Creating files',
			rm          : 'Delete files',
			copy        : 'Copy files',
			move        : 'Move files',
			prepareCopy : 'Prepare to copy files',
			duplicate   : 'Duplicate files',
			rename      : 'Rename files',
			upload      : 'Uploading files'
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
		 *    progress : 10 // progress bar percents (use cnt : 0 to update progress bar)
		 * })
		 * @return elFinder
		 */
		notify : function(opts) {
			var type     = opts.type,
				msg      = opts.msg || this.i18n(this.notifyType[type] || 'Doing something.'),
				ndialog  = this.ui.notify,
				notify   = ndialog.children('.elfinder-notify-'+type),
				ntpl     = '<div class="elfinder-notify elfinder-notify-{type}"><span class="elfinder-dialog-icon elfinder-dialog-icon-{type}"/><span class="elfinder-notify-msg">{msg}</span> <span class="elfinder-notify-cnt"/><div class="elfinder-notify-progressbar"><div class="elfinder-notify-progress"/></div></div>',
				delta    = opts.cnt,
				progress = opts.progress >= 0 && opts.progress <= 100 ? opts.progress : 0,
				cnt, total, prc;
			
			if (!type) {
				return this;
			}
			
			if (!notify.length) {
				notify = $(ntpl.replace(/\{type\}/g, type).replace(/\{msg\}/g, msg))
					.appendTo(ndialog)
					.data('cnt', 0);

				if (progress) {
					notify.data({progress : 0, total : 0});
				}
			}

			cnt = delta + parseInt(notify.data('cnt'));
			
			if (cnt > 0) {
				!opts.hideCnt && notify.children('.elfinder-notify-cnt').text('('+cnt+')');
				ndialog.is(':hidden') && ndialog.elfinderdialog('open');
				notify.data('cnt', cnt);
				
				if (progress < 100
				&& (total = notify.data('total')) >= 0
				&& (prc = notify.data('progress')) >= 0) {

					total    = delta + parseInt(notify.data('total'));
					prc      = progress + prc;
					progress = parseInt(prc/total);
					notify.data({progress : prc, total : total});
					
					ndialog.find('.elfinder-notify-progress')
						.animate({
							width : (progress < 100 ? progress : 100)+'%'
						}, 20);
				}
				
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
		 * Create unique file name in required dir
		 * 
		 * @param  String  file name
		 * @param  String  parent dir hash
		 * @return String
		 */
		uniqueName : function(prefix, phash) {
			var i = 0, ext = '', p, name;
			
			phash = phash || this.cwd().hash;

			if ((p = prefix.indexOf('.txt')) != -1) {
				ext    = '.txt';
				prefix = prefix.substr(0, p);
			}
			
			prefix = this.i18n(prefix);
			name   = prefix+ext;
			
			if (!this.fileByName(name, phash)) {
				return name;
			}
			while (i < 10000) {
				name = prefix + ' ' + (++i) + ext;
				if (!this.fileByName(name, phash)) {
					return name;
				}
			}
			return prefix + Math.random() + ext;
		},
		
		/**
		 * Return message translated onto current language
		 *
		 * @param  String|Array  message[s]
		 * @return String
		 **/
		i18n : function(msg) { 
			var messages = this.messages, 
				ignore   = [], 
				i;

			if ($.isArray(msg)) {
				msg = msg.slice(0, msg.length)
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
		
		
		navHash2Id : function(hash) {
			return 'nav-'+hash;
		},
		
		navId2Hash : function(id) {
			return id.substr(4);
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