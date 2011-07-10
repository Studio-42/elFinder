/*!
 * elFinder - file manager for web
 * Version 2.0 beta (2011-07-10)
 * http://elfinder.org
 * 
 * Copyright 2009-2011, Studio 42
 * Licensed under a 3 clauses BSD license
 */
(function($) {


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.js
 */

/**
 * @class elFinder - file manager for web
 *
 * @author Dmitry (dio) Levashov
 **/
window.elFinder = function(node, opts) {
	this.time('load');
	
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
		namespace = 'elfinder-'+(id || Math.random().toString().substr(2, 7)),
		
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
		width  = 'auto',
		
		/**
		 * elFinder node height
		 *
		 * @type Number
		 * @default 400
		 **/
		height = 400,
		
		beeper = $(document.createElement('audio')).hide().appendTo('body')[0],
			
		
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
				ctrlKey = !!(e.ctrlKey || e.metaKey);

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
	 * Protocol version
	 *
	 * @type String
	 **/
	this.api = null;
	
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
	this.oldAPI = false;
	
	/**
	 * User os. Required to bind native shortcuts for open/rename
	 *
	 * @type String
	 **/
	this.OS = navigator.userAgent.indexOf('Mac') !== -1 ? 'mac' : navigator.userAgent.indexOf('Win') !== -1  ? 'win' : 'other';
	
	/**
	 * Configuration options
	 *
	 * @type Object
	 **/
	this.options = $.extend({}, this.options, opts||{});
	
	
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
	this.lang = this.i18[this.options.lang] && this.i18[this.options.lang].messages ? this.options.lang : 'en';
	
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
	this.messages = $.extend({}, this.i18.en && this.i18.en.messages, this.lang != 'en' ? this.i18[this.lang].messages : {});
	
	/**
	 * Css classes 
	 *
	 * @type String
	 **/
	this.cssClass = 'ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+(this.direction == 'rtl' ? 'rtl' : 'ltr')+' '+this.options.cssClass;

	/**
	 * Method to store/fetch data
	 *
	 * @type Function
	 **/
	this.storage = (function() {
		try {
	    return 'localStorage' in window && window['localStorage'] !== null ? self.localStorage : self.cookie;
	  } catch (e) {
	    return self.cookie;
	  }
	})();

	// this.storage= this.cookie;
	/**
	 * Sort files type
	 *
	 * @type String
	 **/
	this.sort = self.sorts[self.options.sort] || 1;

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
			
			hashes = element.is('.'+self.res('class', 'cwdfile')) 
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
			accept     : '.elfinder-cwd-file-wrapper,.elfinder-navbar-dir,.elfinder-cwd-file',
			hoverClass : this.res('class', 'adroppable'),
			drop : function(e, ui) {
				var dst     = $(this),
					targets = $.map(ui.helper.data('files')||[], function(h) { return h || null }),
					result  = [],
					c       = 'class',
					cnt, hash, i, h;
				
				if (dst.is('.'+self.res(c, 'cwd'))) {
					hash = cwd;
				} else if (dst.is('.'+self.res(c, 'cwdfile'))) {
					hash = dst.attr('id');
				} else if (dst.is('.'+self.res(c, 'navdir'))) {
					hash = self.navId2Hash(dst.attr('id'));
				}

				cnt = targets.length;
				
				while (cnt--) {
					h = targets[cnt];
					// ignore drop into itself or in own location
					h != hash && files[h].phash != hash && result.push(h);
				}
				
				if (result.length) {
					ui.helper.hide();
					self.clipboard(result, !(e.ctrlKey||e.shiftKey||e.metaKey));
					self.exec('paste', hash).always(function() { self.clipboard([]); });
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
		return file.path 
			? file.path
			: file ? cwdOptions.path + (file.hash == cwd ? '' : cwdOptions.separator+file.name) : '';
	}
	
	/**
	 * Return file url if set
	 * 
	 * @param  Object  file
	 * @return String
	 */
	this.url = function(hash) {
		var file = files[hash],
			path = '';

		if (file.url) {
			return file.url;
		}
		if (cwdOptions.url && (path = this.path(hash))) {
			path = path.replace(cwdOptions.separator, '/');
			return cwdOptions.url + path.substr(path.indexOf('/')+1);
		}
		return '';
	}
	
	/**
	 * Return thumbnail url
	 * 
	 * @param  String  file hash
	 * @return String
	 */
	this.tmb = function(hash) {
		var file = files[hash],
			url = file && file.tmb && file.tmb != 1 ? cwdOptions['tmbUrl'] + file.tmb : '';
		
		if (url && ($.browser.opera || $.browser.msie)) {
			url += '?_=' + new Date().getTime();
		}
		return url;
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
		return this.rules[this.rules[cmd] ? cmd : 'defaults'](data);
	}
	
	/**
	 * Proccess ajax request.
	 * Fired events :
	 * @todo
	 * @example
	 * @todo
	 * @return $.Deferred
	 */
	this.request = function(options) {
		var self     = this,
			o        = this.options,
			dfrd     = $.Deferred(),
			// request data
			data     = $.extend({}, o.customData, {mimes : o.onlyMimes}, options.data || options),
			// command name
			cmd      = data.cmd,
			// call default fail callback (display error dialog) ?
			deffail  = !(options.preventDefault || options.preventFail),
			// call default success callback ?
			defdone  = !(options.preventDefault || options.preventDone),
			// options for notify dialog
			notify   = $.extend({}, options.notify),
			// do not normalize data - return as is
			raw      = !!options.raw,
			// sync files on request fail
			syncOnFail = options.syncOnFail,
			// open notify dialog timeout		
			timeout, 
			// request options
			options = $.extend({
				url      : o.url,
				async    : true,
				type     : this.requestType,
				dataType : 'json',
				cache    : false,
				// timeout  : 100,
				data     : data
			}, options.options || {}),
			/**
			 * Default success handler. 
			 * Call default data handlers and fire event with command name.
			 *
			 * @param Object  normalized response data
			 * @return void
			 **/
			done = function(data) {
				data.warning && self.error(data.warning);
				
				cmd == 'open' && open($.extend(true, {}, data));

				// fire some event to update cache/ui
				data.removed && data.removed.length && self.remove(data);
				data.added   && data.added.length   && self.add(data);
				data.changed && data.changed.length && self.change(data);
				
				// fire event with command name
				self.trigger(cmd, data);
			},
			/**
			 * Request error handler. Reject dfrd with correct error message.
			 *
			 * @param jqxhr  request object
			 * @param String request status
			 * @return void
			 **/
			error = function(xhr, status) {
				var error;
				
				switch (status) {
					case 'abort':
						error = xhr.quiet ? '' : ['errConnect', 'errAbort'];
						break;
					case 'timeout':	    
						error = ['errConnect', 'errTimeout'];
						break;
					case 'parsererror': 
						error = ['errResponse', 'errDataNotJSON'];
						break;
					default:
						if (xhr.status == 403) {
							error = ['errConnect', 'errAccess'];
						} else if (xhr.status == 404) {
							error = ['errConnect', 'errNotFound'];
						} else {
							error = 'errConnect';
						} 
				}
				
				dfrd.reject(error, xhr, status);
			},
			/**
			 * Request success handler. Valid response data and reject/resolve dfrd.
			 *
			 * @param Object  response data
			 * @param String request status
			 * @return void
			 **/
			success = function(response) {
				if (raw) {
					return dfrd.resolve(response);
				}
				
				if (!response) {
					return dfrd.reject(['errResponse', 'errDataEmpty'], xhr);
				} else if (!$.isPlainObject(response)) {
					return dfrd.reject(['errResponse', 'errDataNotJSON'], xhr);
				} else if (response.error) {
					return dfrd.reject(response.error, xhr);
				} else if (!self.validResponse(cmd, response)) {
					return dfrd.reject('errResponse', xhr);
				}

				response = self.normalize(response);
				
				if (!self.api) {
					self.api    = response.api || 1;
					self.newAPI = self.api >= 2;
					self.oldAPI = !self.newAPI;
				}
				
				if (response.options) {
					cwdOptions = $.extend({}, cwdOptions, response.options);
				}

				dfrd.resolve(response);
				response.debug && self.debug('backend-debug', response.debug);
			},
			xhr, _xhr
			;

		defdone && dfrd.done(done);
		dfrd.fail(function(error) {
			if (error) {
				deffail ? self.error(error) : self.debug('error', self.i18n(error));
			}
		})
		
		if (!cmd) {
			return dfrd.reject('errCmdReq');
		}	

		if (syncOnFail) {
			dfrd.fail(function(error) {
				error && self.sync();
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
		
		// quiet abort not completed "open" requests
		if (cmd == 'open') {
			while ((_xhr = queue.pop())) {
				if (!_xhr.isRejected() && !_xhr.isResolved()) {
					_xhr.quiet = true;
					_xhr.abort();
				}
			}
		}

		delete options.preventFail

		xhr = this.transport.send(options).fail(error).done(success);
		
		// this.transport.send(options)
		
		// add "open" xhr into queue
		if (cmd == 'open') {
			queue.unshift(xhr);
			dfrd.always(function() {
				var ndx = $.inArray(xhr, queue);
				
				ndx !== -1 && queue.splice(ndx, 1);
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
	 * @return jQuery.Deferred
	 */
	this.sync = function() {
		var self  = this,
			dfrd  = $.Deferred().done(function() { self.trigger('sync'); }),
			opts1 = {
				data           : {cmd : 'open', init : 1, target : cwd, tree : this.ui.tree ? 1 : 0},
				preventDefault : true
			},
			opts2 = {
				data           : {cmd : 'parents', target : cwd},
				preventDefault : true
			};
		
		
		$.when(
			this.request(opts1),
			this.request(opts2)
		)
		.fail(function(error) {
			dfrd.reject(error);
			error && self.request({
				data   : {cmd : 'open', target : self.lastDir(''), tree : 1, init : 1},
				notify : {type : 'open', cnt : 1, hideCnt : true}
			});
		})
		.done(function(odata, pdata) {
			var diff = self.diff(odata.files.concat(pdata && pdata.tree ? pdata.tree : []));

			diff.removed.length && self.remove(diff);
			diff.added.length   && self.add(diff);
			diff.changed.length && self.change(diff);
			return dfrd.resolve(diff);
		});
		
		return dfrd;
	}
	
	this.upload = function(files) {
		return this.transport.upload(files, this);
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
						this.debug('event-stoped', event.type);
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
					? code > 0 ? code : code.charCodeAt(0) 
					: $.ui.keyCode[code];

				if (code && !shortcuts[pattern]) {
					shortcuts[pattern] = {
						keyCode     : code,
						altKey      : $.inArray('ALT', parts)   != -1,
						ctrlKey     : $.inArray('CTRL', parts)  != -1,
						shiftKey    : $.inArray('SHIFT', parts) != -1,
						type        : s.type || 'keydown',
						callback    : s.callback,
						description : s.description,
						pattern     : pattern
					};
				}
			}
		}
		return this;
	}
	
	/**
	 * Registered shortcuts
	 *
	 * @type Object
	 **/
	this.shortcuts = function() {
		var ret = [];
		
		$.each(shortcuts, function(i, s) {
			ret.push([s.pattern, self.i18n(s.description)]);
		});
		return ret;
	};
	
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
		var map = function() { return $.map(clipboard, function(f) { return f.hash }); }
		
		if (hashes !== void(0)) {
			clipboard.length && this.trigger('unlockfiles', {files : map()});
			
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
			cut && this.trigger('lockfiles', {files : map()});
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
	 * @param  String         command name
	 * @param  String|Array   usualy files hashes
	 * @param  String|Array   command options
	 * @return $.Deferred
	 */		
	this.exec = function(cmd, files, opts) {
		return this._commands[cmd] && this.isCommandEnabled(cmd) 
			? this._commands[cmd].exec(files, opts) 
			: $.Deferred().reject('No such command');
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
	
	this.command = function(name) {
		return name === void(0) ? this._commands : this._commands[name];
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
		this.trigger('resize', {width : node.width(), height : node.height()});
	}
	
	/**
	 * Restore elfinder node size
	 * 
	 * @return elFinder
	 */
	this.restoreSize = function() {
		this.resize(width, height);
	}
	
	this.show = function() {
		node.show();
		this.enable().trigger('show');
	}
	
	this.hide = function() {
		this.disable().trigger('hide');
		node.hide();
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
	if (!($.fn.selectable && $.fn.draggable && $.fn.droppable)) {
		return alert(this.i18n('errJqui'));
	}

	// check node
	if (!node.length) {
		return alert(this.i18n('errNode'));
	}
	// check connector url
	if (!this.options.url) {
		return alert(this.i18n('errURL'));
	}

	$.extend($.ui.keyCode, {
		'F1' : 112,
		'F2' : 113,
		'F3' : 114,
		'F4' : 115,
		'F5' : 116,
		'F6' : 117,
		'F7' : 118,
		'F8' : 119,
		'F9' : 120
	});
	
	this.dragUpload = false;
	this.xhrUpload  = typeof XMLHttpRequestUpload != 'undefined' && typeof File != 'undefined' && typeof FormData != 'undefined';
	
	// configure transport object
	this.transport = {}
	
	if (typeof(this.options.transport) == 'object') {
		this.transport = this.options.transport;
		if (typeof(this.transport.init) == 'function') {
			this.transport.init(this)
		}
	}
	
	if (typeof(this.transport.send) != 'function') {
		this.transport.send = function(opts) { return $.ajax(opts); }
	}
	
	if (this.transport.upload == 'iframe') {
		this.transport.upload = $.proxy(this.uploads.iframe, this);
	} else if (typeof(this.transport.upload) == 'function') {
		this.dragUpload = !!this.options.dragUpload;
	} else if (this.xhrUpload) {
		this.transport.upload = $.proxy(this.uploads.xhr, this);
		this.dragUpload = true;
	} else {
		this.transport.upload = $.proxy(this.uploads.iframe, this);
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
	$.each(['enable', 'disable', 'load', 'open', 'reload', 'select',  'add', 'remove', 'change', 'dblclick', 'getfile', 'lockfiles', 'unlockfiles', 'dragstart', 'dragstop', 'search', 'searchend', 'viewchange'], function(i, name) {
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
				node.removeClass('elfinder-disabled')
			}
		})
		.disable(function() {
			prevEnabled = enabled;
			enabled = false;
			node.addClass('elfinder-disabled');
		})
		.select(function(e) {
			selected = $.map(e.data.selected || e.data.value|| [], function(hash) { return files[hash] ? hash : null; });
		})
		.error(function(e) { 
			var opts  = {
					cssClass  : 'elfinder-dialog-error',
					title     : self.i18n(self.i18n('error')),
					resizable : false,
					destroyOnClose : true,
					buttons   : {}
			};

			opts.buttons[self.i18n(self.i18n('btnClose'))] = function() { $(this).elfinderdialog('close'); };

			self.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-error"/>'+self.i18n(e.data.error), opts);
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
		.bind('search', function(e) {
			cache(e.data.files);
		})
		.bind('rm', function(e) {
			var play  = beeper.canPlayType && beeper.canPlayType('audio/wav; codecs="1"');
		
			play && play != '' && play != 'no' && $(beeper).html('<source src="./sounds/rm.wav" type="audio/wav">')[0].play()
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
	
	// in getFileCallback set - change default actions on duble click/enter/ctrl+enter
	if (typeof(this.options.getFileCallback) == 'function' && this.commands.getfile) {
		this.bind('dblclick', function(e) {
			e.preventDefault();
			self.exec('getfile').fail(function() {
				self.exec('open');
			});
		});
		this.shortcut({
			pattern     : 'enter',
			description : this.i18n('cmdgetfile'),
			callback    : function() { self.exec('getfile').fail(function() { self.exec(self.OS == 'mac' ? 'rename' : 'open') }) }
		})
		.shortcut({
			pattern     : 'ctrl+enter',
			description : this.i18n(this.OS == 'mac' ? 'cmdrename' : 'cmdopen'),
			callback    : function() { self.exec(self.OS == 'mac' ? 'rename' : 'open') }
		});
		
	} 

	/**
	 * Loaded commands
	 *
	 * @type Object
	 **/
	this._commands = {};
	
	if (!$.isArray(this.options.commands)) {
		this.options.commands = [];
	}
	// check required commands
	$.each(['open', 'reload', 'back', 'forward', 'up', 'home', 'info', 'search', 'quicklook', 'getfile', 'help'], function(i, cmd) {
		$.inArray(cmd, self.options.commands) === -1 && self.options.commands.push(cmd);
	});

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
		// container for folders tree / places
		navbar : $('<div/>').appendTo(node).elfindernavbar(this),
		// contextmenu
		contextmenu : $('<div/>').appendTo(node).elfindercontextmenu(this),
		// overlay
		overlay : $('<div/>').appendTo(node).elfinderoverlay({
			show : function() { self.disable(); },
			hide : function() { prevEnabled && self.enable(); }
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
		}),
		statusbar : $('<div class="ui-widget-header ui-helper-clearfix ui-corner-bottom elfinder-statusbar"/>').appendTo(node)
	}
	
	// load required ui
	$.each(this.options.ui || [], function(i, ui) {
		var name = 'elfinder'+ui,
			opts = self.options.uiOptions[ui] || {};

		if (!self.ui[ui] && $.fn[name]) {
			self.ui[ui] = $('<'+(opts.tag || 'div')+'/>').appendTo(node)[name](self, opts);
		}
	});
	
	
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

	if (this.options.width) {
		width = this.options.width;
	}
	
	if (this.options.height) {
		height = parseInt(this.options.height);
	}
	
	// update size	
	self.resize(width, height);
	
	// attach events to document
	$(document)
		// disable elfinder on click outside elfinder
		.bind('click.'+this.namespace, function(e) { enabled && !$(e.target).closest(node).length && self.disable(); })
		// exec shortcuts
		.bind(keydown+' '+keypress, execShortcut);
	
	// send initial request and start to pray >_<
	this.trigger('init')
		.request({
			data        : {cmd : 'open', target : self.lastDir(), init : 1, tree : this.ui.tree ? 1 : 0}, 
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
	
	// update ui's size after init
	this.one('load', function() {
		node.trigger('resize')
	});
	
	// self.timeEnd('load'); 

}

/**
 * Prototype
 * 
 * @type  Object
 */
elFinder.prototype = {
	
	res : function(type, id) {
		return this.resources[type] && this.resources[type][id];
	}, 
	
	/**
	 * Internationalization object
	 * 
	 * @type  Object
	 */
	i18 : {
		en : {
			translator  : '',
			language    : 'English',
			direction   : 'ltr',
			messages    : {}
		}
	},
	
	/**
	 * File mimetype to kind mapping
	 * 
	 * @type  Object
	 */
	kinds : 	{
			'unknown'                       : 'Unknown',
			'directory'                     : 'Folder',
			'symlink'                       : 'Alias',
			'symlink-broken'                : 'AliasBroken',
			'application/x-empty'           : 'TextPlain',
			'application/postscript'        : 'Postscript',
			'application/vnd.ms-office'     : 'MsOffice',
			'application/vnd.ms-word'       : 'MsWord',
			'application/vnd.ms-excel'      : 'MsExcel',
			'application/vnd.ms-powerpoint' : 'MsPP',
			'application/pdf'               : 'PDF',
			'application/xml'               : 'XML',
			'application/vnd.oasis.opendocument.text' : 'OO',
			'application/x-shockwave-flash' : 'AppFlash',
			'application/flash-video'       : 'Flash video',
			'application/x-bittorrent'      : 'Torrent',
			'application/javascript'        : 'JS',
			'application/rtf'               : 'RTF',
			'application/rtfd'              : 'RTF',
			'application/x-font-ttf'        : 'TTF',
			'application/x-font-otf'        : 'OTF',
			'application/x-rpm'             : 'RPM',
			'application/x-web-config'      : 'TextPlain',
			'application/xhtml+xml'         : 'HTML',
			'application/docbook+xml'       : 'DOCBOOK',
			'application/x-awk'             : 'AWK',
			'application/x-gzip'            : 'GZIP',
			'application/x-bzip2'           : 'BZIP',
			'application/zip'               : 'ZIP',
			'application/x-rar'             : 'RAR',
			'application/x-tar'             : 'TAR',
			'application/x-7z-compressed'   : '7z',
			'application/x-jar'             : 'JAR',
			'text/plain'                    : 'TextPlain',
			'text/x-php'                    : 'PHP',
			'text/html'                     : 'HTML',
			'text/javascript'               : 'JS',
			'text/css'                      : 'CSS',
			'text/rtf'                      : 'RTF',
			'text/rtfd'                     : 'RTF',
			'text/x-c'                      : 'C',
			'text/x-csrc'                   : 'C',
			'text/x-chdr'                   : 'CHeader',
			'text/x-c++'                    : 'CPP',
			'text/x-c++src'                 : 'CPP',
			'text/x-c++hdr'                 : 'CPPHeader',
			'text/x-shellscript'            : 'Shell',
			'application/x-csh'             : 'Shell',
			'text/x-python'                 : 'Python',
			'text/x-java'                   : 'Java',
			'text/x-java-source'            : 'Java',
			'text/x-ruby'                   : 'Ruby',
			'text/x-perl'                   : 'Perl',
			'text/x-sql'                    : 'SQL',
			'text/xml'                      : 'XML',
			'text/x-comma-separated-values' : 'CSV',
			'image/x-ms-bmp'                : 'BMP',
			'image/jpeg'                    : 'JPEG',
			'image/gif'                     : 'GIF',
			'image/png'                     : 'PNG',
			'image/tiff'                    : 'TIFF',
			'image/x-targa'                 : 'TGA',
			'image/vnd.adobe.photoshop'     : 'PSD',
			'image/xbm'                     : 'XBITMAP',
			'image/pxm'                     : 'PXM',
			'audio/mpeg'                    : 'AudioMPEG',
			'audio/midi'                    : 'AudioMIDI',
			'audio/ogg'                     : 'AudioOGG',
			'audio/mp4'                     : 'AudioMPEG4',
			'audio/x-m4a'                   : 'AudioMPEG4',
			'audio/wav'                     : 'AudioWAV',
			'audio/x-mp3-playlist'          : 'AudioPlaylist',
			'video/x-dv'                    : 'VideoDV',
			'video/mp4'                     : 'VideoMPEG4',
			'video/mpeg'                    : 'VideoMPEG',
			'video/x-msvideo'               : 'VideoAVI',
			'video/quicktime'               : 'VideoMOV',
			'video/x-ms-wmv'                : 'VideoWM',
			'video/x-flv'                   : 'VideoFlash',
			'video/x-matroska'              : 'VideoMKV',
			'video/ogg'                     : 'VideoOGG'
		},
	
	/**
	 * Ajax request data validation rules
	 * 
	 * @type  Object
	 */
	rules : {
		defaults : function(data) {
			if (!data
			|| (data.added && !$.isArray(data.added))
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
		upload  : function(data) { return data && ($.isPlainObject(data.added) || $.isArray(data.added));},
		search  : function(data) { return data && data.files && $.isArray(data.files)}
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
	
	parseUploadData : function(text) {
		var data;
		
		if (!$.trim(text)) {
			return {error : ['errResponse', 'errDataEmpty']};
		}
		
		try {
			data = $.parseJSON(text);
		} catch (e) {
			return {error : ['errResponse', 'errDataNotJSON']}
		}
		
		if (!this.validResponse('upload', data)) {
			return {error : ['errResponse']};
		}
		data = this.normalize(data);
		data.removed = $.map(data.added||[], function(f) { return f.hash; })
		return data;
		
	},
	
	iframeCnt : 0,
	
	uploads : {
		// upload transport using iframe
		iframe : function(data) { 
			var self   = this,
				input  = data.input,
				dfrd   = $.Deferred()
					.fail(function(error) {
						error && self.error(error);
					})
					.done(function(data) {
						data.warning && self.error(data.warning);
						data.removed && self.remove(data);
						data.added   && self.add(data);
						data.changed && self.change(data);
						self.trigger('upload', data);
					}),
				name = 'iframe-'+this.namespace+(++this.iframeCnt),
				form = $('<form action="'+this.options.url+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'" style="display:none"><input type="hidden" name="cmd" value="upload" /></form>'),
				msie = $.browser.msie,
				// clear timeouts, close notification dialog, remove form/iframe
				onload = function() {
					abortto  && clearTimeout(abortto);
					notifyto && clearTimeout(notifyto);
					notify   && self.notify({type : 'upload', cnt : -cnt});
					
					setTimeout(function() {
						msie && $('<iframe src="javascript:false;"/>').appendTo(form);
						form.remove();
						iframe.remove();
					}, 100);
				},
				iframe = $('<iframe src="'+(msie ? 'javascript:false;' : 'about:blank')+'" name="'+name+'" style="position:absolute;left:-1000px;top:-1000px" />')
					.bind('load', function() {
						iframe.unbind('load')
							.bind('load', function() {
								var data = self.parseUploadData(iframe.contents().text());
								
								onload();
								data.error ? dfrd.reject(data.error) : dfrd.resolve(data);
							});
							
							// notify dialog
							notifyto = setTimeout(function() {
								notify = true;
								self.notify({type : 'upload', cnt : cnt});
							}, self.options.notifyDelay);
							
							// emulate abort on timeout
							if (self.options.iframeTimeout > 0) {
								abortto = setTimeout(function() {
									onload();
									dfrd.reject([errors.connect, errors.timeout]);
								}, self.options.iframeTimeout);
							}
							
							form.submit();
					}),
				cnt, notify, notifyto, abortto
				
				;
			
			if (input && $(input).is(':file') && $(input).val()) {
				form.append(input);
			} else {
				return dfrd.reject();
			}
			
			cnt = input.files ? input.files.length : 1;
			
			form.append('<input type="hidden" name="'+(this.newAPI ? 'target' : 'current')+'" value="'+this.cwd().hash+'"/>')
				.append('<input type="hidden" name="html" value="1"/>')
				.append($(input).attr('name', 'upload[]'));
			
			$.each(this.options.onlyMimes||[], function(i, mime) {
				form.append('<input type="hidden" name="mimes[]" value="'+mime+'"/>');
			});
			
			$.each(this.options.customData, function(key, val) {
				form.append('<input type="hidden" name="'+key+'" value="'+val+'"/>');
			});
			
			form.appendTo('body');
			iframe.appendTo('body');
			
			return dfrd;
		},
		// upload transport using XMLHttpRequest
		xhr : function(data) { 
			var self   = this,
				dfrd   = $.Deferred()
					.fail(function(error) {
						error && self.error(error);
					})
					.done(function(data) {
						data.warning && self.error(data.warning);
						data.removed && self.remove(data);
						data.added   && self.add(data);
						data.changed && self.change(data);
	 					self.trigger('upload', data);
					})
					.always(function() {
						notifyto && clearTimeout(notifyto);
						notify && self.notify({type : 'upload', cnt : -cnt, progress : 100*cnt});
					}),
				xhr         = new XMLHttpRequest(),
				formData    = new FormData(),
				files       = data.input ? data.input.files : data.files, 
				cnt         = files.length,
				loaded      = 5,
				notify      = false,
				startNotify = function() {
					return setTimeout(function() {
						notify = true;
						self.notify({type : 'upload', cnt : cnt, progress : loaded*cnt});
					}, self.options.notifyDelay);
				},
				notifyto;
			
			if (!cnt) {
				return dfrd.reject();
			}
			
			xhr.addEventListener('error', function() {
				dfrd.reject('errConnect');
			}, false);
			
			xhr.addEventListener('abort', function() {
				dfrd.reject(['errConnect', 'errAbort']);
			}, false);
			
			xhr.addEventListener('load', function() {
				var status = xhr.status, data;
				
				if (status > 500) {
					return dfrd.reject('errResponse');
				}
				if (status != 200) {
					return dfrd.reject('errConnect');
				}
				if (xhr.readyState != 4) {
					return dfrd.reject(['errConnect', 'errTimeout']); // am i right?
				}
				if (!xhr.responseText) {
					return dfrd.reject(['errResponse', 'errDataEmpty']);
				}

				data = self.parseUploadData(xhr.responseText);
				data.error ? dfrd.reject(data.error) : dfrd.resolve(data);
			}, false);
			
			xhr.upload.addEventListener('progress', function(e) {
				var prev = loaded, curr;

				if (e.lengthComputable) {
					
					curr = parseInt(e.loaded*100 / e.total);

					// to avoid strange bug in safari (not in chrome) with drag&drop.
					// bug: macos finder opened in any folder,
					// reset safari cache (option+command+e), reload elfinder page,
					// drop file from finder
					// on first attempt request starts (progress callback called ones) but never ends.
					// any next drop - successfull.
					if (curr > 0 && !notifyto) {
						notifyto = startNotify();
					}
					
					if (curr - prev > 4) {
						loaded = curr;
						notify && self.notify({type : 'upload', cnt : 0, progress : (loaded - prev)*cnt});
					}
				}
			}, false);
			
			
			xhr.open('POST', this.options.url, true);
			formData.append('cmd', 'upload');
			formData.append(this.newAPI ? 'target' : 'current', this.cwd().hash);
			$.each(this.options.customData, function(key, val) {
				formData.append(key, val);
			});
			$.each(this.options.onlyMimes, function(i, mime) {
				formData.append('mimes['+i+']', mime);
			});
			
			$.each(files, function(i, file) {
				formData.append('upload['+i+']', file);
			});
			
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4 && xhr.status == 0) {
					// ff bug while send zero sized file
					// for safari - send directory
					dfrd.reject(['errConnect', 'errAbort']);
				}
			}
			
			xhr.send(formData);

			if (!$.browser.safari || !data.files) {
				notifyto = startNotify();
			}
			
			return dfrd;
		}
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
			h    = $.proxy(callback, function(event) {
				setTimeout(function() {self.unbind(event.type, h);}, 3);
				return callback.apply(this, arguments);
			});
		return this.bind(event, h);
	},
	
	/**
	 * Set/get data into/from localStorage
	 *
	 * @param  String       key
	 * @param  String|void  value
	 * @return String
	 */
	localStorage : function(key, val) {
		var s = window.localStorage;
		
		key = 'elfinder-'+key+this.id;
		
		val !== void(0) && s.setItem(key, val);
		// s.clear();
		return s.getItem(key)||'';
	},
	
	/**
	 * Get/set cookie
	 *
	 * @param  String       cookie name
	 * @param  String|void  cookie value
	 * @return String
	 */
	cookie : function(name, value) {
		var d, o, c, i;

		name = 'elfinder-'+name+this.id;

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
	 * Get/set last opened directory
	 * 
	 * @param  String|undefined  dir hash
	 * @return String
	 */
	lastDir : function(hash) { 
		return this.storage('lastdir', hash);
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
	 * Cleanup ajax data.
	 * For old api convert data into new api format
	 * 
	 * @param  String  command name
	 * @param  Object  data from backend
	 * @return Object
	 */
	normalize : function(data) {
		var filter = function(file) { 
		
			if (file && file.hash && file.name && file.mime) {
				if (file.mime == 'application/x-empty') {
					file.mime = 'text/plain';
				}
				return file;
			}
			return null;
			return file && file.hash && file.name && file.mime ? file : null; 
		};
		

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
			msg      = this.messages['ntf'+type] ? this.i18n('ntf'+type) : this.i18n('ntfsmth'),
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
				title     : this.i18n(opts.title || 'confirmReq'),
				buttons   : {},
				close     : function() { 
					!complete && opts.cancel.callback();
					$(this).elfinderdialog('destroy');
				}
			},
			apply = this.i18n('apllyAll'),
			label, checkbox;

		
		if (opts.reject) {
			options.buttons[this.i18n(opts.reject.label)] = function() {
				opts.reject.callback(!!(checkbox && checkbox.prop('checked')))
				complete = true;
				$(this).elfinderdialog('close')
			};
		}
		
		options.buttons[this.i18n(opts.accept.label)] = function() {
			opts.accept.callback(!!(checkbox && checkbox.prop('checked')))
			complete = true;
			$(this).elfinderdialog('close')
		};
		
		options.buttons[this.i18n(opts.cancel.label)] = function() {
			$(this).elfinderdialog('close')
		};
		
		if (opts.all) {
			if (opts.reject) {
				options.width = 370;
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
	 * Create unique file name in required dir
	 * 
	 * @param  String  file name
	 * @param  String  parent dir hash
	 * @return String
	 */
	uniqueName : function(prefix, phash) {
		var i = 0, ext = '', p, name;
		
		prefix = this.i18n(prefix);
		phash = phash || this.cwd().hash;

		if ((p = prefix.indexOf('.txt')) != -1) {
			ext    = '.txt';
			prefix = prefix.substr(0, p);
		}
		
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
	i18n : function() {
		var self = this,
			messages = this.messages, 
			input    = [],
			ignore   = [], 
			message = function(m) {
				var file;
				if (m.indexOf('#') === 0) {
					if ((file = self.file(m.substr(1)))) {
						return file.name;
					}
				}
				return m;
			},
			i, j, m;
			
		for (i = 0; i< arguments.length; i++) {
			m = arguments[i];
			
			if (typeof m == 'string') {
				input.push(message(m));
			} else if ($.isArray(m)) {
				for (j = 0; j < m.length; j++) {
					if (typeof m[j] == 'string') {
						input.push(message(m[j]));
					}
				}
			}
		}
		
		for (i = 0; i < input.length; i++) {
			// dont translate placeholders
			if ($.inArray(i, ignore) !== -1) {
				continue;
			}
			m = input[i];
			// translate message
			m = messages[m] || m;
			// replace placeholders in message
			m = m.replace(/\$(\d+)/g, function(match, placeholder) {
				placeholder = i + parseInt(placeholder);
				if (placeholder > 0 && input[placeholder]) {
					ignore.push(placeholder)
				}
				return input[placeholder] || '';
			});

			input[i] = m;
		}

		return $.map(input, function(m, i) { return $.inArray(i, ignore) === -1 ? m : null; }).join('<br>');
	},
	
	/**
	 * Convert mimetype into css classes
	 * 
	 * @param  String  file mimetype
	 * @return String
	 */
	mime2class : function(mime) {
		var prefix = 'elfinder-cwd-icon-';
		
		mime = mime.split('/');
		
		return prefix+mime[0]+(mime[0] != 'image' && mime[1] ? ' '+prefix+mime[1].replace(/(\.|\+)/g, '-') : '')
		// return 'elfinder-cwd-icon-'+mime.replace('/' , ' elfinder-cwd-icon-').replace(/(\.|\+)/g, '-');
	},
	
	/**
	 * Return localized kind of file
	 * 
	 * @param  Object|String  file or file mimetype
	 * @return String
	 */
	mime2kind : function(f) {
		var mime = typeof(f) == 'object' ? f.mime : f, kind;
		
		if (f.alias) {
			kind = 'Alias';
		} else if (this.kinds[mime]) {
			kind = this.kinds[mime];
		} else {
			if (mime.indexOf('text') === 0) {
				kind = 'Text';
			} else if (mime.indexOf('image') === 0) {
				kind = 'Image';
			} else if (mime.indexOf('audio') === 0) {
				kind = 'Audio';
			} else if (mime.indexOf('video') === 0) {
				kind = 'Video';
			} else if (mime.indexOf('application') === 0) {
				kind = 'App';
			} else {
				kind = mime;
			}
		}
		
		return this.messages['kind'+kind] ? this.i18n('kind'+kind) : mime;
		
		var mime = typeof(f) == 'object' ? f.mime : f,
			kind = this.kinds[mime]||'unknown';

		if (f.alias) {
			kind = 'Alias';
		} else if (kind == 'unknown') {
			if (mime.indexOf('text') === 0) {
				kind = 'Text';
			} else if (mime.indexOf('image') === 0) {
				kind = 'Image';
			} else if (mime.indexOf('audio') === 0) {
				kind = 'Audio';
			} else if (mime.indexOf('video') === 0) {
				kind = 'Video';
			} else if (mime.indexOf('application') === 0) {
				kind = 'Application';
			}
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

		return d == 'unknown' 
			? self.i18n('dateUnknown') 
			: (''+d).replace(/([a-z]+)\s/i, function(a1, a2) { return self.i18n(a2)+' '; });
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

		return p.length ? p.join(' '+this.i18n('and')+' ') : this.i18n('noaccess');
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
		return typeof(id) == 'string' ? id.substr(4) : false;
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


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.version.js
 */

/**
 * Application version
 *
 * @type String
 **/
elFinder.prototype.version = '2.0 beta';



/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/jquery.elfinder.js
 */

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
				this.elfinder.hide();
				break;
				
			case 'open':
			case 'show':
				this.elfinder.show();
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


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.options.js
 */

/**
 * Default elFinder config
 *
 * @type  Object
 * @autor Dmitry (dio) Levashov
 */
elFinder.prototype.options = {
	/**
	 * Connector url. Required!
	 *
	 * @type String
	 */
	url : '',

	/**
	 * Ajax request type.
	 *
	 * @type String
	 * @default "get"
	 */
	requestType : 'get',

	/**
	 * Transport to send request to backend.
	 * Required for future extensions using websockets/webdav etc.
	 * Must be an object with "send" method.
	 * transport.send must return $.Deferred() object
	 *
	 * @type Object
	 * @default null
	 * @example
	 *  transport : {
	 *    init : function(elfinderInstance) { },
	 *    send : function(options) {
	 *      var dfrd = $.Deferred();
	 *      // connect to backend ...
	 *      return dfrd;
	 *    },
	 *    upload : function(data) {
	 *      var dfrd = $.Deferred();
	 *      // upload ...
	 *      return dfrd;
	 *    }
	 *    
	 *  }
	 **/
	transport : {},

	/**
	 * Allow to drag and drop to upload files
	 *
	 * @type Boolean|String
	 * @default  'auto'
	 */
	dragUploadAllow : 'auto',
	
	/**
	 * Timeout for upload using iframe
	 *
	 * @type Number
	 * @default  0 - no timeout
	 */
	iframeTimeout : 0,
	
	/**
	 * Data to append to all requests and to upload files
	 *
	 * @type Object
	 * @default  {}
	 */
	customData : {token : '42', test : 'test'},
	
	/**
	 * Event listeners to bind on elFinder init
	 *
	 * @type Object
	 * @default  {}
	 */
	handlers : {},

	/**
	 * Interface language
	 *
	 * @type String
	 * @default "en"
	 */
	lang : 'en',

	/**
	 * Additional css class for filemanager node.
	 *
	 * @type String
	 */
	cssClass : '',

	/**
	 * Active commands list
	 * If some required commands will be missed here, elFinder will add its
	 *
	 * @type Array
	 */
	commands : [
		'open', 'reload', 'home', 'up', 'back', 'forward', 'getfile', 'quicklook', 
		'download', 'rm', 'duplicate', 'rename', 'mkdir', 'mkfile', 'upload', 'copy', 
		'cut', 'paste', 'edit', 'extract', 'archive', 'search', 'info', 'view', 'help'
	],
	
	/**
	 * Commands options.
	 *
	 * @type Object
	 **/
	commandsOptions : {
		// "getfile" command options.
		getfile : {
			// allow to return multiple files info
			multiple : false,
			// allow to return filers info
			folders  : false,
			// action after callback (""/"close"/"destroy")
			oncomplete : ''
		},
		// "upload" command options.
		upload : {
			ui : 'uploadbutton'
		},
		// "quicklook" command options.
		quicklook : {
			autoplay : true,
			jplayer  : 'extensions/jplayer'
		}
	},
	
	/**
	 * Callback for "getfile" commands.
	 * Required to use elFinder with WYSIWYG editors etc..
	 *
	 * @type Function
	 * @default null (command not active)
	 */
	getFileCallback : null,
	
	/**
	 * UI plugins to load.
	 * Current dir ui and dialogs loads always.
	 * Here set not required plugins as folders tree/toolbar/statusbar etc.
	 *
	 * @type Array
	 * @default ['toolbar', 'places', 'tree', 'path', 'stat']
	 */
	ui : ['toolbar', 'places', 'tree', 'path', 'stat'],
	
	/**
	 * Some UI plugins options.
	 * @type Object
	 */
	uiOptions : {
		// toolbar configuration
		toolbar : [
			['back', 'forward'],
			// ['reload'],
			// ['home', 'up'],
			['mkdir', 'mkfile', 'upload'],
			['open', 'download', 'getfile'],
			['info'],
			['quicklook'],
			['copy', 'cut', 'paste'],
			['rm'],
			['duplicate', 'rename', 'edit'],
			['extract', 'archive'],
			['search'],
			['view'],
			['help']
		],
		// directories tree options
		tree : {
			// expand current root on init
			openRootOnLoad : true,
			// auto load current dir parents
			syncTree : true
		}
	},

	/**
	 * Display only required files by types
	 *
	 * @type Array
	 * @default []
	 * @example
	 *  onlyMimes : ["image"] - display all images
	 *  onlyMimes : ["image/png", "application/x-shockwave-flash"] - display png and flash
	 */
	onlyMimes : [],

	/**
	 * How to sort files in current directory
	 *
	 * @type String
	 * @default "nameDirsFirst"
	 * @example
	 *  - sort : 'nameDirsFirst' - sort by name, directory first
	 *  - sort : 'kindDirsFirst' - sort by kind, name, directory first
	 *  - sort : 'sizeDirsFirst' - sort by size, name, directory first
	 *  - sort : 'name' - sort by name
	 *  - sort : 'kind' - sort by kind, name
	 *  - sort : 'size' - sort by size, name
	 */
	sort : 'nameDirsFirst',
	
	/**
	 * elFinder width
	 *
	 * @type String|Number
	 * @default  "auto"
	 */
	width : 'auto',
	
	/**
	 * elFinder height
	 *
	 * @type Number
	 * @default  "auto"
	 */
	height : 400,
	
	/**
	 * Make elFinder resizable if jquery ui resizable available
	 *
	 * @type Boolean
	 * @default  true
	 */
	resizable : true,
	
	/**
	 * Timeout before open notifications dialogs
	 *
	 * @type Number
	 * @default  500 (.5 sec)
	 */
	notifyDelay : 500,
	
	/**
	 * Allow shortcuts
	 *
	 * @type Boolean
	 * @default  true
	 */
	allowShortcuts : true,
	
	/**
	 * Remeber last opened dir to open it after reload or in next session
	 *
	 * @type Boolean
	 * @default  true
	 */
	rememberLastDir : true,
	
	/**
	 * Lazy load config.
	 * How many files display at once?
	 *
	 * @type Number
	 * @default  50
	 */
	showFiles : 30,
	
	/**
	 * Lazy load config.
	 * Distance in px to cwd bottom edge to start display files
	 *
	 * @type Number
	 * @default  50
	 */
	showThreshold : 50,
	
	/**
	 * Additional rule to valid new file name.
	 * By default not allowed empty names or '..'
	 *
	 * @type false|RegExp|function
	 * @default  false
	 * @example
	 *  disable names with spaces:
	 *  validName : /^[^\s]$/
	 */
	validName : false,
	
	/**
	 * Sync content interval
	 * @todo - fix in elFinder
	 * @type Number
	 * @default  0 (do not sync)
	 */
	sync : 1000,
	
	/**
	 * How many thumbnails create in one request
	 *
	 * @type Number
	 * @default  5
	 */
	loadTmbs : 5,
	
	/**
	 * Cookie option for browsersdoes not suppot localStorage
	 *
	 * @type Object
	 */
	cookie         : {
		expires : 30,
		domain  : '',
		path    : '/',
		secure  : false
	},
	
	/**
	 * Contextmenu config
	 *
	 * @type Object
	 */
	contextmenu : {
		// navbarfolder menu
		navbar : ['open', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'info'],
		// current directory menu
		cwd    : ['reload', 'back', '|', 'upload', 'mkdir', 'mkfile', 'paste', '|', 'search', '|', 'info'],
		// current directory file menu
		files  : ['getfile', '|','open', 'quicklook', '|', 'download', '|', 'edit', '|', 'copy', 'cut', 'paste', 'duplicate', '|', 'rm', '|', 'archive', 'extract', '|', 'info']
	},

	/**
	 * Debug config
	 *
	 * @type Array|Boolean
	 */
	// debug : true
	debug : ['error', 'warning']
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.history.js
 */

/**
 * @class elFinder.history
 * Store visited folders
 * and provide "back" and "forward" methods
 *
 * @author Dmitry (dio) Levashov
 */
elFinder.prototype.history = function(fm) {
	var self = this,
		/**
		 * Update history on "open" event?
		 *
		 * @type Boolean
		 */
		update = true,
		/**
		 * Directories hashes storage
		 *
		 * @type Array
		 */
		history = [],
		/**
		 * Current directory index in history
		 *
		 * @type Number
		 */
		current,
		/**
		 * Clear history
		 *
		 * @return void
		 */
		reset = function() {
			history = [fm.cwd().hash];
			current = 0;
			update  = true;
		},
		/**
		 * Open prev/next folder
		 *
		 * @Boolen  open next folder?
		 * @return jQuery.Deferred
		 */
		go = function(fwd) {
			if ((fwd && self.canForward()) || (!fwd && self.canBack())) {
				update = false;
				return fm.exec('open', history[fwd ? ++current : --current]).fail(reset);
			}
			return $.Deferred().reject();
		};
	
	/**
	 * Return true if there is previous visited directories
	 *
	 * @return Boolen
	 */
	this.canBack = function() {
		return current > 0;
	}
	
	/**
	 * Return true if can go forward
	 *
	 * @return Boolen
	 */
	this.canForward = function() {
		return current < history.length - 1;
	}
	
	/**
	 * Go back
	 *
	 * @return void
	 */
	this.back = go;
	
	/**
	 * Go forward
	 *
	 * @return void
	 */
	this.forward = function() {
		return go(true);
	}
	
	// bind to elfinder events
	fm.open(function(e) {
		var l = history.length,
			cwd = fm.cwd().hash;

		if (update) {
			current >= 0 && l > current + 1 && history.splice(current+1);
			history[history.length-1] != cwd && history.push(cwd);
			current = history.length - 1;
		}
		update = true;
	})
	.reload(reset);
	
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.command.js
 */

/**
 * elFinder command prototype
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.command = function(fm) {

	/**
	 * elFinder instance
	 *
	 * @type  elFinder
	 */
	this.fm = fm;
	
	/**
	 * Command name, same as class name
	 *
	 * @type  String
	 */
	this.name = '';
	
	/**
	 * Short command description
	 *
	 * @type  String
	 */
	this.title = '';
	
	/**
	 * Current command state
	 *
	 * @example
	 * this.state = -1; // command disabled
	 * this.state = 0;  // command enabled
	 * this.state = 1;  // command active (for example "fullscreen" command while elfinder in fullscreen mode)
	 * @default -1
	 * @type  Number
	 */
	this.state = -1;
	
	/**
	 * If true, command can not be disabled by connector.
	 * @see this.update()
	 *
	 * @type  Boolen
	 */
	this.alwaysEnabled = false;
	
	/**
	 * If true, this means command was disabled by connector.
	 * @see this.update()
	 *
	 * @type  Boolen
	 */
	this._disabled = false;
	
	this.disableOnSearch = false;
	
	this.updateOnSelect = true;
	
	/**
	 * elFinder events defaults handlers.
	 * Inside handlers "this" is current command object
	 *
	 * @type  Object
	 */
	this._handlers = {
		enable  : function() { this.update(void(0), this.value); },
		disable : function() { this.update(-1, this.value); },
		'open reload load'    : function(e) { 
			this._disabled = !(this.alwaysEnabled || this.fm.isCommandEnabled(this.name));
			this.update(void(0), this.value)
			this.change(); 
		}
	};
	
	/**
	 * elFinder events handlers.
	 * Inside handlers "this" is current command object
	 *
	 * @type  Object
	 */
	this.handlers = {}
	
	/**
	 * Shortcuts
	 *
	 * @type  Array
	 */
	this.shortcuts = [];
	
	/**
	 * Command options
	 *
	 * @type  Object
	 */
	this.options = {ui : 'button'};
	
	/**
	 * Prepare object -
	 * bind events and shortcuts
	 *
	 * @return void
	 */
	this.setup = function(name, opts) {
		var self = this,
			fm   = this.fm, i, s;

		this.name      = name;
		this.title     = fm.messages['cmd'+name] ? fm.i18n('cmd'+name) : name, //  fm.i18n(fm.res('name', name) || this.name);
		this.options   = $.extend({}, this.options, opts);
		this.listeners = [];

		if (this.updateOnSelect) {
			this._handlers.select = function() { this.update(void(0), this.value); }
		}

		$.each($.extend({}, self._handlers, self.handlers), function(cmd, handler) {
			fm.bind(cmd, $.proxy(handler, self));
		});

		for (i = 0; i < this.shortcuts.length; i++) {
			s = this.shortcuts[i];
			s.callback = $.proxy(s.callback || function() { this.exec() }, this);
			!s.description && (s.description = this.title);
			fm.shortcut(s);
		}

		if (this.disableOnSearch) {
			fm.bind('search searchend', function(e) {
				self._disabled = e.type == 'search';
				self.update(void(0), self.value);
			});
		}

		this.init();
	}

	/**
	 * Command specific init stuffs
	 *
	 * @return void
	 */
	this.init = function() { }

	/**
	 * Exec command
	 *
	 * @param  Array         target files hashes
	 * @param  Array|Object  command value
	 * @return $.Deferred
	 */
	this.exec = function(files, opts) { 
		return $.Deferred().reject(); 
	}
	
	/**
	 * Return true if command disabled.
	 *
	 * @return Boolen
	 */
	this.disabled = function() {
		return this.state < 0;
	}
	
	/**
	 * Return true if command enabled.
	 *
	 * @return Boolen
	 */
	this.enabled = function() {
		return this.state > -1;
	}
	
	/**
	 * Return true if command active.
	 *
	 * @return Boolen
	 */
	this.active = function() {
		return this.state > 0;
	}
	
	/**
	 * Return current command state.
	 * Must be overloaded in most commands
	 *
	 * @return Number
	 */
	this.getstate = function() {
		return -1;
	}
	
	/**
	 * Update command state/value
	 * and rize 'change' event if smth changed
	 *
	 * @param  Number  new state or undefined to auto update state
	 * @param  mixed   new value
	 * @return void
	 */
	this.update = function(s, v) {
		var state = this.state,
			value = this.value;

		if (this._disabled) {
			this.state = -1;
		} else {
			this.state = s !== void(0) ? s : this.getstate();
		}

		this.value = v;
		
		if (state != this.state || value != this.value) {
			this.change();
		}
	}
	
	/**
	 * Bind handler / fire 'change' event.
	 *
	 * @param  Function|undefined  event callback
	 * @return void
	 */
	this.change = function(c) {
		var cmd, i;
		
		if (typeof(c) === 'function') {
			this.listeners.push(c);			
		} else {
			for (i = 0; i < this.listeners.length; i++) {
				cmd = this.listeners[i];
				try {
					cmd(this.state, this.value);
				} catch (e) {
					this.fm.debug('error', e)
				}
			}
		}
		return this;
	}
	

	/**
	 * With argument check given files hashes and return list of existed files hashes.
	 * Without argument return selected files hashes.
	 *
	 * @param  Array|String|void  hashes
	 * @return Array
	 */
	this.hashes = function(hashes) {
		return hashes
			? $.map($.isArray(hashes) ? hashes : [hashes], function(hash) { return fm.file(hash) ? hash : null; })
			: fm.selected();
	}
	
	/**
	 * Return only existed files from given fils hashes | selected files
	 *
	 * @param  Array|String|void  hashes
	 * @return Array
	 */
	this.files = function(hashes) {
		var fm = this.fm;
		
		return hashes
			? $.map($.isArray(hashes) ? hashes : [hashes], function(hash) { return fm.file(hash) || null })
			: fm.selectedFiles();
	}
}




/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/elFinder.resources.js
 */

/**
 * elFinder resources registry.
 * Store shared data
 *
 * @type Object
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.resources = {
	'class' : {
		hover       : 'ui-state-hover',
		active      : 'ui-state-active',
		disabled    : 'ui-state-disabled',
		draggable   : 'ui-draggable',
		droppable   : 'ui-droppable',
		adroppable  : 'elfinder-droppable-active',
		cwdfile     : 'elfinder-cwd-file',
		cwd         : 'elfinder-cwd',
		tree        : 'elfinder-tree',
		treeroot    : 'elfinder-navbar-root',
		navdir      : 'elfinder-navbar-dir',
		navdirwrap  : 'elfinder-navbar-dir-wrapper',
		navarrow    : 'elfinder-navbar-arrow',
		navsubtree  : 'elfinder-navbar-subtree',
		navcollapse : 'elfinder-navbar-collapsed',
		navexpand   : 'elfinder-navbar-expanded',
		treedir     : 'elfinder-tree-dir',
		placedir    : 'elfinder-place-dir',
		searchbtn   : 'elfinder-button-search'
	},
	tpl : {
		perms      : '<span class="elfinder-perms"/>',
		symlink    : '<span class="elfinder-symlink"/>',
		navicon    : '<span class="elfinder-nav-icon"/>',
		navspinner : '<span class="elfinder-navbar-spinner"/>',
		navdir     : '<div class="elfinder-navbar-wrapper"><span id="{id}" class="ui-corner-all elfinder-navbar-dir {cssclass}"><span class="elfinder-navbar-arrow"/><span class="elfinder-navbar-icon"/>{symlink}{permissions}{name}</span><div class="elfinder-navbar-subtree"/></div>'
		
	},
	
	mimes : {
		text : [
			'application/x-empty',
			'application/javascript', 
			'application/xhtml+xml', 
			'audio/x-mp3-playlist', 
			'application/x-web-config',
			'application/docbook+xml',
			'application/x-php',
			'application/x-perl',
			'application/x-awk',
			'application/x-config',
			'application/x-csh',
			'application/xml'
		]
	},
	
	mixin : {
		make : function() {
			var fm   = this.fm,
				cmd  = this.name,
				cwd  = fm.getUI('cwd'),
				dfrd = $.Deferred()
					.fail(function(error) {
						error && fm.error(error);
					})
					.always(function() {
						input.remove();
						node.remove();
						fm.enable();
					}),
				id    = 'tmp_'+parseInt(Math.random()*100000),
				phash = fm.cwd().hash,
				date = new Date(),
				file   = {
					hash  : id,
					name  : fm.uniqueName(this.prefix),
					mime  : this.mime,
					read  : true,
					write : true,
					date  : 'Today '+date.getHours()+':'+date.getMinutes()
				},
				node = cwd.trigger('create.'+fm.namespace, file).find('#'+id),
				input = $('<input type="text"/>')
					.keydown(function(e) {
						e.stopImmediatePropagation();

						if (e.keyCode == $.ui.keyCode.ESCAPE) {
							dfrd.reject();
						} else if (e.keyCode == $.ui.keyCode.ENTER) {
							input.blur();
						}
					})
					.mousedown(function(e) {
						e.stopPropagation();
					})
					.blur(function() {
						var name   = $.trim(input.val()),
							parent = input.parent();

						if (parent.length) {

							if (!name) {
								return dfrd.reject('errInvName');
							}
							if (fm.fileByName(name, phash)) {
								return dfrd.reject(['errExists', name]);
							}

							parent.html(fm.escape(name));

							fm.lockfiles({files : [id]});

							fm.request({
									data        : {cmd : cmd, name : name, target : phash}, 
									notify      : {type : cmd, cnt : 1},
									preventFail : true,
									syncOnFail  : true
								})
								.fail(function(error) {
									dfrd.reject(error);
								})
								.done(function(data) {
									dfrd.resolve(data);
								});
						}
					});


			if (!node.length) {
				return dfrd.reject();
			}

			fm.disable();
			node.find('.elfinder-cwd-filename').empty('').append(input.val(file.name));
			input.select().focus();

			return dfrd;



		}
		
	}
}



/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/jquery.dialogelfinder.js
 */

/**
 * @class dialogelfinder - open elFinder in dialog window
 *
 * @param  Object  elFinder options with dialog options
 * @example
 * $(selector).dialogelfinder({
 *     // some elfinder options
 *     title          : 'My files', // dialog title, default = "Files"
 *     width          : 850,        // dialog width, default 840
 *     autoOpen       : false,      // if false - dialog will not be opened after init, default = true
 *     destroyOnClose : true        // destroy elFinder on close dialog, default = false
 * })
 * @author Dmitry (dio) Levashov
 **/
$.fn.dialogelfinder = function(opts) {
	var position = 'elfinderPosition',
		destroy  = 'elfinderDestroyOnClose';
	
	this.not('.elfinder').each(function() {
		
		var doc     = $(document),
			toolbar = $('<div class="ui-widget-header dialogelfinder-drag ui-corner-top">'+(opts.title || 'Files')+'</div>'),
			button  = $('<a href="#" class="dialogelfinder-drag-close ui-corner-all"><span class="ui-icon ui-icon-closethick"/></a>')
				.appendTo(toolbar)
				.click(function(e) {
					e.preventDefault();
					
					node.dialogelfinder('close');
				}),
			node    = $(this).addClass('dialogelfinder')
				.css('position', 'absolute')
				.hide()
				.appendTo('body')
				.draggable({ handle : '.dialogelfinder-drag'})
				.elfinder(opts)
				.prepend(toolbar),
			elfinder = node.elfinder('instance');
		
		
		node.width(parseInt(node.width()) || 840) // fix width if set to "auto"
			.data(destroy, !!opts.destroyOnClose)
			.find('.elfinder-toolbar').removeClass('ui-corner-top');
		
		opts.position && node.data(position, opts.position);
		
		opts.autoOpen !== false && $(this).dialogelfinder('open');

	});
	
	if (opts == 'open') {
		var node = $(this),
			pos  = node.data(position) || {
				top  : parseInt(($(document).height() - node.height())/2 - 12),
				left : parseInt(($(document).width() - node.width())/2)
			},
			zindex = 100;
			
		if (node.is(':hidden')) {
			
			$('body').find(':visible').each(function() {
				var $this = $(this), z;
				
				if (this !== node[0] && $this.css('position') == 'absolute' && (z = parseInt($this.zIndex())) > zindex) {
					zindex = z + 1;
				}
			});

			node.zIndex(zindex).css(pos).show().trigger('resize')

			setTimeout(function() {
				// fix resize icon position and make elfinder active
				node.trigger('resize').mousedown();
			}, 200);
		}
	} else if (opts == 'close') {
		var node = $(this);
			
		if (node.is(':visible')) {
			!!node.data(destroy)
				? node.elfinder('destroy').remove()
				: node.elfinder('close');
		}
	}
	
	return this;
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/i18n/elfinder.en.js
 */

if (elFinder && elFinder.prototype && typeof(elFinder.prototype.i18) == 'object') {
	elFinder.prototype.i18.en = {
		translator : 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;',
		language   : 'English',
		direction  : 'ltr',
		messages   : {
			
			/********************************** errors **********************************/
			'error'                : 'Error',
			'errUnknown'           : 'Unknown error.',
			'errUnknownCmd'        : 'Unknown command.',
			'errJqui'              : 'Invalid jQuery UI configuration. Selectable, draggable and droppable components must be included.',
			'errNode'              : 'elFinder requires DOM Element to be created.',
			'errURL'               : 'Invalid elFinder configuration! URL option is not set.',
			'errAccess'            : 'Access denied.',
			'errConnect'           : 'Unable to connect to backend.',
			'errAbort'             : 'Connection aborted.',
			'errTimeout'           : 'Connection timeout.',
			'errNotFound'          : 'Backend not found.',
			'errResponse'          : 'Invalid backend response.',
			'errConf'              : 'Invalid backend configuration.',
			'errJSON'              : 'PHP JSON module not installed.',
			'errNoVolumes'         : 'Readable volumes not available.',
			'errCmdParams'         : 'Invalid parameters for command "$1".',
			'errDataNotJSON'       : 'Data is not JSON.',
			'errDataEmpty'         : 'Data is empty.',
			'errCmdReq'            : 'Backend request requires command name.',
			'errOpen'              : 'Unable to open "$1".',
			'errNotFolder'         : 'Object is not a folder.',
			'errNotFile'           : 'Object is not a file.',
			'errRead'              : 'Unable to read "$1".',
			'errWrite'             : 'Unable to write into "$1".',
			'errPerm'              : 'Permission denied.',
			'errLocked'            : '"$1" is locked and can not be renamed, moved or removed.',
			'errExists'            : 'File named "$1" already exists.',
			'errInvName'           : 'Invalid file name.',
			'errFolderNotFound'    : 'Folder not found.',
			'errFileNotFound'      : 'File not found.',
			'errTrgFolderNotFound' : 'Target folder "$1" not found.',
			'errPopup'             : 'Browser prevented opening popup window. To open file enable it in browser options.',
			'errMkdir'             : 'Unable to create folder "$1".',
			'errMkfile'            : 'Unable to create file "$1".',
			'errRename'            : 'Unable to rename "$1".',
			'errCopyFrom'          : 'Copying files from volume "$1" not allowed.',
			'errCopyTo'            : 'Copying files to volume "$1" not allowed.',
			'errUploadCommon'      : 'Upload error.',
			'errUpload'            : 'Unable to upload "$1".',
			'errUploadNoFiles'     : 'No files found for upload.',
			'errMaxSize'           : 'Data exceeds the maximum allowed size.',
			'errFileMaxSize'       : 'File exceeds maximum allowed size.',
			'errUploadMime'        : 'File type not allowed.',
			'errUploadTransfer'    : '"$1" transfer error.', 
			'errSave'              : 'Unable to save "$1".',
			'errCopy'              : 'Unable to copy "$1".',
			'errMove'              : 'Unable to move "$1".',
			'errCopyInItself'      : 'Unable to copy "$1" into itself.',
			'errRm'                : 'Unable to remove "$1".',
			'errExtract'           : 'Unable to extract files from "$1".',
			'errArchive'           : 'Unable to create archive.',
			'errArcType'           : 'Unsupported archive type.',
			'errNoArchive'         : 'File is not archive or has unsupported archive type.',
			'errCmdNoSupport'      : 'Backend does not support this command.',
			
			/******************************* commands names ********************************/
			'cmdarchive'   : 'Create archive',
			'cmdback'      : 'Back',
			'cmdcopy'      : 'Copy',
			'cmdcut'       : 'Cut',
			'cmddownload'  : 'Download',
			'cmdduplicate' : 'Duplicate',
			'cmdedit'      : 'Edit file',
			'cmdextract'   : 'Extract files from archive',
			'cmdforward'   : 'Forward',
			'cmdgetfile'   : 'Select files',
			'cmdhelp'      : 'About this software',
			'cmdhome'      : 'Home',
			'cmdinfo'      : 'Get info',
			'cmdmkdir'     : 'New folder',
			'cmdmkfile'    : 'New text file',
			'cmdopen'      : 'Open',
			'cmdpaste'     : 'Paste',
			'cmdquicklook' : 'Preview',
			'cmdreload'    : 'Reload',
			'cmdrename'    : 'Rename',
			'cmdrm'        : 'Delete',
			'cmdsearch'    : 'Find files',
			'cmdup'        : 'Go to parent directory',
			'cmdupload'    : 'Upload files',
			'cmdview'      : 'View',
			
			/*********************************** buttons ***********************************/ 
			'btnClose'  : 'Close',
			'btnSave'   : 'Save',
			'btnRm'     : 'Remove',
			'btnCancel' : 'Cancel',
			'btnNo'     : 'No',
			'btnYes'    : 'Yes',
			
			/******************************** notifications ********************************/
			'ntfopen'     : 'Open folder',
			'ntffile'     : 'Open file',
			'ntfreload'   : 'Reload folder content',
			'ntfmkdir'    : 'Creating directory',
			'ntfmkfile'   : 'Creating files',
			'ntfrm'       : 'Delete files',
			'ntfcopy'     : 'Copy files',
			'ntfmove'     : 'Move files',
			'ntfprepare'  : 'Prepare to copy files',
			'ntfrename'   : 'Rename files',
			'ntfupload'   : 'Uploading files',
			'ntfdownload' : 'Downloading files',
			'ntfsave'     : 'Save files',
			'ntfarchive'  : 'Creating archive',
			'ntfextract'  : 'Extracting files from archive',
			'ntfsearch'   : 'Searching files',
			'ntfsmth'     : 'Doing something >_<',
			
			/************************************ dates **********************************/
			'dateUnknown' : 'unknown',
			'Today'       : 'Today',
			'Yesterday'   : 'Yesterday',
			'Jan'         : 'Jan',
			'Feb'         : 'Feb',
			'Mar'         : 'Mar',
			'Apr'         : 'Apr',
			'May'         : 'May',
			'Jun'         : 'Jun',
			'Jul'         : 'Jul',
			'Aug'         : 'Aug',
			'Sep'         : 'Sep',
			'Oct'         : 'Oct',
			'Nov'         : 'Nov',
			'Dec'         : 'Dec',

			/********************************** messages **********************************/
			'confirmReq'      : 'Confirmation required',
			'confirmRm'       : 'Are you sure you want to remove files?<br/>This cannot be undone!',
			'confirmRepl'     : 'Replace old file with new one?',
			'apllyAll'        : 'Apply to all',
			'name'            : 'Name',
			'size'            : 'Size',
			'perms'           : 'Permissions',
			'modify'          : 'Modified',
			'kind'            : 'Kind',
			'read'            : 'read',
			'write'           : 'write',
			'noaccess'        : 'no access',
			'and'             : 'and',
			'unknown'         : 'unknown',
			'selectall'       : 'Select all files',
			'selectfiles'     : 'Select file(s)',
			'selectffile'     : 'Select first file',
			'selectlfile'     : 'Select last file',
			'viewlist'        : 'List view',
			'viewicons'       : 'Icons view',
			'places'          : 'Places',
			'calc'            : 'Calculate', 
			'path'            : 'Path',
			'aliasfor'        : 'Alias for',
			'locked'          : 'Locked',
			'dim'             : 'Dimensions',
			'files'           : 'Files',
			'folders'         : 'Folders',
			'items'           : 'Items',
			'yes'             : 'yes',
			'no'              : 'no',
			'link'            : 'Link',
			'searcresult'     : 'Search results',  
			'selected'        : 'selected items',
			'about'           : 'About',
			'shortcuts'       : 'Shortcuts',
			'help'            : 'Help',
			'webfm'           : 'Web file manager',
			'ver'             : 'Version',
			'protocol'        : 'protocol version',
			'homepage'        : 'Project home',
			'docs'            : 'Documentation',
			'github'          : 'Fork us on Github',
			'twitter'         : 'Follow us on twitter',
			'facebook'        : 'Join us on facebook',
			'team'            : 'Team',
			'chiefdev'        : 'chief developer',
			'developer'       : 'developer',
			'contributor'     : 'contributor',
			'maintainer'      : 'maintainer',
			'translator'      : 'translator',
			'icons'           : 'Icons',
			'dontforget'      : 'and don\'t forget to take your towel',
			'shortcutsof'     : 'Shortcuts disabled',
			'dropFiles'       : 'Drop files here',
			'or'              : 'or',
			'selectForUpload' : 'Select files to upload',
			'moveFiles'       : 'Move files',
			'copyFiles'       : 'Copy files',
			
			/********************************** mimetypes **********************************/
			'kindUnknown'     : 'Unknown',
			'kindFolder'      : 'Folder',
			'kindAlias'       : 'Alias',
			'kindAliasBroken' : 'Broken alias',
			// applications
			'kindApp'         : 'Application',
			'kindPostscript'  : 'Postscript document',
			'kindMsOffice'    : 'Microsoft Office document',
			'kindMsWord'      : 'Microsoft Word document',
			'kindMsExcel'     : 'Microsoft Excel document',
			'kindMsPP'        : 'Microsoft Powerpoint presentation',
			'kindOO'          : 'Open Office document',
			'kindAppFlash'    : 'Flash application',
			'kindPDF'         : 'Portable Document Format (PDF)',
			'kindTorrent'     : 'Bittorrent file',
			'kind7z'          : '7z archive',
			'kindTAR'         : 'TAR archive',
			'kindGZIP'        : 'GZIP archive',
			'kindBZIP'        : 'BZIP archive',
			'kindZIP'         : 'ZIP archive',
			'kindRAR'         : 'RAR archive',
			'kindJAR'         : 'Java JAR file',
			'kindTTF'         : 'True Type font',
			'kindOTF'         : 'Open Type font',
			'kindRPM'         : 'RPM package',
			// texts
			'kindText'        : 'Text document',
			'kindTextPlain'   : 'Plain text',
			'kindPHP'         : 'PHP source',
			'kindCSS'         : 'Cascading style sheet',
			'kindHTML'        : 'HTML document',
			'kindJS'          : 'Javascript source',
			'kindRTF'         : 'Rich Text Format',
			'kindC'           : 'C source',
			'kindCHeader'     : 'C header source',
			'kindCPP'         : 'C++ source',
			'kindCPPHeader'   : 'C++ header source',
			'kindShell'       : 'Unix shell script',
			'kindPython'      : 'Python source',
			'kindJava'        : 'Java source',
			'kindRuby'        : 'Ruby source',
			'kindPerl'        : 'Perl script',
			'kindSQL'         : 'SQL source',
			'kindXML'         : 'XML document',
			'kindAWK'         : 'AWK source',
			'kindCSV'         : 'Comma separated values',
			'kindDOCBOOK'     : 'Docbook XML document',
			// images
			'kindImage'       : 'Image',
			'kindBMP'         : 'BMP image',
			'kindJPEG'        : 'JPEG image',
			'kindGIF'         : 'GIF Image',
			'kindPNG'         : 'PNG Image',
			'kindTIFF'        : 'TIFF image',
			'kindTGA'         : 'TGA image',
			'kindPSD'         : 'Adobe Photoshop image',
			'kindXBITMAP'     : 'X bitmap image',
			'kindPXM'         : 'Pixelmator image',
			// media
			'kindAudio'       : 'Audio media',
			'kindAudioMPEG'   : 'MPEG audio',
			'kindAudioMPEG4'  : 'MPEG-4 audio',
			'kindAudioMIDI'   : 'MIDI audio',
			'kindAudioOGG'    : 'Ogg Vorbis audio',
			'kindAudioWAV'    : 'WAV audio',
			'AudioPlaylist'   : 'MP3 playlist',
			'kindVideo'       : 'Video media',
			'kindVideoDV'     : 'DV movie',
			'kindVideoMPEG'   : 'MPEG movie',
			'kindVideoMPEG4'  : 'MPEG-4 movie',
			'kindVideoAVI'    : 'AVI movie',
			'kindVideoMOV'    : 'Quick Time movie',
			'kindVideoWM'     : 'Windows Media movie',
			'kindVideoFlash'  : 'Flash movie',
			'kindVideoMKV'    : 'Matroska movie',
			'kindVideoOGG'    : 'Ogg movie'
		}
	}
}



/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/button.js
 */

/**
 * @class  elFinder toolbar button widget.
 * If command has variants - create menu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderbutton = function(cmd) {
	return this.each(function() {
		
		var c        = 'class',
			fm       = cmd.fm,
			disabled = fm.res(c, 'disabled'),
			active   = fm.res(c, 'active'),
			hover    = fm.res(c, 'hover'),
			item     = 'elfinder-button-menu-item',
			menu,
			button   = $(this).addClass('ui-state-default elfinder-button')
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+'"/>')
				.hover(function(e) { !button.is('.'+disabled) && button.toggleClass(hover); })
				.click(function(e) { 
					if (!button.is('.'+disabled)) {
						if (menu && cmd.variants.length > 1) {
							// close other menus
							menu.is(':hidden') && cmd.fm.getUI().click();
							e.stopPropagation();
							menu.slideToggle(100);
						} else {
							cmd.exec();
						}

					}
				}),
			hideMenu = function() {
				menu.hide();
			};
			
		// if command has variants create menu
		if ($.isArray(cmd.variants)) {
			button.addClass('elfinder-menubutton');
			
			menu = $('<div class="ui-widget ui-widget-content elfinder-button-menu ui-corner-all"/>')
				.hide()
				.appendTo(button)
				.zIndex(10+button.zIndex())
				.delegate('.'+item, 'hover', function() { $(this).toggleClass(hover) })
				.delegate('.'+item, 'click', function(e) {
					e.preventDefault();
					cmd.exec(cmd.fm.selected(), $(this).data('value'));
				});

			cmd.fm.bind('disable select', hideMenu).getUI().click(hideMenu);
			
			cmd.change(function() {
				menu.html('');
				$.each(cmd.variants, function(i, variant) {
					menu.append($('<div class="'+item+'">'+variant[1]+'</div>').data('value', variant[0]));
				});
			});
		}	
			
		cmd.change(function() {
			if (cmd.disabled()) {
				button.removeClass(active).addClass(disabled);
			} else {
				button.removeClass(disabled);
				button[cmd.active() ? 'addClass' : 'removeClass'](active);
			}
		})
		.change();
	});
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/contexmenu.js
 */

/**
 * @class  elFinder contextmenu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercontextmenu = function(fm) {
	
	return this.each(function() {
		var event        = $.browser.opera ? 'click' : 'contextmenu',
			c            = 'class',
			clItem       = 'elfinder-contextmenu-item',
			clGroup      = 'elfinder-contextmenu-group',
			clSub        = 'elfinder-contextmenu-sub',
			clHover      = fm.res(c, 'hover'),
			clDisabled   = fm.res(c, 'disabled'),
			clCwdFile    = fm.res(c, 'cwdfile'), 
			clNavdir     = fm.res(c, 'treedir'), 
			clNavDirWrap = fm.res(c, 'navdirwrap'), 
			subpos       = fm.direction == 'ltr' ? 'left' : 'right',
			menu = $(this).addClass('ui-helper-reset ui-widget ui-state-default ui-corner-all elfinder-contextmenu elfinder-contextmenu-'+fm.direction)
				.hide()
				.appendTo('body')
				.delegate('.'+clItem, 'hover', function() {
					var item = $(this).toggleClass(clHover);
					item.is('.'+clGroup) && item.children('.'+clSub).toggle()
					
				})
				.delegate('.'+clItem, 'click', function(e) {
					var item = $(this),
						data = item.data();

					e.preventDefault();
					e.stopPropagation();

					if (!item.is('.'+clGroup)) {
						data && data.cmd && fm.exec(data.cmd, menu.data('targets'), data.variant, true);
						close();
					}
				}),
			options = $.extend({navbar : [], cwd : []}, fm.options.contextmenu),
			/**
			 * Append items to menu
			 *
			 * @param String  menu type (navbar/cwd)
			 * @param Array   files ids list
			 * @return void
			 **/
			append = function(type, targets) {
				var commands = options[type], 
					sep = false;

				menu.text('').data('targets', targets);

				$.each(commands, function(i, name) {
					var cmd = fm.command(name),
						item, sub;

					if (!(cmd && cmd.name)) {
						if (name == '|' && sep) {
							menu.append('<div class="elfinder-contextmenu-separator"/>');
							sep = false;
						}
						return;
					}
					
					if (cmd.getstate(targets) == -1) {
						return;
					}
					
					item = $('<div class="'+clItem+'"><span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+' elfinder-contextmenu-icon"/><span>'+cmd.title+'</span></div>')
						.data({cmd : cmd.name});

					
					if (cmd.variants) {

						sub = $('<div class="ui-corner-all '+clSub+'"/>')
							.appendTo(item.addClass(clGroup).append('<span class="elfinder-contextmenu-arrow"/>'));
							
						$.each(cmd.variants, function(i, variant) {
							sub.append($('<div class="'+clItem+'"><span>'+variant[1]+'</span></div>')
								.data({cmd : cmd.name, variant : variant[0]}));
						});
					}
					
					menu.append(item);
					sep = true;
				});
			},
			/**
			 * Close menu and empty it
			 *
			 * @return void
			 **/
			close = function() {
				menu.hide().text('').removeData('targets');
			},
			/**
			 * Open menu in required position
			 *
			 * @param Number  left offset
			 * @param Number  top offset
			 * @return void
			 **/
			open = function(x, y) {
				var win        = $(window),
					width      = menu.outerWidth(),
					height     = menu.outerHeight(),
					wwidth     = win.width(),
					wheight    = win.height(),
					scrolltop  = win.scrollTop(),
					scrollleft = win.scrollLeft(),
					css        = {
						top  : (y + height  < wheight  ? y : y - height > 0 ? y - height : y) + scrolltop,
						left : (x + width < wwidth ? x : x - width) + scrollleft,
						'z-index' : 100 + fm.getUI('workzone').zIndex()
					};

				if (!menu.children().length) {
					return;
				}
				
				menu.css(css).show();
				
				css = {'z-index' : css['z-index']+10};
				css[subpos] = parseInt(menu.width());
				menu.find('.'+clSub).css(css);
			},
			cwd, nav;

		fm.one('load', function() {
			
			cwd = fm.getUI('cwd')
				.bind(event, function(e) {
					var target  = $(e.target),
						file    = target.closest('.'+clCwdFile),
						targets = [],
						type    = 'files';

					e.preventDefault();

					if (file.length) {
						// do not show menu on disabled files
						if (file.is('.'+clDisabled)) {
							return;
						}
						cwd.trigger('selectfile', file.attr('id'));
						targets = fm.selected();
					} else {
						cwd.trigger('unselectall');
						targets.push(fm.cwd().hash);
						type = 'cwd';
					}

					append(type, targets);
					open(e.clientX, e.clientY);
				});
			
			fm.getUI('navbar')
				.bind(event, function(e) {
					var target  = $(e.target),
						targets = [];


					e.preventDefault();
					if (target.is('.'+clNavdir+',.'+clNavDirWrap)) {
					

						target.is('.'+clNavDirWrap) && (target = target.children('.'+clNavdir));
						if (target.length) {
							targets.push(fm.navId2Hash(target.attr('id')))
							append('navbar', targets);
							open(e.clientX, e.clientY);
						}
					}
				});
			
			fm.bind('disable select', close).getUI().click(close);

		}).one('destroy', function() {
			menu.remove();
		});
		
	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/cwd.js
 */

/**
 * elFinder current working directory ui.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercwd = function(fm) {
	
	this.not('.elfinder-cwd').each(function() {
		// fm.time('cwdLoad');
		var 
			list = fm.storage('view') == 'list',

			undef = 'undefined',
			/**
			 * Select event full name
			 *
			 * @type String
			 **/
			evtSelect = 'select.'+fm.namespace,
			
			/**
			 * Unselect event full name
			 *
			 * @type String
			 **/
			evtUnselect = 'unselect.'+fm.namespace,
			
			/**
			 * Disable event full name
			 *
			 * @type String
			 **/
			evtDisable = 'disable.'+fm.namespace,
			
			/**
			 * Disable event full name
			 *
			 * @type String
			 **/
			evtEnable = 'enable.'+fm.namespace,
			
			c = 'class',
			/**
			 * File css class
			 *
			 * @type String
			 **/
			clFile       = fm.res(c, 'cwdfile'),
			
			/**
			 * Selected css class
			 *
			 * @type String
			 **/
			fileSelector = '.'+clFile,
			
			/**
			 * Selected css class
			 *
			 * @type String
			 **/
			clSelected = 'ui-selected',
			
			/**
			 * Disabled css class
			 *
			 * @type String
			 **/
			clDisabled = fm.res(c, 'disabled'),
			
			/**
			 * Draggable css class
			 *
			 * @type String
			 **/
			clDraggable = fm.res(c, 'draggable'),
			
			/**
			 * Droppable css class
			 *
			 * @type String
			 **/
			clDroppable = fm.res(c, 'droppable'),
			
			/**
			 * Hover css class
			 *
			 * @type String
			 **/
			clHover     = fm.res(c, 'hover'), 

			/**
			 * Hover css class
			 *
			 * @type String
			 **/
			clDropActive = fm.res(c, 'adroppable'),

			/**
			 * Css class for temporary nodes (for mkdir/mkfile) commands
			 *
			 * @type String
			 **/
			clTmp = clFile+'-tmp',

			/**
			 * Number of thumbnails to load in one request (new api only)
			 *
			 * @type Number
			 **/
			tmbNum = fm.options.loadTmbs > 0 ? fm.options.loadTmbs : 5,
			
			/**
			 * File templates
			 *
			 * @type Object
			 **/
			templates = {
				icon : '<div id="{hash}" class="'+clFile+' {permsclass} {dirclass} ui-corner-all"><div class="elfinder-cwd-file-wrapper ui-corner-all"><div class="elfinder-cwd-icon {mime} ui-corner-all" unselectable="on" {style}/>{marker}</div><div class="elfinder-cwd-filename" title="{name}">{name}</div></div>',
				row  : '<tr id="{hash}" class="'+clFile+' {permsclass} {dirclass}"><td><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon {mime}"/>{marker}<span class="elfinder-cwd-filename">{name}</span></div></td><td>{perms}</td><td>{date}</td><td>{size}</td><td>{kind}</td></tr>'
			},
			
			permsTpl = fm.res('tpl', 'perms'),
			
			symlinkTpl = fm.res('tpl', 'symlink'),
			
			/**
			 * Template placeholders replacement rules
			 *
			 * @type Object
			 **/
			replacement = {
				permsclass : function(f) {
					return fm.perms2class(f);
				},
				perms : function(f) {
					return fm.formatPermissions(f);
				},
				dirclass : function(f) {
					return f.mime == 'directory' ? 'directory' : '';
				},
				mime : function(f) {
					return fm.mime2class(f.mime);
				},
				size : function(f) {
					return fm.formatSize(f.size);
				},
				date : function(f) {
					return fm.formatDate(f.date);
				},
				kind : function(f) {
					return fm.mime2kind(f);
				},
				marker : function(f) {
					return (f.alias || f.mime == 'symlink-broken' ? symlinkTpl : '')+(!f.read || !f.write ? permsTpl : '');
				}
			},
			
			/**
			 * Return file html
			 *
			 * @param  Object  file info
			 * @return String
			 **/
			itemhtml = function(f) {
				f.name = fm.escape(f.name);
				return templates[list ? 'row' : 'icon']
						.replace(/\{([a-z]+)\}/g, function(s, e) { 
							return replacement[e] ? replacement[e](f) : (f[e] ? f[e] : ''); 
						});
			},
			
			/**
			 * Flag. Required for msie to avoid unselect files on dragstart
			 *
			 * @type Boolean
			 **/
			selectLock = false,
			
			/**
			 * Move selection to prev/next file
			 *
			 * @param String  move direction
			 * @param Boolean append to current selection
			 * @return void
			 * @rise select			
			 */
			select = function(keyCode, append) {
				var code     = $.ui.keyCode,
					prev     = keyCode == code.LEFT || keyCode == code.UP,
					sel      = cwd.find('[id].'+clSelected),
					selector = prev ? 'first' : 'last',
					s, n, sib, top, left;
					
				function sibling(n, direction) {
					return n[direction+'All']('[id]:not(.'+clDisabled+'):first');
				}
				
				if (sel.length) {
					s = sel.filter(prev ? ':first' : ':last');
					sib = sibling(s, prev ? 'prev' : 'next');
					
					if (!sib.length) {
						// there is no sibling on required side - do not move selection
						n = s;
					} else if (list || keyCode == code.LEFT || keyCode == code.RIGHT) {
						// find real prevoius file
						n = sib;
					} else {
						// find up/down side file in icons view
						top = s.position().top;
						left = s.position().left;

						n = s;
						if (prev) {
							do {
								n = n.prev('[id]');
							} while (n.length && !(n.position().top < top && n.position().left <= left));

							if (n.is('.'+clDisabled)) {
								n = sibling(n, 'next');
							}
						} else {
							do {
								n = n.next('[id]');
							} while (n.length && !(n.position().top > top && n.position().left >= left));
							
							if (n.is('.'+clDisabled)) {
								n = sibling(n, 'prev');
							}
							// there is row before last one - select last file
							if (!n.length) {
								sib = cwd.find('[id]:not(.'+clDisabled+'):last');
								if (sib.position().top > top) {
									n = sib;
								}
							}
						}
					}
					
				} else {
					// there are no selected file - select first/last one
					n = cwd.find('[id]:not(.'+clDisabled+'):'+(prev ? 'last' : 'first'))
				}
				
				if (n && n.length) {

					if (append) {
						// append new files to selected
						n = s.add(s[prev ? 'prevUntil' : 'nextUntil']('#'+n.attr('id'))).add(n);
					} else {
						// unselect selected files
						sel.trigger(evtUnselect);
					}
					// select file(s)
					n.trigger(evtSelect);
					// set its visible
					scrollToView(n.filter(prev ? ':first' : ':last'));
					// update cache/view
					trigger();
				}
			},
			
			selectFile = function(hash) {
				cwd.find('#'+hash).trigger(evtSelect);
			},
			
			/**
			 * Unselect all files
			 *
			 * @return void
			 */
			unselectAll = function() {
				cwd.find('[id].'+clSelected).trigger(evtUnselect); 
			},
			
			/**
			 * Return selected files hashes list
			 *
			 * @return Array
			 */
			selected = function() {
				return $.map(cwd.find('[id].'+clSelected), function(n) {
					n = $(n);
					return n.is('.'+clDisabled) ? null : $(n).attr('id');
				});
			},
			
			/**
			 * Fire elfinder "select" event and pass selected files to it
			 *
			 * @return void
			 */
			trigger = function() {
				fm.trigger('select', {selected : selected()});
			},
			
			/**
			 * Scroll file to set it visible
			 *
			 * @param DOMElement  file/dir node
			 * @return void
			 */
			scrollToView = function(o) {
				var t  = o.position().top,
					h  = o.outerHeight(true),
					ph = cwd.innerHeight(),
					st = cwd.scrollTop();

				if (t < 0) {
					cwd.scrollTop(Math.ceil(t + st) - 9);
				} else if (t + h > ph) {
					cwd.scrollTop(Math.ceil(t + h - ph + st));
				}
			},
			
			/**
			 * Files we get from server but not show yet
			 *
			 * @type Array
			 **/
			buffer = [],
			
			/**
			 * Return index of elements with required hash in buffer 
			 *
			 * @param String  file hash
			 * @return Number
			 */
			index = function(hash) {
				var l = buffer.length;
				
				while (l--) {
					if (buffer[l].hash == hash) {
						return l;
					}
				}
				return -1;
			},
			
			/**
			 * Scroll event name
			 *
			 * @type String
			 **/
			scrollEvent = 'scroll.'+fm.namespace,

			/**
			 * Cwd scroll event handler.
			 * Lazy load - append to cwd not shown files
			 *
			 * @return void
			 */
			render = function() {
				var html  = [],  
					dirs  = false, 
					ltmb  = [],
					atmb  = {},
					last  = cwd.find('[id]:last'),
					top   = !last.length,
					place = list ? cwd.children('table').children('tbody') : cwd,
					files;

				if (!buffer.length) {
					return cwd.unbind(scrollEvent);
				}

				while ((!last.length || cwd.innerHeight() - last.position().top + fm.options.showThreshold > 0) 
					&& (files = buffer.splice(0, fm.options.showFiles)).length) {
					
					html = $.map(files, function(f) {
						if (f.hash && f.name) {
							if (f.mime == 'directory') {
								dirs = true;
							}
							if (f.tmb) {
								f.tmb === 1 ? ltmb.push(f.hash) : (atmb[f.hash] = f.tmb)
							} 
							return itemhtml(f);
						}
						return null;
					});

					place.append(html.join(''));
					last = cwd.find('[id]:last');
					// scroll top on dir load to avoid scroll after page reload
					top && cwd.scrollTop(0);
					
				}

				// load/attach thumbnails
				attachThumbnails(atmb);
				ltmb.length && loadThumbnails(ltmb);

				// make directory droppable
				dirs && makeDroppable();
				
			},
			
			/**
			 * Droppable options for cwd.
			 * Do not add class on childs file over
			 *
			 * @type Object
			 */
			droppable = $.extend({}, fm.droppable, {
				over : function(e, ui) { 
					var hash = fm.cwd().hash;

					$.each(ui.helper.data('files'), function(i, h) {
						if (fm.file(h).phash == hash) {
							cwd.removeClass(clDropActive);
							return false;
						}
					})
				}
			}),
			
			/**
			 * Make directory droppable
			 *
			 * @return void
			 */
			makeDroppable = function() {
				setTimeout(function() {
					cwd.find('.directory:not(.'+clDroppable+',.elfinder-na,.elfinder-ro)').droppable(fm.droppable);
				}, 20);
			},
			
			/**
			 * Preload required thumbnails and on load add css to files.
			 * Return false if required file is not visible yet (in buffer) -
			 * required for old api to stop loading thumbnails.
			 *
			 * @param  Object  file hash -> thumbnail map
			 * @return Boolean
			 */
			attachThumbnails = function(images) {
				var url = fm.option('tmbUrl'),
					ret = true, 
					ndx;
				
				$.each(images, function(hash, tmb) {
					var node = cwd.find('#'+hash);

					if (node.length) {

						(function(node, tmb) {
							$('<img/>')
								.load(function() { node.find('.elfinder-cwd-icon').css('background', "url('"+tmb+"') center center no-repeat"); })
								.attr('src', tmb);
						})(node, url+tmb);
					} else {
						ret = false;
						if ((ndx = index(hash)) != -1) {
							buffer[ndx].tmb = tmb;
						}
					}
				});
				return ret;
			},
			
			/**
			 * Load thumbnails from backend.
			 *
			 * @param  Array|Boolean  files hashes list for new api | true for old api
			 * @return void
			 */
			loadThumbnails = function(files) {
				var tmbs = [];
				
				if (fm.oldAPI) {
					fm.request({
						data : {cmd : 'tmb', current : fm.cwd().hash},
						preventFail : true
						})
						.done(function(data) {
							if (attachThumbnails(data.images||[]) && data.tmb) {
								loadThumbnails();
							}
						})
					return;
				} 

				tmbs = tmbs = files.splice(0, tmbNum);
				if (tmbs.length) {
					fm.request({
						data : {cmd : 'tmb', targets : tmbs},
						preventFail : true
					})
					.done(function(data) {
						if (attachThumbnails(data.images||[])) {
							loadThumbnails(files);
						}
					});
				}
			},
			
			/**
			 * Add new files to cwd/buffer
			 *
			 * @param  Array  new files
			 * @return void
			 */
			add = function(files) {
				var place    = list ? cwd.find('tbody') : cwd,
					l        = files.length, 
					ltmb     = [],
					atmb     = {},
					dirs     = false,
					findNode = function(file) {
						var pointer = cwd.find('[id]:first'), file2;
					
						while (pointer.length) {
							file2 = fm.file(pointer.attr('id'));
							if (file2 && fm.compare(file, file2) < 0) {
								return pointer;
							}
							pointer = pointer.next('[id]');
						}
					},
					findIndex = function(file) {
						var l = buffer.length, i;
						
						for (i =0; i < l; i++) {
							if (fm.compare(file, buffer[i]) < 0) {
								return i;
							}
						}
						return l || -1;
					},
					file, hash, node, ndx;

				
				while (l--) {
					file = files[l];
					hash = file.hash;
					
					if (cwd.find('#'+hash).length) {
						continue;
					}
					
					if ((node = findNode(file)) && node.length) {
						node.before(itemhtml(file));
					} else if ((ndx = findIndex(file)) >= 0) {
						buffer.splice(ndx, 0, file);
					} else {
						place.append(itemhtml(file));
					}
					
					if (cwd.find('#'+hash).length) {
						if (file.mime == 'directory') {
							dirs = true;
						} else if (file.tmb) {
							file.tmb === 1 ? ltmb.push(hash) : (atmb[hash] = file.tmb);
						}
					}
				}
				
				attachThumbnails(atmb);
				ltmb.length && loadThumbnails(ltmb);
				dirs && makeDroppable();
			},
			
			/**
			 * Remove files from cwd/buffer
			 *
			 * @param  Array  files hashes
			 * @return void
			 */
			remove = function(files) {
				var l = files.length, hash, n, ndx;
				
				while (l--) {
					hash = files[l];
					if ((n = cwd.find('#'+hash)).length) {
						try {
							n.detach();
						} catch(e) {
							fm.debug('error', e);
						}
					} else if ((ndx = index(hash)) != -1) {
						buffer.splice(ndx, 1);
					}
				}
			},
			
			msg = {
				name : fm.i18n('name'),
				perm : fm.i18n('perms'),
				mod  : fm.i18n('modify'),
				size : fm.i18n('size'),
				kind : fm.i18n('kind')
			},
			/**
			 * Update directory content
			 *
			 * @param  Array  files
			 * @return void
			 */
			content = function(files, any) {
				var phash = fm.cwd().hash; 
			
				try {
					// to avoid problem with draggable
					cwd.children('table,'+fileSelector).remove().end();
				} catch (e) {
					cwd.html('');
				}

				cwd.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
					.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'));

				list && cwd.html('<table><thead><tr class="ui-state-default"><td >'+msg.name+'</td><td>'+msg.perm+'</td><td>'+msg.mod+'</td><td>'+msg.size+'</td><td>'+msg.kind+'</td></tr></thead><tbody/></table>');
		
				buffer = $.map(files, function(f) { return any || f.phash == phash ? f : null; });
				
				buffer = fm.sortFiles(buffer);
		
				cwd.bind(scrollEvent, render).trigger(scrollEvent);
		
				trigger();
			},
			
			/**
			 * CWD node itself
			 *
			 * @type JQuery
			 **/
			cwd = $(this)
				.addClass('elfinder-cwd')
				.attr('unselectable', 'on')
				// fix ui.selectable bugs and add shift+click support 
				.delegate(fileSelector, 'click.'+fm.namespace, function(e) {
					var p    = this.id ? $(this) : $(this).parents('[id]:first'), 
						prev = p.prevAll('.'+clSelected+':first'),
						next = p.nextAll('.'+clSelected+':first'),
						pl   = prev.length,
						nl   = next.length,
						sib;

					e.stopImmediatePropagation();

					if (e.shiftKey && (pl || nl)) {
						sib = pl ? p.prevUntil('#'+prev.attr('id')) : p.nextUntil('#'+next.attr('id'));
						sib.add(p).trigger(evtSelect);
					} else if (e.ctrlKey || e.metaKey) {
						p.trigger(p.is('.'+clSelected) ? evtUnselect : evtSelect);
					} else {
						cwd.find('[id].'+clSelected).trigger(evtUnselect);
						p.trigger(evtSelect);
					}

					trigger();
				})
				// call fm.open()
				.delegate(fileSelector, 'dblclick.'+fm.namespace, function(e) {
					fm.dblclick({file : this.id});
				})
				// attach draggable
				.delegate(fileSelector, 'mouseenter.'+fm.namespace, function(e) {
					var $this = $(this),
						target = list ? $this : $this.children();

					if (!$this.is('.'+clTmp) && !target.is('.'+clDraggable+',.'+clDisabled)) {
						target.draggable(fm.draggable);
					}
				})
				// add css class and disable cwd droppable
				.delegate(fileSelector, 'dropover', function(e, ui) {
					var target = $(this);
					
					e.preventDefault();
					e.stopImmediatePropagation();
					
					cwd.droppable('disable').removeClass(clDisabled+' '+clDropActive);
					if ($.inArray(target.attr('id'), ui.helper.data('files')) === -1) {
						target.children().addClass(clHover);
					} else {
						target.removeClass(clDropActive);
					}
				})
				// remove css class and restore cwd droppable
				.delegate(fileSelector, 'dropout drop', function(e) {
					var target = $(this);
					
					e.preventDefault();
					e.stopImmediatePropagation();
					cwd.droppable('enable').trigger('dropover');
					
					target.removeClass(clDropActive)
					if (!target.is('.'+clSelected)) {
						target.children().removeClass(clHover);
					}
				})
				// add hover class to selected file
				.delegate(fileSelector, evtSelect, function(e) {
					var $this = $(this);
					!selectLock && !$this.is('.'+clDisabled) && $this.addClass(clSelected).children().addClass(clHover);
				})
				// remove hover class from unselected file
				.delegate(fileSelector, evtUnselect, function(e) {
					!selectLock && $(this).removeClass(clSelected).children().removeClass(clHover);
				})
				// disable files wich removing or moving
				.delegate(fileSelector, evtDisable, function() {
					var $this  = $(this).removeClass(clSelected).addClass(clDisabled), 
						target = (list ? $this : $this.children()).removeClass(clHover);
					
					$this.is('.'+clDroppable) && $this.droppable('disable');
					target.is('.'+clDraggable) && target.draggable('disable');
					!list && target.removeClass(clDisabled);
				})
				// if any files was not removed/moved - unlock its
				.delegate(fileSelector, evtEnable, function() {
					var $this  = $(this).removeClass(clDisabled), 
						target = list ? $this : $this.children();
					
					$this.is('.'+clDroppable) && $this.droppable('enable');	
					target.is('.'+clDraggable) && target.draggable('enable');
				})
				.delegate(fileSelector, 'scrolltoview', function() {
					scrollToView($(this))
				})
				// make files selectable
				.selectable({
					filter     : fileSelector,
					stop       : trigger,
					selected   : function(e, ui) { $(ui.selected).trigger(evtSelect); },
					unselected : function(e, ui) { $(ui.unselected).trigger(evtUnselect); }
				})
				// make cwd itself droppable for folders from nav panel
				.droppable(droppable)
				// prepend fake file/dir
				.bind('create.'+fm.namespace, function(e, file) {
					var parent = list ? cwd.find('tbody') : cwd;
					cwd.trigger('unselectall');
					parent.prepend($(itemhtml(file)).addClass(clTmp));
					cwd.scrollTop(0)
				})
				// unselect all selected files
				.bind('unselectall', function() {
					cwd.find('[id].'+clSelected+'').trigger(evtUnselect); 
					trigger();
				})
				.bind('selectfile', function(e, id) {
					cwd.find('#'+id).trigger(evtSelect);
					trigger();
				}),
				// elfinder node
				parent = $(this).parent().resize(function() {
					var h = 0;
					
					cwd.siblings('.elfinder-panel:visible').each(function() {
						h += $(this).outerHeight(true)
					});

					cwd.height(wz.height() - delta - h);
				}),
				// workzone node
				wz = parent.children('.elfinder-workzone').append(this),
				// outerHeight and height difference
				delta = cwd.outerHeight(true) - cwd.height()
				;
		

		if (fm.dragUpload) {
			cwd[0].addEventListener('dragenter', function(e) {
				e.preventDefault();
				e.stopPropagation();
				cwd.addClass(clDropActive);
			}, false);

			cwd[0].addEventListener('dragleave', function(e) {
				e.preventDefault();
				e.stopPropagation();
				cwd.removeClass(clDropActive)
			}, false);

			cwd[0].addEventListener('dragover', function(e) {
				e.preventDefault();
				e.stopPropagation();
			}, false);

			cwd[0].addEventListener('drop', function(e) {
			  	e.preventDefault();
				cwd.removeClass(clDropActive);
				// fm.log(e.dataTransfer.files)
				e.dataTransfer && e.dataTransfer.files &&  e.dataTransfer.files.length && fm.upload({files : e.dataTransfer.files});
			}, false);
		}

		fm
			.bind('open search', function(e) {
				content(e.data.files, e.type=='search');
			})
			.searchend(function() {
				content(fm.files());
			})
			.bind('viewchange', function() {
				var sel = fm.selected(),
					l = fm.storage('view') == 'list';
				
				if (l != list) {
					list = l;
					content(fm.files());

					$.each(sel, function(i, h) {
						selectFile(h);
					});
					trigger();
				}
				// delta = cwd.outerHeight(true) - cwd.height()
				// fm.storage('view', (list = !list) ? 'list' : 'icons');
				
			})
			.add(function(e) {
				var phash = fm.cwd().hash;

				add($.map(e.data.added || [], function(f) { return f.phash == phash ? f : null; }));
			})
			.change(function(e) {
				var phash = fm.cwd().hash,
					sel   = fm.selected();

				$.each($.map(e.data.changed || [], function(f) { return f.phash == phash ? f : null; }), function(i, file) {
					remove([file.hash]);
					add([file]);
					$.inArray(file.hash, sel) !== -1 && selectFile(file.hash);
				})
				trigger();
			})
			.remove(function(e) {
				remove(e.data.removed || []);
				trigger();
			})
			// select dragged file if no selected, disable selectable
			.dragstart(function(e) {
				var target = $(e.data.target),
					oe     = e.data.originalEvent;

				if (target.is(fileSelector)) {
					
					if (!target.is('.'+clSelected)) {
						!(oe.ctrlKey || oe.metaKey || oe.shiftKey) && unselectAll();
						target.trigger(evtSelect);
						trigger();
					}
					cwd.droppable('disable');
				}
				
				cwd.selectable('disable').removeClass(clDisabled);
				selectLock = true;
			})
			// enable selectable
			.dragstop(function() {
				cwd.selectable('enable');
				selectLock = false;
			})
			.bind('lockfiles unlockfiles', function(e) {
				var event = e.type == 'lockfiles' ? evtDisable : evtEnable,
					files = e.data.files || [], 
					l     = files.length;
				
				while (l--) {
					cwd.find('#'+files[l]).trigger(event);
				}
				trigger();
			})
			// select new files after some actions
			.bind('mkdir mkfile duplicate upload rename archive', function(e) {
				var phash = fm.cwd().hash, files;
				
				cwd.trigger('unselectall');

				$.each(e.data.added || [], function(i, file) { 
					file && file.phash == phash && selectFile(file.hash);
				});
				trigger();
			})
			.shortcut({
				pattern     :'ctrl+a', 
				description : 'selectall',
				callback    : function() { 
					cwd.find('[id]:not(.'+clSelected+')').trigger(evtSelect); 
					trigger();
				}
			})
			.shortcut({
				pattern     : 'left right up down shift+left shift+right shift+up shift+down',
				description : 'selectfiles',
				type        : 'keydown' , //$.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown',
				callback    : function(e) { select(e.keyCode, e.shiftKey); }
			})
			.shortcut({
				pattern     : 'home',
				description : 'selectffile',
				callback    : function(e) { 
					unselectAll();
					cwd.find('[id]:first').trigger(evtSelect) ;
					trigger();
				}
			})
			.shortcut({
				pattern     : 'end',
				description : 'selectlfile',
				callback    : function(e) { 
					unselectAll();
					cwd.find('[id]:last').trigger(evtSelect) ;
					trigger();
				}
			});
		
	});
	
	// fm.timeEnd('cwdLoad')
	
	return this;
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/dialog.js
 */

/**
 * @class  elFinder dialog
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderdialog = function(opts) {
	var dialog;
	
	if (typeof(opts) == 'string' && (dialog = this.closest('.ui-dialog')).length) {
		if (opts == 'open' && dialog.is(':hidden')) {
			dialog.fadeIn(150, function() {
				dialog.trigger('open');
			});
		} else if (opts == 'close' && dialog.is(':visible')) {
			dialog.hide().trigger('close');
		} else if (opts == 'destroy') {
			dialog.hide().remove();
		}
	}
	
	opts = $.extend({}, $.fn.elfinderdialog.defaults, opts);

	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			parent     = self.parent(),
			clactive   = 'elfinder-dialog-active',
			cldialog   = 'elfinder-dialog',
			clnotify   = 'elfinder-dialog-notify',
			clhover    = 'ui-state-hover',
			id         = parseInt(Math.random()*1000000),
			overlay    = parent.children('.elfinder-overlay'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"/>')
				.append(buttonset),
			
			dialog = $('<div class="ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable std42-dialog  '+cldialog+' '+opts.cssClass+'"/>')
				.hide()
				.append(self)
				.appendTo(parent)
				.draggable({ handle : '.ui-dialog-titlebar'})
				.css({
					width  : opts.width,
					height : opts.height
				})
				.mousedown(function(e) {
					e.stopPropagation()
					$(document).mousedown();

					if (!dialog.is('.'+clactive)) {
						parent.find('.'+cldialog+':visible').removeClass(clactive);
						dialog.addClass(clactive).zIndex(maxZIndex() + 1);
					}
				})
				.bind('open', function() {
					opts.modal && overlay.elfinderoverlay('show');
					dialog.mousedown().find('.ui-button:first').focus();
					dialog.find(':text:first').focus();
					typeof(opts.open) == 'function' && $.proxy(opts.open, self[0])();

					if (!dialog.is('.'+clnotify)) {
						
						parent.find('.'+cldialog+':visible').not('.'+clnotify).each(function() {
							var d     = $(this),
								top   = parseInt(d.css('top')),
								left  = parseInt(d.css('left')),
								_top  = parseInt(dialog.css('top')),
								_left = parseInt(dialog.css('left'))
								;

							if (d[0] != dialog[0] && (top >= _top || left >= _left)) {
								dialog.css({
									top  : (top+10)+'px',
									left : (left+10)+'px'
								});
							}
						});
					} 
				})
				.bind('close', function() {
					var dialogs = parent.find('.elfinder-dialog:visible'),
						z = maxZIndex();
					
					opts.modal && overlay.elfinderoverlay('hide');
					
					// get focus to next dialog
					if (dialogs.length) {
						dialogs.each(function() {
							var d = $(this);
							if (d.zIndex() >= z) {
								d.mousedown();
								return false;
							}
						})
					} else {
						// return focus to parent
						parent.mousedown();
					}
					
					if (typeof(opts.close) == 'function') {
						$.proxy(opts.close, self[0])();
					} else if (opts.destroyOnClose) {
						dialog.hide().remove();
					}
				}),
				maxZIndex = function() {
					var z = parent.zIndex() + 10;
					parent.find('.'+cldialog+':visible').each(function() {
						var _z;
						if (this != dialog[0]) {
							_z = $(this).zIndex();
							if (_z > z) {
								z = _z;
							}
						}
					})
					return z;
				},
				top
			;
		
		if (!opts.position) {
			top = parseInt((parent.height() - dialog.outerHeight())/2 - 42);
			opts.position = {
				top  : (top > 0 ? top : 0)+'px',
				left : parseInt((parent.width() - dialog.outerWidth())/2)+'px'
			}
		} 
			
		dialog.css(opts.position);

		if (opts.closeOnEscape) {
			$(document).bind('keyup.'+id, function(e) {
				if (e.keyCode == $.ui.keyCode.ESCAPE && dialog.is('.'+clactive)) {
					self.elfinderdialog('close');
					$(document).unbind('keyup.'+id);
				}
			})
		}
		dialog.prepend(
			$('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">'+opts.title+'</div>')
				.prepend($('<a href="#" class="ui-dialog-titlebar-close ui-corner-all"><span class="ui-icon ui-icon-closethick"/></a>')
					.mousedown(function(e) {
						e.preventDefault();
						self.elfinderdialog('close');
					}))

		);
			
		
			
		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+name+'</span></button>')
				.click($.proxy(cb, self[0]))
				.hover(function(e) { $(this)[e.type == 'mouseenter' ? 'focus' : 'blur']() })
				.focus(function() { $(this).addClass(clhover) })
				.blur(function() { $(this).removeClass(clhover) })
				.keydown(function(e) { 
					var next;
					
					if (e.keyCode == $.ui.keyCode.ENTER) {
						$(this).click();
					}  else if (e.keyCode == $.ui.keyCode.TAB) {
						next = $(this).next('.ui-button');
						next.length ? next.focus() : $(this).parent().children('.ui-button:first').focus()
					}
				})
			buttonset.append(button);
		})
			
		buttonset.children().length && dialog.append(buttonpane);
			
		if (opts.resizable && $.fn.resizable) {
			dialog.resizable({
					minWidth   : opts.minWidth,
					minHeight  : opts.minHeight,
					alsoResize : this
				});
		} 
			
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
			
		opts.autoOpen && self.elfinderdialog('open');

	});
	
	return this;
}

$.fn.elfinderdialog.defaults = {
	cssClass  : '',
	title     : '',
	modal     : false,
	resizable : true,
	autoOpen  : true,
	closeOnEscape : true,
	buttons   : {},
	position  : null,
	width     : 300,
	height    : 'auto',
	minWidth  : 200,
	minHeight : 110
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/navbar.js
 */

/**
 * @class elfindernav - elFinder container for diretories tree and places
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindernavbar = function(fm) {
	
	this.not('.elfinder-navbar').each(function() {
		var nav    = $(this).addClass('ui-state-default elfinder-navbar'),
			parent = nav.parent()
				.resize(function() {
					nav.height(wz.height() - delta);
				}),
			wz     = parent.children('.elfinder-workzone').append(nav),
			delta  = nav.outerHeight() - nav.height(),
			ltr    = fm.direction == 'ltr',
			handle;

		
		if ($.fn.resizable) {
			handle = nav.resizable({handles : ltr ? 'e' : 'w'})
				.scroll(function() {
					handle.css('top', parseInt(nav.scrollTop())+'px');
				})
				
				.find('.ui-resizable-handle').zIndex(nav.zIndex() + 10);

			if (!ltr) {
				nav.resize(function() {
					nav.css('left', null).css('right', 0);
				})
			}

			fm.one('open', function() {
				setTimeout(function() {
					parent.trigger('resize');
				}, 100);
			});
		}
	});
	
	return this;
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/overlay.js
 */


$.fn.elfinderoverlay = function(opts) {
	
	this.filter(':not(.elfinder-overlay)').each(function() {
		opts = $.extend({}, opts);
		$(this).addClass('ui-widget-overlay elfinder-overlay')
			.hide()
			.mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
			})
			.data({
				cnt  : 0,
				show : typeof(opts.show) == 'function' ? opts.show : function() { },
				hide : typeof(opts.hide) == 'function' ? opts.hide : function() { }
			});
	});
	
	if (opts == 'show') {
		var o    = this.eq(0),
			cnt  = o.data('cnt') + 1,
			show = o.data('show');

		o.data('cnt', cnt);

		if (o.is(':hidden')) {
			o.zIndex(o.parent().zIndex()+1);
			o.show();
			show();
		}
	} 
	
	if (opts == 'hide') {
		var o    = this.eq(0),
			cnt  = o.data('cnt') - 1,
			hide = o.data('hide');
		
		o.data('cnt', cnt);
			
		if (cnt == 0 && o.is(':visible')) {
			o.hide();
			hide();        
		}
	}
	
	return this;
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/panel.js
 */

$.fn.elfinderpanel = function(fm) {
	
	return this.each(function() {
		var panel = $(this).addClass('elfinder-panel ui-state-default ui-corner-all'),
			margin = 'margin-'+(fm.direction == 'ltr' ? 'left' : 'right');
		
		fm.one('load', function(e) {
			var navbar = fm.getUI('navbar');
			
			panel.css(margin, parseInt(navbar.outerWidth(true)));
			navbar.bind('resize', function() {
				panel.is(':visible') && panel.css(margin, parseInt(navbar.outerWidth(true)))
			})
		})
	})
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/path.js
 */

/**
 * @class elFinder ui
 * Display current folder path in statusbar.
 * Click on folder name in path - open folder
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderpath = function(fm) {
	return this.each(function() {
		var path = $(this).addClass('elfinder-path').html('&nbsp;')
				.delegate('a', 'click', function(e) {
					var hash = $(this).attr('href').substr(1);

					e.preventDefault();
					hash != fm.cwd().hash && fm.exec('open', hash);
				})
				.prependTo(fm.getUI('statusbar').show())

			fm.bind('open searchend', function() {
				var dirs = [];

				$.each(fm.parents(fm.cwd().hash), function(i, hash) {
					dirs.push('<a href="#'+hash+'">'+fm.escape(fm.file(hash).name)+'</a>');
				});

				path.html(dirs.join(fm.option('separator')));
			})
			.bind('search', function() {
				path.html(fm.i18n('searcresult'));
			});
	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/places.js
 */

/**
 * @class elFinder places/favorites ui
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderplaces = function(fm, opts) {
	return this.each(function() {
		var dirs      = [],
			c         = 'class',
			navdir    = fm.res(c, 'navdir'),
			collapsed = fm.res(c, 'navcollapse'),
			expanded  = fm.res(c, 'navexpand'),
			hover     = fm.res(c, 'hover'),
			tpl       = fm.res('tpl', 'navdir'),
			ptpl      = fm.res('tpl', 'perms'),
			spinner   = $(fm.res('tpl', 'navspinner')),
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			id2hash   = function(id) { return id.substr(6);	},
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			hash2id   = function(hash) { return 'place-'+hash; },
			
			/**
			 * Save current places state
			 *
			 * @return void
			 **/
			save      = function() { fm.storage('places', dirs.join(',')); },
			/**
			 * Return node for given dir object
			 *
			 * @param  Object  directory object
			 * @return jQuery
			 **/
			create    = function(dir) {
				return $(tpl.replace(/\{id\}/, hash2id(dir.hash))
						.replace(/\{name\}/, fm.escape(dir.name))
						.replace(/\{cssclass\}/, fm.perms2class(dir))
						.replace(/\{permissions\}/, !dir.read || !dir.write ? ptpl : '')
						.replace(/\{symlink\}/, ''));
			},
			/**
			 * Add new node into places
			 *
			 * @param  Object  directory object
			 * @return void
			 **/
			add = function(dir) {
				var node = create(dir);

				if (subtree.children().length) {
					$.each(subtree.children(), function() {
						var current =  $(this);
						
						if (dir.name.localeCompare(current.children('.'+navdir).text()) < 0) {
							return !node.insertBefore(current);
						}
					});
				} 
				
				dirs.push(dir.hash);
				!node.parent().length && subtree.append(node);
				root.addClass(collapsed);
				node.draggable({
					appendTo : 'body',
					revert   : false,
					helper   : function() {
						var dir = $(this);
							
						dir.children().removeClass('ui-state-hover');
						
						return $('<div class="elfinder-place-drag elfinder-'+fm.direction+'"/>')
								.append(dir.clone())
								.data('hash', id2hash(dir.children(':first').attr('id')));

					},
					start    : function() { $(this).hide(); },
					stop     : function(e, ui) {
						var top    = places.offset().top,
							left   = places.offset().left,
							width  = places.width(),
							height = places.height(),
							x      = e.clientX,
							y      = e.clientY;
						
						if (x > left && x < left+width && y > top && y < y+height) {
							$(this).show();
						} else {
							remove(ui.helper.data('hash'));
							save();
						}
					}
				});
			}, 
			/**
			 * Remove dir from places
			 *
			 * @param  String  directory id
			 * @return void
			 **/
			remove = function(hash) {
				var ndx = $.inArray(hash, dirs);

				if (ndx !== -1) {
					dirs.splice(ndx, 1);
					subtree.find('#'+hash2id(hash)).parent().remove();
					!subtree.children().length && root.removeClass(collapsed+' '+expanded);
				}
			},
			/**
			 * Remove all dir from places
			 *
			 * @return void
			 **/
			clear = function() {
				subtree.empty();
				root.removeClass(collapsed+' '+expanded);
			},
			/**
			 * Node - wrapper for places root
			 *
			 * @type jQuery
			 **/
			wrapper = create({
					hash  : 'root-'+fm.namespace, 
					name  : fm.i18n(opts.name, 'places'),
					read  : true,
					write : true
				}),
			/**
			 * Places root node
			 *
			 * @type jQuery
			 **/
			root = wrapper.children('.'+navdir)
				.addClass(fm.res(c, 'treeroot'))
				.click(function() {
					if (root.is('.'+collapsed)) {
						places.toggleClass(expanded);
						subtree.slideToggle();
						fm.storage('placesState', places.is('.'+expanded)? 1 : 0);
					}
				}),
			/**
			 * Container for dirs
			 *
			 * @type jQuery
			 **/
			subtree = wrapper.children('.'+fm.res(c, 'navsubtree')),
			/**
			 * Main places container
			 *
			 * @type jQuery
			 **/
			places = $(this).addClass(fm.res(c, 'tree')+' elfinder-places ui-corner-all')
				.hide()
				.append(wrapper)
				.appendTo(fm.getUI('navbar'))
				.delegate('.'+navdir, 'hover', function() {
					$(this).toggleClass('ui-state-hover');
				})
				.delegate('.'+navdir, 'click', function(e) {
					fm.exec('open', $(this).attr('id').substr(6))
				})
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-tree-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
					drop       : function(e, ui) {
						var resolve = true;
						
						$.each(ui.helper.data('files'), function(i, hash) {
							var dir = fm.file(hash);
							
							if (dir && dir.mime == 'directory' && $.inArray(dir.hash, dirs) === -1) {
								add(dir);
							} else {
								resolve = false;
							}
						})
						save();
						resolve && ui.helper.hide();
					}
				});
	

		// on fm load - show places and load files from backend
		fm.one('load', function() {
			if (fm.oldAPI) {
				return;
			}
			
			places.show().parent().show();

			dirs = $.map(fm.storage('places').split(','), function(hash) { return hash || null});
			
			if (dirs.length) {
				root.prepend(spinner);
				
				fm.request({
					data : {cmd : 'info', targets : dirs},
					preventDefault : true
				})
				.done(function(data) {
					dirs = [];
					$.each(data.files, function(i, file) {
						file.mime == 'directory' && add(file);
					});
					save();
					if (fm.storage('placesState') > 0) {
						root.click();
					}
				})
				.always(function() {
					spinner.remove();
				})
			}
			

			fm.remove(function(e) {
				$.each(e.data.removed, function(i, hash) {
					remove(hash);
				});
				save();
			})
			.change(function(e) {
				$.each(e.data.changed, function(i, file) {
					if ($.inArray(file.hash, dirs) !== -1) {
						remove(file.hash);
						file.mime == 'directory' && add(file);
					}
				});
				save();
			})
			.bind('sync', function() {
				if (dirs.length) {
					root.prepend(spinner);

					fm.request({
						data : {cmd : 'info', targets : dirs},
						preventDefault : true
					})
					.done(function(data) {
						$.each(data.files || [], function(i, file) {
							if ($.inArray(file.hash, dirs) === -1) {
								remove(file.hash);
							}
						});
						save();
					})
					.always(function() {
						spinner.remove();
					});
				}
			})
			
		})
		
	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/searchbutton.js
 */

/**
 * @class  elFinder toolbar search button widget.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersearchbutton = function(cmd) {
	return this.each(function() {
		var result = false,
			button = $(this).hide().addClass('ui-widget-content elfinder-button '+cmd.fm.res('class', 'searchbtn')+''),
			search = function() {
				cmd.exec($.trim(input.val())).done(function() {
					result = true;
					input.focus();
				});
			},
			abort = function() {
				input.val('');
				if (result) {
					result = false;
					cmd.fm.trigger('searchend');
				}
			},
			input  = $('<input type="text" size="42"/>')
				.appendTo(button)
				// to avoid fm shortcuts on arrows
				.keypress(function(e) {
					e.stopPropagation();
				})
				.keydown(function(e) {
					e.stopPropagation();
					
					e.keyCode == 13 &&  search();
					
					if (e.keyCode== 27) {
						e.preventDefault();
						abort();
					}
				});
		
		$('<span class="ui-icon ui-icon-search" title="'+cmd.title+'"/>')
			.appendTo(button)
			.click(search);
		
		$('<span class="ui-icon ui-icon-close"/>')
			.appendTo(button)
			.click(abort)
		
		// wait when button will be added to DOM
		setTimeout(function() {
			button.parent().detach();
			cmd.fm.getUI('toolbar').prepend(button.show());
			// position icons for ie7
			if ($.browser.msie) {
				var icon = button.children(cmd.fm.direction == 'ltr' ? '.ui-icon-close' : '.ui-icon-search');
				icon.css({
					right : '',
					left  : parseInt(button.width())-icon.outerWidth(true)
				});
			}
		}, 200);
		
		cmd.fm
			.error(function() {
				input.unbind('keydown')
			})
			.select(function() {
				input.blur();
			})
			.viewchange(abort)
			.shortcut({
				pattern     : 'ctrl+f f3',
				description : cmd.title,
				callback    : function() { input.select().focus(); }
			});

	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/stat.js
 */

/**
 * @class elFinder ui
 * Display number of files/selected files and its size in statusbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderstat = function(fm) {
	return this.each(function() {
		var size       = $(this).addClass('elfinder-stat-size'),
			sel        = $('<div class="elfinder-stat-selected"/>'),
			titlesize  = fm.i18n('size').toLowerCase(),
			titleitems = fm.i18n('items').toLowerCase(),
			titlesel   = fm.i18n('selected'),
			setstat    = function(files, cwd) {
				var c = 0, 
					s = 0;

				$.each(files, function(i, file) {
					if (!cwd || file.phash == cwd) {
						c++;
						s += parseInt(file.size)||0;
					}
				})
				size.html(titleitems+': '+c+', '+titlesize+': '+fm.formatSize(s));
			};

		fm.getUI('statusbar').prepend(size).append(sel).show();
		
		fm
		.bind('open reload add remove change searchend', function() {
			setstat(fm.files(), fm.cwd().hash)
		})
		.search(function(e) {
			setstat(e.data.files);
		})
		.select(function() {
			var s = 0,
				c = 0;

			$.each(fm.selectedFiles(), function(i, file) {
				c++;
				s += parseInt(file.size)||0;
			});

			sel.html(c ? titlesel+': '+c+', '+titlesize+': '+fm.formatSize(s) : '&nbsp;');
		})

		;
	})
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/toolbar.js
 */

/**
 * @class  elFinder toolbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertoolbar = function(fm, opts) {
	this.not('.elfinder-toolbar').each(function() {
		var commands = fm._commands,
			self     = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-top elfinder-toolbar'),
			panels   = opts || [],
			l        = panels.length,
			i, cmd, panel, button;
		
		self.prev().length && self.parent().prepend(this);

		while (l--) {
			panel = $('<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>');
			i = panels[l].length;
			while (i--) {
				if ((cmd = commands[panels[l][i]])) {
					button = 'elfinder'+cmd.options.ui;
					$.fn[button] && panel.prepend($('<div/>')[button](cmd));
				}
			}
			
			panel.children().length && self.prepend(panel);
			panel.children(':not(:last),:not(:first):not(:last)').after('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');
		}
		
		self.children().length && self.show();
	});
	
	return this;
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/tree.js
 */

/**
 * @class  elFinder folders tree
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertree = function(fm, opts) {
	var treeclass = fm.res('class', 'tree');
	
	this.not('.'+treeclass).each(function() {

		var c = 'class',
			
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = fm.res(c, 'treeroot'),

			/**
			 * Open root dir if not opened yet
			 *
			 * @type Boolean
			 */
			openRoot  = opts.openRootOnLoad,

			/**
			 * Subtree class name
			 *
			 * @type String
			 */
			subtree   = fm.res(c, 'navsubtree'),
			
			/**
			 * Directory class name
			 *
			 * @type String
			 */
			navdir    = fm.res(c, 'treedir'),
			
			/**
			 * Collapsed arrow class name
			 *
			 * @type String
			 */
			collapsed = fm.res(c, 'navcollapse'),
			
			/**
			 * Expanded arrow class name
			 *
			 * @type String
			 */
			expanded  = fm.res(c, 'navexpand'),
			
			/**
			 * Class name to mark arrow for directory with already loaded children
			 *
			 * @type String
			 */
			loaded    = 'elfinder-subtree-loaded',
			
			/**
			 * Arraw class name
			 *
			 * @type String
			 */
			arrow = fm.res(c, 'navarrow'),
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = fm.res(c, 'active'),
			
			/**
			 * Droppable dirs dropover class
			 *
			 * @type String
			 */
			dropover = fm.res(c, 'adroppable'),
			
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = fm.res(c, 'hover'),
			
			/**
			 * Disabled dir class name
			 *
			 * @type String
			 */
			disabled = fm.res(c, 'disabled'),
			
			/**
			 * Draggable dir class name
			 *
			 * @type String
			 */
			draggable = fm.res(c, 'draggable'),
			
			/**
			 * Droppable dir  class name
			 *
			 * @type String
			 */
			droppable = fm.res(c, 'droppable'),
			
			/**
			 * Droppable options
			 *
			 * @type Object
			 */
			droppableopts = $.extend({}, fm.droppable, {
				hoverClass : hover+' '+dropover, 
				// show subfolders on dropover
				over : function() { 
					var link = $(this);
						if (link.is('.'+collapsed+':not(.'+expanded+')')) {
							setTimeout(function() {
								link.is('.'+dropover) && link.children('.'+arrow).click();
							}, 500);
						} 
					}
				}),
			
			spinner = $(fm.res('tpl', 'navspinner')),
			
			/**
			 * Directory html template
			 *
			 * @type String
			 */
			tpl = fm.res('tpl', 'navdir'),
			
			/**
			 * Permissions marker html template
			 *
			 * @type String
			 */
			ptpl = fm.res('tpl', 'perms'),
			
			/**
			 * Symlink marker html template
			 *
			 * @type String
			 */
			stpl = fm.res('tpl', 'symlink'),
			
			/**
			 * Html template replacement methods
			 *
			 * @type Object
			 */
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash) },
				cssclass    : function(dir) { return (dir.phash ? '' : root)+' '+navdir+' '+fm.perms2class(dir)+' '+(dir.dirs && !dir.link ? collapsed : ''); },
				permissions : function(dir) { return !dir.read || !dir.write ? ptpl : ''; },
				symlink     : function(dir) { return dir.alias ? stpl : ''; }
			},
			
			/**
			 * Return html for given dir
			 *
			 * @param  Object  directory
			 * @return String
			 */
			itemhtml = function(dir) {
				dir.name = fm.escape(dir.name);
				
				return tpl.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					return dir[key] || (replace[key] ? replace[key](dir) : '');
				});
			},
			
			/**
			 * Return only dirs from files list
			 *
			 * @param  Array  files list
			 * @return Array
			 */
			filter = function(files) {
				return $.map(files||[], function(f) { return f.mime == 'directory' ? f : null });
			},
			
			/**
			 * Find parent subtree for required directory
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findSubtree = function(hash) {
				return hash ? tree.find('#'+fm.navHash2Id(hash)).next('.'+subtree) : tree;
			},
			
			/**
			 * Find directory (wrapper) in required node
			 * before which we can insert new directory
			 *
			 * @param  jQuery  parent directory
			 * @param  Object  new directory
			 * @return jQuery
			 */
			findSibling = function(subtree, dir) {
				var node = subtree.children(':first'),
					info;

				while (node.length) {
					if ((info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')))) 
					&& dir.name.localeCompare(info.name) < 0) {
						return node;
					}
					node = node.next();
				}
				return $('');
			},
			
			/**
			 * Add new dirs in tree
			 *
			 * @param  Array  dirs list
			 * @return void
			 */
			updateTree = function(dirs) {
				var length  = dirs.length,
					orphans = [],
					i, dir, html, parent, sibling;

				for (i = 0; i < length; i++) {
					dir = dirs[i];

					if (tree.find('#'+fm.navHash2Id(dir.hash)).length) {
						continue;
					}
					
					if ((parent = findSubtree(dir.phash)).length) {
						html = itemhtml(dir);
						if (dir.phash && (sibling = findSibling(parent, dir)).length) {
							sibling.before(html);
						} else {
							parent.append(html);
						}
					} else {
						orphans.push(dir);
					}
				}

				if (orphans.length && orphans.length < length) {
					return updateTree(orphans);
				} 

				updateDroppable();
			},
			
			/**
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @return void
			 */
			sync = function() {
				var cwd     = fm.cwd().hash,
					current = tree.find('#'+fm.navHash2Id(cwd)), 
					rootNode;
				
				if (openRoot) {
					rootNode = tree.find('#'+fm.navHash2Id(fm.root()));
					rootNode.is('.'+loaded) && rootNode.addClass(expanded).next('.'+subtree).show();
					openRoot = false;
				}
				
				if (!current.is('.'+active)) {
					tree.find('.'+navdir+'.'+active).removeClass(active);
					current.addClass(active);
				}
				
				if (opts.syncTree) {
					if (current.length) {
						current.parentsUntil('.'+root).filter('.'+subtree).show().prev('.'+navdir).addClass(expanded);
					} else if (fm.newAPI) {
						fm.request({
							data : {cmd : 'parents', target : cwd},
							preventFail : true
						})
						.done(function(data) {
							var dirs = filter(data.tree);
							updateTree(dirs);
							updateArrows(dirs, loaded)
							cwd == fm.cwd().hash && sync();
						});
					}
				}
			},
			
			/**
			 * Make writable and not root dirs droppable
			 *
			 * @return void
			 */
			updateDroppable = function() {
				tree.find('.'+navdir+':not(.'+droppable+',.elfinder-ro,.elfinder-na)').droppable(droppableopts);
			},
			
			/**
			 * Check required folders for subfolders and update arrow classes
			 *
			 * @param  Array  folders to check
			 * @param  String css class 
			 * @return void
			 */
			updateArrows = function(dirs, cls) {
				var sel = cls == loaded
						? '.'+collapsed+':not(.'+loaded+')'
						: ':not(.'+collapsed+')';
				
						
				//tree.find('.'+subtree+':has(*)').prev(':not(.'+collapsed+')').addClass(collapsed)

				$.each(dirs, function(i, dir) {
					tree.find('#'+fm.navHash2Id(dir.phash)+sel)
						.filter(function() { return $(this).next('.'+subtree).children().length > 0 })
						.addClass(cls);
				})
			},
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass(treeclass)
				// make dirs draggable and toggle hover class
				.delegate('.'+navdir, 'hover', function(e) {
					var link  = $(this), 
						enter = e.type == 'mouseenter';
					
					if (!link.is('.'+dropover+' ,.'+disabled)) {
						enter && !link.is('.'+root+',.'+draggable+',.elfinder-na,.elfinder-wo') && link.draggable(fm.draggable);
						link.toggleClass(hover, enter);
					}
				})
				// add/remove dropover css class
				.delegate('.'+navdir, 'dropover dropout drop', function(e) {
					$(this)[e.type == 'dropover' ? 'addClass' : 'removeClass'](dropover+' '+hover);
				})
				// open dir or open subfolders in tree
				.delegate('.'+navdir, 'click', function(e) {
					var link = $(this),
						hash = fm.navId2Hash(link.attr('id'));
				
					if (hash != fm.cwd().hash && !link.is('.'+disabled)) {
						fm.exec('open', hash);
					} else if (link.is('.'+collapsed)) {
						link.children('.'+arrow).click();
					}
				})
				// toggle subfolders in tree
				.delegate('.'+navdir+'.'+collapsed+' .'+arrow, 'click', function(e) {
					var arrow = $(this),
						link  = arrow.parent('.'+navdir),
						stree = link.next('.'+subtree);

					e.stopPropagation();

					if (link.is('.'+loaded)) {
						link.toggleClass(expanded);
						stree.slideToggle()
					} else {
						spinner.insertBefore(arrow);
						link.removeClass(collapsed);
						
						fm.request({cmd : 'tree', target : fm.navId2Hash(link.attr('id'))})
							.done(function(data) { 
								updateTree(filter(data.tree)); 
								
								if (stree.children().length) {
									link.addClass(collapsed+' '+expanded);
									stree.slideDown();
								} 
								sync();
							})
							.always(function(data) {
								spinner.remove();
								link.addClass(loaded);
							});
					}
				})
				
			;
		// move tree into navbar
		tree.parent().find('.elfinder-navbar').append(tree).show();

		fm.open(function(e) {
			var data = e.data,
				dirs = filter(data.files);

			data.init && tree.empty();

			if (dirs.length) {
				updateTree(dirs);
				updateArrows(dirs, loaded);
			} 
			sync();
		})
		// add new dirs
		.add(function(e) {
			var dirs = filter(e.data.added);

			if (dirs.length) {
				updateTree(dirs);
				updateArrows(dirs, collapsed);
			}
		})
		// update changed dirs
		.change(function(e) {
			var dirs = filter(e.data.changed),
				l    = dirs.length,
				dir, node, tmp, realParent, reqParent, realSibling, reqSibling, isExpanded, isLoaded;
			
			while (l--) {
				dir = dirs[l];
				if ((node = tree.find('#'+fm.navHash2Id(dir.hash))).length) {
					if (dir.phash) {
						realParent  = node.closest('.'+subtree);
						reqParent   = findSubtree(dir.phash);
						realSibling = node.parent().next();
						reqSibling  = findSibling(reqParent, dir);
						
						if (!reqParent.length) {
							continue;
						}
						
						if (reqParent[0] !== realParent[0] || realSibling.get(0) !== reqSibling.get(0)) {
							reqSibling.length ? reqSibling.before(node) : reqParent.append(node);
						}
					}
					isExpanded = node.is('.'+expanded);
					isLoaded   = node.is('.'+loaded);
					tmp        = $(itemhtml(dir));
					node.replaceWith(tmp.children('.'+navdir));
					
					if (dir.dirs 
					&& (isExpanded || isLoaded) 
					&& (node = tree.find('#'+fm.navHash2Id(dir.hash))) 
					&& node.next('.'+subtree).children().length) {
						isExpanded && node.addClass(expanded);
						isLoaded && node.addClass(loaded);
					}
				}
			}

			sync();
			updateDroppable();
		})
		// remove dirs
		.remove(function(e) {
			var dirs = e.data.removed,
				l    = dirs.length,
				node, stree;
			
			while (l--) {
				if ((node = tree.find('#'+fm.navHash2Id(dirs[l]))).length) {
					stree = node.closest('.'+subtree);
					node.parent().detach();
					if (!stree.children().length) {
						stree.hide().prev('.'+navdir).removeClass(collapsed+' '+expanded+' '+loaded);
					}
				}
			}
		})
		// add/remove active class for current dir
		.bind('search searchend', function(e) {
			tree.find('#'+fm.navHash2Id(fm.cwd().hash))[e.type == 'search' ? 'removeClass' : 'addClass'](active);
		})
		// lock/unlock dirs while moving
		.bind('lockfiles unlockfiles', function(e) {
			var lock = e.type == 'lockfiles',
				act  = lock ? 'disable' : 'enable',
				dirs = $.map(e.data.files||[], function(h) {  
					var dir = fm.file(h);
					return dir && dir.mime == 'directory' ? h : null;
				})
				
			$.each(dirs, function(i, hash) {
				var dir = tree.find('#'+fm.navHash2Id(hash));
				
				if (dir.length) {
					dir.is('.'+draggable) && dir.draggable(act);
					dir.is('.'+droppable) && dir.droppable(active);
					dir[lock ? 'addClass' : 'removeClass'](disabled);
				}
			});
		})

	});
	
	return this;
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/uploadButton.js
 */

/**
 * @class  elFinder toolbar's button tor upload file
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderuploadbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd)
				.unbind('click'), 
			form = $('<form/>').appendTo(button),
			input = $('<input type="file" multiple="true"/>')
				.appendTo(form)
				.change(function() {
					var _input;
					if (input.val()) {
						_input = input.clone(true);
						cmd.exec({input : input.remove()[0]});
						input = _input.appendTo(form);
					} 
				});
	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/viewbutton.js
 */

/**
 * @class  elFinder toolbar button to switch current directory view.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderviewbutton = function(cmd) {
	return this.each(function() {
		var button = $(this).elfinderbutton(cmd),
			icon   = button.children('.elfinder-button-icon');

		cmd.change(function() {
			var icons = cmd.value == 'icons';

			icon.toggleClass('elfinder-button-icon-view-list', icons);
			button.attr('title', cmd.fm.i18n(icons ? 'viewlist' : 'viewicons'));
		});
	});
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/ui/workzone.js
 */

/**
 * @class elfinderworkzone - elFinder container for nav and current directory
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderworkzone = function(fm) {
	var cl = 'elfinder-workzone';
	
	this.not('.'+cl).each(function() {
		var wz     = $(this).addClass(cl),
			wdelta = wz.outerHeight(true) - wz.height(),
			parent = wz.parent();
			
		parent.add(window).bind('resize', function() {
				var height = parent.height();

				parent.children(':visible:not(.'+cl+')').each(function() {
					var ch = $(this);

					if (ch.css('position') != 'absolute') {
						height -= ch.outerHeight(true);
					}
				});
				
				wz.height(height - wdelta);
			});
	});
	return this;
}




/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/archive.js
 */

/**
 * @class  elFinder command "archive"
 * Archive selected files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.archive = function() {
	var self  = this,
		fm    = self.fm,
		mimes = [];
		
	this.variants = [];
	
	this.disableOnSearch = true;
	
	/**
	 * Update mimes on open/reload
	 *
	 * @return void
	 **/
	fm.bind('open reload', function() {
		self.variants = [];
		$.each((mimes = fm.option('archivers')['create'] || []), function(i, mime) {
			self.variants.push([mime, fm.mime2kind(mime)])
		});
		self.change();
	});
	
	this.getstate = function() {
		
		return mimes.length && fm.selected().length && fm.cwd().write ? 0 : -1;
	}
	
	this.exec = function(hashes, type) {
		var files = this.files(hashes),
			cnt   = files.length,
			mime  = type || mimes[0],
			cwd   = fm.cwd(),
			error = ['errArchive', 'errPerm'],
			dfrd  = $.Deferred().fail(function(error) {
				error && fm.error(error);
			}), 
			i;

		if (!(cnt && mimes.length && $.inArray(mime, mimes) !== -1)) {
			return dfrd.reject();
		}
		
		if (!cwd.write) {
			return dfrd.reject(error);
		}
		
		for (i = 0; i < cnt; i++) {
			if (!files[i].read) {
				return dfrd.reject(error);
			}
		}

		return fm.request({
			data       : {cmd : 'archive', targets : this.hashes(hashes), type : mime},
			notify     : {type : 'archive', cnt : 1},
			syncOnFail : true
		});
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/back.js
 */

/**
 * @class  elFinder command "back"
 * Open last visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.back = function() {
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.shortcuts      = [{
		pattern     : 'ctrl+left backspace'
	}];
	
	this.getstate = function() {
		return this.fm.history.canBack() ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.history.back();
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/copy.js
 */

/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.copy = function() {
	
	this.shortcuts = [{
		pattern     : 'ctrl+c ctrl+insert'
	}];
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;

		return cnt && $.map(sel, function(f) { return f.phash && f.read ? f : null  }).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm   = this.fm,
			dfrd = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});

		$.each(this.files(hashes), function(i, file) {
			if (!(file.read && file.phash)) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
		});
		
		return dfrd.isRejected() ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes)));
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/cut.js
 */

/**
 * @class elFinder command "copy".
 * Put files in filemanager clipboard.
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.cut = function() {
	
	this.shortcuts = [{
		pattern     : 'ctrl+x shift+insert'
	}];
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return cnt && $.map(sel, function(f) { return f.phash && f.read && !f.locked ? f : null  }).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm     = this.fm,
			dfrd   = $.Deferred()
				.fail(function(error) {
					fm.error(error);
				});

		$.each(this.files(hashes), function(i, file) {
			if (!(file.read && file.phash) ) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
			if (file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
		});
		
		return dfrd.isRejected() ? dfrd : dfrd.resolve(fm.clipboard(this.hashes(hashes), true));
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/download.js
 */

/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.download = function() {
	var self   = this,
		fm     = this.fm,
		filter = function(hashes) {
			return $.map(self.files(hashes), function(f) { return f.mime == 'directory' ? null : f });
		};
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function() {
		var sel = this.fm.selected(),
			cnt = sel.length;
		
		return  cnt && cnt == filter(sel).length ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			base  = fm.options.url, 
			files = filter(hashes),
			dfrd  = $.Deferred(),
			iframe, i, url;
			
		if (fm.oldAPI) {
			fm.error('errCmdNoSupport');
			return dfrd.reject();
		}
			
		base += base.indexOf('?') === -1 ? '?' : '&';
			
		for (i = 0; i < files.length; i++) {
			var iframe = $('<iframe style="display:none" src="'+base + 'cmd=file&target=' + files[i].hash+'&download=1'+'"/>')
				.appendTo('body')
				.load(function() {
					setTimeout(function() {
						iframe.remove();
					}, 1000)
				});
		}
		return dfrd.resolve(hashes);
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/duplicate.js
 */

/**
 * @class elFinder command "duplicate"
 * Create file/folder copy with suffix "copy Number"
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.duplicate = function() {
	var fm = this.fm;
	
	this.disableOnSearch = true;
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;

		return cnt && fm.cwd().write && $.map(sel, function(f) { return f.phash && f.read ? f : null  }).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm     = this.fm,
			files  = this.files(hashes),
			cnt    = files.length,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}), 
			args = [];
			
		if (!cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (!file.read) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
			if (!fm.file(file.phash).write) {
				return !dfrd.reject(['errCopy', file.name, 'errPerm']);
			}
		});
		
		if (dfrd.isRejected()) {
			return dfrd;
		}
		
		return fm.request({
			data   : {cmd : 'duplicate', targets : this.hashes(hashes)},
			notify : {type : 'copy', cnt : cnt}
		});
		
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/edit.js
 */

/**
 * @class elFinder command "edit". 
 * Edit text file in dialog window
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.edit = function() {
	var self  = this,
		fm    = this.fm,
		mimes = fm.res('mimes', 'text') || [],
		/**
		 * Return files acceptable to edit
		 *
		 * @param  Array  files hashes
		 * @return Array
		 **/
		filter = function(files) {
			return $.map(files, function(file) {
				return file.mime.indexOf('text/') === 0 || $.inArray(file.mime, mimes) !== -1 && file.read && file.write ? file : null;
			})
		},
		/**
		 * Get file content and
		 * open dialog with textarea to edit file content
		 *
		 * @param  String  file hash
		 * @return jQuery.Deferred
		 **/
		edit = function(file) {
			var hash   = file.hash,
				opts   = fm.options,
				dfrd   = $.Deferred(), 
				data   = {cmd : 'file', target : hash},
				url    = fm.url(hash) || fm.options.url,
				dialog = function(text) {
					var editor = $('<textarea class="elfinder-file-edit" rows="20">'+text+'</textarea>')
							.keydown(function(e) {
								var code = e.keyCode,
									value, start;
								
								e.stopPropagation();
								if (code == 9) {
									e.preventDefault();
									// insert tab on tab press
									if (this.setSelectionRange) {
										value = this.value;
										start = this.selectionStart;
										this.value = value.substr(0, start) + "\t" + value.substr(this.selectionEnd);
										start += 1;
										this.setSelectionRange(start, start);
									}
								}
								
								if (e.ctrlKey || e.metaKey) {
									// close on ctrl+w/q
									if (code == 81 || code == 87) {
										e.preventDefault();
										cancel();
									}
									if (code == 83) {
										e.preventDefault();
										save();
									}
								}
							}),
						opts = {
							title   : file.name,
							width   : self.options.dialogWidth || 450,
							buttons : {},
							close   : function() { 
								$(this).elfinderdialog('destroy'); 
							},
							open    : function() { 
								fm.disable();
								editor.focus(); 
								editor[0].setSelectionRange && editor[0].setSelectionRange(0, 0);
							}
							
						},
					cancel = function() {
						dfrd.resolve();
						editor.elfinderdialog('close');
					},
					save = function() {
						var value = editor.val();
						
						editor.elfinderdialog('close');
						
						fm.request({
							options : {type : 'post'},
							data : {
								cmd     : 'put',
								target  : hash,
								content : value
							},
							notify : {type : 'save', cnt : 1},
							syncOnFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							data.changed && data.changed.length && fm.change(data);
							dfrd.resolve(data);
						});
					};
						
					opts.buttons[fm.i18n('Save')]   = save;
					opts.buttons[fm.i18n('Cancel')] = cancel;
					
					fm.dialog(editor, opts);
				},
				error;
			
			
			if (!file.read || !file.write) {
				error = ['errOpen', file.name, 'errPerm']
				fm.error(error)
				return dfrd.reject(error);
			}
			
			fm.request({
				data   : {cmd : 'get', target  : hash},
				notify : {type : 'openfile', cnt : 1}
			})
			.done(function(data) {
				dialog(data.content);
			})
			.fail(function(error) {
				dfrd.reject(error);
			})

			return dfrd;
		};
	
	
	this.shortcuts = [{
		pattern     : 'ctrl+e'
	}];
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
			
		return cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var files = filter(this.files(hashes)),
			list  = [],
			file;

		while ((file = files.shift())) {
			list.push(edit(file));
		}
		
		return list.length 
			? $.when.apply(null, list)
			: $.Deferred().reject();
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/extract.js
 */

/**
 * @class  elFinder command "extract"
 * Extract files from archive
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.extract = function() {
	var self    = this,
		fm      = self.fm,
		mimes   = [],
		filter  = function(files) {
			return $.map(files, function(file) { 
				return file.read && $.inArray(file.mime, mimes) !== -1 ? file : null
				
			})
		};
	
	this.disableOnSearch = true;
	
	// Update mimes list on open/reload
	fm.bind('open reload', function() {
		mimes = fm.option('archivers')['extract'] || [];
		self.change();
	});
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var files    = this.files(hashes),
			dfrd     = $.Deferred(),
			cnt      = files.length, 
			complete = cnt, 
			i, file, error;
		
		if (!(cnt && mimes.length)) {
			return dfrd.reject();
		}
		
		for (i = 0; i < cnt; i++) {
			file = files[i];
			if (!(file.read && fm.file(file.phash).write)) {
				error = ['errExtract', file.name, 'errPerm']
				fm.error(error);
				return dfrd.reject(error);
			}
			
			if ($.inArray(file.mime, mimes) === -1) {
				error = ['errExtract', file.name, 'errNoArchive'];
				fm.error(error);
				return dfrd.reject(error);
			}
			
			fm.request({
				data       : {cmd : 'extract', target : file.hash},
				notify     : {type : 'extract', cnt : 1},
				syncOnFail : true
			})
			.fail(function(error) {
				fm.error(error);
				if (!dfrd.isRejected()) {
					dfrd.reject(error);
				}
			})
			.done(function() {
				complete--;
				if (complete == 0) {
					dfrd.resolve();
				}
			});
			
		}
		
		return dfrd;
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/forward.js
 */

/**
 * @class  elFinder command "forward"
 * Open next visited folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.forward = function() {
	this.alwaysEnabled = true;
	this.updateOnSelect = true;
	this.shortcuts = [{
		pattern     : 'ctrl+right'
	}];
	
	this.getstate = function() {
		return this.fm.history.canForward() ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.history.forward();
	}
	
}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/getfile.js
 */

/**
 * @class elFinder command "getfile". 
 * Return selected files info into outer callback.
 * For use elFinder with wysiwyg editors etc.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.getfile = function() {
	var self   = this,
		fm     = this.fm,
		filter = function(files) {
			var o = self.options;

			files = $.map(files, function(file) {
				return file.mime != 'directory' || o.folders ? file : null;
			});

			return o.multiple || files.length == 1 ? files : [];
		};
	
	this.alwaysEnabled = true;
	this.callback      = fm.options.getFileCallback;
	this._disabled     = typeof(this.callback) == 'function';
	
	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
			
		return this.callback && cnt && filter(sel).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm,
			opts  = this.options,
			files = this.files(hashes),
			cnt   = files.length,
			url   = fm.option('url'),
			tmb   = fm.option('tmbUrl'),
			dfrd  = $.Deferred()
				.done(function(data) {
					fm.trigger('getfile', {files : data});
					self.callback(data, fm);
					
					if (opts.oncomplete == 'close') {
						fm.hide();
					} else if (opts.oncomplete == 'destroy') {
						fm.destroy();
					}
				}),
			req = [], 
			i, file, dim;

		if (this.getstate() == -1) {
			return dfrd.reject();
		}
			
		for (i = 0; i < cnt; i++) {
			file = files[i];
			if (file.mime == 'directory' && !opts.folders) {
				return dfrd.reject();
			}
			file.baseUrl = url;
			file.url     = fm.url(file.hash);
			file.path    = fm.path(file.hash);
			if (file.tmb && file.tmb != 1) {
				file.tmb = tmb + file.tmb;
			}
			if (file.dim) {
				dim = file.dim.split('x');
				file.width = dim[0];
				file.height = dim[1];
			} else if (file.mime.indexOf('image') !== -1) {
				req.push(fm.request({
					data : {cmd : 'dim', target : file.hash},
					preventDefault : true
				})
				.done($.proxy(function(data) {
					if (data.dim) {
						dim = data.dim.split('x');
						this.width = dim[0];
						this.height = dim[1];
					}
					this.dim = data.dim
				}, files[i])));
			}
		}
		
		if (req.length) {
			$.when.apply(null, req).always(function() {
				dfrd.resolve(opts.multiple ? files : files[0]);
			})
			return dfrd;
		}
		
		return dfrd.resolve(opts.multiple ? files : files[0]);
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/help.js
 */

/**
 * @class  elFinder command "help"
 * "About" dialog
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.help = function() {
	var fm = this.fm,
		content;
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = 0;
	
	this.shortcuts = [{
		pattern     : 'f1',
		description : this.title
	}];
	
	this.fm.one('open', function() {
		setTimeout(function() {
			var linktpl = '<div class="elfinder-help-link"> <a href="{url}">{link}</a></div>',
				atpl    = '<div class="elfinder-help-team"><div>{author}</div>{work}</div>',
				url     = /\{url\}/,
				link    = /\{link\}/,
				author  = /\{author\}/,
				work    = /\{work\}/,
				r       = 'replace',
				prim    = 'ui-priority-primary',
				sec     = 'ui-priority-secondary',
				lic     = 'elfinder-help-license',
				tab     = '<li class="ui-state-default ui-corner-top"><a href="#{id}">{title}</a></li>',
				html    = ['<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-help">', 
						'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">'],
				stpl    = '<div class="elfinder-help-shortcut"><div class="elfinder-help-shortcut-pattern">{pattern}</div> {descrip}</div>',
				sep     = '<div class="elfinder-help-separator"/>',
				shortcuts = fm.shortcuts()
				;

			$.each({main : 'about', shortcuts : 'shortcuts', help : 'help'}, function(id, title) {
				html.push(tab[r](/\{id\}/, id)[r](/\{title\}/, fm.i18n(title)));
			});

			html.push('</ul>');
			
			// main tab
			html.push('<div id="main" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="elfinder-help-logo"/>')
			html.push('<h3>elFinder</h3>');
			html.push('<div class="'+prim+'">'+fm.i18n('webfm')+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('ver')+': '+fm.version+', '+fm.i18n('protocol')+': '+fm.api+'</div>');
			html.push('<div class="'+sec+'">jQuery/jQuery UI: '+$().jquery+'/'+$.ui.version+'</div>');
			
			html.push(sep);
			
			html.push(linktpl[r](url, 'http://elfinder.org/')[r](link, fm.i18n('homepage')));
			html.push(linktpl[r](url, 'https://github.com/Studio-42/elFinder/wiki')[r](link, fm.i18n('docs')));
			html.push(linktpl[r](url, 'https://github.com/Studio-42/elFinder')[r](link, fm.i18n('github')));
			html.push(linktpl[r](url, 'http://twitter.com/elrte_elfinder')[r](link, fm.i18n('twitter')));
			//html.push(linktpl[r](url, 'http://facebook.com/')[r](link, fm.i18n('facebook')));
			
			html.push(sep);
			
			html.push('<div class="'+prim+'">'+fm.i18n('team')+'</div>');
			
			html.push(atpl[r](author, 'Dmitry "dio" Levashov &lt;dio@std42.ru&gt;')[r](work, fm.i18n('chiefdev')));
			html.push(atpl[r](author, 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;')[r](work, fm.i18n('maintainer')));
			html.push(atpl[r](author, 'Alexey Sukhotin &lt;strogg@yandex.ru&gt;')[r](work, fm.i18n('contributor')));
			
			fm.i18[fm.lang].translator && html.push(atpl[r](author, fm.i18[fm.lang].translator)[r](work, fm.i18n('translator')+' ('+fm.i18[fm.lang].language+')'));
			
			html.push(sep);
			html.push('<div class="'+lic+'">'+fm.i18n('icons')+': <a href="http://pixelmixer.ru/" target="_blank">Pixelmixer</a>, <a href="http://p.yusukekamiyamane.com" target="_blank">Fugue</a></div>');
			
			html.push(sep);
			html.push('<div class="'+lic+'">Licence: BSD Licence</div>');
			html.push('<div class="'+lic+'">Copyright © 2009-2011, Studio 42</div>');
			html.push('<div class="'+lic+'">„ …'+fm.i18n('dontforget')+' ”</div>');
			html.push('</div>');
			// end main
			
			// shortcuts tab
			html.push('<div id="shortcuts" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			
			if (shortcuts.length) {
				html.push('<div class="ui-widget-content elfinder-help-shortcuts">');
				$.each(shortcuts, function(i, s) {
					html.push(stpl.replace(/\{pattern\}/, s[0]).replace(/\{descrip\}/, s[1]));
				});

				html.push('</div>');
			} else {
				html.push('<div class="elfinder-help-disabled">'+fm.i18n('shortcutsof')+'</div>')
			}
			
			
			html.push('</div>')
			//end shortcuts
			
			// help tab
			html.push('<div id="help" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<a href="http://elrte.org/redmine/projects/elfinder/boards" target="_blank" class="elfinder-dont-panic"><span>DON\'T PANIC</span></a>');
			html.push('</div>')
			// end help
			
			html.push('</div>')
			content = $(html.join(''));
			
			content.find('.ui-tabs-nav li')
				.hover(function() {
					$(this).toggleClass('ui-state-hover')
				})
				.children()
				.click(function(e) {
					var link = $(this);
					
					e.preventDefault();
					e.stopPropagation();
					
					if (!link.is('.ui-tabs-selected')) {
						link.parent().addClass('ui-tabs-selected ui-state-active').siblings().removeClass('ui-tabs-selected').removeClass('ui-state-active');
						content.find('.ui-tabs-panel').hide().filter(link.attr('href')).show();
					}
					
				})
				.filter(':first').click();
			
		}, 200)
	})
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		this.fm.dialog(content, {title : this.title, width : 530});
	}

}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/home.js
 */


elFinder.prototype.commands.home = function() {
	this.title = 'Home';
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+home ctrl+shift+up',
		description : 'Home'
	}];
	
	this.getstate = function() {
		var root = this.fm.root(),
			cwd  = this.fm.cwd().hash;
			
		return root && cwd && root != cwd ? 0: -1;
	}
	
	this.exec = function() {
		return this.fm.exec('open', this.fm.root());
	}
	

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/info.js
 */

/**
 * @class elFinder command "info". 
 * Display dialog with file properties.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.info = function() {
	var m   = 'msg',
		fm  = this.fm,
		spclass = 'elfinder-info-spinner',
		msg = {
			calc     : fm.i18n('calc'),
			size     : fm.i18n('size'),
			unknown  : fm.i18n('unknown'),
			path     : fm.i18n('path'),
			aliasfor : fm.i18n('aliasfor'),
			modify   : fm.i18n('modify'),
			perms    : fm.i18n('perms'),
			locked   : fm.i18n('locked'),
			dim      : fm.i18n('dim'),
			kind     : fm.i18n('kind'),
			files    : fm.i18n('files'),
			folders  : fm.i18n('folders'),
			items    : fm.i18n('items'),
			yes      : fm.i18n('yes'),
			no       : fm.i18n('no'),
			link     : fm.i18n('link')
		};
		
	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}</div><table class="elfinder-info-tb">{content}</table>',
		itemTitle  : '<strong>{name}</strong><span class="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		row        : '<tr><td>{label} : </td><td>{value}</td></tr>',
		spinner    : '<span>{text}</span> <span class="'+spclass+'"/>'
	}
	
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+i'
	}];
	
	this.init = function() {
		$.each(msg, function(k, v) {
			msg[k] = fm.i18n(v);
		});
	}
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function(hashes) {
		var self    = this,
			fm      = this.fm,
			tpl     = this.tpl,
			row     = tpl.row,
			files   = this.files(hashes),
			cnt     = files.length,
			content = [],
			view    = tpl.main,
			l       = '{label}',
			v       = '{value}',
			opts    = {
				title    : this.title,
				// autoOpen : false,
				// width    : 270,
				// test in ie >_<
				width : 'auto',
				close : function() { $(this).elfinderdialog('destroy'); }
			},
			count = [],
			replSpinner = function(msg) { dialog.find('.'+spclass).parent().text(msg); },
			dialog, size, tmb, file, title, dcnt;
			
		if (!cnt) {
			return $.Deferred().reject();
		}
			
		if (cnt == 1) {
			file  = files[0];
			view  = view.replace('{class}', fm.mime2class(file.mime));
			title = tpl.itemTitle.replace('{name}', file.name).replace('{kind}', fm.mime2kind(file));

			if (file.tmb) {
				tmb = fm.option('tmbUrl')+file.tmb;
			}
			
			if (!file.read) {
				size = msg.unknown;
			} else if (file.mime != 'directory' || file.alias) {
				size = fm.formatSize(file.size);
			} else {
				size = tpl.spinner.replace('{text}', msg.calc);
				count.push(file.hash);
			}
			
			content.push(row.replace(l, msg.size).replace(v, size));
			file.alias && content.push(row.replace(l, msg.aliasfor).replace(v, file.alias));
			content.push(row.replace(l, msg.path).replace(v, fm.escape(fm.path(file.hash))));
			file.read && content.push(row.replace(l, msg.link).replace(v,  '<a href="'+fm.url(file.hash)+'" target="_blank">'+file.name+'</a>'));
			
			if (file.dim) { // old api
				content.push(row.replace(l, msg.dim).replace(v, file.dim));
			} else if (file.mime.indexOf('image') !== -1) {
				content.push(row.replace(l, msg.dim).replace(v, tpl.spinner.replace('{text}', msg.calc)));
				fm.request({
					data : {cmd : 'dim', target : file.hash},
					preventDefault : true
				})
				.fail(function() {
					replSpinner(msg.unknown);
				})
				.done(function(data) {
					replSpinner(data.dim || msg.unknown);
				});
			}
			
			
			content.push(row.replace(l, msg.modify).replace(v, fm.formatDate(file.date)));
			content.push(row.replace(l, msg.perms).replace(v, fm.formatPermissions(file)));
			content.push(row.replace(l, msg.locked).replace(v, file.locked ? msg.yes : msg.no));
		} else {
			view  = view.replace('{class}', 'elfinder-cwd-icon-group');
			title = tpl.groupTitle.replace('{items}', msg.items).replace('{num}', cnt);
			dcnt  = $.map(files, function(f) { return f.mime == 'directory' ? 1 : null }).length;
			if (!dcnt) {
				size = 0;
				$.each(files, function(h, f) { size += f.size;});
				content.push(row.replace(l, msg.kind).replace(v, msg.files));
				content.push(row.replace(l, msg.size).replace(v, fm.formatSize(size)));
			} else {
				content.push(row.replace(l, msg.kind).replace(v, dcnt == cnt ? msg.folders : msg.folders+' '+dcnt+', '+msg.files+' '+(cnt-dcnt)))
				content.push(row.replace(l, msg.size).replace(v, tpl.spinner.replace('{text}', msg.calc)));
				count = $.map(files, function(f) { return f.hash });
			}
		}
		
		view = view.replace('{title}', title).replace('{content}', content.join(''));
		
		dialog = fm.dialog(view, opts);
		
		// load thumbnail
		if (tmb) {
			$('<img/>')
				.load(function() { dialog.find('.elfinder-cwd-icon').css('background', 'url("'+tmb+'") center center no-repeat'); })
				.attr('src', tmb);
		}
		
		// send request to count total size
		if (count.length) {
			fm.request({
					data : {cmd : 'size', targets : count},
					preventDefault : true
				})
				.fail(function() {
					replSpinner(msg.unknown);
				})
				.done(function(data) {
					var size = parseInt(data.size);
					replSpinner(size >= 0 ? fm.formatSize(size) : msg.unknown);
				});
		}
		
	}
	
}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/mkdir.js
 */

/**
 * @class  elFinder command "mkdir"
 * Create new folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkdir = function() {
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'directory';
	this.prefix          = 'untitled folder';
	this.exec            = $.proxy(this.fm.res('mixin', 'make'), this);
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+n'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/mkfile.js
 */

/**
 * @class  elFinder command "mkfile"
 * Create new empty file
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.mkfile = function() {
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	this.mime            = 'text/plain';
	this.prefix          = 'untitled folder.txt';
	this.exec            = $.proxy(this.fm.res('mixin', 'make'), this);
	
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}

}


/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/open.js
 */

/**
 * @class  elFinder command "open"
 * Enter folder or open files in new windows
 *
 * @author Dmitry (dio) Levashov
 **/  
elFinder.prototype.commands.open = function() {
	this.alwaysEnabled = true;
	
	this._handlers = {
		dblclick : function(e) { e.preventDefault(); this.exec() },
		'select enable disable reload' : function(e) { this.update(e.type == 'disable' ? -1 : void(0));  }
	}
	
	this.shortcuts = [{
		pattern     : 'ctrl+down numpad_enter'+(this.fm.OS != 'mac' && ' enter')
	}];

	this.getstate = function(sel) {
		var sel = this.files(sel),
			cnt = sel.length;
		
		return cnt == 1 
			? 0 
			: cnt ? ($.map(sel, function(file) { return file.mime == 'directory' ? null : file}).length == cnt ? 0 : -1) : -1
	}
	
	this.exec = function(hashes) {
		var fm    = this.fm, 
			dfrd  = $.Deferred().fail(function(error) { error && fm.error(error); }),
			files = this.files(hashes),
			cnt   = files.length,
			file, url, s, w;

		if (!cnt) {
			return dfrd.reject();
		}

		// open folder
		if (cnt == 1 && (file = files[0]) && file.mime == 'directory') {
			return file && !file.read
				? dfrd.reject(['errOpen', file.name, 'errPerm'])
				: fm.request({
						data   : {cmd  : 'open', target : file.hash},
						notify : {type : 'open', cnt : 1, hideCnt : true},
						syncOnFail : true
					});
		}
		
		files = $.map(files, function(file) { return file.mime != 'directory' ? file : null });
		
		// nothing to open or files and folders selected - do nothing
		if (cnt != files.length) {
			return dfrd.reject();
		}
		
		// open files
		cnt = files.length;
		while (cnt--) {
			file = files[cnt];
			
			if (!file.read) {
				return dfrd.reject(['errOpen', file.name, 'errPerm']);
			}
			
			if (!(url = fm.url(file.hash))) {
				url = fm.options.url;
				url = url + (url.indexOf('?') === -1 ? '?' : '&')
					+ (fm.oldAPI ? 'cmd=open&current='+file.phash : 'cmd=file')
					+ '&target=' + file.hash;
			}
			
			w = '';
			// set window size for image
			if (file.dim) {
				s = file.dim.split('x');
				w = 'width='+(parseInt(s[0])+20) + ',height='+(parseInt(s[1])+20);
			}

			if (!window.open(url, '_blank', w + ',top=50,left=50,scrollbars=yes,resizable=yes')) {
				return dfrd.reject('errPopup');
			}
		}
		return dfrd.resolve(hashes);
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/paste.js
 */

/**
 * @class  elFinder command "paste"
 * Paste filesfrom clipboard into directory.
 * If files pasted in its parent directory - files duplicates will created
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.paste = function() {
	
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	
	this.handlers = {
		changeclipboard : function() { this.update(); }
	}

	this.shortcuts = [{
		pattern     : 'ctrl+v shift+insert'
	}];
	
	this.getstate = function(dst) {
		if (dst) {
			if ($.isArray(dst)) {
				if (dst.length != 1) {
					return -1;
				}
				dst = this.fm.file(dst[0]);
			}
		} else {
			dst = this.fm.cwd();
		}

		return this.fm.clipboard().length && dst.mime == 'directory' && dst.write ? 0 : -1;
	}
	
	this.exec = function(dst) {
		var fm     = this.fm,
			dst    = dst ? this.files(dst)[0] : fm.cwd(),
			files  = fm.clipboard(),
			cnt    = files.length,
			cut    = cnt ? files[0].cut : false,
			error  = cut ? 'errMove' : 'errCopy',
			fpaste = [],
			fcopy  = [],
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			copy  = function(files) {
				return files.length && fm._commands.duplicate
					? fm.exec('duplicate', files)
					: $.Deferred().resolve();
			},
			paste = function(files) {
				var dfrd      = $.Deferred(),
					existed   = [],
					intersect = function(files, names) {
						var ret = [], 
							i   = files.length;

						while (i--) {
							$.inArray(files[i].name, names) !== -1 && ret.unshift(i);
						}
						return ret;
					},
					confirm   = function(ndx) {
						var i    = existed[ndx],
							file = files[i],
							last = ndx == existed.length-1;

						if (!file) {
							return;
						}

						fm.confirm({
							title  : fm.i18n(cut ? 'moveFiles' : 'copyFiles'),
							text   : fm.i18n(['errExists', file.name, 'confirmRepl']), 
							all    : !last,
							accept : {
								label    : 'btnYes',
								callback : function(all) {
									!last && !all
										? confirm(++ndx)
										: paste(files);
								}
							},
							reject : {
								label    : 'btnNo',
								callback : function(all) {
									var i;

									if (all) {
										i = existed.length;
										while (ndx < i--) {
											files[existed[i]].remove = true
										}
									} else {
										files[existed[ndx]].remove = true;
									}

									!last && !all
										? confirm(++ndx)
										: paste(files);
								}
							},
							cancel : {
								label    : 'btnCancel',
								callback : function() {
									dfrd.resolve();
								}
							}
						})
					},
					valid     = function(names) {
						existed = intersect(files, names);
						existed.length ? confirm(0) : paste(files);
					},
					paste     = function(files) {
						var files  = $.map(files, function(file) { return !file.remove ? file : null } ),
							cnt    = files.length,
							groups = {},
							args   = [],
							src;

						if (!cnt) {
							return dfrd.resolve();
						}

						src = files[0].phash;
						files = $.map(files, function(f) { return f.hash});
						
						fm.request({
								data   : {cmd : 'paste', dst : dst.hash, targets : files, cut : cut ? 1 : 0, src : src},
								notify : {type : cut ? 'move' : 'copy', cnt : cnt}
							})
							.always(function() {
								fm.unlockfiles({files : files});
							});
					}
					;
				
				if (!files.length) {
					return dfrd.resolve();
				}
					
				if (fm.oldAPI) {
					paste(files);
				} else {
					
					if (!fm.option('copyOverwrite')) {
						paste(files);
					} else {
						dst.hash == fm.cwd().hash
							? valid($.map(fm.files(), function(file) { return file.phash == dst.hash ? file.name : null }))
							: fm.request({
								data : {cmd : 'ls', target : dst.hash},
								notify : {type : 'prepare', cnt : 1, hideCnt : true},
								preventFail : true
							})
							.always(function(data) {
								valid(data.list || [])
							});
					}
				}
				
				return dfrd;
			},
			parents;


		if (!cnt || !dst || dst.mime != 'directory') {
			return dfrd.reject();
		}
			
		if (!dst.write)	{
			return dfrd.reject([error, files[0].name, 'errPerm']);
		}
		
		parents = fm.parents(dst.hash)
		
		$.each(files, function(i, file) {
			if (!file.read) {
				return !dfrd.reject([error, files[0].name, 'errPerm']);
			}
			
			if (cut && file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
			
			if ($.inArray(file.hash, parents) !== -1) {
				return !dfrd.reject(['errCopyInItself', file.name]);
			}
			
			if (file.phash == dst.hash) {
				fcopy.push(file.hash);
			} else {
				fpaste.push({
					hash  : file.hash,
					phash : file.phash,
					name  : file.name
				});
			}
		});

		return $.when(
			copy(fcopy),
			paste(fpaste)
		).always(function() {
			cut && fm.clipboard([]);
		});
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/quicklook.js
 */

/**
 * @class  elFinder command "quicklook"
 * Fast preview for some files types
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.quicklook = function() {
	var self       = this,
		fm         = self.fm,
		/**
		 * window closed state
		 *
		 * @type Number
		 **/
		closed     = 0,
		/**
		 * window animated state
		 *
		 * @type Number
		 **/
		animated   = 1,
		/**
		 * window opened state
		 *
		 * @type Number
		 **/
		opened     = 2,
		/**
		 * window state
		 *
		 * @type Number
		 **/
		state      = closed,
		/**
		 * next/prev event name (requied to cwd catch it)
		 *
		 * @type Number
		 **/
		keydown    = $.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown',
		/**
		 * navbar icon class
		 *
		 * @type Number
		 **/
		navicon    = 'elfinder-quicklook-navbar-icon',
		/**
		 * navbar "fullscreen" icon class
		 *
		 * @type Number
		 **/
		fullscreen  = 'elfinder-quicklook-fullscreen',
		/**
		 * Triger keydown/keypress event with left/right arrow key code
		 *
		 * @param  Number  left/right arrow key code
		 * @return void
		 **/
		navtrigger = function(code) {
			$(document).trigger($.Event(keydown, { keyCode: code, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
		},
		/**
		 * Return css for closed window
		 *
		 * @param  jQuery  file node in cwd
		 * @return void
		 **/
		closedCss = function(node) {
			return {
				opacity : 0,
				width   : 20,//node.width(),
				height  : fm.view == 'list' ? 1 : 20,
				top     : node.offset().top+'px', 
				left    : node.offset().left+'px' 
			}
		},
		/**
		 * Return css for opened window
		 *
		 * @return void
		 **/
		openedCss = function() {
			var win = $(window);
			return {
				opacity : 1,
				width  : width,
				height : height,
				top    : parseInt(parent.position().top + win.scrollTop()),
				left   : parseInt((win.width() - width)/2)
			}
		},
		
		support = function(codec) {
			var media = document.createElement(codec.substr(0, codec.indexOf('/'))),
				value = media.canPlayType && media.canPlayType(codec);
			
			return value && value !== '' && value != 'no';
		},
		
		/**
		 * Opened window width (from config)
		 *
		 * @type Number
		 **/
		width, 
		/**
		 * Opened window height (from config)
		 *
		 * @type Number
		 **/
		height, 
		/**
		 * elFinder node
		 *
		 * @type jQuery
		 **/
		parent, 
		/**
		 * elFinder current directory node
		 *
		 * @type jQuery
		 **/
		cwd, 
		title   = $('<div class="elfinder-quicklook-title"/>'),
		icon    = $('<div/>'),
		info    = $('<div class="elfinder-quicklook-info"/>'),//.hide(),
		fsicon  = $('<div class="'+navicon+' '+navicon+'-fullscreen"/>')
			.mousedown(function(e) {
				var win     = self.window,
					full    = win.is('.'+fullscreen),
					scroll  = 'scroll.'+fm.namespace,
					$window = $(window);
					
				e.stopPropagation();
				
				if (full) {
					win.css(win.data('position')).unbind('mousemove');
					$window.unbind(scroll).trigger(self.resize).unbind(self.resize);
					navbar.unbind('mouseenter').unbind('mousemove');
				} else {
					win.data('position', {
						left   : win.css('left'), 
						top    : win.css('top'), 
						width  : win.width(), 
						height : win.height()
					})
					.css({
						width  : '100%',
						height : '100%'
					});

					$(window).bind(scroll, function() {
						win.css({
							left   : parseInt($(window).scrollLeft())+'px',
							top    : parseInt($(window).scrollTop()) +'px'
						})
					})
					.bind(self.resize, function(e) {
						self.preview.trigger('changesize');
					})
					.trigger(scroll)
					.trigger(self.resize);
					
					win.bind('mousemove', function(e) {
						navbar.stop(true, true).show().delay(3000).fadeOut('slow');
					})
					.mousemove();
					
					navbar.mouseenter(function() {
						navbar.stop(true, true).show();
					})
					.mousemove(function(e) {
						e.stopPropagation();
					});
				}
				navbar.attr('style', '').draggable(full ? 'destroy' : {});
				win.toggleClass(fullscreen);
				$(this).toggleClass(navicon+'-fullscreen-off');
				$.fn.resizable && parent.add(win).resizable(full ? 'enable' : 'disable').removeClass('ui-state-disabled');
			}),
			
		navbar  = $('<div class="elfinder-quicklook-navbar"/>')
			.append($('<div class="'+navicon+' '+navicon+'-prev"/>').mousedown(function() { navtrigger(37); }))
			.append(fsicon)
			.append($('<div class="'+navicon+' '+navicon+'-next"/>').mousedown(function() { navtrigger(39); }))
			.append('<div class="elfinder-quicklook-navbar-separator"/>')
			.append($('<div class="'+navicon+' '+navicon+'-close"/>').mousedown(function() { self.window.trigger('close'); }))
		;

	this.resize = 'resize.'+fm.namespace;
	this.info = $('<div class="elfinder-quicklook-info-wrapper"/>')
		.append(icon)
		.append(info);
		
	this.preview = $('<div class="elfinder-quicklook-preview ui-helper-clearfix"/>')
		// clean info/icon
		.bind('change', function(e) {
			self.info.attr('style', '').hide();
			icon.removeAttr('class').attr('style', '');
			info.html('');

		})
		// update info/icon
		.bind('update', function(e) {
			var fm      = self.fm,
				preview = self.preview,
				file    = e.file,
				tpl     = '<div class="elfinder-quicklook-info-data">{value}</div>',
				tmb;

			if (file) {
				!file.read && e.stopImmediatePropagation();
				self.window.data('hash', file.hash);
				self.preview.unbind('changesize').trigger('change').children().remove();
				title.html(fm.escape(file.name));
				
				info.html(
						tpl.replace(/\{value\}/, file.name)
						+ tpl.replace(/\{value\}/, fm.mime2kind(file))
						+ (file.mime == 'directory' ? '' : tpl.replace(/\{value\}/, fm.formatSize(file.size)))
						+ tpl.replace(/\{value\}/, fm.i18n('modify')+': '+ fm.formatDate(file.date))
					)
				icon.addClass('elfinder-cwd-icon ui-corner-all '+fm.mime2class(file.mime));

				if (file.tmb) {
					$('<img/>')
						.hide()
						.appendTo(self.preview)
						.load(function() {
							icon.css('background', 'url("'+tmb+'") center center no-repeat');
							$(this).remove();
						})
						.attr('src', (tmb = fm.tmb(file.hash)));
				}
				self.info.delay(100).fadeIn(10);
			} else {
				e.stopImmediatePropagation();
			}
		});
		

	

	this.window = $('<div class="ui-helper-reset ui-widget elfinder-quicklook" style="position:absolute"/>')
		.click(function(e) { e.stopPropagation(); })
		.append(
			$('<div class="elfinder-quicklook-titlebar"/>')
				.append(title)
				.append($('<span class="ui-icon ui-icon-circle-close"/>').mousedown(function(e) {
					e.stopPropagation();
					self.window.trigger('close');
				}))
		)
		.append(this.preview.add(navbar))
		.append(self.info.hide())
		.draggable({handle : 'div.elfinder-quicklook-titlebar'})
		.bind('open', function(e) {
			var win  = self.window, 
				file = self.value,
				node;

			if (self.closed() && file && (node = cwd.find('#'+file.hash)).length) {
				
				state = animated;
				node.trigger('scrolltoview');
				win.css(closedCss(node))
					.show()
					.animate(openedCss(), 550, function() {
						state = opened;
						self.update(1, self.value);
					});
			}
		})
		.bind('close', function(e) {
			var win     = self.window,
				preview = self.preview.trigger('change'),
				file    = self.value,
				node    = cwd.find('#'+win.data('hash')),
				close   = function() {
					state = closed;
					win.hide();
					preview.children().remove();
					self.update(0, self.value)
				};
				
			if (self.opened()) {
				state = animated;
				win.is('.'+fullscreen) && fsicon.mousedown()
				node.length
					? win.animate(closedCss(node), 500, close)
					: close();
			}
		});

	/**
	 * This command cannot be disable by backend
	 *
	 * @type Boolean
	 **/
	this.alwaysEnabled = true;
	
	/**
	 * Selected file
	 *
	 * @type Object
	 **/
	this.value = null;
	
	this.handlers = {
		// save selected file
		select : function() { this.update(void(0), this.fm.selectedFiles()[0]); },
		error  : function() { self.window.is(':visible') && self.window.data('hash', '').trigger('close'); },
		'searchshow searchhide' : function() { this.opened() && this.window.trigger('close'); }
	}
	
	this.shortcuts = [{
		pattern     : 'space'
	}];
	
	this.support = {
		audio : {
			ogg : support('audio/ogg; codecs="vorbis"'),
			mp3 : support('audio/mpeg;'),
			wav : support('audio/wav; codecs="1"'),
			m4a : support('audio/x-m4a;') || support('audio/aac;')
		},
		video : {
			ogg  : support('video/ogg; codecs="theora"'),
			webm : support('video/webm; codecs="vp8, vorbis"'),
			mp4  : support('video/mp4; codecs="avc1.42E01E"') || support('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') 
		}
	}
	
	
	/**
	 * Return true if quickLoock window is visible and not animated
	 *
	 * @return Boolean
	 **/
	this.closed = function() {
		return state == closed;
	}
	
	/**
	 * Return true if quickLoock window is hidden
	 *
	 * @return Boolean
	 **/
	this.opened = function() {
		return state == opened;
	}
	
	/**
	 * Init command.
	 * Add default plugins and init other plugins
	 *
	 * @return Object
	 **/
	this.init = function() {
		var o       = this.options, 
			win     = this.window,
			preview = this.preview,
			i, p;
		
		width  = o.width  > 0 ? parseInt(o.width)  : 450;	
		height = o.height > 0 ? parseInt(o.height) : 300;

		fm.one('load', function() {
			parent = fm.getUI();
			cwd    = fm.getUI('cwd');

			win.appendTo('body').zIndex(100 + parent.zIndex());
			
			// close window on escape
			$(document).keydown(function(e) {
				e.keyCode == 27 && self.opened() && win.trigger('close')
			})
			
			if ($.fn.resizable) {
				win.resizable({ 
					handles   : 'se', 
					minWidth  : 350, 
					minHeight : 120, 
					resize    : function() { 
						// use another event to avoid recursion in fullscreen mode
						// may be there is clever solution, but i cant find it :(
						preview.trigger('changesize'); 
					}
				});
			}
			
			self.change(function() {
				if (self.opened()) {
					self.value ? preview.trigger($.Event('update', {file : self.value})) : win.trigger('close');
				}
			});
			
			$.each(fm.commands.quicklook.plugins || [], function(i, plugin) {
				if (typeof(plugin) == 'function') {
					new plugin(self)
				}
			});
			
			preview.bind('update', function() {
				self.info.show();
			});
		});
		
	}
	
	this.getstate = function() {
		return this.fm.selected().length == 1 ? state == opened ? 1 : 0 : -1;
	}
	
	this.exec = function() {
		this.enabled() && this.window.trigger(this.opened() ? 'close' : 'open');
	}

	this.hideinfo = function() {
		this.info.stop(true).hide();
	}

}



/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/quicklook.plugins.js
 */


elFinder.prototype.commands.quicklook.plugins = [
	
	/**
	 * Images preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['image/jpeg', 'image/png', 'image/gif'],
			preview = ql.preview;
		
		// what kind of images we can display
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
			
		preview.bind('update', function(e) {
			var file = e.file,
				img;

			if ($.inArray(file.mime, mimes) !== -1) {
				// this is our file - stop event propagation
				e.stopImmediatePropagation();

				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.load(function() {
						// timeout - because of strange safari bug - 
						// sometimes cant get image height 0_o
						setTimeout(function() {
							var prop = (img.width()/img.height()).toFixed(2);
							preview.bind('changesize', function() {
								var pw = parseInt(preview.width()),
									ph = parseInt(preview.height()),
									w, h;
							
								if (prop < (pw/ph).toFixed(2)) {
									h = ph;
									w = Math.floor(h * prop);
								} else {
									w = pw;
									h = Math.floor(w/prop);
								}
								img.width(w).height(h).css('margin-top', h < ph ? Math.floor((ph - h)/2) : 0);
							
							})
							.trigger('changesize');
							
							// hide info/icon
							ql.hideinfo();
							//show image
							img.fadeIn(100);
						}, 1)
					})
					.attr('src', ql.fm.url(file.hash));
			}
			
		});
	},
	
	/**
	 * HTML preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['text/html', 'application/xhtml+xml'],
			preview = ql.preview,
			fm      = ql.fm;
			
		preview.bind('update', function(e) {
			var file = e.file, jqxhr;
			
			if ($.inArray(file.mime, mimes) !== -1) {
				e.stopImmediatePropagation();

				// stop loading on change file if not loaded yet
				preview.one('change', function() {
					if (!jqxhr.isResolved() && !jqxhr.isRejected()) {
						jqxhr.reject();
					}
				});
				
				jqxhr = fm.request({
					data           : {cmd : 'get', target  : file.hash, current : file.phash},
					preventDefault : true
				})
				.done(function(data) {
					ql.hideinfo();
					doc = $('<iframe class="elfinder-quicklook-preview-html"/>').appendTo(preview)[0].contentWindow.document;
					doc.open();
					doc.write(data.content);
					doc.close();
				});
			}
		})
	},
	
	/**
	 * Texts preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var fm      = ql.fm,
			mimes   = fm.res('mimes', 'text'),
			preview = ql.preview;
				
			
		preview.bind('update', function(e) {
			var file = e.file,
				mime = file.mime,
				jqxhr;
			
			if (mime.indexOf('text/') === 0 || $.inArray(mime, mimes) !== -1) {
				e.stopImmediatePropagation();
				
				// stop loading on change file if not loadin yet
				preview.one('change', function() {
					if (!jqxhr.isResolved() && !jqxhr.isRejected()) {
						jqxhr.reject();
					}
				});
				
				jqxhr = fm.request({
					data   : {cmd     : 'get', target  : file.hash },
					preventDefault : true
				})
				.done(function(data) {
					ql.hideinfo();
					$('<div class="elfinder-quicklook-preview-text-wrapper"><pre class="elfinder-quicklook-preview-text">'+fm.escape(data.content)+'</pre></div>').appendTo(preview);
				});
			}
		});
	},
	
	/**
	 * PDF preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var fm      = ql.fm,
			mime    = 'application/pdf',
			preview = ql.preview,
			active  = false;
			
		if (($.browser.safari && navigator.platform.indexOf('Mac') != -1) || $.browser.msie) {
			active = true;
		} else {
			$.each(navigator.plugins, function(i, plugins) {
				$.each(plugins, function(i, plugin) {
					if (plugin.type == mime) {
						return !(active = true);
					}
				});
			});
		}

		active && preview.bind('update', function(e) {
			var file = e.file, node;
			
			if (file.mime == mime) {
				e.stopImmediatePropagation();
				preview.one('change', function() {
					node.unbind('load').remove();
				});
				
				node = $('<iframe class="elfinder-quicklook-preview-pdf"/>')
					.hide()
					.appendTo(preview)
					.load(function() { 
						ql.hideinfo();
						node.show(); 
					})
					.attr('src', fm.url(file.hash));
			}
			
		})
		
			
	},
	
	/**
	 * Flash preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var fm      = ql.fm,
			mime    = 'application/x-shockwave-flash',
			preview = ql.preview,
			active  = false;

		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				if (plugin.type == mime) {
					return !(active = true);
				}
			});
		});
		
		active && preview.bind('update', function(e) {
			var file = e.file,
				node;
				
			if (file.mime == mime) {
				e.stopImmediatePropagation();
				ql.hideinfo();
				preview.append((node = $('<embed class="elfinder-quicklook-preview-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" src="'+fm.url(file.hash)+'" quality="high" type="application/x-shockwave-flash" />')));
			}
		});
	},
	
	/**
	 * HTML5 audio preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var preview  = ql.preview,
			autoplay = !!ql.options['autoplay'],
			mimes    = {
				'audio/mpeg'    : 'mp3',
				'audio/mpeg3'   : 'mp3',
				'audio/mp3'     : 'mp3',
				'audio/x-mpeg3' : 'mp3',
				'audio/x-mp3'   : 'mp3',
				'audio/x-wav'   : 'wav',
				'audio/wav'     : 'wav',
				'audio/x-m4a'   : 'm4a',
				'audio/aac'     : 'm4a',
				'audio/mp4'     : 'm4a',
				'audio/x-mp4'   : 'm4a',
				'audio/ogg'     : 'ogg'
			},
			node;

		preview.bind('update', function(e) {
			var file = e.file,
				type = mimes[file.mime];

			if (ql.support.audio[type]) {
				e.stopImmediatePropagation();
				
				node = $('<audio class="elfinder-quicklook-preview-audio" controls preload="auto" autobuffer><source src="'+ql.fm.url(file.hash)+'" /></audio>')
					.appendTo(preview);
				autoplay && node[0].play();
			}
		}).bind('change', function() {
			if (node && node.parent().length) {
				node[0].pause();
				node.remove();
				node= null;
			}
		});
	},
	
	/**
	 * HTML5 video preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var preview  = ql.preview,
			autoplay = !!ql.options['autoplay'],
			mimes    = {
				'video/mp4'       : 'mp4',
				'video/x-m4v'     : 'mp4',
				'video/ogg'       : 'ogg',
				'application/ogg' : 'ogg',
				'video/webm'      : 'webm'
			},
			node;

		preview.bind('update', function(e) {
			var file = e.file,
				type = mimes[file.mime];
				
			if (ql.support.video[type]) {
				e.stopImmediatePropagation();

				ql.hideinfo();
				node = $('<video class="elfinder-quicklook-preview-video" controls preload="auto" autobuffer><source src="'+ql.fm.url(file.hash)+'" /></video>').appendTo(preview);
				autoplay && node[0].play();
				
			}
		}).bind('change', function() {
			if (node && node.parent().length) {
				node[0].pause();
				node.remove();
				node= null;
			}
		});
	},
	
	/**
	 * Audio/video preview plugin using browser plugins
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var preview = ql.preview,
			mimes   = [],
			node;
			
		$.each(navigator.plugins, function(i, plugins) {
			$.each(plugins, function(i, plugin) {
				(plugin.type.indexOf('audio/') === 0 || plugin.type.indexOf('video/') === 0) && mimes.push(plugin.type);
			});
		});
		
		preview.bind('update', function(e) {
			var file  = e.file,
				mime  = file.mime,
				video;
			
			if ($.inArray(file.mime, mimes) !== -1) {
				e.stopImmediatePropagation();
				(video = mime.indexOf('video/') === 0) && ql.hideinfo();
				node = $('<embed src="'+ql.fm.url(file.hash)+'" type="'+mime+'" class="elfinder-quicklook-preview-'+(video ? 'video' : 'audio')+'"/>')
					.appendTo(preview);
			}
		}).bind('change', function() {
			if (node && node.parent().length) {
				node.remove();
				node= null;
			}
		});
		
	}
	
]

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/reload.js
 */

/**
 * @class  elFinder command "reload"
 * Sync files and folders
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.reload = function() {
	
	this.alwaysEnabled = true;
	this.updateOnSelect = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+shift+r f5'
	}];
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var fm      = this.fm,
			dfrd    = fm.sync(),
			timeout = setTimeout(function() {
				fm.notify({type : 'reload', cnt : 1, hideCnt : true});
				dfrd.always(function() { fm.notify({type : 'reload', cnt  : -1}); });
			}, fm.notifyDelay);
			
		return dfrd.always(function() { 
			clearTimeout(timeout); 
			fm.trigger('reload');
		});
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/rename.js
 */

/**
 * @class elFinder command "rename". 
 * Rename selected file.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.rename = function() {
	this.disableOnSearch = true;
	
	this.shortcuts = [{
		pattern     : 'f2'+(this.fm.OS == 'mac' && ' enter')
	}];
	
	this.getstate = function() {
		var sel = this.fm.selectedFiles();

		return sel.length == 1 && sel[0].phash && !sel[0].locked  ? 0 : -1;
	}
	
	this.exec = function() {
		var fm       = this.fm,
			cwd      = fm.getUI('cwd'),
			sel      = fm.selected(),
			cnt      = sel.length,
			file     = fm.file(sel.shift()),
			filename = '.elfinder-cwd-filename',
			dfrd     = $.Deferred()
				.fail(function(error) {
					var parent = input.parent(),
						name   = fm.escape(file.name);

					error && fm.error(error);
					if (parent.length) {
						input.remove();
						parent.html(name);
					} else {
						cwd.find('#'+file.hash).find(filename).html(name);
					}
				})
				.always(function() {
					fm.enable();
				}),
			input = $('<input type="text"/>')
				.keydown(function(e) {
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (e.keyCode == $.ui.keyCode.ESCAPE) {
						dfrd.reject();
					} else if (e.keyCode == $.ui.keyCode.ENTER) {
						input.blur();
					}
				})
				.mousedown(function(e) {
					e.stopPropagation();
				})
				.blur(function() {
					var name   = $.trim(input.val()),
						parent = input.parent();
					
					if (parent.length) {
						if (name == file.name) {
							return dfrd.reject();
						}
						if (!name) {
							return dfrd.reject('errInvName');
						}
						if (fm.fileByName(name, file.phash)) {
							return dfrd.reject(['errExists', name]);
						}
						
						parent.html(fm.escape(name));
						fm.lockfiles({files : [file.hash]});
						fm.request({
								data   : {cmd : 'rename', target : file.hash, name : name},
								notify : {type : 'rename', cnt : 1}
							})
							.fail(function(error) {
								dfrd.reject();
								fm.sync();
							})
							.done(function(data) {
								dfrd.resolve(data);
							})
							.always(function() {
								fm.unlockfiles({files : [file.hash]})
							});
						
					}
				}),
			node = cwd.find('#'+file.hash).find(filename).empty().append(input.val(file.name));
		
		if (!file || cnt > 1 || !node.length) {
			return dfrd.reject('errCmdParams', this.title);
		}
		
		if (file.locked) {
			return dfrd.reject(['errLocked', file.name]);
		}
		
		fm.disable();
		input.select().focus();
		
		return dfrd;
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/rm.js
 */

/**
 * @class  elFinder command "rm"
 * Delete files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.rm = function() {
	
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace'
	}];
	
	this.getstate = function(sel) {
		var fm = this.fm;
		sel = sel || fm.selected();
		return sel.length && $.map(sel, function(h) { var f = fm.file(h); return f && f.phash && !f.locked ? h : null }).length == sel.length
			? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var self   = this,
			fm     = this.fm,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			files  = this.files(hashes),
			cnt    = files.length,
			cwd    = fm.cwd().hash,
			goroot = false;
		
		if (!cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (!file.phash) {
				return !dfrd.reject(['errRm', file.name, 'errPerm']);
			}
			if (file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
			if (file.hash == cwd) {
				goroot = fm.root(file.hash);
			}
		});

		if (!dfrd.isRejected()) {
			files = this.hashes(hashes);
			
			fm.confirm({
				title  : self.title,
				text   : 'confirmRm',
				accept : {
					label    : 'btnRm',
					callback : function() {  
						fm.lockfiles({files : files});
						fm.request({
							data   : {cmd  : 'rm', targets : files}, 
							notify : {type : 'rm', cnt : cnt},
							preventFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							dfrd.done(data);
							goroot && fm.exec('open', goroot)
						}
						).always(function() {
							fm.unlockfiles({files : files});
						});
					}
				},
				cancel : {
					label    : 'btnCancel',
					callback : function() { dfrd.reject(); }
				}
			});
		}
			
		return dfrd;
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/search.js
 */

/**
 * @class  elFinder command "search"
 * Find files
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.search = function() {
	this.title          = 'Find files';
	this.options        = {ui : 'searchbutton'}
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	
	/**
	 * Return command status.
	 * Search does not support old api.
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return 0;
	}
	
	/**
	 * Send search request to backend.
	 *
	 * @param  String  search string
	 * @return $.Deferred
	 **/
	this.exec = function(q) {
		var fm = this.fm;
		
		if (typeof(q) == 'string' && q) {
			return fm.request({
				data   : {cmd : 'search', q : q},
				notify : {type : 'search', cnt : 1, hideCnt : true}
			});
		}
		fm.getUI('toolbar').find('.'+fm.res('class', 'searchbtn')+' :text').focus();
		return $.Deferred().reject();
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/up.js
 */

/**
 * @class  elFinder command "up"
 * Go into parent directory
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.up = function() {
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	
	this.shortcuts = [{
		pattern     : 'ctrl+up'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().phash ? 0 : -1;
	}
	
	this.exec = function() {
		return this.fm.cwd().phash ? this.fm.exec('open', this.fm.cwd().phash) : $.Deferred().reject();
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/upload.js
 */

/**
 * @class elFinder command "upload"
 * Upload files using iframe or XMLHttpRequest & FormData.
 * Dialog allow to send files using drag and drop
 *
 * @type  elFinder.command
 * @author  Dmitry (dio) Levashov
 */
elFinder.prototype.commands.upload = function() {
	var hover = this.fm.res('class', 'hover');
	
	
	this.disableOnSearch = true;
	this.updateOnSelect  = false;
	
	// Shortcut opens dialog
	this.shortcuts = [{
		pattern     : 'ctrl+u'
	}];
	
	/**
	 * Return command state
	 *
	 * @return Number
	 **/
	this.getstate = function() {
		return this.fm.cwd().write ? 0 : -1;
	}
	
	
	this.exec = function(data) {
		var fm = this.fm,
			upload = function(data) {
				dialog.elfinderdialog('close');
				fm.upload(data)
					.fail(function(error) {
						dfrd.reject(error);
					})
					.done(function(data) {
						dfrd.resolve(data);
					});
			},
			dfrd, dialog, input, button, dropbox;
		
		if (data && (data.input || data.files)) {
			return fm.upload(data);
		}
		
		dfrd = $.Deferred();
		
		
		input = $('<input type="file" multiple="true"/>')
			.change(function() {
				upload({input : input[0]});
			});

		button = $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+fm.i18n('selectForUpload')+'</span></div>')
			.append($('<form/>').append(input))
			.hover(function() {
				button.toggleClass(hover)
			})
			
		dialog = $('<div class="elfinder-upload-dialog-wrapper"/>')
			.append(button);
		
		if (fm.dragUpload) {
			dropbox = $('<div class="ui-corner-all elfinder-upload-dropbox">'+fm.i18n('dropFiles')+'</div>')
				.prependTo(dialog)
				.after('<div class="elfinder-upload-dialog-or">'+fm.i18n('or')+'</div>')[0];

			dropbox.addEventListener('dragenter', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
				$(dropbox).addClass(hover);
			}, false);

			dropbox.addEventListener('dragleave', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
				$(dropbox).removeClass(hover);
			}, false);

			dropbox.addEventListener('dragover', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
			}, false);

			dropbox.addEventListener('drop', function(e) {
				e.stopPropagation();
			  	e.preventDefault();
			
				upload({files : e.dataTransfer.files});
			}, false);
			
		}
		
		fm.dialog(dialog, {
			title          : this.title,
			modal          : true,
			resizable      : false,
			destroyOnClose : true
		});
			
		return dfrd;
	}

}

/*
 * File: /home/troex/Sites/git/elfinder-2.x/js/commands/view.js
 */

/**
 * @class  elFinder command "view"
 * Change current directory view (icons/list)
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.view = function() {
	this.value          = this.fm.storage('view');
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.options = { ui : 'viewbutton'};
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var value = this.fm.storage('view', this.value == 'list' ? 'icons' : 'list');
		this.fm.viewchange();
		this.update(void(0), value);
	}

}
})(jQuery);