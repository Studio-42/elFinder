/**
 * @class elFinder - file manager for web
 *
 * @author Dmitry (dio) Levashov
 **/
var elFinder = function(elm, opts, bootCallback) {
	"use strict";
	//this.time('load');
	var self = this,
		
		/**
		 * Objects array of jQuery.Deferred that calls before elFinder boot up
		 * 
		 * @type Array
		 */
		dfrdsBeforeBootup = [],
		
		/**
		 * Plugin name to check for conflicts with bootstrap etc
		 *
		 * @type Array
		 **/
		conflictChecks = ['button', 'tooltip'],
		
		/**
		 * Node on which elfinder creating
		 *
		 * @type jQuery
		 **/
		node = $(elm),
		
		/**
		 * Object of events originally registered in this node
		 * 
		 * @type Object
		 */
		prevEvents = $.extend(true, {}, $._data(node.get(0), 'events')),
		
		/**
		 * Store node contents.
		 *
		 * @see this.destroy
		 * @type jQuery
		 **/
		prevContent = $('<div></div>').append(node.contents()).attr('class', node.attr('class') || '').attr('style', node.attr('style') || ''),
		
		/**
		 * Instance ID. Required to get/set cookie
		 *
		 * @type String
		 **/
		id = node.attr('id') || node.attr('id', 'elfauto' + $('.elfinder').length).attr('id'),
		
		/**
		 * Events namespace
		 *
		 * @type String
		 **/
		namespace = 'elfinder-' + id,
		
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
		 * Keypup event
		 *
		 * @type String
		 **/
		keyup    = 'keyup.'+namespace,

		/**
		 * Is shortcuts/commands enabled
		 *
		 * @type Boolean
		 **/
		enabled = false,
		
		/**
		 * Store enabled value before ajax request
		 *
		 * @type Boolean
		 **/
		prevEnabled = false,
		
		/**
		 * List of build-in events which mapped into methods with same names
		 *
		 * @type Array
		 **/
		events = ['enable', 'disable', 'load', 'open', 'reload', 'select',  'add', 'remove', 'change', 'dblclick', 'getfile', 'lockfiles', 'unlockfiles', 'selectfiles', 'unselectfiles', 'dragstart', 'dragstop', 'search', 'searchend', 'viewchange'],
		
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
		 * Current working directory options default
		 *
		 * @type Object
		 **/
		cwdOptionsDefault = {
			path          : '',
			url           : '',
			tmbUrl        : '',
			disabled      : [],
			separator     : '/',
			archives      : [],
			extract       : [],
			copyOverwrite : true,
			uploadOverwrite : true,
			uploadMaxSize : 0,
			jpgQuality    : 100,
			tmbCrop       : false,
			tmbReqCustomData : false,
			tmb           : false // old API
		},
		
		/**
		 * Current working directory options
		 *
		 * @type Object
		 **/
		cwdOptions = {},
		
		/**
		 * Files/dirs cache
		 *
		 * @type Object
		 **/
		files = {},
		
		/**
		 * Hidden Files/dirs cache
		 *
		 * @type Object
		 **/
		hiddenFiles = {},

		/**
		 * Files/dirs hash cache of each dirs
		 *
		 * @type Object
		 **/
		ownFiles = {},
		
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
		 * Copied/cuted files hashes
		 * Prevent from remove its from cache.
		 * Required for dispaly correct files names in error messages
		 *
		 * @type Object
		 **/
		remember = {},
		
		/**
		 * Queue for 'open' requests
		 *
		 * @type Array
		 **/
		queue = [],
		
		/**
		 * Queue for only cwd requests e.g. `tmb`
		 *
		 * @type Array
		 **/
		cwdQueue = [],
		
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
		 * Number: pixcel or String: Number + "%"
		 *
		 * @type Number | String
		 * @default 400
		 **/
		height = 400,
		
		/**
		 * Base node object or selector
		 * Element which is the reference of the height percentage
		 *
		 * @type Object|String
		 * @default null | $(window) (if height is percentage)
		 **/
		heightBase = null,
		
		/**
		 * MIME type list(Associative array) handled as a text file
		 * 
		 * @type Object|null
		 */
		textMimes = null,
		
		/**
		 * elfinder path for sound played on remove
		 * @type String
		 * @default ./sounds/
		 **/
		soundPath = 'sounds/',
		
		/**
		 * JSON.stringify of previous fm.sorters
		 * @type String
		 */
		prevSorterStr = '',

		/**
		 * Map table of file extention to MIME-Type
		 * @type Object
		 */
		extToMimeTable,

		/**
		 * Disabled page unload function
		 * @type Boolean
		 */
		diableUnloadCheck = false,

		beeper = $(document.createElement('audio')).hide().appendTo('body')[0],
			
		syncInterval,
		autoSyncStop = 0,
		
		uiCmdMapPrev = '',
		
		gcJobRes = null,
		
		open = function(data) {
			// NOTES: Do not touch data object
		
			var volumeid, contextmenu, emptyDirs = {}, stayDirs = {},
				rmClass, hashes, calc, gc, collapsed, prevcwd, sorterStr, diff;
			
			if (self.api >= 2.1) {
				// support volume driver option `uiCmdMap`
				self.commandMap = (data.options.uiCmdMap && Object.keys(data.options.uiCmdMap).length)? data.options.uiCmdMap : {};
				if (uiCmdMapPrev !== JSON.stringify(self.commandMap)) {
					uiCmdMapPrev = JSON.stringify(self.commandMap);
				}
			} else {
				self.options.sync = 0;
			}
			
			if (data.init) {
				// init - reset cache
				files = {};
				ownFiles = {};
			} else {
				// remove only files from prev cwd
				// and collapsed directory (included 100+ directories) to empty for perfomance tune in DnD
				prevcwd = cwd;
				rmClass = 'elfinder-subtree-loaded ' + self.res('class', 'navexpand');
				collapsed = self.res('class', 'navcollapse');
				hashes = Object.keys(files);
				calc = function(i) {
					if (!files[i]) {
						return true;
					}
					
					var isDir = (files[i].mime === 'directory'),
						phash = files[i].phash,
						pnav;
						
					if (
						(!isDir
							|| emptyDirs[phash]
							|| (!stayDirs[phash]
								&& self.navHash2Elm(files[i].hash).is(':hidden')
								&& self.navHash2Elm(phash).next('.elfinder-navbar-subtree').children().length > 100
							)
						)
						&& (isDir || phash !== cwd)
						&& ! remember[i]
					) {
						if (isDir && !emptyDirs[phash]) {
							emptyDirs[phash] = true;
							self.navHash2Elm(phash)
							 .removeClass(rmClass)
							 .next('.elfinder-navbar-subtree').empty();
						}
						deleteCache(files[i]);
					} else if (isDir) {
						stayDirs[phash] = true;
					}
				};
				gc = function() {
					if (hashes.length) {
						gcJobRes && gcJobRes._abort();
						gcJobRes = self.asyncJob(calc, hashes, {
							interval : 20,
							numPerOnce : 100
						}).done(function() {
							var hd = self.storage('hide') || {items: {}};
							if (Object.keys(hiddenFiles).length) {
								$.each(hiddenFiles, function(h) {
									if (!hd.items[h]) {
										delete hiddenFiles[h];
									}
								});
							}
						});
					}
				};
				
				self.trigger('filesgc').one('filesgc', function() {
					hashes = [];
				});
				
				self.one('opendone', function() {
					if (prevcwd !== cwd) {
						if (! node.data('lazycnt')) {
							gc();
						} else {
							self.one('lazydone', gc);
						}
					}
				});
			}

			self.sorters = {};
			cwd = data.cwd.hash;
			cache(data.files);
			if (!files[cwd]) {
				cache([data.cwd]);
			} else {
				diff = self.diff([data.cwd], true);
				if (diff.changed.length) {
					cache(diff.changed, 'change');
					self.change({changed: diff.changed});
				}
			}
			data.changed && data.changed.length && cache(data.changed, 'change');

			// trigger event 'sorterupdate'
			sorterStr = JSON.stringify(self.sorters);
			if (prevSorterStr !== sorterStr) {
				self.trigger('sorterupdate');
				prevSorterStr = sorterStr;
			}

			self.lastDir(cwd);
			
			self.autoSync();
		},
		
		/**
		 * Store info about files/dirs in "files" object.
		 *
		 * @param  Array  files
		 * @param  String data type
		 * @return void
		 **/
		cache = function(data, type) {
			var type      = type || 'files',
				keeps = ['sizeInfo', 'encoding'],
				defsorter = { name: true, perm: true, date: true,  size: true, kind: true },
				sorterChk = !self.sorters._checked && (type === 'files'),
				l         = data.length,
				setSorter = function(file) {
					var f = file || {},
						sorters = [];
					$.each(self.sortRules, function(key) {
						if (defsorter[key] || typeof f[key] !== 'undefined' || (key === 'mode' && typeof f.perm !== 'undefined')) {
							sorters.push(key);
						}
					});
					self.sorters = self.arrayFlip(sorters, true);
					self.sorters._checked = true;
				},
				changedParents = {},
				hideData = self.storage('hide') || {},
				hides = hideData.items || {},
				f, i, i1, keepProp, parents, hidden;

			for (i = 0; i < l; i++) {
				f = Object.assign({}, data[i]);
				hidden = (!hideData.show && hides[f.hash])? true : false;
				if (f.name && f.hash && f.mime) {
					if (!hidden) {
						if (sorterChk && f.phash === cwd) {
							setSorter(f);
							sorterChk = false;
						}
						
						if (f.phash && (type === 'add' || (type === 'change' && (!files[f.hash] || f.size !== files[f.hash])))) {
							if (parents = self.parents(f.phash)) {
								$.each(parents, function() {
									changedParents[this] = true;
								});
							}
						}
					}

					if (files[f.hash]) {
						for (i1 =0; i1 < keeps.length; i1++) {
							if(files[f.hash][keeps[i1]] && ! f[keeps[i1]]) {
								f[keeps[i1]] = files[f.hash][keeps[i1]];
							}
						}
						if (f.sizeInfo && !f.size) {
							f.size = f.sizeInfo.size;
						}
						deleteCache(files[f.hash], true);
					}
					if (hides[f.hash]) {
						hiddenFiles[f.hash] = f;
					}
					if (hidden) {
						l--;
						data.splice(i--, 1);
					} else {
						files[f.hash] = f;
						if (f.mime === 'directory' && !ownFiles[f.hash]) {
							ownFiles[f.hash] = {};
						}
						if (f.phash) {
							if (!ownFiles[f.phash]) {
								ownFiles[f.phash] = {};
							}
							ownFiles[f.phash][f.hash] = true;
						}
					}
				}
			}
			// delete sizeInfo cache
			$.each(Object.keys(changedParents), function() {
				var target = files[this];
				if (target && target.sizeInfo) {
					delete target.sizeInfo;
				}
			});
			
			// for empty folder
			sorterChk && setSorter();
		},
		
		/**
		 * Delete file object from files caches
		 * 
		 * @param  Array  removed hashes
		 * @return void
		 */
		remove = function(removed) {
			var l       = removed.length,
				roots   = {},
				rm      = function(hash) {
					var file = files[hash], i;
					if (file) {
						if (file.mime === 'directory') {
							if (roots[hash]) {
								delete self.roots[roots[hash]];
							}
							// restore stats of deleted root parent directory
							$.each(self.leafRoots, function(phash, roots) {
								var idx, pdir;
								if ((idx = $.inArray(hash, roots))!== -1) {
									if (roots.length === 1) {
										if ((pdir = Object.assign({}, files[phash])) && pdir._realStats) {
											$.each(pdir._realStats, function(k, v) {
												pdir[k] = v;
											});
											remove(files[phash]._realStats);
											self.change({ changed: [pdir] });
										}
										delete self.leafRoots[phash];
									} else {
										self.leafRoots[phash].splice(idx, 1);
									}
								}
							});
							if (self.searchStatus.state < 2) {
								$.each(files, function(h, f) {
									f.phash == hash && rm(h);
								});
							}
						}
						if (file.phash) {
							if (parents = self.parents(file.phash)) {
								$.each(parents, function() {
									changedParents[this] = true;
								});
							}
						}
						deleteCache(files[hash]);
					}
				},
				changedParents = {},
				parents;
		
			$.each(self.roots, function(k, v) {
				roots[v] = k;
			});
			while (l--) {
				rm(removed[l]);
			}
			// delete sizeInfo cache
			$.each(Object.keys(changedParents), function() {
				var target = files[this];
				if (target && target.sizeInfo) {
					delete target.sizeInfo;
				}
			});
		},
		
		/**
		 * Update file object in files caches
		 * 
		 * @param  Array  changed file objects
		 * @return void
		 * @deprecated should be use `cache(updatesArrayData, 'change');`
		 */
		change = function(changed) {
			$.each(changed, function(i, file) {
				var hash = file.hash;
				if (files[hash]) {
					$.each(Object.keys(files[hash]), function(i, v){
						if (typeof file[v] === 'undefined') {
							delete files[hash][v];
						}
					});
				}
				files[hash] = files[hash] ? Object.assign(files[hash], file) : file;
			});
		},
		
		/**
		 * Delete cache data of files, ownFiles and self.optionsByHashes
		 * 
		 * @param  Object  file
		 * @param  Boolean update
		 * @return void
		 */
		deleteCache = function(file, update) {
			var hash = file.hash,
				phash = file.phash;
			
			if (phash && ownFiles[phash]) {
				 delete ownFiles[phash][hash];
			}
			if (!update) {
				ownFiles[hash] && delete ownFiles[hash];
				self.optionsByHashes[hash] && delete self.optionsByHashes[hash];
			}
			delete files[hash];
		},
		
		/**
		 * Maximum number of concurrent connections on request
		 * 
		 * @type Number
		 */
		requestMaxConn,
		
		/**
		 * Current number of connections
		 * 
		 * @type Number
		 */
		requestCnt = 0,
		
		/**
		 * Queue waiting for connection
		 * 
		 * @type Array
		 */
		requestQueue = [],
		
		/**
		 * Current open command instance
		 * 
		 * @type Object
		 */
		currentOpenCmd = null,

		/**
		 * Exec shortcut
		 *
		 * @param  jQuery.Event  keydown/keypress event
		 * @return void
		 */
		execShortcut = function(e) {
			var code    = e.keyCode,
				ctrlKey = !!(e.ctrlKey || e.metaKey),
				isMousedown = e.type === 'mousedown',
				ddm;

			!isMousedown && (self.keyState.keyCode = code);
			self.keyState.ctrlKey  = ctrlKey;
			self.keyState.shiftKey = e.shiftKey;
			self.keyState.metaKey  = e.metaKey;
			self.keyState.altKey   = e.altKey;
			if (isMousedown) {
				return;
			} else if (e.type === 'keyup') {
				self.keyState.keyCode = null;
				return;
			}

			if (enabled) {

				$.each(shortcuts, function(i, shortcut) {
					if (shortcut.type    == e.type 
					&& shortcut.keyCode  == code 
					&& shortcut.shiftKey == e.shiftKey 
					&& shortcut.ctrlKey  == ctrlKey 
					&& shortcut.altKey   == e.altKey) {
						e.preventDefault();
						e.stopPropagation();
						shortcut.callback(e, self);
						self.debug('shortcut-exec', i+' : '+shortcut.description);
					}
				});
				
				// prevent tab out of elfinder
				if (code == $.ui.keyCode.TAB && !$(e.target).is(':input')) {
					e.preventDefault();
				}
				
				// cancel any actions by [Esc] key
				if (e.type === 'keydown' && code == $.ui.keyCode.ESCAPE) {
					// copy or cut 
					if (! node.find('.ui-widget:visible').length) {
						self.clipboard().length && self.clipboard([]);
					}
					// dragging
					if ($.ui.ddmanager) {
						ddm = $.ui.ddmanager.current;
						ddm && ddm.helper && ddm.cancel();
					}
					// button menus
					self.toHide(node.find('.ui-widget.elfinder-button-menu.elfinder-frontmost:visible'));
					// trigger keydownEsc
					self.trigger('keydownEsc', e);
				}

			}
		},
		date = new Date(),
		utc,
		i18n,
		inFrame = (window.parent !== window),
		parentIframe = (function() {
			var pifm, ifms;
			if (inFrame) {
				try {
					ifms = $('iframe', window.parent.document);
					if (ifms.length) {
						$.each(ifms, function(i, ifm) {
							if (ifm.contentWindow === window) {
								pifm = $(ifm);
								return false;
							}
						});
					}
				} catch(e) {}
			}
			return pifm;
		})(),
		/**
		 * elFinder boot up function
		 * 
		 * @type Function
		 */
		bootUp,
		/**
		 * Original function of XMLHttpRequest.prototype.send
		 * 
		 * @type Function
		 */
		savedXhrSend;
	
	// opts must be an object
	if (!opts) {
		opts = {};
	}
	
	// set UA.Angle, UA.Rotated for mobile devices
	if (self.UA.Mobile) {
		$(window).on('orientationchange.'+namespace, function() {
			var a = ((screen && screen.orientation && screen.orientation.angle) || window.orientation || 0) + 0;
			if (a === -90) {
				a = 270;
			}
			self.UA.Angle = a;
			self.UA.Rotated = a % 180 === 0? false : true;
		}).trigger('orientationchange.'+namespace);
	}
	
	// check opt.bootCallback
	if (opts.bootCallback && typeof opts.bootCallback === 'function') {
		(function() {
			var func = bootCallback,
				opFunc = opts.bootCallback;
			bootCallback = function(fm, extraObj) {
				func && typeof func === 'function' && func.call(this, fm, extraObj);
				opFunc.call(this, fm, extraObj);
			};
		})();
	}
	delete opts.bootCallback;

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
	 * Net drivers names
	 *
	 * @type Array
	 **/
	this.netDrivers = [];
	
	/**
	 * Base URL of elfFinder library starting from Manager HTML
	 * 
	 * @type String
	 */
	this.baseUrl = '';
	
	/**
	 * Base URL of i18n js files
	 * baseUrl + "js/i18n/" when empty value
	 * 
	 * @type String
	 */
	this.i18nBaseUrl = '';

	/**
	 * Base URL of worker js files
	 * baseUrl + "js/worker/" when empty value
	 * 
	 * @type String
	 */
	this.workerBaseUrl = '';

	/**
	 * Is elFinder CSS loaded
	 * 
	 * @type Boolean
	 */
	this.cssloaded = false;
	
	/**
	 * Current theme object
	 * 
	 * @type Object|Null
	 */
	this.theme = null;

	this.mimesCanMakeEmpty = {};

	/**
	 * Callback function at boot up that option specified at elFinder starting
	 * 
	 * @type Function
	 */
	this.bootCallback;

	/**
	 * Callback function at reload(restart) elFinder 
	 * 
	 * @type Function
	 */
	this.reloadCallback;

	/**
	 * ID. Required to create unique cookie name
	 *
	 * @type String
	 **/
	this.id = id;

	/**
	 * Method to store/fetch data
	 *
	 * @type Function
	 **/
	this.storage = (function() {
		try {
			if ('localStorage' in window && window.localStorage !== null) {
				if (self.UA.Safari) {
					// check for Mac/iOS safari private browsing mode
					window.localStorage.setItem('elfstoragecheck', 1);
					window.localStorage.removeItem('elfstoragecheck');
				}
				return self.localStorage;
			} else {
				return self.cookie;
			}
		} catch (e) {
			return self.cookie;
		}
	})();

	/**
	 * Set pause page unload check function or Get state
	 *
	 * @param      Boolean   state   To set state
	 * @param      Boolean   keep    Keep disabled
	 * @return     Boolean|void
	 */
	this.pauseUnloadCheck = function(state, keep) {
		if (typeof state === 'undefined') {
			return diableUnloadCheck;
		} else {
			diableUnloadCheck = !!state;
			if (state && !keep) {
				requestAnimationFrame(function() {
					diableUnloadCheck = false;
				});
			}
		}
	};

	/**
	 * Configuration options
	 *
	 * @type Object
	 **/
	//this.options = $.extend(true, {}, this._options, opts);
	this.options = Object.assign({}, this._options);
	
	// for old type configuration
	if (opts.uiOptions) {
		if (opts.uiOptions.toolbar && Array.isArray(opts.uiOptions.toolbar)) {
			if ($.isPlainObject(opts.uiOptions.toolbar[opts.uiOptions.toolbar.length - 1])) {
				self.options.uiOptions.toolbarExtra = Object.assign(self.options.uiOptions.toolbarExtra || {}, opts.uiOptions.toolbar.pop());
			}
		}
	}
	
	// Overwrite if opts value is an array
	(function() {
		var arrOv = function(obj, base) {
			if ($.isPlainObject(obj)) {
				$.each(obj, function(k, v) {
					if ($.isPlainObject(v)) {
						if (!base[k]) {
							base[k] = {};
						}
						arrOv(v, base[k]);
					} else {
						base[k] = v;
					}
				});
			}
		};
		arrOv(opts, self.options);
	})();
	
	// join toolbarExtra to toolbar
	this.options.uiOptions.toolbar.push(this.options.uiOptions.toolbarExtra);
	delete this.options.uiOptions.toolbarExtra;

	/**
	 * Arrays that has to unbind events
	 * 
	 * @type Object
	 */
	this.toUnbindEvents = {};
	
	/**
	 * Attach listener to events
	 * To bind to multiply events at once, separate events names by space
	 * 
	 * @param  String  event(s) name(s)
	 * @param  Object  event handler or {done: handler}
	 * @param  Boolean priority first
	 * @return elFinder
	 */
	this.bind = function(event, callback, priorityFirst) {
		var i, len;
		
		if (callback && (typeof callback === 'function' || typeof callback.done === 'function')) {
			event = ('' + event).toLowerCase().replace(/^\s+|\s+$/g, '').split(/\s+/);
			
			len = event.length;
			for (i = 0; i < len; i++) {
				if (listeners[event[i]] === void(0)) {
					listeners[event[i]] = [];
				}
				listeners[event[i]][priorityFirst? 'unshift' : 'push'](callback);
			}
		}
		return this;
	};
	
	/**
	 * Remove event listener if exists
	 * To un-bind to multiply events at once, separate events names by space
	 *
	 * @param  String    event(s) name(s)
	 * @param  Function  callback
	 * @return elFinder
	 */
	this.unbind = function(event, callback) {
		var i, len, l, ci;
		
		event = ('' + event).toLowerCase().split(/\s+/);
		
		len = event.length;
		for (i = 0; i < len; i++) {
			if (l = listeners[event[i]]) {
				ci = $.inArray(callback, l);
				ci > -1 && l.splice(ci, 1);
			}
		}
		
		callback = null;
		return this;
	};
	
	/**
	 * Fire event - send notification to all event listeners
	 * In the callback `this` becames an event object
	 *
	 * @param  String   event type
	 * @param  Object   data to send across event
	 * @param  Boolean  allow modify data (call by reference of data) default: true
	 * @return elFinder
	 */
	this.trigger = function(evType, data, allowModify) {
		var type      = evType.toLowerCase(),
			isopen    = (type === 'open'),
			dataIsObj = (typeof data === 'object'),
			handlers  = listeners[type] || [],
			dones     = [],
			i, l, jst, event;
		
		this.debug('event-'+type, data);
		
		if (! dataIsObj || typeof allowModify === 'undefined') {
			allowModify = true;
		}
		if (l = handlers.length) {
			event = $.Event(type);
			if (data) {
				data._getEvent = function() {
					return event;
				};
			}
			if (allowModify) {
				event.data = data;
			}

			for (i = 0; i < l; i++) {
				if (! handlers[i]) {
					// probably un-binded this handler
					continue;
				}

				// handler is $.Deferred(), call all functions upon completion
				if (handlers[i].done) {
					dones.push(handlers[i].done);
					continue;
				}
				
				// set `event.data` only callback has argument
				if (handlers[i].length) {
					if (!allowModify) {
						// to avoid data modifications. remember about "sharing" passing arguments in js :) 
						if (typeof jst === 'undefined') {
							try {
								jst = JSON.stringify(data);
							} catch(e) {
								jst = false;
							}
						}
						event.data = jst? JSON.parse(jst) : data;
					}
				}

				try {
					if (handlers[i].call(event, event, this) === false || event.isDefaultPrevented()) {
						this.debug('event-stoped', event.type);
						break;
					}
				} catch (ex) {
					window.console && window.console.log && window.console.log(ex);
				}
				
			}
			
			// call done functions
			if (l = dones.length) {
				for (i = 0; i < l; i++) {
					try {
						if (dones[i].call(event, event, this) === false || event.isDefaultPrevented()) {
							this.debug('event-stoped', event.type + '(done)');
							break;
						}
					} catch (ex) {
						window.console && window.console.log && window.console.log(ex);
					}
				}
			}

			if (this.toUnbindEvents[type] && this.toUnbindEvents[type].length) {
				$.each(this.toUnbindEvents[type], function(i, v) {
					self.unbind(v.type, v.callback);
				});
				delete this.toUnbindEvents[type];
			}
		}
		return this;
	};
	
	/**
	 * Get event listeners
	 *
	 * @param  String   event type
	 * @return Array    listed event functions
	 */
	this.getListeners = function(event) {
		return event? listeners[event.toLowerCase()] : listeners;
	};

	// set fm.baseUrl
	this.baseUrl = (function() {
		var myTag, base, baseUrl;
		
		if (self.options.baseUrl) {
			return self.options.baseUrl;
		} else {
			baseUrl = '';
			myTag = null;
			$('head > script').each(function() {
				if (this.src && this.src.match(/js\/elfinder(?:-[a-z0-9_-]+)?\.(?:min|full)\.js(?:$|\?)/i)) {
					myTag = $(this);
					return false;
				}
			});
			if (myTag) {
				baseUrl = myTag.attr('src').replace(/js\/[^\/]+$/, '');
				if (! baseUrl.match(/^(https?\/\/|\/)/)) {
					// check <base> tag
					if (base = $('head > base[href]').attr('href')) {
						baseUrl = base.replace(/\/$/, '') + '/' + baseUrl; 
					}
				}
			}
			if (baseUrl !== '') {
				self.options.baseUrl = baseUrl;
			} else {
				if (! self.options.baseUrl) {
					self.options.baseUrl = './';
				}
				baseUrl = self.options.baseUrl;
			}
			return baseUrl;
		}
	})();
	
	this.i18nBaseUrl = (this.options.i18nBaseUrl || this.baseUrl + 'js/i18n').replace(/\/$/, '') + '/';
	this.workerBaseUrl = (this.options.workerBaseUrl || this.baseUrl + 'js/worker').replace(/\/$/, '') + '/';

	this.options.maxErrorDialogs = Math.max(1, parseInt(this.options.maxErrorDialogs || 5));

	// set dispInlineRegex
	cwdOptionsDefault.dispInlineRegex = this.options.dispInlineRegex;

	// auto load required CSS
	if (this.options.cssAutoLoad) {
		(function() {
			var baseUrl = self.baseUrl,
				myCss = $('head > link[href$="css/elfinder.min.css"],link[href$="css/elfinder.full.css"]:first').length,
				rmTag = function() {
					if (node.data('cssautoloadHide')) {
						node.data('cssautoloadHide').remove();
						node.removeData('cssautoloadHide');
					}
				},
				loaded = function() {
					if (!self.cssloaded) {
						rmTag();
						self.cssloaded = true;
						self.trigger('cssloaded');
					}
				};
			
			if (! myCss) {
				// to request CSS auto loading
				self.cssloaded = null;
			}

			// additional CSS files
			if (Array.isArray(self.options.cssAutoLoad)) {
				if (!self.options.themes.default) {
					// set as default theme
					self.options.themes = Object.assign({
						'default' : {
							'name': 'default',
							'cssurls': self.options.cssAutoLoad
						}
					}, self.options.themes);
					if (!self.options.theme) {
						self.options.theme = 'default';
					}
				} else {
					if (self.cssloaded === true) {
						self.loadCss(self.options.cssAutoLoad);
					} else {
						self.bind('cssloaded', function() {
							self.loadCss(self.options.cssAutoLoad);
						});
					}
				}
			}

			// try to load main css
			if (self.cssloaded === null) {
				// hide elFinder node while css loading
				node.addClass('elfinder')
					.data('cssautoloadHide', $('<style>.elfinder{visibility:hidden;overflow:hidden}</style>'));
				$('head').append(node.data('cssautoloadHide'));

				// set default theme
				if (!self.options.themes.default) {
					self.options.themes = Object.assign({
						'default' : {
							'name': 'default',
							'cssurls': 'css/theme.css',
							'author': 'elFinder Project',
							'license': '3-clauses BSD'
						}
					}, self.options.themes);
					if (!self.options.theme) {
						self.options.theme = 'default';
					}
				}

				// Delay 'visibility' check it required for browsers such as Safari
				requestAnimationFrame(function() {
					if (node.css('visibility') === 'hidden') {
						// load CSS
						self.loadCss([baseUrl+'css/elfinder.min.css'], {
							dfd: $.Deferred().done(function() {
								loaded();
							}).fail(function() {
								rmTag();
								if (!self.cssloaded) {
									self.cssloaded = false;
									self.bind('init', function() {
										if (!self.cssloaded) {
											self.error(['errRead', 'CSS (elfinder.min)']);
										}
									});
								}
							})
						});
					} else {
						loaded();
					}
				});
			}
		})();
	}

	// load theme if exists
	(function() {
		var theme,
			themes = self.options.themes,
			ids = Object.keys(themes || {});
		if (ids.length) {
			theme = self.storage('theme') || self.options.theme;
			if (!themes[theme]) {
				theme = ids[0];
			}
			if (self.cssloaded) {
				self.changeTheme(theme);
			} else {
				self.bind('cssloaded', function() {
					self.changeTheme(theme);
				});
			}
		}
	})();
	
	/**
	 * Volume option to set the properties of the root Stat
	 * 
	 * @type Object
	 */
	this.optionProperties = {
		icon: void(0),
		csscls: void(0),
		tmbUrl: void(0),
		uiCmdMap: {},
		netkey: void(0),
		disabled: []
	};
	
	if (! inFrame && ! this.options.enableAlways && $('body').children().length === 2) { // only node and beeper
		this.options.enableAlways = true;
	}
	
	// make options.debug
	if (this.options.debug === true) {
		this.options.debug = 'all';
	} else if (Array.isArray(this.options.debug)) {
		(function() {
			var d = {};
			$.each(self.options.debug, function() {
				d[this] = true;
			});
			self.options.debug = d;
		})();
	} else {
		this.options.debug = false;
	}
	
	/**
	 * Original functions evacuated by conflict check
	 * 
	 * @type Object
	 */
	this.noConflicts = {};
	
	/**
	 * Check and save conflicts with bootstrap etc
	 * 
	 * @type Function
	 */
	this.noConflict = function() {
		$.each(conflictChecks, function(i, p) {
			if ($.fn[p] && typeof $.fn[p].noConflict === 'function') {
				self.noConflicts[p] = $.fn[p].noConflict();
			}
		});
	};
	// do check conflict
	this.noConflict();
	
	/**
	 * Is elFinder over CORS
	 *
	 * @type Boolean
	 **/
	this.isCORS = false;
	
	// configure for CORS
	(function(){
		if (typeof self.options.cors !== 'undefined' && self.options.cors !== null) {
			self.isCORS = self.options.cors? true : false;
		} else {
			var parseUrl = document.createElement('a'),
				parseUploadUrl,
				selfProtocol = window.location.protocol,
				portReg = function(protocol) {
					protocol = (!protocol || protocol === ':')? selfProtocol : protocol;
					return protocol === 'https:'? /\:443$/ : /\:80$/;
				},
				selfHost = window.location.host.replace(portReg(selfProtocol), '');
			parseUrl.href = opts.url;
			if (opts.urlUpload && (opts.urlUpload !== opts.url)) {
				parseUploadUrl = document.createElement('a');
				parseUploadUrl.href = opts.urlUpload;
			}
			if (selfHost !== parseUrl.host.replace(portReg(parseUrl.protocol), '')
				|| (parseUrl.protocol !== ':'&& parseUrl.protocol !== '' && (selfProtocol !== parseUrl.protocol))
				|| (parseUploadUrl && 
					(selfHost !== parseUploadUrl.host.replace(portReg(parseUploadUrl.protocol), '')
					|| (parseUploadUrl.protocol !== ':' && parseUploadUrl.protocol !== '' && (selfProtocol !== parseUploadUrl.protocol))
					)
				)
			) {
				self.isCORS = true;
			}
		}
		if (self.isCORS) {
			if (!$.isPlainObject(self.options.customHeaders)) {
				self.options.customHeaders = {};
			}
			if (!$.isPlainObject(self.options.xhrFields)) {
				self.options.xhrFields = {};
			}
			self.options.requestType = 'post';
			self.options.customHeaders['X-Requested-With'] = 'XMLHttpRequest';
			self.options.xhrFields['withCredentials'] = true;
		}
	})();

	/**
	 * Ajax request type
	 *
	 * @type String
	 * @default "get"
	 **/
	this.requestType = /^(get|post)$/i.test(this.options.requestType) ? this.options.requestType.toLowerCase() : 'get';
	
	// set `requestMaxConn` by option
	requestMaxConn = Math.max(parseInt(this.options.requestMaxConn), 1);
	
	/**
	 * Custom data that given as options
	 * 
	 * @type Object
	 * @default {}
	 */
	this.optsCustomData = $.isPlainObject(this.options.customData) ? this.options.customData : {};

	/**
	 * Any data to send across every ajax request
	 *
	 * @type Object
	 * @default {}
	 **/
	this.customData = Object.assign({}, this.optsCustomData);

	/**
	 * Previous custom data from connector
	 * 
	 * @type Object|null
	 */
	this.prevCustomData = null;

	/**
	 * Any custom headers to send across every ajax request
	 *
	 * @type Object
	 * @default {}
	*/
	this.customHeaders = $.isPlainObject(this.options.customHeaders) ? this.options.customHeaders : {};

	/**
	 * Any custom xhrFields to send across every ajax request
	 *
	 * @type Object
	 * @default {}
	 */
	this.xhrFields = $.isPlainObject(this.options.xhrFields) ? this.options.xhrFields : {};

	/**
	 * Replace XMLHttpRequest.prototype.send to extended function for 3rd party libs XHR request etc.
	 * 
	 * @type Function
	 */
	this.replaceXhrSend = function() {
		if (! savedXhrSend) {
			savedXhrSend = XMLHttpRequest.prototype.send;
		}
		XMLHttpRequest.prototype.send = function() {
			var xhr = this;
			// set request headers
			if (self.customHeaders) {
				$.each(self.customHeaders, function(key) {
					xhr.setRequestHeader(key, this);
				});
			}
			// set xhrFields
			if (self.xhrFields) {
				$.each(self.xhrFields, function(key) {
					if (key in xhr) {
						xhr[key] = this;
					}
				});
			}
			return savedXhrSend.apply(this, arguments);
		};
	};
	
	/**
	 * Restore saved original XMLHttpRequest.prototype.send
	 * 
	 * @type Function
	 */
	this.restoreXhrSend = function() {
		savedXhrSend && (XMLHttpRequest.prototype.send = savedXhrSend);
	};

	/**
	 * command names for into queue for only cwd requests
	 * these commands aborts before `open` request
	 *
	 * @type Array
	 * @default ['tmb', 'parents']
	 */
	this.abortCmdsOnOpen = this.options.abortCmdsOnOpen || ['tmb', 'parents'];

	/**
	 * ui.nav id prefix
	 * 
	 * @type String
	 */
	this.navPrefix = 'nav' + (elFinder.prototype.uniqueid? elFinder.prototype.uniqueid : '') + '-';
	
	/**
	 * ui.cwd id prefix
	 * 
	 * @type String
	 */
	this.cwdPrefix = elFinder.prototype.uniqueid? ('cwd' + elFinder.prototype.uniqueid + '-') : '';
	
	// Increment elFinder.prototype.uniqueid
	++elFinder.prototype.uniqueid;
	
	/**
	 * URL to upload files
	 *
	 * @type String
	 **/
	this.uploadURL = opts.urlUpload || opts.url;
	
	/**
	 * Events namespace
	 *
	 * @type String
	 **/
	this.namespace = namespace;

	/**
	 * Today timestamp
	 *
	 * @type Number
	 **/
	this.today = (new Date(date.getFullYear(), date.getMonth(), date.getDate())).getTime()/1000;
	
	/**
	 * Yesterday timestamp
	 *
	 * @type Number
	 **/
	this.yesterday = this.today - 86400;
	
	utc = this.options.UTCDate ? 'UTC' : '';
	
	this.getHours    = 'get'+utc+'Hours';
	this.getMinutes  = 'get'+utc+'Minutes';
	this.getSeconds  = 'get'+utc+'Seconds';
	this.getDate     = 'get'+utc+'Date';
	this.getDay      = 'get'+utc+'Day';
	this.getMonth    = 'get'+utc+'Month';
	this.getFullYear = 'get'+utc+'FullYear';
	
	/**
	 * elFinder node z-index (auto detect on elFinder load)
	 *
	 * @type null | Number
	 **/
	this.zIndex;

	/**
	 * Current search status
	 * 
	 * @type Object
	 */
	this.searchStatus = {
		state  : 0, // 0: search ended, 1: search started, 2: in search result
		query  : '',
		target : '',
		mime   : '',
		mixed  : false, // in multi volumes search: false or Array that target volume ids
		ininc  : false // in incremental search
	};

	/**
	 * Interface language
	 *
	 * @type String
	 * @default "en"
	 **/
	this.lang = this.storage('lang') || this.options.lang;
	if (this.lang === 'jp') {
		this.lang = this.options.lang = 'ja';
	}

	this.viewType = this.storage('view') || this.options.defaultView || 'icons';

	this.sortType = this.storage('sortType') || this.options.sortType || 'name';
	
	this.sortOrder = this.storage('sortOrder') || this.options.sortOrder || 'asc';

	this.sortStickFolders = this.storage('sortStickFolders');
	if (this.sortStickFolders === null) {
		this.sortStickFolders = !!this.options.sortStickFolders;
	} else {
		this.sortStickFolders = !!this.sortStickFolders;
	}

	this.sortAlsoTreeview = this.storage('sortAlsoTreeview');
	if (this.sortAlsoTreeview === null || this.options.sortAlsoTreeview === null) {
		this.sortAlsoTreeview = !!this.options.sortAlsoTreeview;
	} else {
		this.sortAlsoTreeview = !!this.sortAlsoTreeview;
	}

	this.sortRules = $.extend(true, {}, this._sortRules, this.options.sortRules);
	
	$.each(this.sortRules, function(name, method) {
		if (typeof method != 'function') {
			delete self.sortRules[name];
		} 
	});
	
	this.compare = $.proxy(this.compare, this);
	
	/**
	 * Delay in ms before open notification dialog
	 *
	 * @type Number
	 * @default 500
	 **/
	this.notifyDelay = this.options.notifyDelay > 0 ? parseInt(this.options.notifyDelay) : 500;
	
	/**
	 * Dragging UI Helper object
	 *
	 * @type jQuery | null
	 **/
	this.draggingUiHelper = null;
	
	/**
	 * Base droppable options
	 *
	 * @type Object
	 **/
	this.droppable = {
		greedy     : true,
		tolerance  : 'pointer',
		accept     : '.elfinder-cwd-file-wrapper,.elfinder-navbar-dir,.elfinder-cwd-file,.elfinder-cwd-filename',
		hoverClass : this.res('class', 'adroppable'),
		classes    : { // Deprecated hoverClass jQueryUI>=1.12.0
			'ui-droppable-hover': this.res('class', 'adroppable')
		},
		autoDisable: true, // elFinder original, see jquery.elfinder.js
		drop : function(e, ui) {
			var dst     = $(this),
				targets = $.grep(ui.helper.data('files')||[], function(h) { return h? true : false; }),
				result  = [],
				dups    = [],
				faults  = [],
				isCopy  = ui.helper.hasClass('elfinder-drag-helper-plus'),
				c       = 'class',
				cnt, hash, i, h;
			
			if (typeof e.button === 'undefined' || ui.helper.data('namespace') !== namespace || ! self.insideWorkzone(e.pageX, e.pageY)) {
				return false;
			}
			if (dst.hasClass(self.res(c, 'cwdfile'))) {
				hash = self.cwdId2Hash(dst.attr('id'));
			} else if (dst.hasClass(self.res(c, 'navdir'))) {
				hash = self.navId2Hash(dst.attr('id'));
			} else {
				hash = cwd;
			}

			cnt = targets.length;
			
			while (cnt--) {
				h = targets[cnt];
				// ignore drop into itself or in own location
				if (h != hash && files[h].phash != hash) {
					result.push(h);
				} else {
					((isCopy && h !== hash && files[hash].write)? dups : faults).push(h);
				}
			}
			
			if (faults.length) {
				return false;
			}
			
			ui.helper.data('droped', true);
			
			if (dups.length) {
				ui.helper.hide();
				self.exec('duplicate', dups, {_userAction: true});
			}
			
			if (result.length) {
				ui.helper.hide();
				self.clipboard(result, !isCopy);
				self.exec('paste', hash, {_userAction: true}, hash).always(function(){
					self.clipboard([]);
					self.trigger('unlockfiles', {files : targets});
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
		return enabled && this.visible();
	};
	
	/**
	 * Return true if filemanager is visible
	 *
	 * @return Boolean
	 **/
	this.visible = function() {
		return node[0].elfinder && node.is(':visible');
	};
	
	/**
	 * Return file is root?
	 * 
	 * @param  Object  target file object
	 * @return Boolean
	 */
	this.isRoot = function(file) {
		return (file.isroot || ! file.phash)? true : false;
	};
	
	/**
	 * Return root dir hash for current working directory
	 * 
	 * @param  String   target hash
	 * @param  Boolean  include fake parent (optional)
	 * @return String
	 */
	this.root = function(hash, fake) {
		hash = hash || cwd;
		var dir, i;
		
		if (! fake) {
			$.each(self.roots, function(id, rhash) {
				if (hash.indexOf(id) === 0) {
					dir = rhash;
					return false;
				}
			});
			if (dir) {
				return dir;
			}
		}
		
		dir = files[hash];
		while (dir && dir.phash && (fake || ! dir.isroot)) {
			dir = files[dir.phash];
		}
		if (dir) {
			return dir.hash;
		}
		
		while (i in files && files.hasOwnProperty(i)) {
			dir = files[i];
			if (dir.mime === 'directory' && !dir.phash && dir.read) {
				return dir.hash;
			}
		}
		
		return '';
	};
	
	/**
	 * Return current working directory info
	 * 
	 * @return Object
	 */
	this.cwd = function() {
		return files[cwd] || {};
	};
	
	/**
	 * Return required cwd option
	 * 
	 * @param  String  option name
	 * @param  String  target hash (optional)
	 * @return mixed
	 */
	this.option = function(name, target) {
		var res, item;
		target = target || cwd;
		if (self.optionsByHashes[target] && typeof self.optionsByHashes[target][name] !== 'undefined') {
			return self.optionsByHashes[target][name];
		}
		if (self.hasVolOptions && cwd !== target && (!(item = self.file(target)) || item.phash !== cwd)) {
			res = '';
			$.each(self.volOptions, function(id, opt) {
				if (target.indexOf(id) === 0) {
					res = opt[name] || '';
					return false;
				}
			});
			return res;
		} else {
			return cwdOptions[name] || '';
		}
	};
	
	/**
	 * Return disabled commands by each folder
	 * 
	 * @param  Array  target hashes
	 * @return Array
	 */
	this.getDisabledCmds = function(targets, flip) {
		var disabled = {'hidden': true};
		if (! Array.isArray(targets)) {
			targets = [ targets ];
		}
		$.each(targets, function(i, h) {
			var disCmds = self.option('disabledFlip', h);
			if (disCmds) {
				Object.assign(disabled, disCmds);
			}
		});
		return flip? disabled : Object.keys(disabled);
	};
	
	/**
	 * Return file data from current dir or tree by it's hash
	 * 
	 * @param  String  file hash
	 * @return Object
	 */
	this.file = function(hash, alsoHidden) { 
		return hash? (files[hash] || (alsoHidden? hiddenFiles[hash] : void(0))) : void(0); 
	};
	
	/**
	 * Return all cached files
	 * 
	 * @param  String  parent hash
	 * @return Object
	 */
	this.files = function(phash) {
		var items = {};
		if (phash) {
			if (!ownFiles[phash]) {
				return {};
			}
			$.each(ownFiles[phash], function(h) {
				if (files[h]) {
					items[h] = files[h];
				} else {
					delete ownFiles[phash][h];
				}
			});
			return Object.assign({}, items);
		}
		return Object.assign({}, files);
	};
	
	/**
	 * Return list of file parents hashes include file hash
	 * 
	 * @param  String  file hash
	 * @return Array
	 */
	this.parents = function(hash) {
		var parents = [],
			dir;
		
		while (hash && (dir = this.file(hash))) {
			parents.unshift(dir.hash);
			hash = dir.phash;
		}
		return parents;
	};
	
	this.path2array = function(hash, i18) {
		var file, 
			path = [];
			
		while (hash) {
			if ((file = files[hash]) && file.hash) {
				path.unshift(i18 && file.i18 ? file.i18 : file.name);
				hash = file.isroot? null : file.phash;
			} else {
				path = [];
				break;
			}
		}
			
		return path;
	};
	
	/**
	 * Return file path or Get path async with jQuery.Deferred
	 * 
	 * @param  Object  file
	 * @param  Boolean i18
	 * @param  Object  asyncOpt
	 * @return String|jQuery.Deferred
	 */
	this.path = function(hash, i18, asyncOpt) { 
		var path = files[hash] && files[hash].path
			? files[hash].path
			: this.path2array(hash, i18).join(cwdOptions.separator);
		if (! asyncOpt || ! files[hash]) {
			return path;
		} else {
			asyncOpt = Object.assign({notify: {type : 'parents', cnt : 1, hideCnt : true}}, asyncOpt);
			
			var dfd    = $.Deferred(),
				notify = asyncOpt.notify,
				noreq  = false,
				req    = function() {
					self.request({
						data : {cmd : 'parents', target : files[hash].phash},
						notify : notify,
						preventFail : true
					})
					.done(done)
					.fail(function() {
						dfd.reject();
					});
				},
				done   = function() {
					self.one('parentsdone', function() {
						path = self.path(hash, i18);
						if (path === '' && noreq) {
							//retry with request
							noreq = false;
							req();
						} else {
							if (notify) {
								clearTimeout(ntftm);
								notify.cnt = -(parseInt(notify.cnt || 0));
								self.notify(notify);
							}
							dfd.resolve(path);
						}
					});
				},
				ntftm;
		
			if (path) {
				return dfd.resolve(path);
			} else {
				if (self.ui['tree']) {
					// try as no request
					if (notify) {
						ntftm = setTimeout(function() {
							self.notify(notify);
						}, self.notifyDelay);
					}
					noreq = true;
					done(true);
				} else {
					req();
				}
				return dfd;
			}
		}
	};
	
	/**
	 * Return file url if set
	 * 
	 * @param  String  file hash
	 * @param  Object  Options
	 * @return String|Object of jQuery Deferred
	 */
	this.url = function(hash, o) {
		var file   = files[hash],
			opts   = o || {},
			async  = opts.async || false,
			temp   = opts.temporary || false,
			onetm  = (opts.onetime && self.option('onetimeUrl', hash)) || false,
			absurl = opts.absurl || false,
			dfrd   = (async || onetm)? $.Deferred() : null,
			filter = function(url) {
				if (url && absurl) {
					url = self.convAbsUrl(url);
				}
				return url;
			},
			getUrl = function(url) {
				if (url) {
					return filter(url);
				}
				if (file.url) {
					return filter(file.url);
				}
				
				if (typeof baseUrl === 'undefined') {
					baseUrl = getBaseUrl();
				}
				
				if (baseUrl) {
					return filter(baseUrl + $.map(self.path2array(hash), function(n) { return encodeURIComponent(n); }).slice(1).join('/'));
				}

				var params = Object.assign({}, self.customData, {
					cmd: 'file',
					target: file.hash
				});
				if (self.oldAPI) {
					params.cmd = 'open';
					params.current = file.phash;
				}
				return filter(self.options.url + (self.options.url.indexOf('?') === -1 ? '?' : '&') + $.param(params, true));
			},
			getBaseUrl = function() {
				return self.option('url', (!self.isRoot(file) && file.phash) || file.hash);
			},
			baseUrl, res;
		
		if (!file || !file.read) {
			return async? dfrd.resolve('') : '';
		}
		
		if (onetm && (!file.url || file.url == '1') && !(baseUrl = getBaseUrl())) {
			async = true;
			this.request({
				data : { cmd : 'url', target : hash, options : { onetime: 1 } },
				preventDefault : true,
				options: {async: async},
				notify: {type : 'file', cnt : 1, hideCnt : true},
				progressBar: opts.progressBar
			}).done(function(data) {
				dfrd.resolve(filter(data.url || ''));
			}).fail(function() {
				dfrd.resolve('');
			});
		} else {
			if (file.url == '1' || (temp && !file.url && !(baseUrl = getBaseUrl()))) {
				this.request({
					data : { cmd : 'url', target : hash, options : { temporary: temp? 1 : 0 } },
					preventDefault : true,
					options: {async: async},
					notify: async? {type : temp? 'file' : 'url', cnt : 1, hideCnt : true} : {},
					progressBar: opts.progressBar
				})
				.done(function(data) {
					file.url = data.url || '';
				})
				.fail(function() {
					file.url = '';
				})
				.always(function() {
					var url;
					if (file.url && temp) {
						url = file.url;
						file.url = '1'; // restore
					}
					if (async) {
						dfrd.resolve(getUrl(url));
					} else {
						return getUrl(url);
					}
				});
			} else {
				if (async) {
					dfrd.resolve(getUrl());
				} else {
					return getUrl();
				}
			}
		}
		if (async) {
			return dfrd;
		}
	};
	
	/**
	 * Return file url for the extarnal service
	 *
	 * @param      String  hash     The hash
	 * @param      Object  options  The options
	 * @return     Object  jQuery Deferred
	 */
	this.forExternalUrl = function(hash, options) {
		var onetime = self.option('onetimeUrl', hash),
			opts = {
				async: true,
				absurl: true
			};

		opts[onetime? 'onetime' : 'temporary'] = true;
		return self.url(hash, Object.assign({}, options, opts));
	};

	/**
	 * Return file url for open in elFinder
	 * 
	 * @param  String  file hash
	 * @param  Boolean for download link
	 * @param      Object  requestOpts   The request options
	 * @return String
	 */
	this.openUrl = function(hash, download, callback, requestOpts) {
		var file = files[hash],
			url  = '',
			onetimeSize = (requestOpts || {}).onetimeSize || (5 * 1024 * 1024);
		
		if (!file || !file.read) {
			return '';
		}
		
		if (!download || download === 'sameorigin') {
			if (file.url) {
				if (file.url != 1) {
					url = file.url;
				}
			} else if (cwdOptions.url && file.hash.indexOf(self.cwd().volumeid) === 0) {
				url = cwdOptions.url + $.map(this.path2array(hash), function(n) { return encodeURIComponent(n); }).slice(1).join('/');
			}
			if (!download || this.isSameOrigin(url)) {
				if (url) {
					url += (url.match(/\?/)? '&' : '?') + '_'.repeat((url.match(/[\?&](_+)t=/g) || ['&t=']).sort().shift().match(/[\?&](_*)t=/)[1].length + 1) + 't=' + (file.ts || parseInt(+new Date()/1000));
					if (callback) {
						callback(url);
						return;
					} else {
						return url;
					}
				}
			}
		}
		
		if (callback && this.hasParrotHeaders()) {
			if (!requestOpts) {
				requestOpts = {};
			} else {
				delete requestOpts.onetimeSize;
			}
			if (!requestOpts.onetime && !requestOpts.temporary && file.size > onetimeSize) {
				if (file.mime.match(/^video|audio/)) {
					requestOpts.temporary = true;
				} else {
					requestOpts.onetime = true;
				}
			}
			if (requestOpts.onetime || requestOpts.temporary) {
				return this.url(file.hash, Object.assign({
					async: true
				}, requestOpts)).done(function(url) {
					callback(url);
				}).fail(function() {
					callback('');
				});
			} else {
				return this.getContents(hash, 'blob', requestOpts).done(function(blob){
					url = (window.URL || window.webkitURL).createObjectURL(blob);
					callback(url);
				}).fail(function() {
					callback('');
				});
			}
		} else {
			url = this.options.url;
			url = url + (url.indexOf('?') === -1 ? '?' : '&')
				+ (this.oldAPI ? 'cmd=open&current='+file.phash : 'cmd=file')
				+ '&target=' + file.hash
				+ '&_t=' + (file.ts || parseInt(+new Date()/1000));
			
			if (download === true) {
				url += '&download=1';
			}
			
			$.each(this.customData, function(key, val) {
				url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(val);
			});
			if (callback) {
				callback(url);
				return;
			} else {
				return url;
			}
		}
	};
	
	/**
	 * Return thumbnail url
	 * 
	 * @param  Object  file object
	 * @return String
	 */
	this.tmb = function(file) {
		var tmbUrl, tmbCrop,
			cls    = 'elfinder-cwd-bgurl',
			url    = '',
			cData  = {},
			n      = 0;

		if ($.isPlainObject(file)) {
			if (self.searchStatus.state && file.hash.indexOf(self.cwd().volumeid) !== 0) {
				tmbUrl = self.option('tmbUrl', file.hash);
				tmbCrop = self.option('tmbCrop', file.hash);
			} else {
				tmbUrl = cwdOptions.tmbUrl;
				tmbCrop = cwdOptions.tmbCrop;
			}
			if (tmbCrop) {
				cls += ' elfinder-cwd-bgurl-crop';
			}
			if (tmbUrl === 'self' && file.mime.indexOf('image/') === 0) {
				url = self.openUrl(file.hash);
				cls += ' elfinder-cwd-bgself';
			} else if ((self.oldAPI || tmbUrl) && file && file.tmb && file.tmb != 1) {
				url = tmbUrl + file.tmb;
			} else if (self.newAPI && file && file.tmb && file.tmb != 1) {
				url = file.tmb;
			}
			if (url) {
				if (tmbUrl !== 'self') {
					if (file.ts) {
						cData._t = file.ts;
					}
					if (cwdOptions.tmbReqCustomData && Object.keys(this.customData).length) {
						cData = Object.assign(cData, this.customData);
					}
					if (Object.keys(cData).length) {
						url += (url.match(/\?/) ? '&' : '?');
						$.each(cData, function (key, val) {
							url += ((n++ === 0)? '' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(val);
						});
					}
				}
				return { url: url, className: cls };
			}
		}
		
		return false;
	};
	
	/**
	 * Return selected files hashes
	 *
	 * @return Array
	 **/
	this.selected = function() {
		return selected.slice(0);
	};
	
	/**
	 * Return selected files info
	 * 
	 * @return Array
	 */
	this.selectedFiles = function() {
		return $.map(selected, function(hash) { return files[hash] ? Object.assign({}, files[hash]) : null; });
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
		return data.error || this.rules[this.rules[cmd] ? cmd : 'defaults'](data);
	};
	
	/**
	 * Return bytes from ini formated size
	 * 
	 * @param  String  ini formated size
	 * @return Integer
	 */
	this.returnBytes = function(val) {
		var last;
		if (isNaN(val)) {
			if (! val) {
				val = '';
			}
			// for ex. 1mb, 1KB
			val = val.replace(/b$/i, '');
			last = val.charAt(val.length - 1).toLowerCase();
			val = val.replace(/[tgmk]$/i, '');
			if (last == 't') {
				val = val * 1024 * 1024 * 1024 * 1024;
			} else if (last == 'g') {
				val = val * 1024 * 1024 * 1024;
			} else if (last == 'm') {
				val = val * 1024 * 1024;
			} else if (last == 'k') {
				val = val * 1024;
			}
			val = isNaN(val)? 0 : parseInt(val);
		} else {
			val = parseInt(val);
			if (val < 1) val = 0;
		}
		return val;
	};
	
	/**
	 * Process ajax request.
	 * Fired events :
	 * @todo
	 * @example
	 * @todo
	 * @return $.Deferred
	 */
	this.request = function(opts) { 
		var self     = this,
			o        = this.options,
			dfrd     = $.Deferred(),
			// request ID
			reqId    = (+ new Date()).toString(16) + Math.floor(1000 * Math.random()).toString(16), 
			// request data
			data     = Object.assign({}, self.customData, {mimes : o.onlyMimes}, opts.data || opts),
			// command name
			cmd      = data.cmd,
			// request type is binary
			isBinary = (opts.options || {}).dataType === 'binary',
			// current cmd is "open"
			isOpen   = (!opts.asNotOpen && cmd === 'open'),
			// call default fail callback (display error dialog) ?
			deffail  = !(isBinary || opts.preventDefault || opts.preventFail),
			// call default success callback ?
			defdone  = !(isBinary || opts.preventDefault || opts.preventDone),
			// current progress of receive data
			prog     = opts.progressVal || 20,
			// timer of fake progress
			progTm   = null,
			// whether the notification dialog is currently displayed
			hasNotify= false,
			// options for notify dialog
			notify   = !opts.progressBar? (opts.notify? Object.assign({progress: prog * opts.notify.cnt}, opts.notify) : {}) : {},
			// make cancel button
			cancel   = !!opts.cancel,
			// do not normalize data - return as is
			raw      = isBinary || !!opts.raw,
			// sync files on request fail
			syncOnFail = opts.syncOnFail,
			// use lazy()
			lazy     = !!opts.lazy,
			// prepare function before done()
			prepare  = opts.prepare,
			// navigate option object when cmd done
			navigate = opts.navigate,
			// open notify dialog timeout
			timeout,
			// use browser cache
			useCache = (opts.options || {}).cache,
			// request options
			options = Object.assign({
				url      : o.url,
				async    : true,
				type     : this.requestType,
				dataType : 'json',
				cache    : (self.api >= 2.1029), // api >= 2.1029 has unique request ID
				data     : data,
				headers  : this.customHeaders,
				xhrFields: this.xhrFields,
				progress : function(e) {
					var p = e.loaded / e.total * 100;
					progTm && clearTimeout(progTm);
					if (opts.progressBar) {
						try {
							opts.progressBar.width(p + '%');
						} catch(e) {}
					} else {
						if (hasNotify && notify.type) {
							p = p * notify.cnt;
							if (prog < p) {
								self.notify({
									type: notify.type,
									progress: p - prog,
									cnt: 0,
									hideCnt: notify.hideCnt
								});
								prog = p;
							}
						}
					}
					if (opts.progress) {
						try {
							opts.progress(e);
						} catch(e) {}
					}
				}
			}, opts.options || {}),
			/**
			 * Default success handler. 
			 * Call default data handlers and fire event with command name.
			 *
			 * @param Object  normalized response data
			 * @return void
			 **/
			done = function(data) {
				data.warning && self.error(data.warning);
				
				if (isOpen) {
					open(data);
				} else {
					self.updateCache(data);
				}
				
				self.lazy(function() {
					// fire some event to update cache/ui
					data.removed && data.removed.length && self.remove(data);
					data.added   && data.added.length   && self.add(data);
					data.changed && data.changed.length && self.change(data);
				}).then(function() {
					// fire event with command name
					return self.lazy(function() {
						self.trigger(cmd, data, false);
					});
				}).then(function() {
					// fire event with command name + 'done'
					return self.lazy(function() {
						self.trigger(cmd + 'done');
					});
				}).then(function() {
					// make toast message
					if (data.toasts && Array.isArray(data.toasts)) {
						$.each(data.toasts, function() {
							this.msg && self.toast(this);
						});
					}
					// force update content
					data.sync && self.sync();
				});
			},
			/**
			 * Request error handler. Reject dfrd with correct error message.
			 *
			 * @param jqxhr  request object
			 * @param String request status
			 * @return void
			 **/
			error = function(xhr, status) {
				var error, data, 
					d = self.options.debug;
				
				switch (status) {
					case 'abort':
						error = xhr.quiet ? '' : ['errConnect', 'errAbort'];
						break;
					case 'timeout':	    
						error = ['errConnect', 'errTimeout'];
						break;
					case 'parsererror': 
						error = ['errResponse', 'errDataNotJSON'];
						if (xhr.responseText) {
							if (! cwd || (d && (d === 'all' || d['backend-error']))) {
								error.push(xhr.responseText);
							}
						}
						break;
					default:
						if (xhr.responseText) {
							// check responseText, Is that JSON?
							try {
								data = JSON.parse(xhr.responseText);
								if (data && data.error) {
									error = data.error;
								}
							} catch(e) {}
						}
						if (! error) {
							if (xhr.status == 403) {
								error = ['errConnect', 'errAccess', 'HTTP error ' + xhr.status];
							} else if (xhr.status == 404) {
								error = ['errConnect', 'errNotFound', 'HTTP error ' + xhr.status];
							} else if (xhr.status >= 500) {
								error = ['errResponse', 'errServerError', 'HTTP error ' + xhr.status];
							} else {
								if (xhr.status == 414 && options.type === 'get') {
									// retry by POST method
									options.type = 'post';
									self.abortXHR(xhr);
									dfrd.xhr = xhr = self.transport.send(options).fail(error).done(success);
									return;
								}
								error = xhr.quiet ? '' : ['errConnect', 'HTTP error ' + xhr.status];
							} 
						}
				}
				
				self.trigger(cmd + 'done');
				dfrd.reject({error: error}, xhr, status);
			},
			/**
			 * Request success handler. Valid response data and reject/resolve dfrd.
			 *
			 * @param Object  response data
			 * @param String request status
			 * @return void
			 **/
			success = function(response) {
				// Set currrent request command name
				self.currentReqCmd = cmd;
				
				response.debug && self.responseDebug(response);
				
				self.setCustomHeaderByXhr(xhr);

				if (raw) {
					self.abortXHR(xhr);
					response && response.debug && self.debug('backend-debug', response);
					return dfrd.resolve(response);
				}
				
				if (!response) {
					return dfrd.reject({error :['errResponse', 'errDataEmpty']}, xhr, response);
				} else if (!$.isPlainObject(response)) {
					return dfrd.reject({error :['errResponse', 'errDataNotJSON']}, xhr, response);
				} else if (response.error) {
					if (isOpen) {
						// check leafRoots
						$.each(self.leafRoots, function(phash, roots) {
							self.leafRoots[phash] = $.grep(roots, function(h) { return h !== data.target; });
						});
					}
					return dfrd.reject({error :response.error}, xhr, response);
				}
				
				var resolve = function() {
					var pushLeafRoots = function(name) {
						if (self.leafRoots[data.target] && response[name]) {
							$.each(self.leafRoots[data.target], function(i, h) {
								var root;
								if (root = self.file(h)) {
									response[name].push(root);
								}
							});
						}
					},
					setTextMimes = function() {
						self.textMimes = {};
						$.each(self.res('mimes', 'text'), function() {
							self.textMimes[this.toLowerCase()] = true;
						});
					},
					actionTarget;
					
					if (isOpen) {
						pushLeafRoots('files');
					} else if (cmd === 'tree') {
						pushLeafRoots('tree');
					}
					
					response = self.normalize(response);
					
					if (!self.validResponse(cmd, response)) {
						return dfrd.reject({error :(response.norError || 'errResponse')}, xhr, response);
					}
					
					if (isOpen) {
						if (!self.api) {
							self.api    = response.api || 1;
							if (self.api == '2.0' && typeof response.options.uploadMaxSize !== 'undefined') {
								self.api = '2.1';
							}
							self.newAPI = self.api >= 2;
							self.oldAPI = !self.newAPI;
						}
						
						if (response.textMimes && Array.isArray(response.textMimes)) {
							self.resources.mimes.text = response.textMimes;
							setTextMimes();
						}
						!self.textMimes && setTextMimes();
						
						if (response.options) {
							cwdOptions = Object.assign({}, cwdOptionsDefault, response.options);
						}

						if (response.netDrivers) {
							self.netDrivers = response.netDrivers;
						}

						if (response.maxTargets) {
							self.maxTargets = response.maxTargets;
						}

						if (!!data.init) {
							self.uplMaxSize = self.returnBytes(response.uplMaxSize);
							self.uplMaxFile = !!response.uplMaxFile? Math.min(parseInt(response.uplMaxFile), 50) : 20;
						}
					}

					if (typeof prepare === 'function') {
						prepare(response);
					}
					
					if (navigate) {
						actionTarget = navigate.target || 'added';
						if (response[actionTarget] && response[actionTarget].length) {
							self.one(cmd + 'done', function() {
								var targets  = response[actionTarget],
									newItems = self.findCwdNodes(targets),
									inCwdHashes = function() {
										var cwdHash = self.cwd().hash;
										return $.map(targets, function(f) { return (f.phash && cwdHash === f.phash)? f.hash : null; });
									},
									hashes   = inCwdHashes(),
									makeToast  = function(t) {
										var node = void(0),
											data = t.action? t.action.data : void(0),
											cmd, msg, done;
										if ((data || hashes.length) && t.action && (msg = t.action.msg) && (cmd = t.action.cmd) && (!t.action.cwdNot || t.action.cwdNot !== self.cwd().hash)) {
											done = t.action.done;
											data = t.action.data;
											node = $('<div></div>')
												.append(
													$('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all elfinder-tabstop"><span class="ui-button-text">'
														+self.i18n(msg)
														+'</span></button>')
													.on('mouseenter mouseleave', function(e) { 
														$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
													})
													.on('click', function() {
														self.exec(cmd, data || hashes, {_userAction: true, _currentType: 'toast', _currentNode: $(this) });
														if (done) {
															self.one(cmd+'done', function() {
																if (typeof done === 'function') {
																	done();
																} else if (done === 'select') {
																	self.trigger('selectfiles', {files : inCwdHashes()});
																}
															});
														}
													})
												);
										}
										delete t.action;
										t.extNode = node;
										return t;
									};
								
								if (! navigate.toast) {
									navigate.toast = {};
								}
								
								!navigate.noselect && self.trigger('selectfiles', {files : self.searchStatus.state > 1 ? $.map(targets, function(f) { return f.hash; }) : hashes});
								
								if (newItems.length) {
									if (!navigate.noscroll) {
										newItems.first().trigger('scrolltoview', {blink : false});
										self.resources.blink(newItems, 'lookme');
									}
									if ($.isPlainObject(navigate.toast.incwd)) {
										self.toast(makeToast(navigate.toast.incwd));
									}
								} else {
									if ($.isPlainObject(navigate.toast.inbuffer)) {
										self.toast(makeToast(navigate.toast.inbuffer));
									}
								}
							});
						}
					}
					
					dfrd.resolve(response);
					
					response.debug && self.debug('backend-debug', response);
				};
				self.abortXHR(xhr);
				lazy? self.lazy(resolve) : resolve();
			},
			xhr, _xhr,
			xhrAbort = function(e) {
				if (xhr && xhr.state() === 'pending') {
					self.abortXHR(xhr, { quiet: true , abort: true });
					if (!e || (e.type !== 'unload' && e.type !== 'destroy')) {
						self.autoSync();
					}
				}
			},
			abort = function(e){
				self.trigger(cmd + 'done');
				if (e.type == 'autosync') {
					if (e.data.action != 'stop') return;
				} else if (e.type != 'unload' && e.type != 'destroy' && e.type != 'openxhrabort') {
					if (!e.data.added || !e.data.added.length) {
						return;
					}
				}
				xhrAbort(e);
			},
			request = function(mode) {
				var queueAbort = function() {
					syncOnFail = false;
					dfrd.reject();
				};
				
				if (mode) {
					if (mode === 'cmd') {
						return cmd;
					}
				}
				
				if (isOpen) {
					if (currentOpenCmd && currentOpenCmd.state() === 'pending') {
						if (currentOpenCmd._target === data.target) {
							return dfrd.reject('openabort');
						} else {
							if (currentOpenCmd.xhr) {
								currentOpenCmd.xhr.queueAbort();
							} else {
								currentOpenCmd.reject('openabort');
							}
						}
					}
					currentOpenCmd = dfrd;
					currentOpenCmd._target = data.target;
				}
				
				dfrd.always(function() {
					delete options.headers['X-elFinderReqid'];
					if (isOpen) {
						currentOpenCmd = null;
					}
				}).fail(function(error, xhr, response) {
					var errData, errMsg;

					if (isOpen && error === 'openabort') {
						error = '';
						syncOnFail = false;
					}

					errData = {
						cmd: cmd,
						err: error,
						xhr: xhr,
						rc: response
					};

					// unset this cmd queue when user canceling
					// see notify : function - `cancel.reject(0);`
					if (error === 0) {
						if (requestQueue.length) {
							requestQueue = $.grep(requestQueue, function(req) {
								return (req('cmd') === cmd) ? false : true;
							});
						}
					}
					// trigger "requestError" event
					self.trigger('requestError', errData);
					if (errData._getEvent && errData._getEvent().isDefaultPrevented()) {
						deffail = false;
						syncOnFail = false;
						if (error) {
							error.error = '';
						}
					}
					// abort xhr
					xhrAbort();
					if (isOpen) {
						openDir = self.file(data.target);
						openDir && openDir.volumeid && self.isRoot(openDir) && delete self.volumeExpires[openDir.volumeid];
					}
					self.trigger(cmd + 'fail', response);
					errMsg = (typeof error === 'object')? error.error : error;
					if (errMsg) {
						deffail ? self.error(errMsg) : self.debug('error', self.i18n(errMsg));
					}
					syncOnFail && self.sync();
				});

				if (!cmd) {
					syncOnFail = false;
					return dfrd.reject({error :'errCmdReq'});
				}
				
				if (self.maxTargets && data.targets && data.targets.length > self.maxTargets) {
					syncOnFail = false;
					return dfrd.reject({error :['errMaxTargets', self.maxTargets]});
				}

				defdone && dfrd.done(done);
				
				// quiet abort not completed "open" requests
				if (isOpen) {
					while ((_xhr = queue.pop())) {
						_xhr.queueAbort();
					}
					if (cwd !== data.target) {
						while ((_xhr = cwdQueue.pop())) {
							_xhr.queueAbort();
						}
					}
				}

				// trigger abort autoSync for commands to add the item
				if ($.inArray(cmd, (self.cmdsToAdd + ' autosync').split(' ')) !== -1) {
					if (cmd !== 'autosync') {
						self.autoSync('stop');
						dfrd.always(function() {
							self.autoSync();
						});
					}
					self.trigger('openxhrabort');
				}

				delete options.preventFail;

				if (self.api >= 2.1029) {
					if (useCache) {
						options.headers['X-elFinderReqid'] = reqId;
					} else {
						Object.assign(options.data, { reqid : reqId });
					}
				}
				
				// function for set value of this syncOnFail
				dfrd.syncOnFail = function(state) {
					syncOnFail = !!state;
				};

				requestCnt++;

				dfrd.xhr = xhr = self.transport.send(options).always(function() {
					// set responseURL from native xhr object
					if (options._xhr && typeof options._xhr.responseURL !== 'undefined') {
						xhr.responseURL = options._xhr.responseURL || '';
					}
					--requestCnt;
					if (requestQueue.length) {
						requestQueue.shift()();
					}
				}).fail(error).done(success);
				
				if (self.api >= 2.1029) {
					xhr._requestId = reqId;
				}
				
				if (isOpen || (data.compare && cmd === 'info')) {
					// regist function queueAbort
					xhr.queueAbort = queueAbort;
					// add autoSync xhr into queue
					queue.unshift(xhr);
					// bind abort()
					data.compare && self.bind(self.cmdsToAdd + ' autosync openxhrabort', abort);
					dfrd.always(function() {
						var ndx = $.inArray(xhr, queue);
						data.compare && self.unbind(self.cmdsToAdd + ' autosync openxhrabort', abort);
						ndx !== -1 && queue.splice(ndx, 1);
					});
				} else if ($.inArray(cmd, self.abortCmdsOnOpen) !== -1) {
					// regist function queueAbort
					xhr.queueAbort = queueAbort;
					// add "open" xhr, only cwd xhr into queue
					cwdQueue.unshift(xhr);
					dfrd.always(function() {
						var ndx = $.inArray(xhr, cwdQueue);
						ndx !== -1 && cwdQueue.splice(ndx, 1);
					});
				}
				
				// abort pending xhr on window unload or elFinder destroy
				self.bind('unload destroy', abort);
				dfrd.always(function() {
					self.unbind('unload destroy', abort);
				});
				
				return dfrd;
			},
			queueingRequest = function() {
				// show notify
				if (notify.type && notify.cnt) {
					if (cancel) {
						notify.cancel = dfrd;
						opts.eachCancel && (notify.id = +new Date());
					}
					timeout = setTimeout(function() {
						// start fake count up
						progTm = setTimeout(progFakeUp, 1000);
						self.notify(notify);
						hasNotify = true;
						dfrd.always(function() {
							notify.cnt = -(parseInt(notify.cnt)||0);
							self.notify(notify);
							hasNotify = false;
						});
					}, self.notifyDelay);
					
					dfrd.always(function() {
						clearTimeout(timeout);
					});
				}
				// queueing
				if (requestCnt < requestMaxConn) {
					// do request
					return request();
				} else {
					if (isOpen) {
						requestQueue.unshift(request);
					} else {
						requestQueue.push(request);
					}
					return dfrd;
				}
			},
			progFakeUp = function() {
				var add;
				if (hasNotify && progTm) {
					add = 1 * notify.cnt;
					progTm = null;
					self.notify({
						type: notify.type,
						progress: add,
						cnt: 0,
						hideCnt: notify.hideCnt
					});
					prog += add;
					if ((prog / notify.cnt) < 80) {
						progTm = setTimeout(progFakeUp, 500);
					}
				}
			},
			bindData = {opts: opts, result: true},
			openDir;
		
		// prevent request initial request is completed
		if (!self.api && !data.init) {
			syncOnFail = false;
			return dfrd.reject();
		}

		// trigger "request.cmd" that callback be able to cancel request by substituting "false" for "event.data.result"
		self.trigger('request.' + cmd, bindData, true);
		
		if (! bindData.result) {
			self.trigger(cmd + 'done');
			return dfrd.reject();
		} else if (typeof bindData.result === 'object' && bindData.result.promise) {
			bindData.result
				.done(queueingRequest)
				.fail(function() {
					self.trigger(cmd + 'done');
					dfrd.reject();
				});
			return dfrd;
		}
		
		return queueingRequest();
	};
	
	/**
	 * Call cache()
	 * Store info about files/dirs in "files" object.
	 *
	 * @param  Array  files
	 * @param  String type
	 * @return void
	 */
	this.cache = function(dataArray, type) {
		if (! Array.isArray(dataArray)) {
			dataArray = [ dataArray ];
		}
		cache(dataArray, type);
	};
	
	/**
	 * Update file object caches by respose data object
	 * 
	 * @param  Object  respose data object
	 * @return void
	 */
	this.updateCache = function(data) {
		if ($.isPlainObject(data)) {
			data.files && data.files.length && cache(data.files, 'files');
			data.tree && data.tree.length && cache(data.tree, 'tree');
			data.removed && data.removed.length && remove(data.removed);
			data.added && data.added.length && cache(data.added, 'add');
			data.changed && data.changed.length && cache(data.changed, 'change');
		}
	};
	
	/**
	 * Compare current files cache with new files and return diff
	 * 
	 * @param  Array   new files
	 * @param  String  target folder hash
	 * @param  Array   exclude properties to compare
	 * @return Object
	 */
	this.diff = function(incoming, onlydir, excludeProps) {
		var raw       = {},
			added     = [],
			removed   = [],
			changed   = [],
			excludes  = null,
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
		
		// make excludes object
		if (excludeProps && excludeProps.length) {
			excludes = {};
			$.each(excludeProps, function() {
				excludes[this] = true;
			});
		}
		
		// find removed
		$.each(files, function(hash, f) {
			if (! raw[hash] && (! onlydir || f.phash === onlydir)) {
				removed.push(hash);
			}
		});
		
		// compare files
		$.each(raw, function(hash, file) {
			var origin  = files[hash],
				orgKeys = {},
				chkKeyLen;

			if (!origin) {
				added.push(file);
			} else {
				// make orgKeys object
				$.each(Object.keys(origin), function() {
					orgKeys[this] = true;
				});
				$.each(file, function(prop) {
					delete orgKeys[prop];
					if (! excludes || ! excludes[prop]) {
						if (file[prop] !== origin[prop]) {
							changed.push(file);
							orgKeys = {};
							return false;
						}
					}
				});
				chkKeyLen = Object.keys(orgKeys).length;
				if (chkKeyLen !== 0) {
					if (excludes) {
						$.each(orgKeys, function(prop) {
							if (excludes[prop]) {
								--chkKeyLen;
							}
						});
					}
					(chkKeyLen !== 0) && changed.push(file);
				}
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
	};
	
	/**
	 * Sync content
	 * 
	 * @return jQuery.Deferred
	 */
	this.sync = function(onlydir, polling) {
		this.autoSync('stop');
		var self  = this,
			compare = function(){
				var c = '', cnt = 0, mtime = 0;
				if (onlydir && polling) {
					$.each(files, function(h, f) {
						if (f.phash && f.phash === onlydir) {
							++cnt;
							mtime = Math.max(mtime, f.ts);
						}
						c = cnt+':'+mtime;
					});
				}
				return c;
			},
			comp  = compare(),
			dfrd  = $.Deferred().always(function() { !reqFail && self.trigger('sync'); }),
			opts = [this.request({
				data           : {cmd : 'open', reload : 1, target : cwd, tree : (! onlydir && this.ui.tree) ? 1 : 0, compare : comp},
				preventDefault : true
			})],
			exParents = function() {
				var parents = [],
					curRoot = self.file(self.root(cwd)),
					curId = curRoot? curRoot.volumeid : null,
					phash = self.cwd().phash,
					isroot,pdir;
				
				while(phash) {
					if (pdir = self.file(phash)) {
						if (phash.indexOf(curId) !== 0) {
							parents.push( {target: phash, cmd: 'tree'} );
							if (! self.isRoot(pdir)) {
								parents.push( {target: phash, cmd: 'parents'} );
							}
							curRoot = self.file(self.root(phash));
							curId = curRoot? curRoot.volumeid : null;
						}
						phash = pdir.phash;
					} else {
						phash = null;
					}
				}
				return parents;
			},
			reqFail;
		
		if (! onlydir && self.api >= 2) {
			(cwd !== this.root()) && opts.push(this.request({
				data           : {cmd : 'parents', target : cwd},
				preventDefault : true
			}));
			$.each(exParents(), function(i, data) {
				opts.push(self.request({
					data           : {cmd : data.cmd, target : data.target},
					preventDefault : true
				}));
			});
		}
		$.when.apply($, opts)
		.fail(function(error, xhr) {
			reqFail = (xhr && xhr.status != 200);
			if (! polling || $.inArray('errOpen', error) !== -1) {
				dfrd.reject(error);
				self.parseError(error) && self.request({
					data   : {cmd : 'open', target : (self.lastDir('') || self.root()), tree : 1, init : 1},
					notify : {type : 'open', cnt : 1, hideCnt : true}
				});
			} else {
				dfrd.reject((error && xhr.status != 0)? error : void 0);
			}
		})
		.done(function(odata) {
			var pdata, argLen, i;
			
			if (odata.cwd.compare) {
				if (comp === odata.cwd.compare) {
					return dfrd.reject();
				}
			}
			
			// for 2nd and more requests
			pdata = {tree : []};
			
			// results marge of 2nd and more requests
			argLen = arguments.length;
			if (argLen > 1) {
				for(i = 1; i < argLen; i++) {
					if (arguments[i].tree && arguments[i].tree.length) {
						pdata.tree.push.apply(pdata.tree, arguments[i].tree);
					}
				}
			}
			
			if (self.api < 2.1) {
				if (! pdata.tree) {
					pdata.tree = [];
				}
				pdata.tree.push(odata.cwd);
			}
			
			// data normalize
			odata = self.normalize(odata);
			if (!self.validResponse('open', odata)) {
				return dfrd.reject((odata.norError || 'errResponse'));
			}
			pdata = self.normalize(pdata);
			if (!self.validResponse('tree', pdata)) {
				return dfrd.reject((pdata.norError || 'errResponse'));
			}
			
			var diff = self.diff(odata.files.concat(pdata && pdata.tree ? pdata.tree : []), onlydir);

			diff.added.push(odata.cwd);
			
			self.updateCache(diff);
			
			// trigger events
			diff.removed.length && self.remove(diff);
			diff.added.length   && self.add(diff);
			diff.changed.length && self.change(diff);
			return dfrd.resolve(diff);
		})
		.always(function() {
			self.autoSync();
		});
		
		return dfrd;
	};
	
	this.upload = function(files) {
		return this.transport.upload(files, this);
	};
	
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
				pattern = patterns[i];
				parts   = pattern.split('+');
				code    = (code = parts.pop()).length == 1 
					? (code > 0 ? code : code.charCodeAt(0))
					: (code > 0 ? code : $.ui.keyCode[code]);

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
	};
	
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
		var map = function() { return $.map(clipboard, function(f) { return f.hash; }); };

		if (hashes !== void(0)) {
			clipboard.length && this.trigger('unlockfiles', {files : map()});
			remember = {};
			
			clipboard = $.map(hashes||[], function(hash) {
				var file = files[hash];
				if (file) {
					
					remember[hash] = true;
					
					return {
						hash   : hash,
						phash  : file.phash,
						name   : file.name,
						mime   : file.mime,
						read   : file.read,
						locked : file.locked,
						cut    : !!cut
					};
				}
				return null;
			});
			this.trigger('changeclipboard', {clipboard : clipboard.slice(0, clipboard.length)});
			cut && this.trigger('lockfiles', {files : map()});
		}

		// return copy of clipboard instead of refrence
		return clipboard.slice(0, clipboard.length);
	};
	
	/**
	 * Return true if command enabled
	 * 
	 * @param  String       command name
	 * @param  String|void  hash for check of own volume's disabled cmds
	 * @return Boolean
	 */
	this.isCommandEnabled = function(name, dstHash) {
		var disabled, cmd,
			cvid = self.cwd().volumeid || '';
		
		// In serach results use selected item hash to check
		if (!dstHash && self.searchStatus.state > 1 && self.selected().length) {
			dstHash = self.selected()[0];
		}
		if (dstHash && (! cvid || dstHash.indexOf(cvid) !== 0)) {
			disabled = self.option('disabledFlip', dstHash);
			//if (! disabled) {
			//	disabled = {};
			//}
		} else {
			disabled = cwdOptions.disabledFlip/* || {}*/;
		}
		cmd = this._commands[name];
		return cmd ? (cmd.alwaysEnabled || !disabled[name]) : false;
	};
	
	/**
	 * Exec command and return result;
	 *
	 * @param  String         command name
	 * @param  String|Array   usualy files hashes
	 * @param  String|Array   command options
	 * @param  String|void    hash for enabled check of own volume's disabled cmds
	 * @return $.Deferred
	 */		
	this.exec = function(cmd, files, opts, dstHash) {
		var dfrd, resType;
		
		// apply commandMap for keyboard shortcut
		if (!dstHash && this.commandMap[cmd] && this.commandMap[cmd] !== 'hidden') {
			cmd = this.commandMap[cmd];
		}

		if (cmd === 'open') {
			if (this.searchStatus.state || this.searchStatus.ininc) {
				this.trigger('searchend', { noupdate: true });
			}
			this.autoSync('stop');
		}
		if (!dstHash && files) {
			if ($.isArray(files)) {
				if (files.length) {
					dstHash = files[0];
				}
			} else {
				dstHash = files;
			}
		}
		dfrd = this._commands[cmd] && this.isCommandEnabled(cmd, dstHash) 
			? this._commands[cmd].exec(files, opts) 
			: $.Deferred().reject('errUnknownCmd');
		
		resType = typeof dfrd;
		if (!(resType === 'object' && dfrd.promise)) {
			self.debug('warning', '"cmd.exec()" should be returned "$.Deferred" but cmd "' + cmd + '" returned "' + resType + '"');
			dfrd = $.Deferred().resolve();
		}
		
		this.trigger('exec', { dfrd : dfrd, cmd : cmd, files : files, opts : opts, dstHash : dstHash });
		return dfrd;
	};
	
	/**
	 * Create and return dialog.
	 *
	 * @param  String|DOMElement  dialog content
	 * @param  Object             dialog options
	 * @return jQuery
	 */
	this.dialog = function(content, options) {
		var dialog = $('<div></div>').append(content).appendTo(node).elfinderdialog(options, self),
			dnode  = dialog.closest('.ui-dialog'),
			resize = function(){
				! dialog.data('draged') && dialog.is(':visible') && dialog.elfinderdialog('posInit');
			};
		if (dnode.length) {
			self.bind('resize', resize);
			dnode.on('remove', function() {
				self.unbind('resize', resize);
			});
		}
		return dialog;
	};
	
	/**
	 * Create and return toast.
	 *
	 * @param  Object  toast options - see ui/toast.js
	 * @return jQuery
	 */
	this.toast = function(options) {
		return $('<div class="ui-front"></div>').appendTo(this.ui.toast).elfindertoast(options || {}, this);
	};
	
	/**
	 * Return UI widget or node
	 *
	 * @param  String  ui name
	 * @return jQuery
	 */
	this.getUI = function(ui) {
		return ui? (this.ui[ui] || $()) : node;
	};
	
	/**
	 * Return elFinder.command instance or instances array
	 *
	 * @param  String  command name
	 * @return Object | Array
	 */
	this.getCommand = function(name) {
		return name === void(0) ? this._commands : this._commands[name];
	};
	
	/**
	 * Resize elfinder node
	 * 
	 * @param  String|Number  width
	 * @param  String|Number  height
	 * @return void
	 */
	this.resize = function(w, h) {
		var getMargin = function() {
				var m = node.outerHeight(true) - node.innerHeight(),
					p = node;
				
				while(p.get(0) !== heightBase.get(0)) {
					p = p.parent();
					m += p.outerHeight(true) - p.innerHeight();
					if (! p.parent().length) {
						// reached the document
						break;
					}
				}
				return m;
			},
			fit = ! node.hasClass('ui-resizable'),
			prv = node.data('resizeSize') || {w: 0, h: 0},
			mt, size = {};

		if (heightBase && heightBase.data('resizeTm')) {
			clearTimeout(heightBase.data('resizeTm'));
		}
		
		if (! self.options.noResizeBySelf) {
			if (typeof h === 'string') {
				if (mt = h.match(/^([0-9.]+)%$/)) {
					// setup heightBase
					if (! heightBase || ! heightBase.length) {
						heightBase = $(window);
					}
					if (! heightBase.data('marginToMyNode')) {
						heightBase.data('marginToMyNode', getMargin());
					}
					if (! heightBase.data('fitToBaseFunc')) {
						heightBase.data('fitToBaseFunc', function(e) {
							var tm = heightBase.data('resizeTm');
							e.preventDefault();
							e.stopPropagation();
							tm && cancelAnimationFrame(tm);
							if (! node.hasClass('elfinder-fullscreen') && (!self.UA.Mobile || heightBase.data('rotated') !== self.UA.Rotated)) {
								heightBase.data('rotated', self.UA.Rotated);
								heightBase.data('resizeTm', requestAnimationFrame(function() {
									self.restoreSize();
								}));
							}
						});
					}
					if (typeof heightBase.data('rotated') === 'undefined') {
						heightBase.data('rotated', self.UA.Rotated);
					}
					h = heightBase.height() * (mt[1] / 100) - heightBase.data('marginToMyNode');
					
					heightBase.off('resize.' + self.namespace, heightBase.data('fitToBaseFunc'));
					fit && heightBase.on('resize.' + self.namespace, heightBase.data('fitToBaseFunc'));
				}
			}
			
			node.css({ width : w, height : parseInt(h) });
		}

		size.w = Math.round(node.width());
		size.h = Math.round(node.height());
		node.data('resizeSize', size);
		if (size.w !== prv.w || size.h !== prv.h) {
			node.trigger('resize');
			this.trigger('resize', {width : size.w, height : size.h});
		}
	};
	
	/**
	 * Restore elfinder node size
	 * 
	 * @return elFinder
	 */
	this.restoreSize = function() {
		this.resize(width, height);
	};
	
	this.show = function() {
		node.show();
		this.enable().trigger('show');
	};
	
	this.hide = function() {
		if (this.options.enableAlways) {
			prevEnabled = enabled;
			enabled = false;
		}
		this.disable();
		this.trigger('hide');
		node.hide();
	};
	
	/**
	 * Lazy execution function
	 * 
	 * @param  Object  function
	 * @param  Number  delay
	 * @param  Object  options
	 * @return Object  jQuery.Deferred
	 */
	this.lazy = function(func, delay, opts) {
		var busy = function(state) {
				var cnt = node.data('lazycnt'),
					repaint;
				
				if (state) {
					repaint = node.data('lazyrepaint')? false : opts.repaint;
					if (! cnt) {
						node.data('lazycnt', 1)
							.addClass('elfinder-processing');
					} else {
						node.data('lazycnt', ++cnt);
					}
					if (repaint) {
						node.data('lazyrepaint', true).css('display'); // force repaint
					}
				} else {
					if (cnt && cnt > 1) {
						node.data('lazycnt', --cnt);
					} else {
						repaint = node.data('lazyrepaint');
						node.data('lazycnt', 0)
							.removeData('lazyrepaint')
							.removeClass('elfinder-processing');
						repaint && node.css('display'); // force repaint;
						self.trigger('lazydone');
					}
				}
			},
			dfd  = $.Deferred(),
			callFunc = function() {
				dfd.resolve(func.call(dfd));
				busy(false);
			};
		
		delay = delay || 0;
		opts = opts || {};
		busy(true);
		
		if (delay) {
			setTimeout(callFunc, delay);
		} else {
			requestAnimationFrame(callFunc);
		}
		
		return dfd;
	};
	
	/**
	 * Destroy this elFinder instance
	 *
	 * @return void
	 **/
	this.destroy = function() {
		if (node && node[0].elfinder) {
			node.hasClass('elfinder-fullscreen') && self.toggleFullscreen(node);
			this.options.syncStart = false;
			this.autoSync('forcestop');
			this.trigger('destroy').disable();
			clipboard = [];
			selected = [];
			listeners = {};
			shortcuts = {};
			$(window).off('.' + namespace);
			$(document).off('.' + namespace);
			self.trigger = function(){};
			$(beeper).remove();
			node.off()
				.removeData()
				.empty()
				.append(prevContent.contents())
				.attr('class', prevContent.attr('class'))
				.attr('style', prevContent.attr('style'));
			delete node[0].elfinder;
			// restore kept events
			$.each(prevEvents, function(n, arr) {
				$.each(arr, function(i, o) {
					node.on(o.type + (o.namespace? '.'+o.namespace : ''), o.selector, o.handler);
				});
			});
		}
	};
	
	/**
	 * Start or stop auto sync
	 * 
	 * @param  String|Bool  stop
	 * @return void
	 */
	this.autoSync = function(mode) {
		var sync;
		if (self.options.sync >= 1000) {
			if (syncInterval) {
				clearTimeout(syncInterval);
				syncInterval = null;
				self.trigger('autosync', {action : 'stop'});
			}
			
			if (mode === 'stop') {
				++autoSyncStop;
			} else {
				autoSyncStop = Math.max(0, --autoSyncStop);
			}
			
			if (autoSyncStop || mode === 'forcestop' || ! self.options.syncStart) {
				return;
			} 
			
			// run interval sync
			sync = function(start){
				var timeout;
				if (cwdOptions.syncMinMs && (start || syncInterval)) {
					start && self.trigger('autosync', {action : 'start'});
					timeout = Math.max(self.options.sync, cwdOptions.syncMinMs);
					syncInterval && clearTimeout(syncInterval);
					syncInterval = setTimeout(function() {
						var dosync = true, hash = cwd, cts;
						if (cwdOptions.syncChkAsTs && files[hash] && (cts = files[hash].ts)) {
							self.request({
								data : {cmd : 'info', targets : [hash], compare : cts, reload : 1},
								preventDefault : true
							})
							.done(function(data){
								var ts;
								dosync = true;
								if (data.compare) {
									ts = data.compare;
									if (ts == cts) {
										dosync = false;
									}
								}
								if (dosync) {
									self.sync(hash).always(function(){
										if (ts) {
											// update ts for cache clear etc.
											files[hash].ts = ts;
										}
										sync();
									});
								} else {
									sync();
								}
							})
							.fail(function(error, xhr){
								var err = self.parseError(error);
								if (err && xhr.status != 0) {
									self.error(err);
									if (Array.isArray(err) && $.inArray('errOpen', err) !== -1) {
										self.request({
											data   : {cmd : 'open', target : (self.lastDir('') || self.root()), tree : 1, init : 1},
											notify : {type : 'open', cnt : 1, hideCnt : true}
										});
									}
								} else {
									syncInterval = setTimeout(function() {
										sync();
									}, timeout);
								}
							});
						} else {
							self.sync(cwd, true).always(function(){
								sync();
							});
						}
					}, timeout);
				}
			};
			sync(true);
		}
	};
	
	/**
	 * Return bool is inside work zone of specific point
	 * 
	 * @param  Number event.pageX
	 * @param  Number event.pageY
	 * @return Bool
	 */
	this.insideWorkzone = function(x, y, margin) {
		var rectangle = this.getUI('workzone').data('rectangle');
		
		margin = margin || 1;
		if (x < rectangle.left + margin
		|| x > rectangle.left + rectangle.width + margin
		|| y < rectangle.top + margin
		|| y > rectangle.top + rectangle.height + margin) {
			return false;
		}
		return true;
	};
	
	/**
	 * Target ui node move to last of children of elFinder node fot to show front
	 * 
	 * @param  Object  target    Target jQuery node object
	 */
	this.toFront = function(target) {
		var nodes = node.children('.ui-front').removeClass('elfinder-frontmost'),
			lastnode = nodes.last();
		nodes.css('z-index', '');
		$(target).addClass('ui-front elfinder-frontmost').css('z-index', lastnode.css('z-index') + 1);
	};
	
	/**
	 * Remove class 'elfinder-frontmost' and hide() to target ui node
	 *
	 * @param      Object   target  Target jQuery node object
	 * @param      Boolean  nohide  Do not hide
	 */
	this.toHide =function(target, nohide) {
		var tgt = $(target),
			last;

		!nohide && tgt.hide();
		if (tgt.hasClass('elfinder-frontmost')) {
			tgt.removeClass('elfinder-frontmost');
			last = node.children('.ui-front:visible:not(.elfinder-frontmost)').last();
			if (last.length) {
				requestAnimationFrame(function() {
					if (!node.children('.elfinder-frontmost:visible').length) {
						self.toFront(last);
						last.trigger('frontmost');
					}
				});
			}
		}
	};

	/**
	 * Return css object for maximize
	 * 
	 * @return Object
	 */
	this.getMaximizeCss = function() {
		return {
			width   : '100%',
			height  : '100%',
			margin  : 0,
			top     : 0,
			left    : 0,
			display : 'block',
			position: 'fixed',
			zIndex  : Math.max(self.zIndex? (self.zIndex + 1) : 0 , 1000),
			maxWidth : '',
			maxHeight: ''
		};
	};
	
	// Closure for togglefullscreen
	(function() {
		// check is in iframe
		if (inFrame && self.UA.Fullscreen) {
			self.UA.Fullscreen = false;
			if (parentIframe && typeof parentIframe.attr('allowfullscreen') !== 'undefined') {
				self.UA.Fullscreen = true;
			}
		}

		var orgStyle, bodyOvf, resizeTm, fullElm, exitFull, toFull, funcObj,
			cls = 'elfinder-fullscreen',
			clsN = 'elfinder-fullscreen-native',
			checkDialog = function() {
				var t = 0,
					l = 0;
				$.each(node.children('.ui-dialog,.ui-draggable'), function(i, d) {
					var $d = $(d),
						pos = $d.position();
					
					if (pos.top < 0) {
						$d.css('top', t);
						t += 20;
					}
					if (pos.left < 0) {
						$d.css('left', l);
						l += 20;
					}
				});
			},
			setFuncObj = function() {
				var useFullscreen = self.storage('useFullscreen');
				funcObj = self.UA.Fullscreen && (useFullscreen? useFullscreen > 0 : self.options.commandsOptions.fullscreen.mode === 'screen') ? {
					// native full screen mode
					
					fullElm: function() {
						return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
					},
					
					exitFull: function() {
						if (document.exitFullscreen) {
							return document.exitFullscreen();
						} else if (document.webkitExitFullscreen) {
							return document.webkitExitFullscreen();
						} else if (document.mozCancelFullScreen) {
							return document.mozCancelFullScreen();
						} else if (document.msExitFullscreen) {
							return document.msExitFullscreen();
						}
					},
					
					toFull: function(elem) {
						if (elem.requestFullscreen) {
							return elem.requestFullscreen();
						} else if (elem.webkitRequestFullscreen) {
							return elem.webkitRequestFullscreen();
						} else if (elem.mozRequestFullScreen) {
							return elem.mozRequestFullScreen();
						} else if (elem.msRequestFullscreen) {
							return elem.msRequestFullscreen();
						}
						return false;
					}
				} : {
					// node element maximize mode
					
					fullElm: function() {
						var full;
						if (node.hasClass(cls)) {
							return node.get(0);
						} else {
							full = node.find('.' + cls);
							if (full.length) {
								return full.get(0);
							}
						}
						return null;
					},
					
					exitFull: function() {
						var elm;
						
						$(window).off('resize.' + namespace, resize);
						if (bodyOvf !== void(0)) {
							$('body').css('overflow', bodyOvf);
						}
						bodyOvf = void(0);
						
						if (orgStyle) {
							elm = orgStyle.elm;
							restoreStyle(elm);
							$(elm).trigger('resize', {fullscreen: 'off'});
						}
						
						$(window).trigger('resize');
					},
					
					toFull: function(elem) {
						bodyOvf = $('body').css('overflow') || '';
						$('body').css('overflow', 'hidden');
						
						$(elem).css(self.getMaximizeCss())
							.addClass(cls)
							.trigger('resize', {fullscreen: 'on'});
						
						checkDialog();
						
						$(window).on('resize.' + namespace, resize).trigger('resize');
						
						return true;
					}
				};
			},
			restoreStyle = function(elem) {
				if (orgStyle && orgStyle.elm == elem) {
					$(elem).removeClass(cls + ' ' + clsN).attr('style', orgStyle.style);
					orgStyle = null;
				}
			},
			resize = function(e) {
				var elm;
				if (e.target === window) {
					resizeTm && cancelAnimationFrame(resizeTm);
					resizeTm = requestAnimationFrame(function() {
						if (elm = funcObj.fullElm()) {
							$(elm).trigger('resize', {fullscreen: 'on'});
						}
					});
				}
			};
		
		setFuncObj();

		$(document).on('fullscreenchange.' + namespace + ' webkitfullscreenchange.' + namespace + ' mozfullscreenchange.' + namespace + ' MSFullscreenChange.' + namespace, function(e){
			if (self.UA.Fullscreen) {
				var elm = funcObj.fullElm(),
					win = $(window);
				
				resizeTm && cancelAnimationFrame(resizeTm);
				if (elm === null) {
					win.off('resize.' + namespace, resize);
					if (orgStyle) {
						elm = orgStyle.elm;
						restoreStyle(elm);
						$(elm).trigger('resize', {fullscreen: 'off'});
					}
				} else {
					$(elm).addClass(cls + ' ' + clsN)
						.attr('style', 'width:100%; height:100%; margin:0; padding:0;')
						.trigger('resize', {fullscreen: 'on'});
					win.on('resize.' + namespace, resize);
					checkDialog();
				}
				win.trigger('resize');
			}
		});
		
		/**
		 * Toggle Full Scrren Mode
		 * 
		 * @param  Object target
		 * @param  Bool   full
		 * @return Object | Null  DOM node object of current full scrren
		 */
		self.toggleFullscreen = function(target, full) {
			var elm = $(target).get(0),
				curElm = null;
			
			curElm = funcObj.fullElm();
			if (curElm) {
				if (curElm == elm) {
					if (full === true) {
						return curElm;
					}
				} else {
					if (full === false) {
						return curElm;
					}
				}
				funcObj.exitFull();
				return null;
			} else {
				if (full === false) {
					return null;
				}
			}
			
			setFuncObj();
			orgStyle = {elm: elm, style: $(elm).attr('style')};
			if (funcObj.toFull(elm) !== false) {
				return elm;
			} else {
				orgStyle = null;
				return null;
			}
		};
	})();
	
	// Closure for toggleMaximize
	(function(){
		var cls = 'elfinder-maximized',
		resizeTm,
		resize = function(e) {
			if (e.target === window && e.data && e.data.elm) {
				var elm = e.data.elm;
				resizeTm && cancelAnimationFrame(resizeTm);
				resizeTm = requestAnimationFrame(function() {
					elm.trigger('resize', {maximize: 'on'});
				});
			}
		},
		exitMax = function(elm) {
			$(window).off('resize.' + namespace, resize);
			$('body').css('overflow', elm.data('bodyOvf'));
			elm.removeClass(cls)
				.attr('style', elm.data('orgStyle'))
				.removeData('bodyOvf')
				.removeData('orgStyle');
			elm.trigger('resize', {maximize: 'off'});
		},
		toMax = function(elm) {
			elm.data('bodyOvf', $('body').css('overflow') || '')
				.data('orgStyle', elm.attr('style'))
				.addClass(cls)
				.css(self.getMaximizeCss());
			$('body').css('overflow', 'hidden');
			$(window).on('resize.' + namespace, {elm: elm}, resize);
			elm.trigger('resize', {maximize: 'on'});
		};
		
		/**
		 * Toggle Maximize target node
		 * 
		 * @param  Object target
		 * @param  Bool   max
		 * @return void
		 */
		self.toggleMaximize = function(target, max) {
			var elm = $(target),
				maximized = elm.hasClass(cls);
			
			if (maximized) {
				if (max === true) {
					return;
				}
				exitMax(elm);
			} else {
				if (max === false) {
					return;
				}
				toMax(elm);
			}
		};
	})();
	
	/*************  init stuffs  ****************/
	Object.assign($.ui.keyCode, {
		'F1' : 112,
		'F2' : 113,
		'F3' : 114,
		'F4' : 115,
		'F5' : 116,
		'F6' : 117,
		'F7' : 118,
		'F8' : 119,
		'F9' : 120,
		'F10' : 121,
		'F11' : 122,
		'F12' : 123,
		'DIG0' : 48,
		'DIG1' : 49,
		'DIG2' : 50,
		'DIG3' : 51,
		'DIG4' : 52,
		'DIG5' : 53,
		'DIG6' : 54,
		'DIG7' : 55,
		'DIG8' : 56,
		'DIG9' : 57,
		'NUM0' : 96,
		'NUM1' : 97,
		'NUM2' : 98,
		'NUM3' : 99,
		'NUM4' : 100,
		'NUM5' : 101,
		'NUM6' : 102,
		'NUM7' : 103,
		'NUM8' : 104,
		'NUM9' : 105,
		'CONTEXTMENU' : 93,
		'DOT'  : 190
	});
	
	this.dragUpload = false;
	this.xhrUpload  = (typeof XMLHttpRequestUpload != 'undefined' || typeof XMLHttpRequestEventTarget != 'undefined') && typeof File != 'undefined' && typeof FormData != 'undefined';
	
	// configure transport object
	this.transport = {};

	if (typeof(this.options.transport) == 'object') {
		this.transport = this.options.transport;
		if (typeof(this.transport.init) == 'function') {
			this.transport.init(this);
		}
	}
	
	if (typeof(this.transport.send) != 'function') {
		this.transport.send = function(opts) {
			if (!self.UA.IE) {
				// keep native xhr object for handling property responseURL
				opts._xhr = new XMLHttpRequest();
				opts.xhr = function() { 
					if (opts.progress) {
						opts._xhr.addEventListener('progress', opts.progress); 
					}
					return opts._xhr;
				};
			}
			return $.ajax(opts);
		};
	}
	
	if (this.transport.upload == 'iframe') {
		this.transport.upload = $.proxy(this.uploads.iframe, this);
	} else if (typeof(this.transport.upload) == 'function') {
		this.dragUpload = !!this.options.dragUploadAllow;
	} else if (this.xhrUpload && !!this.options.dragUploadAllow) {
		this.transport.upload = $.proxy(this.uploads.xhr, this);
		this.dragUpload = true;
	} else {
		this.transport.upload = $.proxy(this.uploads.iframe, this);
	}

	/**
	 * Decoding 'raw' string converted to unicode
	 * 
	 * @param  String str
	 * @return String
	 */
	this.decodeRawString = function(str) {
		var charCodes = function(str) {
			var i, len, arr;
			for (i=0,len=str.length,arr=[]; i<len; i++) {
				arr.push(str.charCodeAt(i));
			}
			return arr;
		},
		scalarValues = function(arr) {
			var scalars = [], i, len, c;
			if (typeof arr === 'string') {arr = charCodes(arr);}
			for (i=0,len=arr.length; c=arr[i],i<len; i++) {
				if (c >= 0xd800 && c <= 0xdbff) {
					scalars.push((c & 1023) + 64 << 10 | arr[++i] & 1023);
				} else {
					scalars.push(c);
				}
			}
			return scalars;
		},
		decodeUTF8 = function(arr) {
			var i, len, c, str, char = String.fromCharCode;
			for (i=0,len=arr.length,str=""; c=arr[i],i<len; i++) {
				if (c <= 0x7f) {
					str += char(c);
				} else if (c <= 0xdf && c >= 0xc2) {
					str += char((c&31)<<6 | arr[++i]&63);
				} else if (c <= 0xef && c >= 0xe0) {
					str += char((c&15)<<12 | (arr[++i]&63)<<6 | arr[++i]&63);
				} else if (c <= 0xf7 && c >= 0xf0) {
					str += char(
						0xd800 | ((c&7)<<8 | (arr[++i]&63)<<2 | arr[++i]>>>4&3) - 64,
						0xdc00 | (arr[i++]&15)<<6 | arr[i]&63
					);
				} else {
					str += char(0xfffd);
				}
			}
			return str;
		};
		
		return decodeUTF8(scalarValues(str));
	};

	/**
	 * Gets target file contents by file.hash
	 *
	 * @param      String  hash          The hash
	 * @param      String  responseType  'blob' or 'arraybuffer' (default)
	 * @param      Object  requestOpts   The request options
	 * @return     arraybuffer|blob  The contents.
	 */
	this.getContents = function(hash, responseType, requestOpts) {
		var self = this,
			dfd = $.Deferred(),
			type = responseType || 'arraybuffer',
			url, req;

		dfd.fail(function() {
			req && req.state() === 'pending' && req.reject();
		});

		url = self.openUrl(hash);
		if (!self.isSameOrigin(url)) {
			url = self.openUrl(hash, true);
		}
		req = self.request(Object.assign({
			data    : {cmd : 'get'},
			options : {
				url: url,
				type: 'get',
				cache : true,
				dataType : 'binary',
				responseType : type,
				processData: false
			},
			notify : {
				type: 'file',
				cnt: 1,
				hideCnt: true
			},
			cancel : true
		}, requestOpts || {}))
		.fail(function() {
			dfd.reject();
		})
		.done(function(data) {
			dfd.resolve(data);
		});

		return dfd;
	};

	/**
	 * Gets the binary by url.
	 *
	 * @param      {Object}    opts      The options
	 * @param      {Function}  callback  The callback
	 * @param      {Object}    requestOpts The request options
	 * @return     arraybuffer|blob  The contents.
	 */
	this.getBinaryByUrl = function(opts, callback, requestOpts) {
		var self = this,
			dfd = $.Deferred(),
			url, req;

		dfd.fail(function() {
			req && req.state() === 'pending' && req.reject();
		});

		req = self.request(Object.assign({
			data    : {cmd : 'get'},
			options : Object.assign({
				type: 'get',
				cache : true,
				dataType : 'binary',
				responseType : 'blob',
				processData: false
			}, opts)
		}, requestOpts || {}))
		.fail(function() {
			dfd.reject();
		})
		.done(function(data) {
			callback && callback(data);
			dfd.resolve(data);
		});

		return dfd;
	};

	/**
	 * Gets the mimetype.
	 *
	 * @param      {string}  name     The name
	 * @param      {string}  orgMime  The organization mime
	 * @return     {string}  The mimetype.
	 */
	this.getMimetype = function(name, orgMime) {
		var mime = orgMime,
			ext, m;
		m = (name + '').match(/\.([^.]+)$/);
		if (m && (ext = m[1])) {
			if (!extToMimeTable) {
				extToMimeTable = self.arrayFlip(self.mimeTypes);
			}
			if (!(mime = extToMimeTable[ext.toLowerCase()])) {
				mime = orgMime;
			}
		}
		return mime;
	};

	/**
	 * Supported check hash algorisms
	 * 
	 * @type Array
	 */
	self.hashCheckers = [];

	/**
	 * Closure of getContentsHashes()
	 */
	(function(self) {
		var hashLibs = {};

		if (window.Worker && window.ArrayBuffer) {
			// make fm.hashCheckers
			if (self.options.cdns.sparkmd5) {
				hashLibs.SparkMD5 = true;
				self.hashCheckers.push('md5');
			}
			if (self.options.cdns.jssha) {
				hashLibs.jsSHA = true;
				self.hashCheckers = self.hashCheckers.concat(['sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'sha3-224', 'sha3-256', 'sha3-384', 'sha3-512', 'shake128', 'shake256']);
			}
		}

		/**
		 * Gets the contents hashes.
		 *
		 * @param      String  target      target file.hash
		 * @param      Object  needHashes  need hash lib names
		 * @param      Object  requestOpts The request options
		 * @return     Object  hashes with lib name as key
		 */
		self.getContentsHashes = function(target, needHashes, hashOpts, requestOpts) {
			var dfd = $.Deferred(),
				needs = self.arrayFlip(needHashes || ['md5'], true),
				libs = [],
				jobs = [],
				res = {},
				opts = hashOpts? hashOpts : {
					shake128len : 256,
					shake256len : 512
				},
				req;

			dfd.fail(function() {
				req && req.reject();
			});

			if (Object.keys(hashLibs).length) {
				req = self.getContents(target, 'arraybuffer', requestOpts).done(function(arrayBuffer) {
					if (needs.md5 && hashLibs.SparkMD5) {
						jobs.push((function() {
							var job = $.Deferred();
							try {
								var wk = self.getWorker();
								job.fail(function() {
									wk && wk.terminate();
								});
								wk.onmessage = function(ans) {
									wk && wk.terminate();
									if (ans.data.hash) {
										var f;
										res.md5 = ans.data.hash;
										if (f = self.file(target)) {
											f.md5 = res.md5;
										}
									} else if (ans.data.error) {
										res.md5 = ans.data.error;
									}
									dfd.notify(res);
									job.resolve();
								};
								wk.onerror = function(e) {
									job.reject();
								};
								wk.postMessage({
									scripts: [self.options.cdns.sparkmd5, self.getWorkerUrl('calcfilehash.js')],
									data: { type: 'md5', bin: arrayBuffer }
								});
								dfd.fail(function() {
									job.reject();
								});
							} catch(e) {
								job.reject();
								delete hashLibs.SparkMD5;
							}
							return job;
						})());
					}
					if (hashLibs.jsSHA) {
						$.each(['1', '224', '256', '384', '512', '3-224', '3-256', '3-384', '3-512', 'ke128', 'ke256'], function(i, v) {
							if (needs['sha' + v]) {
								jobs.push((function() {
									var job = $.Deferred();
									try {
										var wk = self.getWorker();
										job.fail(function() {
											wk && wk.terminate();
										});
										wk.onmessage = function(ans) {
											wk && wk.terminate();
											if (ans.data.hash) {
												var f;
												res['sha' + v] = ans.data.hash;
												if (f = self.file(target)) {
													f['sha' + v] = res['sha' + v];
												}
											} else if (ans.data.error) {
												res['sha' + v] = ans.data.error;
											}
											dfd.notify(res);
											job.resolve();
										};
										wk.onerror = function(e) {
											job.reject();
										};
										wk.postMessage({
											scripts: [self.options.cdns.jssha, self.getWorkerUrl('calcfilehash.js')],
											data: { type: v, bin: arrayBuffer, hashOpts: opts }
										});
										dfd.fail(function() {
											job.reject();
										});
									} catch(e) {
										job.reject();
										delete hashLibs.jsSHA;
									}
									return job;
								})());
							}
						});
					}
					if (jobs.length) {
						$.when.apply(null, jobs).always(function() {
							dfd.resolve(res);
						});
					} else {
						dfd.reject();
					}
				}).fail(function() {
					dfd.reject();
				});
			} else {
				dfd.reject();
			}

			return dfd;
		};
	})(this);

	/**
	 * Parse error value to display
	 *
	 * @param  Mixed  error
	 * @return Mixed  parsed error
	 */
	this.parseError = function(error) {
		var arg = error;
		if ($.isPlainObject(arg)) {
			arg = arg.error;
		}
		return arg;
	};

	/**
	 * Alias for this.trigger('error', {error : 'message'})
	 *
	 * @param  String  error message
	 * @return elFinder
	 **/
	this.error = function() {
		var arg = arguments[0],
			opts = arguments[1] || null,
			err;
		if (arguments.length == 1 && typeof(arg) === 'function') {
			return self.bind('error', arg);
		} else {
			err = this.parseError(arg);
			return (err === true || !err)? this : self.trigger('error', {error: err, opts : opts});
		}
	};
	
	// create bind/trigger aliases for build-in events
	$.each(events, function(i, name) {
		self[name] = function() {
			var arg = arguments[0];
			return arguments.length == 1 && typeof(arg) == 'function'
				? self.bind(name, arg)
				: self.trigger(name, $.isPlainObject(arg) ? arg : {});
		};
	});

	// bind core event handlers
	this
		.enable(function() {
			if (!enabled && self.api && self.visible() && self.ui.overlay.is(':hidden') && ! node.children('.elfinder-dialog.' + self.res('class', 'editing') + ':visible').length) {
				enabled = true;
				document.activeElement && document.activeElement.blur();
				node.removeClass('elfinder-disabled');
			}
		})
		.disable(function() {
			prevEnabled = enabled;
			enabled = false;
			node.addClass('elfinder-disabled');
		})
		.open(function() {
			selected = [];
		})
		.select(function(e) {
			var cnt = 0,
				unselects = [];
			selected = $.grep(e.data.selected || e.data.value|| [], function(hash) {
				if (unselects.length || (self.maxTargets && ++cnt > self.maxTargets)) {
					unselects.push(hash);
					return false;
				} else {
					return files[hash] ? true : false;
				}
			});
			if (unselects.length) {
				self.trigger('unselectfiles', {files: unselects, inselect: true});
				self.toast({mode: 'warning', msg: self.i18n(['errMaxTargets', self.maxTargets])});
			}
		})
		.error(function(e) { 
			var opts  = {
					cssClass  : 'elfinder-dialog-error',
					title     : self.i18n('error'),
					resizable : false,
					destroyOnClose : true,
					buttons   : {}
				},
				node = self.getUI(),
				cnt = node.children('.elfinder-dialog-error').length,
				last, counter;
			
			if (cnt < self.options.maxErrorDialogs) {
				opts.buttons[self.i18n(self.i18n('btnClose'))] = function() { $(this).elfinderdialog('close'); };

				if (e.data.opts && $.isPlainObject(e.data.opts)) {
					Object.assign(opts, e.data.opts);
				}

				self.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-error"></span>'+self.i18n(e.data.error), opts);
			} else {
				last = node.children('.elfinder-dialog-error:last').children('.ui-dialog-content:first');
				counter = last.children('.elfinder-error-counter');
				if (counter.length) {
					counter.data('cnt', parseInt(counter.data('cnt')) + 1).html(self.i18n(['moreErrors', counter.data('cnt')]));
				} else {
					counter = $('<span class="elfinder-error-counter">'+ self.i18n(['moreErrors', 1]) +'</span>').data('cnt', 1);
					last.append('<br/>', counter);
				}
			}
		})
		.bind('tmb', function(e) {
			$.each(e.data.images||[], function(hash, tmb) {
				if (files[hash]) {
					files[hash].tmb = tmb;
				}
			});
		})
		.bind('searchstart', function(e) {
			Object.assign(self.searchStatus, e.data);
			self.searchStatus.state = 1;
		})
		.bind('search', function(e) {
			self.searchStatus.state = 2;
		})
		.bind('searchend', function() {
			self.searchStatus.state = 0;
			self.searchStatus.ininc = false;
			self.searchStatus.mixed = false;
		})
		.bind('canMakeEmptyFile', function(e) {
			var data = e.data,
				obj = {};
			if (data && Array.isArray(data.mimes)) {
				if (!data.unshift) {
					obj = self.mimesCanMakeEmpty;
				}
				$.each(data.mimes, function() {
					if (!obj[this]) {
						obj[this] = self.mimeTypes[this];
					}
				});
				if (data.unshift) {
					self.mimesCanMakeEmpty = Object.assign(obj, self.mimesCanMakeEmpty);
				}
			}
		})
		.bind('themechange', function() {
			requestAnimationFrame(function() {
				self.trigger('uiresize');
			});
		})
		;

	// We listen and emit a sound on delete according to option
	if (true === this.options.sound) {
		this.bind('playsound', function(e) {
			var play  = beeper.canPlayType && beeper.canPlayType('audio/wav; codecs="1"'),
				file = e.data && e.data.soundFile;

			play && file && play != '' && play != 'no' && $(beeper).html('<source src="' + soundPath + file + '" type="audio/wav">')[0].play();
		});
	}

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
	 * Root hashed
	 * 
	 * @type Object
	 */
	this.roots = {};
	
	/**
	 * leaf roots
	 * 
	 * @type Object
	 */
	this.leafRoots = {};
	
	this.volumeExpires = {};

	/**
	 * Loaded commands
	 *
	 * @type Object
	 **/
	this._commands = {};
	
	if (!Array.isArray(this.options.commands)) {
		this.options.commands = [];
	}
	
	if ($.inArray('*', this.options.commands) !== -1) {
		this.options.commands = Object.keys(this.commands);
	}
	
	/**
	 * UI command map of cwd volume ( That volume driver option `uiCmdMap` )
	 *
	 * @type Object
	 **/
	this.commandMap = {};
	
	/**
	 * cwd options of each volume
	 * key: volumeid
	 * val: options object
	 * 
	 * @type Object
	 */
	this.volOptions = {};

	/**
	 * Has volOptions data
	 * 
	 * @type Boolean
	 */
	this.hasVolOptions = false;

	/**
	 * Hash of trash holders
	 * key: trash folder hash
	 * val: source volume hash
	 * 
	 * @type Object
	 */
	this.trashes = {};

	/**
	 * cwd options of each folder/file
	 * key: hash
	 * val: options object
	 *
	 * @type Object
	 */
	this.optionsByHashes = {};
	
	/**
	 * UI Auto Hide Functions
	 * Each auto hide function mast be call to `fm.trigger('uiautohide')` at end of process
	 *
	 * @type Array
	 **/
	this.uiAutoHide = [];
	
	// trigger `uiautohide`
	this.one('open', function() {
		if (self.uiAutoHide.length) {
			setTimeout(function() {
				self.trigger('uiautohide');
			}, 500);
		}
	});
	
	// Auto Hide Functions sequential processing start
	this.bind('uiautohide', function() {
		if (self.uiAutoHide.length) {
			self.uiAutoHide.shift()();
		}
	});

	if (this.options.width) {
		width = this.options.width;
	}
	
	if (this.options.height) {
		height = this.options.height;
	}
	
	if (this.options.heightBase) {
		heightBase = $(this.options.heightBase);
	}
	
	if (this.options.soundPath) {
		soundPath = this.options.soundPath.replace(/\/+$/, '') + '/';
	} else {
		soundPath = this.baseUrl + soundPath;
	}
	
	if (this.options.parrotHeaders && Array.isArray(this.options.parrotHeaders) && this.options.parrotHeaders.length) {
		this.parrotHeaders = this.options.parrotHeaders;
		// check sessionStorage
		$.each(this.parrotHeaders, function(i, h) {
			var v = self.sessionStorage('core-ph:' + h);
			if (v) {
				self.customHeaders[h] = v;
			}
		});
	} else {
		this.parrotHeaders = [];
	}

	self.one('opendone', function() {
		var tm;
		// attach events to document
		$(document)
			// disable elfinder on click outside elfinder
			.on('click.'+namespace, function(e) { enabled && ! self.options.enableAlways && !$(e.target).closest(node).length && self.disable(); })
			// exec shortcuts
			.on(keydown+' '+keypress+' '+keyup+' '+mousedown, execShortcut);
		
		// attach events to window
		self.options.useBrowserHistory && $(window)
			.on('popstate.' + namespace, function(ev) {
				var state = ev.originalEvent.state || {},
					hasThash = state.thash? true : false,
					dialog = node.find('.elfinder-frontmost:visible'),
					input = node.find('.elfinder-navbar-dir,.elfinder-cwd-filename').find('input,textarea'),
					onOpen, toast;
				if (!hasThash) {
					state = { thash: self.cwd().hash };
					// scroll to elFinder node
					$('html,body').animate({ scrollTop: node.offset().top });
				}
				if (dialog.length || input.length) {
					history.pushState(state, null, location.pathname + location.search + '#elf_' + state.thash);
					if (dialog.length) {
						if (!dialog.hasClass(self.res('class', 'preventback'))) {
							if (dialog.hasClass('elfinder-contextmenu')) {
								$(document).trigger($.Event('keydown', { keyCode: $.ui.keyCode.ESCAPE, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
							} else if (dialog.hasClass('elfinder-dialog')) {
								dialog.elfinderdialog('close');
							} else {
								dialog.trigger('close');
							}
						}
					} else {
						input.trigger($.Event('keydown', { keyCode: $.ui.keyCode.ESCAPE, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
					}
				} else {
					if (hasThash) {
						!$.isEmptyObject(self.files()) && self.request({
							data   : {cmd  : 'open', target : state.thash, onhistory : 1},
							notify : {type : 'open', cnt : 1, hideCnt : true},
							syncOnFail : true
						});
					} else {
						onOpen = function() {
							toast.trigger('click');
						};
						self.one('open', onOpen, true);
						toast = self.toast({
							msg: self.i18n('pressAgainToExit'),
							onHidden: function() {
								self.unbind('open', onOpen);
								history.pushState(state, null, location.pathname + location.search + '#elf_' + state.thash);
							}
						});
					}
				}
			});
		
		$(window).on('resize.' + namespace, function(e){
			if (e.target === this) {
				tm && cancelAnimationFrame(tm);
				tm = requestAnimationFrame(function() {
					var prv = node.data('resizeSize') || {w: 0, h: 0},
						size = {w: Math.round(node.width()), h: Math.round(node.height())};
					node.data('resizeSize', size);
					if (size.w !== prv.w || size.h !== prv.h) {
						node.trigger('resize');
						self.trigger('resize', {width : size.w, height : size.h});
					}
				});
			}
		})
		.on('beforeunload.' + namespace,function(e){
			var msg, cnt;
			if (!self.pauseUnloadCheck()) {
				if (node.is(':visible')) {
					if (self.ui.notify.children().length && $.inArray('hasNotifyDialog', self.options.windowCloseConfirm) !== -1) {
						msg = self.i18n('ntfsmth');
					} else if (node.find('.'+self.res('class', 'editing')).length && $.inArray('editingFile', self.options.windowCloseConfirm) !== -1) {
						msg = self.i18n('editingFile');
					} else if ((cnt = Object.keys(self.selected()).length) && $.inArray('hasSelectedItem', self.options.windowCloseConfirm) !== -1) {
						msg = self.i18n('hasSelected', ''+cnt);
					} else if ((cnt = Object.keys(self.clipboard()).length) && $.inArray('hasClipboardData', self.options.windowCloseConfirm) !== -1) {
						msg = self.i18n('hasClipboard', ''+cnt);
					}
					if (msg) {
						e.returnValue = msg;
						return msg;
					}
				}
				self.trigger('unload');
			}
		});

		// bind window onmessage for CORS
		$(window).on('message.' + namespace, function(e){
			var res = e.originalEvent || null,
				obj, data;
			if (res && (self.convAbsUrl(self.options.url).indexOf(res.origin) === 0 || self.convAbsUrl(self.uploadURL).indexOf(res.origin) === 0)) {
				try {
					obj = JSON.parse(res.data);
					data = obj.data || null;
					if (data) {
						if (data.error) {
							if (obj.bind) {
								self.trigger(obj.bind+'fail', data);
							}
							self.error(data.error);
						} else {
							data.warning && self.error(data.warning);
							self.updateCache(data);
							data.removed && data.removed.length && self.remove(data);
							data.added   && data.added.length   && self.add(data);
							data.changed && data.changed.length && self.change(data);
							if (obj.bind) {
								self.trigger(obj.bind, data);
								self.trigger(obj.bind+'done');
							}
							data.sync && self.sync();
						}
					}
				} catch (e) {
					self.sync();
				}
			}
		});

		// elFinder enable always
		if (self.options.enableAlways) {
			$(window).on('focus.' + namespace, function(e){
				(e.target === this) && self.enable();
			});
			if (inFrame) {
				$(window.top).on('focus.' + namespace, function() {
					if (self.enable() && (! parentIframe || parentIframe.is(':visible'))) {
						requestAnimationFrame(function() {
							$(window).trigger('focus');
						});
					}
				});
			}
		} else if (inFrame) {
			$(window).on('blur.' + namespace, function(e){
				enabled && e.target === this && self.disable();
			});
		}

		// return focus to the window on click (elFInder in the frame)
		if (inFrame) {
			node.on('click', function(e) {
				$(window).trigger('focus');
			});
		}
		
		// elFinder to enable by mouse over
		if (self.options.enableByMouseOver) {
			node.on('mouseenter touchstart', function(e) {
				(inFrame) && $(window).trigger('focus');
				! self.enabled() && self.enable();
			});
		}

		// When the browser tab turn to foreground/background
		$(window).on('visibilitychange.' + namespace, function(e) {
			var background = document.hidden || document.webkitHidden || document.msHidden;
			// AutoSync turn On/Off
			if (self.options.syncStart) {
				self.autoSync(background? 'stop' : void(0));
			}
		});
	});

	// store instance in node
	node[0].elfinder = this;

	// auto load language file
	dfrdsBeforeBootup.push((function() {
		var lang   = self.lang,
			langJs = self.i18nBaseUrl + 'elfinder.' + lang + '.js',
			dfd    = $.Deferred().done(function() {
				if (self.i18[lang]) {
					self.lang = lang;
				}
				self.trigger('i18load');
				i18n = self.lang === 'en' 
					? self.i18['en'] 
					: $.extend(true, {}, self.i18['en'], self.i18[self.lang]);
			});
		
		if (!self.i18[lang]) {
			self.lang = 'en';
			if (self.hasRequire) {
				require([langJs], function() {
					dfd.resolve();
				}, function() {
					dfd.resolve();
				});
			} else {
				self.loadScript([langJs], function() {
					dfd.resolve();
				}, {
					loadType: 'tag',
					error : function() {
						dfd.resolve();
					}
				});
			}
		} else {
			dfd.resolve();
		}
		return dfd;
	})());
	
	// elFinder boot up function
	bootUp = function() {
		var columnNames;

		/**
		 * i18 messages
		 *
		 * @type Object
		 **/
		self.messages = i18n.messages;
		
		// check jquery ui
		if (!($.fn.selectable && $.fn.draggable && $.fn.droppable && $.fn.resizable && $.fn.button && $.fn.slider)) {
			return alert(self.i18n('errJqui'));
		}
		
		// check node
		if (!node.length) {
			return alert(self.i18n('errNode'));
		}
		// check connector url
		if (!self.options.url) {
			return alert(self.i18n('errURL'));
		}
		
		// column key/name map for fm.getColumnName()
		columnNames = Object.assign({
			name : self.i18n('name'),
			perm : self.i18n('perms'),
			date : self.i18n('modify'),
			size : self.i18n('size'),
			kind : self.i18n('kind'),
			modestr : self.i18n('mode'),
			modeoct : self.i18n('mode'),
			modeboth : self.i18n('mode')
		}, self.options.uiOptions.cwd.listView.columnsCustomName);

		/**
		 * Gets the column name of cwd list view
		 *
		 * @param      String  key     The key
		 * @return     String  The column name.
		 */
		self.getColumnName = function(key) {
			var res = columnNames[key] || self.i18n(key);
			return typeof res === 'function'? res() : res;
		};

		/**
		 * Interface direction
		 *
		 * @type String
		 * @default "ltr"
		 **/
		self.direction = i18n.direction;
		
		/**
		 * Date/time format
		 *
		 * @type String
		 * @default "m.d.Y"
		 **/
		self.dateFormat = self.options.dateFormat || i18n.dateFormat;
		
		/**
		 * Date format like "Yesterday 10:20:12"
		 *
		 * @type String
		 * @default "{day} {time}"
		 **/
		self.fancyFormat = self.options.fancyDateFormat || i18n.fancyDateFormat;
		
		/**
		 * Date format for if upload file has not original unique name
		 * e.g. Clipboard image data, Image data taken with iOS
		 *
		 * @type String
		 * @default "ymd-His"
		 **/
		self.nonameDateFormat = (self.options.nonameDateFormat || i18n.nonameDateFormat).replace(/[\/\\]/g, '_');

		/**
		 * Css classes 
		 *
		 * @type String
		 **/
		self.cssClass = 'ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'
				+(self.direction == 'rtl' ? 'rtl' : 'ltr')
				+(self.UA.Touch? (' elfinder-touch' + (self.options.resizable ? ' touch-punch' : '')) : '')
				+(self.UA.Mobile? ' elfinder-mobile' : '')
				+(self.UA.iOS? ' elfinder-ios' : '')
				+' '+self.options.cssClass;

		// prepare node
		node.addClass(self.cssClass)
			.on(mousedown, function() {
				!enabled && self.enable();
			});

		// draggable closure
		(function() {
			var ltr, wzRect, wzBottom, wzBottom2, nodeStyle,
				keyEvt = keydown + 'draggable' + ' keyup.' + namespace + 'draggable';
			
			/**
			 * Base draggable options
			 *
			 * @type Object
			 **/
			self.draggable = {
				appendTo   : node,
				addClasses : false,
				distance   : 4,
				revert     : true,
				refreshPositions : false,
				cursor     : 'crosshair',
				cursorAt   : {left : 50, top : 47},
				scroll     : false,
				start      : function(e, ui) {
					var helper   = ui.helper,
						targets  = $.grep(helper.data('files')||[], function(h) {
							if (h) {
								remember[h] = true;
								return true;
							}
							return false;
						}),
						locked   = false,
						cnt, h;
					
					// fix node size
					nodeStyle = node.attr('style');
					node.width(node.width()).height(node.height());
					
					// set var for drag()
					ltr = (self.direction === 'ltr');
					wzRect = self.getUI('workzone').data('rectangle');
					wzBottom = wzRect.top + wzRect.height;
					wzBottom2 = wzBottom - self.getUI('navdock').outerHeight(true);
					
					self.draggingUiHelper = helper;
					cnt = targets.length;
					while (cnt--) {
						h = targets[cnt];
						if (files[h].locked) {
							locked = true;
							helper.data('locked', true);
							break;
						}
					}
					!locked && self.trigger('lockfiles', {files : targets});
		
					helper.data('autoScrTm', setInterval(function() {
						if (helper.data('autoScr')) {
							self.autoScroll[helper.data('autoScr')](helper.data('autoScrVal'));
						}
					}, 50));
				},
				drag       : function(e, ui) {
					var helper = ui.helper,
						autoScr, autoUp, bottom;
					
					if ((autoUp = wzRect.top > e.pageY) || wzBottom2 < e.pageY) {
						if (wzRect.cwdEdge > e.pageX) {
							autoScr = (ltr? 'navbar' : 'cwd') + (autoUp? 'Up' : 'Down');
						} else {
							autoScr = (ltr? 'cwd' : 'navbar') + (autoUp? 'Up' : 'Down');
						}
						if (!autoUp) {
							if (autoScr.substr(0, 3) === 'cwd') {
								if (wzBottom < e.pageY) {
									bottom = wzBottom;
								} else {
									autoScr = null;
								}
							} else {
								bottom = wzBottom2;
							}
						}
						if (autoScr) {
							helper.data('autoScr', autoScr);
							helper.data('autoScrVal', Math.pow((autoUp? wzRect.top - e.pageY : e.pageY - bottom), 1.3));
						}
					}
					if (! autoScr) {
						if (helper.data('autoScr')) {
							helper.data('refreshPositions', 1).data('autoScr', null);
						}
					}
					if (helper.data('refreshPositions') && $(this).elfUiWidgetInstance('draggable')) {
						if (helper.data('refreshPositions') > 0) {
							$(this).draggable('option', { refreshPositions : true, elfRefresh : true });
							helper.data('refreshPositions', -1);
						} else {
							$(this).draggable('option', { refreshPositions : false, elfRefresh : false });
							helper.data('refreshPositions', null);
						}
					}
				},
				stop       : function(e, ui) {
					var helper = ui.helper,
						files;
					
					$(document).off(keyEvt);
					$(this).elfUiWidgetInstance('draggable') && $(this).draggable('option', { refreshPositions : false });
					self.draggingUiHelper = null;
					self.trigger('focus').trigger('dragstop');
					if (! helper.data('droped')) {
						files = $.grep(helper.data('files')||[], function(h) { return h? true : false ;});
						self.trigger('unlockfiles', {files : files});
						self.trigger('selectfiles', {files : self.selected()});
					}
					self.enable();
					
					// restore node style
					node.attr('style', nodeStyle);
					
					helper.data('autoScrTm') && clearInterval(helper.data('autoScrTm'));
				},
				helper     : function(e, ui) {
					var element = this.id ? $(this) : $(this).parents('[id]:first'),
						helper  = $('<div class="elfinder-drag-helper"><span class="elfinder-drag-helper-icon-status"></span></div>'),
						icon    = function(f) {
							var mime = f.mime, i, tmb = self.tmb(f);
							i = '<div class="elfinder-cwd-icon elfinder-cwd-icon-drag '+self.mime2class(mime)+' ui-corner-all"></div>';
							if (tmb) {
								i = $(i).addClass(tmb.className).css('background-image', "url('"+tmb.url+"')").get(0).outerHTML;
							} else if (f.icon) {
								i = $(i).css(self.getIconStyle(f, true)).get(0).outerHTML;
							}
							if (f.csscls) {
								i = '<div class="'+f.csscls+'">' + i + '</div>';
							}
							return i;
						},
						hashes, l, ctr;
					
					self.draggingUiHelper && self.draggingUiHelper.stop(true, true);
					
					self.trigger('dragstart', {target : element[0], originalEvent : e}, true);
					
					hashes = element.hasClass(self.res('class', 'cwdfile')) 
						? self.selected() 
						: [self.navId2Hash(element.attr('id'))];
					
					helper.append(icon(files[hashes[0]])).data('files', hashes).data('locked', false).data('droped', false).data('namespace', namespace).data('dropover', 0);
		
					if ((l = hashes.length) > 1) {
						helper.append(icon(files[hashes[l-1]]) + '<span class="elfinder-drag-num">'+l+'</span>');
					}
					
					$(document).on(keyEvt, function(e){
						if (self._commands.copy) {
							var chk = (e.shiftKey||e.ctrlKey||e.metaKey);
							if (ctr !== chk) {
								ctr = chk;
								if (helper.is(':visible') && helper.data('dropover') && ! helper.data('droped')) {
									helper.toggleClass('elfinder-drag-helper-plus', helper.data('locked')? true : ctr);
									self.trigger(ctr? 'unlockfiles' : 'lockfiles', {files : hashes, helper: helper});
								}
							}
						}
					});
					
					return helper;
				}
			};
		})();

		// in getFileCallback set - change default actions on double click/enter/ctrl+enter
		if (self.commands.getfile) {
			if (typeof(self.options.getFileCallback) == 'function') {
				self.bind('dblclick', function(e) {
					e.preventDefault();
					self.exec('getfile').fail(function() {
						self.exec('open', e.data && e.data.file? [ e.data.file ]: void(0));
					});
				});
				self.shortcut({
					pattern     : 'enter',
					description : self.i18n('cmdgetfile'),
					callback    : function() { self.exec('getfile').fail(function() { self.exec(self.OS == 'mac' ? 'rename' : 'open'); }); }
				})
				.shortcut({
					pattern     : 'ctrl+enter',
					description : self.i18n(self.OS == 'mac' ? 'cmdrename' : 'cmdopen'),
					callback    : function() { self.exec(self.OS == 'mac' ? 'rename' : 'open'); }
				});
			} else {
				self.options.getFileCallback = null;
			}
		}

		// load commands
		$.each(self.commands, function(name, cmd) {
			var proto = Object.assign({}, cmd.prototype),
				extendsCmd, opts;
			if ($.isFunction(cmd) && !self._commands[name] && (cmd.prototype.forceLoad || $.inArray(name, self.options.commands) !== -1)) {
				extendsCmd = cmd.prototype.extendsCmd || '';
				if (extendsCmd) {
					if ($.isFunction(self.commands[extendsCmd])) {
						cmd.prototype = Object.assign({}, base, new self.commands[extendsCmd](), cmd.prototype);
					} else {
						return true;
					}
				} else {
					cmd.prototype = Object.assign({}, base, cmd.prototype);
				}
				self._commands[name] = new cmd();
				cmd.prototype = proto;
				opts = self.options.commandsOptions[name] || {};
				if (extendsCmd && self.options.commandsOptions[extendsCmd]) {
					opts = $.extend(true, {}, self.options.commandsOptions[extendsCmd], opts);
				}
				self._commands[name].setup(name, opts);
				// setup linked commands
				if (self._commands[name].linkedCmds.length) {
					$.each(self._commands[name].linkedCmds, function(i, n) {
						var lcmd = self.commands[n];
						if ($.isFunction(lcmd) && !self._commands[n]) {
							lcmd.prototype = base;
							self._commands[n] = new lcmd();
							self._commands[n].setup(n, self.options.commandsOptions[n]||{});
						}
					});
				}
			}
		});

		/**
		 * UI nodes
		 *
		 * @type Object
		 **/
		self.ui = {
			// container for nav panel and current folder container
			workzone : $('<div></div>').appendTo(node).elfinderworkzone(self),
			// contaainer for folders tree / places
			navbar : $('<div></div>').appendTo(node).elfindernavbar(self, self.options.uiOptions.navbar || {}),
			// container for for preview etc at below the navbar
			navdock : $('<div></div>').appendTo(node).elfindernavdock(self, self.options.uiOptions.navdock || {}),
			// contextmenu
			contextmenu : $('<div></div>').appendTo(node).elfindercontextmenu(self),
			// overlay
			overlay : $('<div></div>').appendTo(node).elfinderoverlay({
				show : function() { self.disable(); },
				hide : function() { prevEnabled && self.enable(); }
			}),
			// current folder container
			cwd : $('<div></div>').appendTo(node).elfindercwd(self, self.options.uiOptions.cwd || {}),
			// notification dialog window
			notify : self.dialog('', {
				cssClass      : 'elfinder-dialog-notify' + (self.options.notifyDialog.canClose? '' : ' elfinder-titlebar-button-hide'),
				position      : self.options.notifyDialog.position,
				absolute      : true,
				resizable     : false,
				autoOpen      : false,
				allowMinimize : true,
				closeOnEscape : self.options.notifyDialog.canClose? true : false,
				title         : '&nbsp;',
				width         : self.options.notifyDialog.width? parseInt(self.options.notifyDialog.width) : null,
				minHeight     : null,
				minimize      : function() { self.ui.notify.trigger('minimize'); }
			}),
			statusbar : $('<div class="ui-widget-header ui-helper-clearfix ui-corner-bottom elfinder-statusbar"></div>').hide().appendTo(node),
			toast : $('<div class="elfinder-toast"></div>').appendTo(node),
			bottomtray : $('<div class="elfinder-bottomtray">').appendTo(node),
			progressbar : $('<div class="elfinder-ui-progressbar">').appendTo(node)
		};

		self.trigger('uiready');

		// load required ui
		$.each(self.options.ui || [], function(i, ui) {
			var name = 'elfinder'+ui,
				opts = self.options.uiOptions[ui] || {};
	
			if (!self.ui[ui] && $.fn[name]) {
				// regist to self.ui before make instance
				self.ui[ui] = $('<'+(opts.tag || 'div')+'/>').appendTo(node);
				self.ui[ui][name](self, opts);
			}
		});

		self.ui.progressbar.appendTo(self.ui.workzone);
		self.ui.notify.prev('.ui-dialog-titlebar').append('<div class="elfinder-ui-progressbar"></div>');

		// update size	
		self.resize(width, height);
		
		// make node resizable
		if (self.options.resizable) {
			node.resizable({
				resize    : function(e, ui) {
					self.resize(ui.size.width, ui.size.height);
				},
				handles   : 'se',
				minWidth  : 300,
				minHeight : 200
			});
			if (self.UA.Touch) {
				node.addClass('touch-punch');
			}
		}

		(function() {
			var navbar = self.getUI('navbar'),
				cwd    = self.getUI('cwd').parent();
			
			self.autoScroll = {
				navbarUp   : function(v) {
					navbar.scrollTop(Math.max(0, navbar.scrollTop() - v));
				},
				navbarDown : function(v) {
					navbar.scrollTop(navbar.scrollTop() + v);
				},
				cwdUp     : function(v) {
					cwd.scrollTop(Math.max(0, cwd.scrollTop() - v));
				},
				cwdDown   : function(v) {
					cwd.scrollTop(cwd.scrollTop() + v);
				}
			};
		})();

		// Swipe on the touch devices to show/hide of toolbar or navbar
		if (self.UA.Touch) {
			(function() {
				var lastX, lastY, nodeOffset, nodeWidth, nodeTop, navbarW, toolbarH,
					navbar = self.getUI('navbar'),
					toolbar = self.getUI('toolbar'),
					moveEv = 'touchmove.stopscroll',
					moveTm,
					moveUpOn = function(e) {
						var touches = e.originalEvent.touches || [{}],
							y = touches[0].pageY || null;
						if (!lastY || y < lastY) {
							e.preventDefault();
							moveTm && clearTimeout(moveTm);
						}
					},
					moveDownOn = function(e) {
						e.preventDefault();
						moveTm && clearTimeout(moveTm);
					},
					moveOff = function() {
						moveTm = setTimeout(function() {
							node.off(moveEv);
						}, 100);
					},
					handleW, handleH = 50;

				navbar = navbar.children().length? navbar : null;
				toolbar = toolbar.length? toolbar : null;
				node.on('touchstart touchmove touchend', function(e) {
					if (e.type === 'touchend') {
						lastX = false;
						lastY = false;
						moveOff();
						return;
					}
					
					var touches = e.originalEvent.touches || [{}],
						x = touches[0].pageX || null,
						y = touches[0].pageY || null,
						ltr = (self.direction === 'ltr'),
						navbarMode, treeWidth, swipeX, moveX, toolbarT, mode;
					
					if (x === null || y === null || (e.type === 'touchstart' && touches.length > 1)) {
						return;
					}
					
					if (e.type === 'touchstart') {
						nodeOffset = node.offset();
						nodeWidth = node.width();
						if (navbar) {
							lastX = false;
							if (navbar.is(':hidden')) {
								if (! handleW) {
									handleW = Math.max(50, nodeWidth / 10);
								}
								if ((ltr? (x - nodeOffset.left) : (nodeWidth + nodeOffset.left - x)) < handleW) {
									lastX = x;
								}
							} else if (! e.originalEvent._preventSwipeX) {
								navbarW = navbar.width();
								if (ltr) {
									swipeX = (x < nodeOffset.left + navbarW);
								} else {
									swipeX = (x > nodeOffset.left + nodeWidth - navbarW);
								}
								if (swipeX) {
									handleW = Math.max(50, nodeWidth / 10);
									lastX = x;
								} else {
									lastX = false;
								}
							}
						}
						if (toolbar) {
							lastY = false;
							if (! e.originalEvent._preventSwipeY) {
								toolbarH = toolbar.height();
								nodeTop = nodeOffset.top;
								if (y - nodeTop < (toolbar.is(':hidden')? handleH : (toolbarH + 30))) {
									lastY = y;
									node.on(moveEv, toolbar.is(':hidden')? moveDownOn: moveUpOn);
								}
							}
						}
					} else {
						if (navbar && lastX !== false) {
							navbarMode = (ltr? (lastX > x) : (lastX < x))? 'navhide' : 'navshow';
							moveX = Math.abs(lastX - x);
							if (navbarMode === 'navhide' && moveX > navbarW * 0.6
								|| (moveX > (navbarMode === 'navhide'? navbarW / 3 : 45)
									&& (navbarMode === 'navshow'
										|| (ltr? x < nodeOffset.left + 20 : x > nodeOffset.left + nodeWidth - 20)
									))
							) {
								self.getUI('navbar').trigger(navbarMode, {handleW: handleW});
								lastX = false;
							}
						}
						if (toolbar && lastY !== false ) {
							toolbarT = toolbar.offset().top;
							if (Math.abs(lastY - y) > Math.min(45, toolbarH / 3)) {
								mode = (lastY > y)? 'slideUp' : 'slideDown';
								if (mode === 'slideDown' || toolbarT + 20 > y) {
									if (toolbar.is(mode === 'slideDown' ? ':hidden' : ':visible')) {
										toolbar.stop(true, true).trigger('toggle', {duration: 100, handleH: handleH});
									}
									lastY = false;
								}
							}
						}
					}
				});
			})();
		}

		if (self.dragUpload) {
			// add event listener for HTML5 DnD upload
			(function() {
				var isin = function(e) {
					return (e.target.nodeName !== 'TEXTAREA' && e.target.nodeName !== 'INPUT' && $(e.target).closest('div.ui-dialog-content').length === 0);
				},
				ent       = 'native-drag-enter',
				disable   = 'native-drag-disable',
				c         = 'class',
				navdir    = self.res(c, 'navdir'),
				droppable = self.res(c, 'droppable'),
				dropover  = self.res(c, 'adroppable'),
				arrow     = self.res(c, 'navarrow'),
				clDropActive = self.res(c, 'adroppable'),
				wz        = self.getUI('workzone'),
				ltr       = (self.direction === 'ltr'),
				clearTm   = function() {
					autoScrTm && cancelAnimationFrame(autoScrTm);
					autoScrTm = null;
				},
				wzRect, autoScrFn, autoScrTm;
				
				node.on('dragenter', function(e) {
					clearTm();
					if (isin(e)) {
						e.preventDefault();
						e.stopPropagation();
						wzRect = wz.data('rectangle');
					}
				})
				.on('dragleave', function(e) {
					clearTm();
					if (isin(e)) {
						e.preventDefault();
						e.stopPropagation();
					}
				})
				.on('dragover', function(e) {
					var autoUp;
					if (isin(e)) {
						e.preventDefault();
						e.stopPropagation();
						e.originalEvent.dataTransfer.dropEffect = 'none';
						if (! autoScrTm) {
							autoScrTm = requestAnimationFrame(function() {
								var wzBottom = wzRect.top + wzRect.height,
									wzBottom2 = wzBottom - self.getUI('navdock').outerHeight(true),
									fn;
								if ((autoUp = e.pageY < wzRect.top) || e.pageY > wzBottom2 ) {
									if (wzRect.cwdEdge > e.pageX) {
										fn = (ltr? 'navbar' : 'cwd') + (autoUp? 'Up' : 'Down');
									} else {
										fn = (ltr? 'cwd' : 'navbar') + (autoUp? 'Up' : 'Down');
									}
									if (!autoUp) {
										if (fn.substr(0, 3) === 'cwd') {
											if (wzBottom < e.pageY) {
												wzBottom2 = wzBottom;
											} else {
												fn = '';
											}
										}
									}
									fn && self.autoScroll[fn](Math.pow((autoUp? wzRect.top - e.pageY : e.pageY - wzBottom2), 1.3));
								}
								autoScrTm = null;
							});
						}
					} else {
						clearTm();
					}
				})
				.on('drop', function(e) {
					clearTm();
					if (isin(e)) {
						e.stopPropagation();
						e.preventDefault();
					}
				});
				
				node.on('dragenter', '.native-droppable', function(e){
					if (e.originalEvent.dataTransfer) {
						var $elm = $(e.currentTarget),
							id   = e.currentTarget.id || null,
							cwd  = null,
							elfFrom;
						if (!id) { // target is cwd
							cwd = self.cwd();
							$elm.data(disable, false);
							try {
								$.each(e.originalEvent.dataTransfer.types, function(i, v){
									if (v.substr(0, 13) === 'elfinderfrom:') {
										elfFrom = v.substr(13).toLowerCase();
									}
								});
							} catch(e) {}
						}
						if (!cwd || (cwd.write && (!elfFrom || elfFrom !== (window.location.href + cwd.hash).toLowerCase()))) {
							e.preventDefault();
							e.stopPropagation();
							$elm.data(ent, true);
							$elm.addClass(clDropActive);
						} else {
							$elm.data(disable, true);
						}
					}
				})
				.on('dragleave', '.native-droppable', function(e){
					if (e.originalEvent.dataTransfer) {
						var $elm = $(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
						if ($elm.data(ent)) {
							$elm.data(ent, false);
						} else {
							$elm.removeClass(clDropActive);
						}
					}
				})
				.on('dragover', '.native-droppable', function(e){
					if (e.originalEvent.dataTransfer) {
						var $elm = $(e.currentTarget);
						e.preventDefault();
						e.stopPropagation();
						e.originalEvent.dataTransfer.dropEffect = $elm.data(disable)? 'none' : 'copy';
						$elm.data(ent, false);
					}
				})
				.on('drop', '.native-droppable', function(e){
					if (e.originalEvent && e.originalEvent.dataTransfer) {
						var $elm = $(e.currentTarget),
							id;
						e.preventDefault();
						e.stopPropagation();
						$elm.removeClass(clDropActive);
						if (e.currentTarget.id) {
							id = $elm.hasClass(navdir)? self.navId2Hash(e.currentTarget.id) : self.cwdId2Hash(e.currentTarget.id);
						} else {
							id = self.cwd().hash;
						}
						e.originalEvent._target = id;
						self.exec('upload', {dropEvt: e.originalEvent, target: id}, void 0, id);
					}
				});
			})();
		}

		// trigger event cssloaded if cssAutoLoad disabled
		if (self.cssloaded === false) {
			self.cssloaded = true;
			self.trigger('cssloaded');
		}

		// calculate elFinder node z-index
		self.zIndexCalc();

		// send initial request and start to pray >_<
		self.trigger('init')
			.request({
				data        : {cmd : 'open', target : self.startDir(), init : 1, tree : 1}, 
				preventDone : true,
				notify      : {type : 'open', cnt : 1, hideCnt : true},
				freeze      : true
			})
			.fail(function() {
				self.trigger('fail').disable().lastDir('');
				listeners = {};
				shortcuts = {};
				$(document).add(node).off('.'+namespace);
				self.trigger = function() { };
			})
			.done(function(data) {
				var trashDisable = function(th) {
						var src = self.file(self.trashes[th]),
							d = self.options.debug,
							error;
						
						if (src && src.volumeid) {
							delete self.volOptions[src.volumeid].trashHash;
						}
						self.trashes[th] = false;
						self.debug('backend-error', 'Trash hash "'+th+'" was not found or not writable.');
					},
					toChkTh = {};
				
				// regist rawStringDecoder
				if (self.options.rawStringDecoder) {
					self.registRawStringDecoder(self.options.rawStringDecoder);
				}

				// re-calculate elFinder node z-index
				self.zIndexCalc();
				
				self.load().debug('api', self.api);
				// update ui's size after init
				node.trigger('resize');
				// initial open
				open(data);
				self.trigger('open', data, false);
				self.trigger('opendone');
				
				if (inFrame && self.options.enableAlways) {
					$(window).trigger('focus');
				}
				
				// check self.trashes
				$.each(self.trashes, function(th) {
					var dir = self.file(th),
						src;
					if (! dir) {
						toChkTh[th] = true;
					} else if (dir.mime !== 'directory' || ! dir.write) {
						trashDisable(th);
					}
				});
				if (Object.keys(toChkTh).length) {
					self.request({
						data : {cmd : 'info', targets : Object.keys(toChkTh)},
						preventDefault : true
					}).done(function(data) {
						if (data && data.files) {
							$.each(data.files, function(i, dir) {
								if (dir.mime === 'directory' && dir.write) {
									delete toChkTh[dir.hash];
								}
							});
						}
					}).always(function() {
						$.each(toChkTh, trashDisable);
					});
				}
				// to enable / disable
				self[self.options.enableAlways? 'enable' : 'disable']();
			});
		
		// self.timeEnd('load');
		// End of bootUp()
	};
	
	// call bootCallback function with elFinder instance, extraObject - { dfrdsBeforeBootup: dfrdsBeforeBootup }
	if (bootCallback && typeof bootCallback === 'function') {
		self.bootCallback = bootCallback;
		bootCallback.call(node.get(0), self, { dfrdsBeforeBootup: dfrdsBeforeBootup });
	}
	
	// call dfrdsBeforeBootup functions then boot up elFinder
	$.when.apply(null, dfrdsBeforeBootup).done(function() {
		bootUp();
	}).fail(function(error) {
		self.error(error);
	});
};

//register elFinder to global scope
if (typeof toGlobal === 'undefined' || toGlobal) {
	window.elFinder = elFinder;
}

/**
 * Prototype
 * 
 * @type  Object
 */
elFinder.prototype = {
	
	uniqueid : 0,
	
	res : function(type, id) {
		return this.resources[type] && this.resources[type][id];
	}, 

	/**
	 * User os. Required to bind native shortcuts for open/rename
	 *
	 * @type String
	 **/
	OS : navigator.userAgent.indexOf('Mac') !== -1 ? 'mac' : navigator.userAgent.indexOf('Win') !== -1  ? 'win' : 'other',
	
	/**
	 * User browser UA.
	 * jQuery.browser: version deprecated: 1.3, removed: 1.9
	 *
	 * @type Object
	 **/
	UA : (function(){
		var self = this,
			webkit = !document.unqueID && !window.opera && !window.sidebar && 'localStorage' in window && 'WebkitAppearance' in document.documentElement.style,
			chrome = webkit && window.chrome,
			/*setRotated = function() {
				var a = ((screen && screen.orientation && screen.orientation.angle) || window.orientation || 0) + 0;
				if (a === -90) {
					a = 270;
				}
				UA.Angle = a;
				UA.Rotated = a % 180 === 0? false : true;
			},*/
			UA = {
				// Browser IE <= IE 6
				ltIE6   : typeof window.addEventListener == "undefined" && typeof document.documentElement.style.maxHeight == "undefined",
				// Browser IE <= IE 7
				ltIE7   : typeof window.addEventListener == "undefined" && typeof document.querySelectorAll == "undefined",
				// Browser IE <= IE 8
				ltIE8   : typeof window.addEventListener == "undefined" && typeof document.getElementsByClassName == "undefined",
				// Browser IE <= IE 9
				ltIE9  : document.uniqueID && document.documentMode <= 9,
				// Browser IE <= IE 10
				ltIE10  : document.uniqueID && document.documentMode <= 10,
				// Browser IE >= IE 11
				gtIE11  : document.uniqueID && document.documentMode >= 11,
				IE      : document.uniqueID,
				Firefox : window.sidebar,
				Opera   : window.opera,
				Webkit  : webkit,
				Chrome  : chrome,
				Edge    : (chrome && window.msCredentials)? true : false,
				Safari  : webkit && !window.chrome,
				Mobile  : typeof window.orientation != "undefined",
				Touch   : typeof window.ontouchstart != "undefined",
				iOS     : navigator.platform.match(/^iP(?:[ao]d|hone)/),
				Mac     : navigator.platform.match(/^Mac/),
				Fullscreen : (typeof (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen) !== 'undefined'),
				Angle   : 0,
				Rotated : false,
				CSS : (function() {
					var aStyle = document.createElement('a').style,
						pStyle = document.createElement('p').style,
						css;
					css = 'position:sticky;position:-webkit-sticky;';
					css += 'width:-webkit-max-content;width:-moz-max-content;width:-ms-max-content;width:max-content;';
					aStyle.cssText = css;
					return {
						positionSticky : aStyle.position.indexOf('sticky')!==-1,
						widthMaxContent : aStyle.width.indexOf('max-content')!==-1,
						flex : typeof pStyle.flex !== 'undefined'
					};
				})()
			};
			return UA;
	})(),
	
	/**
	 * Is cookie enabled
	 * 
	 * @type Boolean
	 */
	cookieEnabled : window.navigator.cookieEnabled,

	/**
	 * Has RequireJS?
	 * 
	 * @type Boolean
	 */
	hasRequire : (typeof define === 'function' && define.amd),
	
	/**
	 * Current request command
	 * 
	 * @type  String
	 */
	currentReqCmd : '',
	
	/**
	 * Current keyboard state
	 * 
	 * @type  Object
	 */
	keyState : {},
	
	/**
	 * Internationalization object
	 * 
	 * @type  Object
	 */
	i18 : {
		en : {
			translator      : '',
			language        : 'English',
			direction       : 'ltr',
			dateFormat      : 'd.m.Y H:i',
			fancyDateFormat : '$1 H:i',
			nonameDateFormat : 'ymd-His',
			messages        : {}
		},
		months : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		monthsShort : ['msJan', 'msFeb', 'msMar', 'msApr', 'msMay', 'msJun', 'msJul', 'msAug', 'msSep', 'msOct', 'msNov', 'msDec'],

		days : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		daysShort : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	},
	
	/**
	 * File mimetype to kind mapping
	 * 
	 * @type  Object
	 */
	kinds : 	{
			'unknown'                       : 'Unknown',
			'directory'                     : 'Folder',
			'group'                         : 'Selects',
			'symlink'                       : 'Alias',
			'symlink-broken'                : 'AliasBroken',
			'application/x-empty'           : 'TextPlain',
			'application/postscript'        : 'Postscript',
			'application/vnd.ms-office'     : 'MsOffice',
			'application/msword'            : 'MsWord',
			'application/vnd.ms-word'       : 'MsWord',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'MsWord',
			'application/vnd.ms-word.document.macroEnabled.12'                        : 'MsWord',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.template' : 'MsWord',
			'application/vnd.ms-word.template.macroEnabled.12'                        : 'MsWord',
			'application/vnd.ms-excel'      : 'MsExcel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       : 'MsExcel',
			'application/vnd.ms-excel.sheet.macroEnabled.12'                          : 'MsExcel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.template'    : 'MsExcel',
			'application/vnd.ms-excel.template.macroEnabled.12'                       : 'MsExcel',
			'application/vnd.ms-excel.sheet.binary.macroEnabled.12'                   : 'MsExcel',
			'application/vnd.ms-excel.addin.macroEnabled.12'                          : 'MsExcel',
			'application/vnd.ms-powerpoint' : 'MsPP',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'MsPP',
			'application/vnd.ms-powerpoint.presentation.macroEnabled.12'              : 'MsPP',
			'application/vnd.openxmlformats-officedocument.presentationml.slideshow'  : 'MsPP',
			'application/vnd.ms-powerpoint.slideshow.macroEnabled.12'                 : 'MsPP',
			'application/vnd.openxmlformats-officedocument.presentationml.template'   : 'MsPP',
			'application/vnd.ms-powerpoint.template.macroEnabled.12'                  : 'MsPP',
			'application/vnd.ms-powerpoint.addin.macroEnabled.12'                     : 'MsPP',
			'application/vnd.openxmlformats-officedocument.presentationml.slide'      : 'MsPP',
			'application/vnd.ms-powerpoint.slide.macroEnabled.12'                     : 'MsPP',
			'application/pdf'               : 'PDF',
			'application/xml'               : 'XML',
			'application/vnd.oasis.opendocument.text' : 'OO',
			'application/vnd.oasis.opendocument.text-template'         : 'OO',
			'application/vnd.oasis.opendocument.text-web'              : 'OO',
			'application/vnd.oasis.opendocument.text-master'           : 'OO',
			'application/vnd.oasis.opendocument.graphics'              : 'OO',
			'application/vnd.oasis.opendocument.graphics-template'     : 'OO',
			'application/vnd.oasis.opendocument.presentation'          : 'OO',
			'application/vnd.oasis.opendocument.presentation-template' : 'OO',
			'application/vnd.oasis.opendocument.spreadsheet'           : 'OO',
			'application/vnd.oasis.opendocument.spreadsheet-template'  : 'OO',
			'application/vnd.oasis.opendocument.chart'                 : 'OO',
			'application/vnd.oasis.opendocument.formula'               : 'OO',
			'application/vnd.oasis.opendocument.database'              : 'OO',
			'application/vnd.oasis.opendocument.image'                 : 'OO',
			'application/vnd.openofficeorg.extension'                  : 'OO',
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
			'application/x-xz'              : 'XZ',
			'application/zip'               : 'ZIP',
			'application/x-zip'               : 'ZIP',
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
			'text/x-markdown'               : 'Markdown',
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
	 * File mimetype to file extention mapping
	 * 
	 * @type  Object
	 * @see   elFinder.mimetypes.js
	 */
	mimeTypes : {},
	
	/**
	 * Ajax request data validation rules
	 * 
	 * @type  Object
	 */
	rules : {
		defaults : function(data) {
			if (!data
			|| (data.added && !Array.isArray(data.added))
			||  (data.removed && !Array.isArray(data.removed))
			||  (data.changed && !Array.isArray(data.changed))) {
				return false;
			}
			return true;
		},
		open    : function(data) { return data && data.cwd && data.files && $.isPlainObject(data.cwd) && Array.isArray(data.files); },
		tree    : function(data) { return data && data.tree && Array.isArray(data.tree); },
		parents : function(data) { return data && data.tree && Array.isArray(data.tree); },
		tmb     : function(data) { return data && data.images && ($.isPlainObject(data.images) || Array.isArray(data.images)); },
		upload  : function(data) { return data && ($.isPlainObject(data.added) || Array.isArray(data.added));},
		search  : function(data) { return data && data.files && Array.isArray(data.files); }
	},
	
	/**
	 * Commands costructors
	 *
	 * @type Object
	 */
	commands : {},
	
	/**
	 * Commands to add the item (space delimited)
	 * 
	 * @type String
	 */
	cmdsToAdd : 'archive duplicate extract mkdir mkfile paste rm upload',
	
	parseUploadData : function(text) {
		var self = this,
			data;
		
		if (!$.trim(text)) {
			return {error : ['errResponse', 'errDataEmpty']};
		}
		
		try {
			data = JSON.parse(text);
		} catch (e) {
			return {error : ['errResponse', 'errDataNotJSON']};
		}
		
		data = self.normalize(data);
		if (!self.validResponse('upload', data)) {
			return {error : (data.norError || ['errResponse'])};
		}
		data.removed = $.merge((data.removed || []), $.map(data.added || [], function(f) { return self.file(f.hash)? f.hash : null; }));
		return data;
		
	},
	
	iframeCnt : 0,
	
	uploads : {
		// xhr muiti uploading flag
		xhrUploading: false,
		
		// Timer of request fail to sync
		failSyncTm: null,
		
		// current chunkfail requesting chunk
		chunkfailReq: {},
		
		// check file/dir exists
		checkExists: function(files, target, fm, isDir) {
			var dfrd = $.Deferred(),
				names, renames = [], hashes = {}, chkFiles = [],
				cancel = function() {
					var i = files.length;
					while (--i > -1) {
						files[i]._remove = true;
					}
				},
				resolve = function() {
					dfrd.resolve(renames, hashes);
				},
				check = function() {
					var existed = [], exists = [], i, c,
						pathStr = target !== fm.cwd().hash? fm.path(target, true) + fm.option('separator', target) : '',
						confirm = function(ndx) {
							var last = ndx == exists.length-1,
								opts = {
									cssClass : 'elfinder-confirm-upload',
									title  : fm.i18n('cmdupload'),
									text   : ['errExists', pathStr + exists[ndx].name, 'confirmRepl'], 
									all    : !last,
									accept : {
										label    : 'btnYes',
										callback : function(all) {
											!last && !all
												? confirm(++ndx)
												: resolve();
										}
									},
									reject : {
										label    : 'btnNo',
										callback : function(all) {
											var i;
			
											if (all) {
												i = exists.length;
												while (ndx < i--) {
													files[exists[i].i]._remove = true;
												}
											} else {
												files[exists[ndx].i]._remove = true;
											}
			
											!last && !all
												? confirm(++ndx)
												: resolve();
										}
									},
									cancel : {
										label    : 'btnCancel',
										callback : function() {
											cancel();
											resolve();
										}
									},
									buttons : [
										{
											label : 'btnBackup',
											cssClass : 'elfinder-confirm-btn-backup',
											callback : function(all) {
												var i;
												if (all) {
													i = exists.length;
													while (ndx < i--) {
														renames.push(exists[i].name);
													}
												} else {
													renames.push(exists[ndx].name);
												}
												!last && !all
													? confirm(++ndx)
													: resolve();
											}
										}
									]
								};
							
							if (!isDir) {
								opts.buttons.push({
									label : 'btnRename' + (last? '' : 'All'),
									cssClass : 'elfinder-confirm-btn-rename',
									callback : function() {
										renames = null;
										resolve();
									}
								});
							}
							if (fm.iframeCnt > 0) {
								delete opts.reject;
							}
							fm.confirm(opts);
						};
					
					if (! fm.file(target).read) {
						// for dropbox type
						resolve();
						return;
					}
					
					names = $.map(files, function(file, i) { return file.name && (!fm.UA.iOS || file.name !== 'image.jpg')? {i: i, name: file.name} : null ;});
					
					fm.request({
						data : {cmd : 'ls', target : target, intersect : $.map(names, function(item) { return item.name;})},
						notify : {type : 'preupload', cnt : 1, hideCnt : true},
						preventDefault : true
					})
					.done(function(data) {
						var existedArr, cwdItems;
						if (data) {
							if (data.error) {
								cancel();
							} else {
								if (fm.options.overwriteUploadConfirm && fm.option('uploadOverwrite', target)) {
									if (data.list) {
										if (Array.isArray(data.list)) {
											existed = data.list || [];
										} else {
											existedArr = [];
											existed = $.map(data.list, function(n) {
												if (typeof n === 'string') {
													return n;
												} else {
													// support to >=2.1.11 plugin Normalizer, Sanitizer
													existedArr = existedArr.concat(n);
													return false;
												}
											});
											if (existedArr.length) {
												existed = existed.concat(existedArr);
											}
											hashes = data.list;
										}
										exists = $.grep(names, function(name){
											return $.inArray(name.name, existed) !== -1 ? true : false ;
										});
										if (exists.length && existed.length && target == fm.cwd().hash) {
											cwdItems = $.map(fm.files(target), function(file) { return file.name; } );
											if ($.grep(existed, function(n) { 
												return $.inArray(n, cwdItems) === -1? true : false;
											}).length){
												fm.sync();
											}
										}
									}
								}
							}
						}
						if (exists.length > 0) {
							confirm(0);
						} else {
							resolve();
						}
					})
					.fail(function(error) {
						cancel();
						resolve();
						error && fm.error(error);
					});
				};
			if (fm.api >= 2.1 && typeof files[0] == 'object') {
				check();
			} else {
				resolve();
			}
			return dfrd;
		},
		
		// check droped contents
		checkFile : function(data, fm, target) {
			if (!!data.checked || data.type == 'files') {
				return data.files;
			} else if (data.type == 'data') {
				var dfrd = $.Deferred(),
				scanDfd = $.Deferred(),
				files = [],
				paths = [],
				dirctorys = [],
				processing = 0,
				items,
				mkdirs = [],
				cancel = false,
				toArray = function(list) {
					return Array.prototype.slice.call(list || [], 0);
				},
				doScan = function(items) {
					var entry, readEntries,
						excludes = fm.options.folderUploadExclude[fm.OS] || null,
						length = items.length,
						check = function() {
							if (--processing < 1 && scanDfd.state() === 'pending') {
								scanDfd.resolve();
							}
						},
						pushItem = function(file) {
							if (! excludes || ! file.name.match(excludes)) {
								paths.push(entry.fullPath || '');
								files.push(file);
							}
							check();
						},
						readEntries = function(dirReader) {
							var entries = [],
								read = function() {
									dirReader.readEntries(function(results) {
										if (cancel || !results.length) {
											for (var i = 0; i < entries.length; i++) {
												if (cancel) {
													scanDfd.reject();
													break;
												}
												doScan([entries[i]]);
											}
											check();
										} else {
											entries = entries.concat(toArray(results));
											read();
										}
									}, check);
								};
							read();
						};
					
					processing++;
					for (var i = 0; i < length; i++) {
						if (cancel) {
							scanDfd.reject();
							break;
						}
						entry = items[i];
						if (entry) {
							if (entry instanceof File) {
								pushItem(entry);
							} else if (entry.isFile) {
								processing++;
								entry.file(pushItem, check);
							} else if (entry.isDirectory) {
								if (fm.api >= 2.1) {
									processing++;
									mkdirs.push(entry.fullPath);
									readEntries(entry.createReader()); // Start reading dirs.
								}
							}
						}
					}
					check();
					return scanDfd;
				}, hasDirs;
				
				items = $.map(data.files.items, function(item){
					if (item.kind === 'file') {
						return (item.getAsEntry? item.getAsEntry() : item.webkitGetAsEntry()) || item.getAsFile();
					} else {
						return null;
					}
				});
				$.each(items, function(i, item) {
					if (item.isDirectory) {
						hasDirs = true;
						return false;
					}
				});
				if (items.length > 0) {
					fm.uploads.checkExists(items, target, fm, hasDirs).done(function(renames, hashes){
						var dfds = [];
						if (fm.options.overwriteUploadConfirm && fm.option('uploadOverwrite', target)) {
							if (renames === null) {
								data.overwrite = 0;
								renames = [];
							}
							items = $.grep(items, function(item){
								var i, bak, hash, dfd, hi;
								if (item.isDirectory && renames.length) {
									i = $.inArray(item.name, renames);
									if (i !== -1) {
										renames.splice(i, 1);
										bak = fm.uniqueName(item.name + fm.options.backupSuffix , null, '');
										$.each(hashes, function(h, name) {
											if (item.name == name) {
												hash = h;
												return false;
											}
										});
										if (! hash) {
											hash = fm.fileByName(item.name, target).hash;
										}
										fm.lockfiles({files : [hash]});
										dfd = fm.request({
											data   : {cmd : 'rename', target : hash, name : bak},
											notify : {type : 'rename', cnt : 1}
										})
										.fail(function() {
											item._remove = true;
											fm.sync();
										})
										.always(function() {
											fm.unlockfiles({files : [hash]});
										});
										dfds.push(dfd);
									}
								}
								return !item._remove? true : false;
							});
						}
						$.when.apply($, dfds).done(function(){
							var notifyto, msg,
								id = +new Date();
							
							if (items.length > 0) {
								msg = fm.escape(items[0].name);
								if (items.length > 1) {
									msg += ' ... ' + items.length + fm.i18n('items');
								}
								notifyto = setTimeout(function() {
									fm.notify({
										type : 'readdir',
										id : id,
										cnt : 1,
										hideCnt: true,
										msg : fm.i18n('ntfreaddir') + ' (' + msg + ')',
										cancel: function() {
											cancel = true;
										}
									});
								}, fm.options.notifyDelay);
								doScan(items).done(function() {
									notifyto && clearTimeout(notifyto);
									fm.notify({type : 'readdir', id: id, cnt : -1});
									if (cancel) {
										dfrd.reject();
									} else {
										dfrd.resolve([files, paths, renames, hashes, mkdirs]);
									}
								}).fail(function() {
									dfrd.reject();
								});
							} else {
								dfrd.reject();
							}
						});
					});
					return dfrd.promise();
				} else {
					return dfrd.reject();
				}
			} else {
				var ret = [];
				var check = [];
				var str = data.files[0];
				if (data.type == 'html') {
					var tmp = $("<html></html>").append($.parseHTML(str.replace(/ src=/ig, ' _elfsrc='))),
						atag;
					$('img[_elfsrc]', tmp).each(function(){
						var url, purl,
						self = $(this),
						pa = self.closest('a');
						if (pa && pa.attr('href') && pa.attr('href').match(/\.(?:jpe?g|gif|bmp|png)/i)) {
							purl = pa.attr('href');
						}
						url = self.attr('_elfsrc');
						if (url) {
							if (purl) {
								$.inArray(purl, ret) == -1 && ret.push(purl);
								$.inArray(url, check) == -1 &&  check.push(url);
							} else {
								$.inArray(url, ret) == -1 && ret.push(url);
							}
						}
						// Probably it's clipboard data
						if (ret.length === 1 && ret[0].match(/^data:image\/png/)) {
							data.clipdata = true;
						}
					});
					atag = $('a[href]', tmp);
					atag.each(function(){
						var text, loc,
							parseUrl = function(url) {
								var a = document.createElement('a');
								a.href = url;
								return a;
							};
						if (text = $(this).text()) {
							loc = parseUrl($(this).attr('href'));
							if (loc.href && loc.href.match(/^(?:ht|f)tp/i) && (atag.length === 1 || ! loc.pathname.match(/(?:\.html?|\/[^\/.]*)$/i) || $.trim(text).match(/\.[a-z0-9-]{1,10}$/i))) {
								if ($.inArray(loc.href, ret) == -1 && $.inArray(loc.href, check) == -1) ret.push(loc.href);
							}
						}
					});
				} else {
					var regex, m, url;
					regex = /((?:ht|f)tps?:\/\/[-_.!~*\'()a-z0-9;/?:\@&=+\$,%#\*\[\]]+)/ig;
					while (m = regex.exec(str)) {
						url = m[1].replace(/&amp;/g, '&');
						if ($.inArray(url, ret) == -1) ret.push(url);
					}
				}
				return ret;
			}
		},

		// upload transport using XMLHttpRequest
		xhr : function(data, fm) { 
			var self   = fm ? fm : this,
				node        = self.getUI(),
				xhr         = new XMLHttpRequest(),
				notifyto    = null,
				notifyto1   = null,
				notifyto2   = null,
				dataChecked = data.checked,
				isDataType  = (data.isDataType || data.type == 'data'),
				target      = (data.target || self.cwd().hash),
				dropEvt     = (data.dropEvt || null),
				extraData   = data.extraData || null,
				chunkEnable = (self.option('uploadMaxConn', target) != -1),
				multiMax    = Math.min(5, Math.max(1, self.option('uploadMaxConn', target))),
				retryWait   = 10000, // 10 sec
				retryMax    = 30, // 10 sec * 30 = 300 secs (Max 5 mins)
				retry       = 0,
				getFile     = function(files) {
					var dfd = $.Deferred(),
						file;
					if (files.promise) {
						files.always(function(f) {
							dfd.resolve(Array.isArray(f) && f.length? (isDataType? f[0][0] : f[0]) : {});
						});
					} else {
						dfd.resolve(files.length? (isDataType? files[0][0] : files[0]) : {});
					}
					return dfd;
				},
				dfrd   = $.Deferred()
					.fail(function(err) {
						var error = self.parseError(err),
							userAbort;
						if (error === 'userabort') {
							userAbort = true;
							error = void 0;
						}
						if (files && (self.uploads.xhrUploading || userAbort)) {
							// send request om fail
							getFile(files).done(function(file) {
								if (!userAbort) {
									triggerError(error, file);
								}
								if (! file._cid) {
									// send sync request
									self.uploads.failSyncTm && clearTimeout(self.uploads.failSyncTm);
									self.uploads.failSyncTm = setTimeout(function() {
										self.sync(target);
									}, 1000);
								} else if (! self.uploads.chunkfailReq[file._cid]) {
									// send chunkfail request
									self.uploads.chunkfailReq[file._cid] = true;
									setTimeout(function() {
										fm.request({
											data : {
												cmd: 'upload',
												target: target,
												chunk: file._chunk,
												cid: file._cid,
												upload: ['chunkfail'],
												mimes: 'chunkfail'
											},
											options : {
												type: 'post',
												url: self.uploadURL
											},
											preventDefault: true
										}).always(function() {
											delete self.uploads.chunkfailReq[file._chunk];
										});
									}, 1000);
								}
							});
						} else {
							triggerError(error);
						}
						!userAbort && self.sync();
						self.uploads.xhrUploading = false;
						files = null;
					})
					.done(function(data) {
						self.uploads.xhrUploading = false;
						files = null;
						if (data) {
							self.currentReqCmd = 'upload';
							data.warning && triggerError(data.warning);
							self.updateCache(data);
							data.removed && data.removed.length && self.remove(data);
							data.added   && data.added.length   && self.add(data);
							data.changed && data.changed.length && self.change(data);
							self.trigger('upload', data, false);
							self.trigger('uploaddone');
							if (data.toasts && Array.isArray(data.toasts)) {
								$.each(data.toasts, function() {
									this.msg && self.toast(this);
								});
							}
							data.sync && self.sync();
							if (data.debug) {
								self.responseDebug(data);
								fm.debug('backend-debug', data);
							}
						}
					})
					.always(function() {
						self.abortXHR(xhr);
						// unregist fnAbort function
						node.off('uploadabort', fnAbort);
						$(window).off('unload', fnAbort);
						notifyto && clearTimeout(notifyto);
						notifyto1 && clearTimeout(notifyto1);
						notifyto2 && clearTimeout(notifyto2);
						dataChecked && !data.multiupload && checkNotify() && self.notify({type : 'upload', cnt : -cnt, progress : 0, size : 0});
						notifyto1 && uploadedNtf && self.notify({type : 'chunkmerge', cnt : -cnt});
						chunkMerge && notifyElm.children('.elfinder-notify-chunkmerge').length && self.notify({type : 'chunkmerge', cnt : -1});
					}),
				formData    = new FormData(),
				files       = data.input ? data.input.files : self.uploads.checkFile(data, self, target), 
				cnt         = data.checked? (isDataType? files[0].length : files.length) : files.length,
				isChunked   = false,
				loaded      = 0,
				prev        = 0,
				filesize    = 0,
				notify      = false,
				notifyElm   = self.ui.notify,
				cancelBtn   = true,
				uploadedNtf = false,
				abort       = false,
				checkNotify = function() {
					if (!notify && (ntfUpload = notifyElm.children('.elfinder-notify-upload')).length) {
						notify = true;
					}
					return notify;
				},
				fnAbort     = function(e, error) {
					abort = true;
					self.abortXHR(xhr, { quiet: true, abort: true });
					dfrd.reject(error);
					if (checkNotify()) {
						self.notify({type : 'upload', cnt : ntfUpload.data('cnt') * -1, progress : 0, size : 0});
					}
				},
				cancelToggle = function(show, hasChunk) {
					ntfUpload.children('.elfinder-notify-cancel')[show? 'show':'hide']();
					cancelBtn = show;
				},
				startNotify = function(size) {
					if (!size) size = filesize;
					return setTimeout(function() {
						notify = true;
						self.notify({type : 'upload', cnt : cnt, progress : loaded - prev, size : size,
							cancel: function() {
								node.trigger('uploadabort', 'userabort');
							}
						});
						ntfUpload = notifyElm.children('.elfinder-notify-upload');
						prev = loaded;
						if (data.multiupload) {
							cancelBtn && cancelToggle(true);
						} else {
							cancelToggle(cancelBtn && loaded < size);
						}
					}, self.options.notifyDelay);
				},
				doRetry = function() {
					if (retry++ <= retryMax) {
						if (checkNotify() && prev) {
							self.notify({type : 'upload', cnt : 0, progress : 0, size : prev});
						}
						self.abortXHR(xhr, { quiet: true });
						prev = loaded = 0;
						setTimeout(function() {
							var reqId;
							if (! abort) {
								xhr.open('POST', self.uploadURL, true);
								if (self.api >= 2.1029) {
									reqId = (+ new Date()).toString(16) + Math.floor(1000 * Math.random()).toString(16);
									(typeof formData['delete'] === 'function') && formData['delete']('reqid');
									formData.append('reqid', reqId);
									xhr._requestId = reqId;
								}
								xhr.send(formData);
							}
						}, retryWait);
					} else {
						node.trigger('uploadabort', ['errAbort', 'errTimeout']);
					}
				},
				progress = function() {
					var node;
					if (notify) {
						dfrd.notifyWith(ntfUpload, [{
							cnt: ntfUpload.data('cnt'),
							progress: ntfUpload.data('progress'),
							total: ntfUpload.data('total')
						}]);
					}
				},
				triggerError = function(err, file, unite) {
					err && self.trigger('xhruploadfail', { error: err, file: file });
					if (unite) {
						if (err) {
							if (errCnt < self.options.maxErrorDialogs) {
								if (Array.isArray(err)) {
									errors = errors.concat(err);
								} else {
									errors.push(err);
								}
							}
							errCnt++;
						}
					} else {
						if (err) {
							self.error(err);
						} else {
							if (errors.length) {
								if (errCnt >= self.options.maxErrorDialogs) {
									errors = errors.concat('moreErrors', errCnt - self.options.maxErrorDialogs);
								}
								self.error(errors);
							}
							errors = [];
							errCnt = 0;
						}
					}
				},
				errors = [],
				errCnt = 0,
				renames = (data.renames || null),
				hashes = (data.hashes || null),
				chunkMerge = false,
				ntfUpload = $();
			
			// regist fnAbort function
			node.one('uploadabort', fnAbort);
			$(window).one('unload.' + fm.namespace, fnAbort);
			
			!chunkMerge && (prev = loaded);
			
			if (!isDataType && !cnt) {
				return dfrd.reject(['errUploadNoFiles']);
			}
			
			xhr.addEventListener('error', function() {
				if (xhr.status == 0) {
					if (abort) {
						dfrd.reject();
					} else {
						// ff bug while send zero sized file
						// for safari - send directory
						if (!isDataType && data.files && $.grep(data.files, function(f){return ! f.type && f.size === (self.UA.Safari? 1802 : 0)? true : false;}).length) {
							dfrd.reject(['errAbort', 'errFolderUpload']);
						} else if (data.input && $.grep(data.input.files, function(f){return ! f.type && f.size === (self.UA.Safari? 1802 : 0)? true : false;}).length) {
							dfrd.reject(['errUploadNoFiles']);
						} else {
							doRetry();
						}
					}
				} else {
					node.trigger('uploadabort', 'errConnect');
				}
			}, false);
			
			xhr.addEventListener('load', function(e) {
				var status = xhr.status, res, curr = 0, error = '', errData, errObj;
				
				self.setCustomHeaderByXhr(xhr);

				if (status >= 400) {
					if (status > 500) {
						error = 'errResponse';
					} else {
						error = ['errResponse', 'errServerError'];
					}
				} else {
					if (!xhr.responseText) {
						error = ['errResponse', 'errDataEmpty'];
					}
				}
				
				if (error) {
					node.trigger('uploadabort');
					getFile(files || {}).done(function(file) {
						return dfrd.reject(file._cid? null : error);
					});
				}
				
				loaded = filesize;
				
				if (checkNotify() && (curr = loaded - prev)) {
					self.notify({type : 'upload', cnt : 0, progress : curr, size : 0});
					progress();
				}

				res = self.parseUploadData(xhr.responseText);
				
				// chunked upload commit
				if (res._chunkmerged) {
					formData = new FormData();
					var _file = [{_chunkmerged: res._chunkmerged, _name: res._name, _mtime: res._mtime}];
					chunkMerge = true;
					node.off('uploadabort', fnAbort);
					notifyto2 = setTimeout(function() {
						self.notify({type : 'chunkmerge', cnt : 1});
					}, self.options.notifyDelay);
					isDataType? send(_file, files[1]) : send(_file);
					return;
				}
				
				res._multiupload = data.multiupload? true : false;
				if (res.error) {
					errData = {
						cmd: 'upload',
						err: res,
						xhr: xhr,
						rc: xhr.status
					};
					self.trigger('uploadfail', res);
					// trigger "requestError" event
					self.trigger('requestError', errData);
					if (errData._getEvent && errData._getEvent().isDefaultPrevented()) {
						res.error = '';
					}
					if (res._chunkfailure || res._multiupload) {
						abort = true;
						self.uploads.xhrUploading = false;
						notifyto && clearTimeout(notifyto);
						if (ntfUpload.length) {
							self.notify({type : 'upload', cnt : -cnt, progress : 0, size : 0});
							dfrd.reject(res);
						} else {
							// for multi connection
							dfrd.reject();
						}
					} else {
						dfrd.reject(res);
					}
				} else {
					dfrd.resolve(res);
				}
			}, false);
			
			xhr.upload.addEventListener('loadstart', function(e) {
				if (!chunkMerge && e.lengthComputable) {
					loaded = e.loaded;
					retry && (loaded = 0);
					filesize = e.total;
					if (!loaded) {
						loaded = parseInt(filesize * 0.05);
					}
					if (checkNotify()) {
						self.notify({type : 'upload', cnt : 0, progress : loaded - prev, size : data.multiupload? 0 : filesize});
						prev = loaded;
						progress();
					}
				}
			}, false);
			
			xhr.upload.addEventListener('progress', function(e) {
				var curr;

				if (e.lengthComputable && !chunkMerge && xhr.readyState < 2) {
					
					loaded = e.loaded;

					// to avoid strange bug in safari (not in chrome) with drag&drop.
					// bug: macos finder opened in any folder,
					// reset safari cache (option+command+e), reload elfinder page,
					// drop file from finder
					// on first attempt request starts (progress callback called ones) but never ends.
					// any next drop - successfull.
					if (!data.checked && loaded > 0 && !notifyto) {
						notifyto = startNotify(xhr._totalSize - loaded);
					}
					
					if (!filesize) {
						filesize = e.total;
						if (!loaded) {
							loaded = parseInt(filesize * 0.05);
						}
					}
					
					curr = loaded - prev;
					if (checkNotify() && (curr/e.total) >= 0.05) {
						self.notify({type : 'upload', cnt : 0, progress : curr, size : 0});
						prev = loaded;
						progress();
					}
					
					if (!uploadedNtf && loaded >= filesize && !isChunked) {
						// Use "chunkmerge" for "server-in-process" notification
						uploadedNtf = true;
						notifyto1 = setTimeout(function() {
							self.notify({type : 'chunkmerge', cnt : cnt});
						}, self.options.notifyDelay);
					}

					if (cancelBtn && ! data.multiupload && loaded >= filesize) {
						checkNotify() && cancelToggle(false);
					}
				}
			}, false);
			
			var send = function(files, paths){
				var size = 0,
				fcnt = 1,
				sfiles = [],
				c = 0,
				total = cnt,
				maxFileSize,
				totalSize = 0,
				chunked = [],
				chunkID = new Date().getTime().toString().substr(-9), // for take care of the 32bit backend system
				BYTES_PER_CHUNK = Math.min((fm.uplMaxSize? fm.uplMaxSize : 2097152) - 8190, fm.options.uploadMaxChunkSize), // uplMaxSize margin 8kb or options.uploadMaxChunkSize
				blobSlice = chunkEnable? false : '',
				blobSize, blobMtime, blobName, i, start, end, chunks, blob, chunk, added, done, last, failChunk,
				multi = function(files, num){
					var sfiles = [], cid, sfilesLen = 0, cancelChk, hasChunk;
					if (!abort) {
						while(files.length && sfiles.length < num) {
							sfiles.push(files.shift());
						}
						sfilesLen = sfiles.length;
						if (sfilesLen) {
							cancelChk = sfilesLen;
							for (var i=0; i < sfilesLen; i++) {
								if (abort) {
									break;
								}
								cid = isDataType? (sfiles[i][0][0]._cid || null) : (sfiles[i][0]._cid || null);
								hasChunk = (hasChunk || cid)? true : false;
								if (!!failChunk[cid]) {
									last--;
									continue;
								}
								fm.exec('upload', {
									type: data.type,
									isDataType: isDataType,
									files: sfiles[i],
									checked: true,
									target: target,
									dropEvt: dropEvt,
									renames: renames,
									hashes: hashes,
									multiupload: true,
									overwrite: data.overwrite === 0? 0 : void 0,
									clipdata: data.clipdata
								}, void 0, target)
								.fail(function(error) {
									if (error && error === 'No such command') {
										abort = true;
										fm.error(['errUpload', 'errPerm']);
									}
									if (cid) {	
										failChunk[cid] = true;
									}
								})
								.always(function(e) {
									if (e && e.added) added = $.merge(added, e.added);
									if (last <= ++done) {
										fm.trigger('multiupload', {added: added});
										notifyto && clearTimeout(notifyto);
										if (checkNotify()) {
											self.notify({type : 'upload', cnt : -cnt, progress : 0, size : 0});
										}
									}
									if (files.length) {
										multi(files, 1); // Next one
									} else {
										if (--cancelChk <= 1) {
											if (cancelBtn) {
												cancelToggle(false, hasChunk);
											}
										}
										dfrd.resolve();
									}
								});
							}
						}
					}
					if (sfiles.length < 1 || abort) {
						if (abort) {
							notifyto && clearTimeout(notifyto);
							if (cid) {
								failChunk[cid] = true;
							}
							dfrd.reject();
						} else {
							dfrd.resolve();
							self.uploads.xhrUploading = false;
						}
					}
				},
				check = function(){
					if (!self.uploads.xhrUploading) {
						self.uploads.xhrUploading = true;
						multi(sfiles, multiMax); // Max connection: 3
					} else {
						setTimeout(check, 100);
					}
				},
				reqId, err;

				if (! dataChecked && (isDataType || data.type == 'files')) {
					if (! (maxFileSize = fm.option('uploadMaxSize', target))) {
						maxFileSize = 0;
					}
					for (i=0; i < files.length; i++) {
						try {
							blob = files[i];
							blobSize = blob.size;
							if (blobSlice === false) {
								blobSlice = '';
								if (self.api >= 2.1) {
									if ('slice' in blob) {
										blobSlice = 'slice';
									} else if ('mozSlice' in blob) {
										blobSlice = 'mozSlice';
									} else if ('webkitSlice' in blob) {
										blobSlice = 'webkitSlice';
									}
								}
							}
						} catch(e) {
							cnt--;
							total--;
							continue;
						}
						
						// file size check
						if ((maxFileSize && blobSize > maxFileSize) || (!blobSlice && fm.uplMaxSize && blobSize > fm.uplMaxSize)) {
							triggerError(['errUploadFile', blob.name, 'errUploadFileSize'], blob, true);
							cnt--;
							total--;
							continue;
						}
						
						// file mime check
						if (blob.type && ! self.uploadMimeCheck(blob.type, target)) {
							triggerError(['errUploadFile', blob.name, 'errUploadMime', '(' + blob.type + ')'], blob, true);
							cnt--;
							total--;
							continue;
						}
						
						if (blobSlice && blobSize > BYTES_PER_CHUNK) {
							start = 0;
							end = BYTES_PER_CHUNK;
							chunks = -1;
							total = Math.floor((blobSize - 1) / BYTES_PER_CHUNK);
							blobMtime = blob.lastModified? Math.round(blob.lastModified/1000) : 0;
							blobName = data.clipdata? fm.date(fm.nonameDateFormat) + '.png' : blob.name;

							totalSize += blobSize;
							chunked[chunkID] = 0;
							while(start < blobSize) {
								chunk = blob[blobSlice](start, end);
								chunk._chunk = blobName + '.' + (++chunks) + '_' + total + '.part';
								chunk._cid   = chunkID;
								chunk._range = start + ',' + chunk.size + ',' + blobSize;
								chunk._mtime = blobMtime;
								chunked[chunkID]++;
								
								if (size) {
									c++;
								}
								if (typeof sfiles[c] == 'undefined') {
									sfiles[c] = [];
									if (isDataType) {
										sfiles[c][0] = [];
										sfiles[c][1] = [];
									}
								}
								size = BYTES_PER_CHUNK;
								fcnt = 1;
								if (isDataType) {
									sfiles[c][0].push(chunk);
									sfiles[c][1].push(paths[i]);
								} else {
									sfiles[c].push(chunk);
								}

								start = end;
								end = start + BYTES_PER_CHUNK;
							}
							if (chunk == null) {
								triggerError(['errUploadFile', blob.name, 'errUploadFileSize'], blob, true);
								cnt--;
								total--;
							} else {
								total += chunks;
								size = 0;
								fcnt = 1;
								c++;
							}
							continue;
						}
						if ((fm.uplMaxSize && size + blobSize > fm.uplMaxSize) || fcnt > fm.uplMaxFile) {
							size = 0;
							fcnt = 1;
							c++;
						}
						if (typeof sfiles[c] == 'undefined') {
							sfiles[c] = [];
							if (isDataType) {
								sfiles[c][0] = [];
								sfiles[c][1] = [];
							}
						}
						if (isDataType) {
							sfiles[c][0].push(blob);
							sfiles[c][1].push(paths[i]);
						} else {
							sfiles[c].push(blob);
						}
						size += blobSize;
						totalSize += blobSize;
						fcnt++;
					}
					
					if (errors.length) {
						triggerError();
					}

					if (sfiles.length == 0) {
						// no data
						data.checked = true;
						return false;
					}
					
					if (sfiles.length > 1) {
						// multi upload
						notifyto = startNotify(totalSize);
						added = [];
						done = 0;
						last = sfiles.length;
						failChunk = [];
						check();
						return true;
					}
					
					// single upload
					if (isDataType) {
						files = sfiles[0][0];
						paths = sfiles[0][1];
					} else {
						files = sfiles[0];
					}
				}
				
				if (!dataChecked) {
					if (!fm.UA.Safari || !data.files) {
						notifyto = startNotify(totalSize);
					} else {
						xhr._totalSize = totalSize;
					}
				}
				
				dataChecked = true;
				
				if (! files.length) {
					dfrd.reject(['errUploadNoFiles']);
				}
				
				xhr.open('POST', self.uploadURL, true);
				
				// set request headers
				if (fm.customHeaders) {
					$.each(fm.customHeaders, function(key) {
						xhr.setRequestHeader(key, this);
					});
				}
				
				// set xhrFields
				if (fm.xhrFields) {
					$.each(fm.xhrFields, function(key) {
						if (key in xhr) {
							xhr[key] = this;
						}
					});
				}

				if (self.api >= 2.1029) {
					// request ID
					reqId = (+ new Date()).toString(16) + Math.floor(1000 * Math.random()).toString(16);
					formData.append('reqid', reqId);
					xhr._requestId = reqId;
				}
				formData.append('cmd', 'upload');
				formData.append(self.newAPI ? 'target' : 'current', target);
				if (renames && renames.length) {
					$.each(renames, function(i, v) {
						formData.append('renames[]', v);
					});
					formData.append('suffix', fm.options.backupSuffix);
				}
				if (hashes) {
					$.each(hashes, function(i, v) {
						formData.append('hashes['+ i +']', v);
					});
				}
				$.each(self.customData, function(key, val) {
					formData.append(key, val);
				});
				$.each(self.options.onlyMimes, function(i, mime) {
					formData.append('mimes[]', mime);
				});
				
				$.each(files, function(i, file) {
					var name, relpath;
					if (file._chunkmerged) {
						formData.append('chunk', file._chunkmerged);
						formData.append('upload[]', file._name);
						formData.append('mtime[]', file._mtime);
						data.clipdata && formData.append('overwrite', 0);
						isChunked = true;
					} else {
						if (file._chunkfail) {
							formData.append('upload[]', 'chunkfail');
							formData.append('mimes', 'chunkfail');
						} else {
							if (data.clipdata) {
								if (!file._chunk) {
									data.overwrite = 0;
									name = fm.date(fm.nonameDateFormat) + '.png';
								}
							} else {
								if (file.name) {
									name = file.name;
									if (fm.UA.iOS) {
										if (name.match(/^image\.jpe?g$/i)) {
											data.overwrite = 0;
											name = fm.date(fm.nonameDateFormat) + '.jpg';
										} else if (name.match(/^capturedvideo\.mov$/i)) {
											data.overwrite = 0;
											name = fm.date(fm.nonameDateFormat) + '.mov';
										}
									}
									relpath = (file.webkitRelativePath || file.relativePath || file._relativePath || '').replace(/[^\/]+$/, '');
									name = relpath + name;
								}
							}
							name? formData.append('upload[]', file, name) : formData.append('upload[]', file);
						}
						if (file._chunk) {
							formData.append('chunk', file._chunk);
							formData.append('cid'  , file._cid);
							formData.append('range', file._range);
							formData.append('mtime[]', file._mtime);
							isChunked = true;
						} else {
							formData.append('mtime[]', file.lastModified? Math.round(file.lastModified/1000) : 0);
						}
					}
				});
				
				if (isDataType) {
					$.each(paths, function(i, path) {
						formData.append('upload_path[]', path);
					});
				}
				
				if (data.overwrite === 0) {
					formData.append('overwrite', 0);
				}
				
				// send int value that which meta key was pressed when dropped  as `dropWith`
				if (dropEvt) {
					formData.append('dropWith', parseInt(
						(dropEvt.altKey  ? '1' : '0')+
						(dropEvt.ctrlKey ? '1' : '0')+
						(dropEvt.metaKey ? '1' : '0')+
						(dropEvt.shiftKey? '1' : '0'), 2));
				}
				
				// set extraData on current request
				if (extraData) {
					$.each(extraData, function(key, val) {
						formData.append(key, val);
					});
				}

				xhr.send(formData);
				
				return true;
			};
			
			if (! isDataType) {
				if (files.length > 0) {
					if (! data.clipdata && renames == null) {
						var mkdirs = [],
							paths = [],
							excludes = fm.options.folderUploadExclude[fm.OS] || null;
						$.each(files, function(i, file) {
							var relPath = file.webkitRelativePath || file.relativePath || '',
								idx, rootDir;
							if (! relPath) {
								return false;
							}
							if (excludes && file.name.match(excludes)) {
								file._remove = true;
								relPath = void(0);
							} else {
								// add '/' as prefix to make same to folder uploading with DnD, see #2607
								relPath = '/' + relPath.replace(/\/[^\/]*$/, '').replace(/^\//, '');
								if (relPath && $.inArray(relPath, mkdirs) === -1) {
									mkdirs.push(relPath);
									// checking the root directory to supports <input type="file" webkitdirectory> see #2378
									idx = relPath.substr(1).indexOf('/');
									if (idx !== -1 && (rootDir = relPath.substr(0, idx + 1)) && $.inArray(rootDir, mkdirs) === -1) {
										mkdirs.unshift(rootDir);
									}
								}
							}
							paths.push(relPath);
						});
						renames = [];
						hashes = {};
						if (mkdirs.length) {
							(function() {
								var checkDirs = $.map(mkdirs, function(name) { return name.substr(1).indexOf('/') === -1 ? {name: name.substr(1)} : null;}),
									cancelDirs = [];
								fm.uploads.checkExists(checkDirs, target, fm, true).done(
									function(res, res2) {
										var dfds = [], dfd, bak, hash;
										if (fm.options.overwriteUploadConfirm && fm.option('uploadOverwrite', target)) {
											cancelDirs = $.map(checkDirs, function(dir) { return dir._remove? dir.name : null ;} );
											checkDirs = $.grep(checkDirs, function(dir) { return !dir._remove? true : false ;} );
										}
										if (cancelDirs.length) {
											$.each(paths.concat(), function(i, path) {
												if ($.inArray(path, cancelDirs) === 0) {
													files[i]._remove = true;
													paths[i] = void(0);
												}
											});
										}
										files = $.grep(files, function(file) { return file._remove? false : true; });
										paths = $.grep(paths, function(path) { return path === void 0 ? false : true; });
										if (checkDirs.length) {
											dfd = $.Deferred();
											if (res.length) {
												$.each(res, function(i, existName) {
													// backup
													bak = fm.uniqueName(existName + fm.options.backupSuffix , null, '');
													$.each(res2, function(h, name) {
														if (res[0] == name) {
															hash = h;
															return false;
														}
													});
													if (! hash) {
														hash = fm.fileByName(res[0], target).hash;
													}
													fm.lockfiles({files : [hash]});
													dfds.push(
														fm.request({
															data   : {cmd : 'rename', target : hash, name : bak},
															notify : {type : 'rename', cnt : 1}
														})
														.fail(function(error) {
															dfrd.reject(error);
															fm.sync();
														})
														.always(function() {
															fm.unlockfiles({files : [hash]});
														})
													);
												});
											} else {
												dfds.push(null);
											}
											
											$.when.apply($, dfds).done(function() {
												// ensure directories
												fm.request({
													data   : {cmd : 'mkdir', target : target, dirs : mkdirs},
													notify : {type : 'mkdir', cnt : mkdirs.length},
													preventFail: true
												})
												.fail(function(error) {
													error = error || ['errUnknown'];
													if (error[0] === 'errCmdParams') {
														multiMax = 1;
													} else {
														multiMax = 0;
														dfrd.reject(error);
													}
												})
												.done(function(data) {
													var rm = false;
													if (!data.hashes) {
														data.hashes = {};
													}
													paths = $.map(paths.concat(), function(p, i) {
														if (p === '/') {
															return target;
														} else {
															if (data.hashes[p]) {
																return data.hashes[p];
															} else {
																rm = true;
																files[i]._remove = true;
																return null;
															}
														}
													});
													if (rm) {
														files = $.grep(files, function(file) { return file._remove? false : true; });
													}
												})
												.always(function(data) {
													if (multiMax) {
														isDataType = true;
														if (! send(files, paths)) {
															dfrd.reject();
														}
													}
												});
											});
										} else {
											dfrd.reject();
										}
									}
								);
							})();
						} else {
							fm.uploads.checkExists(files, target, fm).done(
								function(res, res2){
									if (fm.options.overwriteUploadConfirm && fm.option('uploadOverwrite', target)) {
										hashes = res2;
										if (res === null) {
											data.overwrite = 0;
										} else {
											renames = res;
										}
										files = $.grep(files, function(file){return !file._remove? true : false ;});
									}
									cnt = files.length;
									if (cnt > 0) {
										if (! send(files)) {
											dfrd.reject();
										}
									} else {
										dfrd.reject();
									}
								}
							);
						}
					} else {
						if (! send(files)) {
							dfrd.reject();
						}
					}
				} else {
					dfrd.reject();
				}
			} else {
				if (dataChecked) {
					send(files[0], files[1]);
				} else {
					files.done(function(result) { // result: [files, paths, renames, hashes, mkdirs]
						renames = [];
						cnt = result[0].length;
						if (cnt) {
							if (result[4] && result[4].length) {
								// ensure directories
								fm.request({
									data   : {cmd : 'mkdir', target : target, dirs : result[4]},
									notify : {type : 'mkdir', cnt : result[4].length},
									preventFail: true
								})
								.fail(function(error) {
									error = error || ['errUnknown'];
									if (error[0] === 'errCmdParams') {
										multiMax = 1;
									} else {
										multiMax = 0;
										dfrd.reject(error);
									}
								})
								.done(function(data) {
									var rm = false;
									if (!data.hashes) {
										data.hashes = {};
									}
									result[1] = $.map(result[1], function(p, i) {
										result[0][i]._relativePath = p.replace(/^\//, '');
										p = p.replace(/\/[^\/]*$/, '');
										if (p === '') {
											return target;
										} else {
											if (data.hashes[p]) {
												return data.hashes[p];
											} else {
												rm = true;
												result[0][i]._remove = true;
												return null;
											}
										}
									});
									if (rm) {
										result[0] = $.grep(result[0], function(file) { return file._remove? false : true; });
									}
								})
								.always(function(data) {
									if (multiMax) {
										renames = result[2];
										hashes = result[3];
										send(result[0], result[1]);
									}
								});
								return;
							} else {
								result[1] = $.map(result[1], function() { return target; });
							}
							renames = result[2];
							hashes = result[3];
							send(result[0], result[1]);
						} else {
							dfrd.reject(['errUploadNoFiles']);
						}
					}).fail(function(){
						dfrd.reject();
					});
				}
			}

			return dfrd;
		},
		
		// upload transport using iframe
		iframe : function(data, fm) { 
			var self   = fm ? fm : this,
				input  = data.input? data.input : false,
				files  = !input ? self.uploads.checkFile(data, self) : false,
				dfrd   = $.Deferred()
					.fail(function(error) {
						error && self.error(error);
					}),
				name = 'iframe-'+fm.namespace+(++self.iframeCnt),
				form = $('<form action="'+self.uploadURL+'" method="post" enctype="multipart/form-data" encoding="multipart/form-data" target="'+name+'" style="display:none"><input type="hidden" name="cmd" value="upload" /></form>'),
				msie = this.UA.IE,
				// clear timeouts, close notification dialog, remove form/iframe
				onload = function() {
					abortto  && clearTimeout(abortto);
					notifyto && clearTimeout(notifyto);
					notify   && self.notify({type : 'upload', cnt : -cnt});
					
					setTimeout(function() {
						msie && $('<iframe src="javascript:false;"></iframe>').appendTo(form);
						form.remove();
						iframe.remove();
					}, 100);
				},
				iframe = $('<iframe src="'+(msie ? 'javascript:false;' : 'about:blank')+'" name="'+name+'" style="position:absolute;left:-1000px;top:-1000px" ></iframe>')
					.on('load', function() {
						iframe.off('load')
							.on('load', function() {
								onload();
								// data will be processed in callback response or window onmessage
								dfrd.resolve();
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
									dfrd.reject(['errConnect', 'errTimeout']);
								}, self.options.iframeTimeout);
							}
							
							form.submit();
					}),
				target  = (data.target || self.cwd().hash),
				names   = [],
				dfds    = [],
				renames = [],
				hashes  = {},
				cnt, notify, notifyto, abortto;

			if (files && files.length) {
				$.each(files, function(i, val) {
					form.append('<input type="hidden" name="upload[]" value="'+val+'"/>');
				});
				cnt = 1;
			} else if (input && $(input).is(':file') && $(input).val()) {
				if (fm.options.overwriteUploadConfirm && fm.option('uploadOverwrite', target)) {
					names = input.files? input.files : [{ name: $(input).val().replace(/^(?:.+[\\\/])?([^\\\/]+)$/, '$1') }];
					//names = $.map(names, function(file){return file.name? { name: file.name } : null ;});
					dfds.push(self.uploads.checkExists(names, target, self).done(
						function(res, res2){
							hashes = res2;
							if (res === null) {
								data.overwrite = 0;
							} else{
								renames = res;
								cnt = $.grep(names, function(file){return !file._remove? true : false ;}).length;
								if (cnt != names.length) {
									cnt = 0;
								}
							}
						}
					));
				}
				cnt = input.files ? input.files.length : 1;
				form.append(input);
			} else {
				return dfrd.reject();
			}
			
			$.when.apply($, dfds).done(function() {
				if (cnt < 1) {
					return dfrd.reject();
				}
				form.append('<input type="hidden" name="'+(self.newAPI ? 'target' : 'current')+'" value="'+target+'"/>')
					.append('<input type="hidden" name="html" value="1"/>')
					.append('<input type="hidden" name="node" value="'+self.id+'"/>')
					.append($(input).attr('name', 'upload[]'));
				
				if (renames.length > 0) {
					$.each(renames, function(i, rename) {
						form.append('<input type="hidden" name="renames[]" value="'+self.escape(rename)+'"/>');
					});
					form.append('<input type="hidden" name="suffix" value="'+fm.options.backupSuffix+'"/>');
				}
				if (hashes) {
					$.each(renames, function(i, v) {
						form.append('<input type="hidden" name="['+i+']" value="'+self.escape(v)+'"/>');
					});
				}
				
				if (data.overwrite === 0) {
					form.append('<input type="hidden" name="overwrite" value="0"/>');
				}
				
				$.each(self.options.onlyMimes||[], function(i, mime) {
					form.append('<input type="hidden" name="mimes[]" value="'+self.escape(mime)+'"/>');
				});
				
				$.each(self.customData, function(key, val) {
					form.append('<input type="hidden" name="'+key+'" value="'+self.escape(val)+'"/>');
				});
				
				form.appendTo('body');
				iframe.appendTo('body');
			});
			
			return dfrd;
		}
	},
	
	
	/**
	 * Bind callback to event(s) The callback is executed at most once per event.
	 * To bind to multiply events at once, separate events names by space
	 *
	 * @param  String    event name
	 * @param  Function  callback
	 * @param  Boolan    priority first
	 * @return elFinder
	 */
	one : function(ev, callback, priorityFirst) {
		var self  = this,
			event = ev.toLowerCase(),
			h     = function(e, f) {
				if (!self.toUnbindEvents[event]) {
					self.toUnbindEvents[event] = [];
				}
				self.toUnbindEvents[event].push({
					type: event,
					callback: h
				});
				return (callback.done? callback.done : callback).apply(this, arguments);
			};
		if (callback.done) {
			h = {done: h};
		}
		return this.bind(event, h, priorityFirst);
	},
	
	/**
	 * Set/get data into/from localStorage
	 *
	 * @param  String       key
	 * @param  String|void  value
	 * @return String|null
	 */
	localStorage : function(key, val) {
		var self   = this,
			s      = window.localStorage,
			oldkey = 'elfinder-'+(key || '')+this.id, // old key of elFinder < 2.1.6
			prefix = window.location.pathname+'-elfinder-',
			suffix = this.id,
			clrs   = [],
			retval, oldval, t, precnt, sufcnt;

		// reset this node data
		if (typeof(key) === 'undefined') {
			precnt = prefix.length;
			sufcnt = suffix.length * -1;
			$.each(s, function(key) {
				if (key.substr(0, precnt) === prefix && key.substr(sufcnt) === suffix) {
					clrs.push(key);
				}
			});
			$.each(clrs, function(i, key) {
				s.removeItem(key);
			});
			return true;
		}
		
		// new key of elFinder >= 2.1.6
		key = prefix+key+suffix;
		
		if (val === null) {
			return s.removeItem(key);
		}
		
		if (val === void(0) && !(retval = s.getItem(key)) && (oldval = s.getItem(oldkey))) {
			val = oldval;
			s.removeItem(oldkey);
		}
		
		if (val !== void(0)) {
			t = typeof val;
			if (t !== 'string' && t !== 'number') {
				val = JSON.stringify(val);
			}
			try {
				s.setItem(key, val);
			} catch (e) {
				try {
					s.clear();
					s.setItem(key, val);
				} catch (e) {
					self.debug('error', e.toString());
				}
			}
			retval = s.getItem(key);
		}

		if (retval && (retval.substr(0,1) === '{' || retval.substr(0,1) === '[')) {
			try {
				return JSON.parse(retval);
			} catch(e) {}
		}
		return retval;
	},

	/**
	 * Set/get data into/from sessionStorage
	 *
	 * @param  String       key
	 * @param  String|void  value
	 * @return String|null
	 */
	sessionStorage : function(key, val) {
		var self   = this,
			s, retval, t;

		try {
			s = window.sessionStorage;
		} catch(e) {}

		if (!s) {
			return;
		}

		if (val === null) {
			return s.removeItem(key);
		}

		if (val !== void(0)) {
			t = typeof val;
			if (t !== 'string' && t !== 'number') {
				val = JSON.stringify(val);
			}
			try {
				s.setItem(key, val);
			} catch (e) {
				try {
					s.clear();
					s.setItem(key, val);
				} catch (e) {
					self.debug('error', e.toString());
				}
			}
		}
		retval = s.getItem(key);

		if (retval && (retval.substr(0,1) === '{' || retval.substr(0,1) === '[')) {
			try {
				return JSON.parse(retval);
			} catch(e) {}
		}
		return retval;
	},

	/**
	 * Get/set cookie
	 *
	 * @param  String       cookie name
	 * @param  String|void  cookie value
	 * @return String|null
	 */
	cookie : function(name, value) {
		var d, o, c, i, retval, t;

		name = 'elfinder-'+name+this.id;

		if (value === void(0)) {
			if (this.cookieEnabled && document.cookie && document.cookie != '') {
				c = document.cookie.split(';');
				name += '=';
				for (i=0; i<c.length; i++) {
					c[i] = $.trim(c[i]);
					if (c[i].substring(0, name.length) == name) {
						retval = decodeURIComponent(c[i].substring(name.length));
						if (retval.substr(0,1) === '{' || retval.substr(0,1) === '[') {
							try {
								return JSON.parse(retval);
							} catch(e) {}
						}
						return retval;
					}
				}
			}
			return null;
		}

		if (!this.cookieEnabled) {
			return '';
		}

		o = Object.assign({}, this.options.cookie);
		if (value === null) {
			value = '';
			o.expires = -1;
		} else {
			t = typeof value;
			if (t !== 'string' && t !== 'number') {
				value = JSON.stringify(value);
			}
		}
		if (typeof(o.expires) == 'number') {
			d = new Date();
			d.setTime(d.getTime()+(o.expires * 86400000));
			o.expires = d;
		}
		document.cookie = name+'='+encodeURIComponent(value)+'; expires='+o.expires.toUTCString()+(o.path ? '; path='+o.path : '')+(o.domain ? '; domain='+o.domain : '')+(o.secure ? '; secure' : '')+(o.samesite ? '; samesite='+o.samesite : '');
		if (value && (value.substr(0,1) === '{' || value.substr(0,1) === '[')) {
			try {
				return JSON.parse(value);
			} catch(e) {}
		}
		return value;
	},
	
	/**
	 * Get start directory (by location.hash or last opened directory)
	 * 
	 * @return String
	 */
	startDir : function() {
		var locHash = window.location.hash;
		if (locHash && locHash.match(/^#elf_/)) {
			return locHash.replace(/^#elf_/, '');
		} else if (this.options.startPathHash) {
			return this.options.startPathHash;
		} else {
			return this.lastDir();
		}
	},
	
	/**
	 * Get/set last opened directory
	 * 
	 * @param  String|undefined  dir hash
	 * @return String
	 */
	lastDir : function(hash) { 
		return this.options.rememberLastDir ? this.storage('lastdir', hash) : '';
	},
	
	/**
	 * Node for escape html entities in texts
	 * 
	 * @type jQuery
	 */
	_node : $('<span></c.length;>'),
	
	/**
	 * Replace not html-safe symbols to html entities
	 * 
	 * @param  String  text to escape
	 * @return String
	 */
	escape : function(name) {
		return this._node.text(name).html().replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
		var self   = this,
			fileFilter = (function() {
				var func, filter;
				if (filter = self.options.fileFilter) {
					if (typeof filter === 'function') {
						func = function(file) {
							return filter.call(self, file);
						};
					} else if (filter instanceof RegExp) {
						func = function(file) {
							return filter.test(file.name);
						};
					}
				}
				return func? func : null;
			})(),
			chkCmdMap = function(opts) {
				// Disable command to replace with other command
				var disabled;
				if (opts.uiCmdMap) {
					if ($.isPlainObject(opts.uiCmdMap) && Object.keys(opts.uiCmdMap).length) {
						if (!opts.disabledFlip) {
							opts.disabledFlip = {};
						}
						disabled = opts.disabledFlip;
						$.each(opts.uiCmdMap, function(f, t) {
							if (t === 'hidden' && !disabled[f]) {
								opts.disabled.push(f);
								opts.disabledFlip[f] = true;
							}
						});
					} else {
						delete opts.uiCmdMap;
					}
				}
			},
			normalizeOptions = function(opts) {
				var getType = function(v) {
						var type = typeof v;
						if (type === 'object' && Array.isArray(v)) {
							type = 'array';
						}
						return type;
					};
				$.each(self.optionProperties, function(k, empty) {
					if (empty !== void(0)) {
						if (opts[k] && getType(opts[k]) !== getType(empty)) {
							opts[k] = empty;
						}
					}
				});
				if (opts.disabled) {
					opts.disabledFlip = self.arrayFlip(opts.disabled, true);
					$.each(self.options.disabledCmdsRels, function(com, rels) {
						var m, flg;
						if (opts.disabledFlip[com]) {
							flg = true;
						} else if (m = com.match(/^([^&]+)&([^=]+)=(.*)$/)) {
							if (opts.disabledFlip[m[1]] && opts[m[2]] == m[3]) {
								flg = true;
							}
						}
						if (flg) {
							$.each(rels, function(i, rel) {
								if (!opts.disabledFlip[rel]) {
									opts.disabledFlip[rel] = true;
									opts.disabled.push(rel);
								}
							});
						}
					});
				} else {
					opts.disabledFlip = {};
				}
				return opts;
			},
			filter = function(file, asMap, type) { 
				var res = asMap? file : true,
					ign = asMap? null : false,
					vid, targetOptions, isRoot, rootNames;
				
				if (file && file.hash && file.name && file.mime) {
					if (file.mime === 'application/x-empty') {
						file.mime = 'text/plain';
					}
					
					isRoot = self.isRoot(file);
					if (isRoot && ! file.volumeid) {
						self.debug('warning', 'The volume root statuses requires `volumeid` property.');
					}
					if (isRoot || file.mime === 'directory') {
						// Prevention of circular reference
						if (file.phash) {
							if (file.phash === file.hash) {
								error = error.concat(['Parent folder of "$1" is itself.', file.name]);
								return ign;
							}
							if (isRoot && file.volumeid && file.phash.indexOf(file.volumeid) === 0) {
								error = error.concat(['Parent folder of "$1" is inner itself.', file.name]);
								return ign;
							}
						}
						
						// set options, tmbUrls for each volume
						if (file.volumeid) {
							vid = file.volumeid;
							
							if (isRoot) {
								// make or update of leaf roots cache
								if (file.phash) {
									if (! self.leafRoots[file.phash]) {
										self.leafRoots[file.phash] = [ file.hash ];
									} else {
										if ($.inArray(file.hash, self.leafRoots[file.phash]) === -1) {
											self.leafRoots[file.phash].push(file.hash);
										}
									}
								}

								self.hasVolOptions = true;
								if (! self.volOptions[vid]) {
									self.volOptions[vid] = {
										// set dispInlineRegex
										dispInlineRegex: self.options.dispInlineRegex
									};
								}
								
								targetOptions = self.volOptions[vid];
								
								if (file.options) {
									// >= v.2.1.14 has file.options
									Object.assign(targetOptions, file.options);
								}
								
								// for compat <= v2.1.13
								if (file.disabled) {
									targetOptions.disabled = file.disabled;
									targetOptions.disabledFlip = self.arrayFlip(file.disabled, true);
								}
								if (file.tmbUrl) {
									targetOptions.tmbUrl = file.tmbUrl;
								}
								
								// '/' required at the end of url
								if (targetOptions.url && targetOptions.url.substr(-1) !== '/') {
									targetOptions.url += '/';
								}

								// check uiCmdMap
								chkCmdMap(targetOptions);
								
								// check trash bin hash
								if (targetOptions.trashHash) {
									if (self.trashes[targetOptions.trashHash] === false) {
										delete targetOptions.trashHash;
									} else {
										self.trashes[targetOptions.trashHash] = file.hash;
									}
								}
								
								// set immediate properties
								$.each(self.optionProperties, function(k) {
									if (targetOptions[k]) {
										file[k] = targetOptions[k];
									}
								});

								// regist fm.roots
								if (type !== 'cwd') {
									self.roots[vid] = file.hash;
								}

								// regist fm.volumeExpires
								if (file.expires) {
									self.volumeExpires[vid] = file.expires;
								}
							}
							
							if (prevId !== vid) {
								prevId = vid;
								i18nFolderName = self.option('i18nFolderName', vid);
							}
						}
						
						// volume root i18n name
						if (isRoot && ! file.i18) {
							name = 'volume_' + file.name,
							i18 = self.i18n(false, name);
	
							if (name !== i18) {
								file.i18 = i18;
							}
						}
						
						// i18nFolderName
						if (i18nFolderName && ! file.i18) {
							name = 'folder_' + file.name,
							i18 = self.i18n(false, name);
	
							if (name !== i18) {
								file.i18 = i18;
							}
						}
						
						if (isRoot) {
							if (rootNames = self.storage('rootNames')) {
								if (rootNames[file.hash]) {
									file._name = file.name;
									file._i18 = file.i18;
									file.name = rootNames[file.hash] = rootNames[file.hash];
									delete file.i18;
								}
								self.storage('rootNames', rootNames);
							}
						}

						// lock trash bins holder
						if (self.trashes[file.hash]) {
							file.locked = true;
						}
					} else {
						if (fileFilter) {
							try {
								if (! fileFilter(file)) {
									return ign;
								}
							} catch(e) {
								self.debug(e);
							}
						}
						if (file.size == 0) {
							file.mime = self.getMimetype(file.name, file.mime);
						}
					}
					
					if (file.options) {
						self.optionsByHashes[file.hash] = normalizeOptions(file.options);
					}
					
					delete file.options;
					
					return res;
				}
				return ign;
			},
			getDescendants = function(hashes) {
				var res = [];
				$.each(self.files(), function(h, f) {
					$.each(self.parents(h), function(i, ph) {
						if ($.inArray(ph, hashes) !== -1 && $.inArray(h, hashes) === -1) {
							res.push(h);
							return false;
						}
					});
				});
				return res;
			},
			applyLeafRootStats = function(dataArr, type) {
				$.each(dataArr, function(i, f) {
					var pfile, done;
					if (self.leafRoots[f.hash]) {
						self.applyLeafRootStats(f);
					}
					// update leaf root parent stat
					if (type !== 'change' && f.phash && self.isRoot(f) && (pfile = self.file(f.phash))) {
						self.applyLeafRootStats(pfile);
						// add to data.changed
						if (!data.changed) {
							data.changed = [pfile];
						} else {
							$.each(data.changed, function(i, f) {
								if (f.hash === pfile.hash) {
									data.changed[i] = pfile;
									done = true;
									return false;
								}
							});
							if (!done) {
								data.changed.push(pfile);
							}
						}
					}
				});
			},
			error = [],
			name, i18, i18nFolderName, prevId, cData;
		
		// set cunstom data
		if (data.customData && (!self.prevCustomData || (JSON.stringify(data.customData) !== JSON.stringify(self.prevCustomData)))) {
			self.prevCustomData = data.customData;
			try {
				cData = JSON.parse(data.customData);
				if ($.isPlainObject(cData)) {
					self.prevCustomData = cData;
					$.each(Object.keys(cData), function(i, key) {
						if (cData[key] === null) {
							delete cData[key];
							delete self.optsCustomData[key];
						}
					});
					self.customData = Object.assign({}, self.optsCustomData, cData);
				}
			} catch(e) {}
		}

		if (data.options) {
			normalizeOptions(data.options);
		}
		
		if (data.cwd) {
			if (data.cwd.volumeid && data.options && Object.keys(data.options).length && self.isRoot(data.cwd)) {
				self.hasVolOptions = true;
				self.volOptions[data.cwd.volumeid] = data.options;
			}
			data.cwd = filter(data.cwd, true, 'cwd');
		}
		if (data.files) {
			data.files = $.grep(data.files, filter);
		} 
		if (data.tree) {
			data.tree = $.grep(data.tree, filter);
		}
		if (data.added) {
			data.added = $.grep(data.added, filter);
		}
		if (data.changed) {
			data.changed = $.grep(data.changed, filter);
		}
		if (data.removed && data.removed.length && self.searchStatus.state === 2) {
			data.removed = data.removed.concat(getDescendants(data.removed));
		}
		if (data.api) {
			data.init = true;
		}

		if (Object.keys(self.leafRoots).length) {
			data.files && applyLeafRootStats(data.files);
			data.tree && applyLeafRootStats(data.tree);
			data.added && applyLeafRootStats(data.added);
			data.changed && applyLeafRootStats(data.changed, 'change');
		}

		// merge options that apply only to cwd
		if (data.cwd && data.cwd.options && data.options) {
			Object.assign(data.options, normalizeOptions(data.cwd.options));
		}

		// '/' required at the end of url
		if (data.options && data.options.url && data.options.url.substr(-1) !== '/') {
			data.options.url += '/';
		}
		
		// check error
		if (error.length) {
			data.norError = ['errResponse'].concat(error);
		}
		
		return data;
	},
	
	/**
	 * Update sort options
	 *
	 * @param {String} sort type
	 * @param {String} sort order
	 * @param {Boolean} show folder first
	 */
	setSort : function(type, order, stickFolders, alsoTreeview) {
		this.storage('sortType', (this.sortType = this.sortRules[type] ? type : 'name'));
		this.storage('sortOrder', (this.sortOrder = /asc|desc/.test(order) ? order : 'asc'));
		this.storage('sortStickFolders', (this.sortStickFolders = !!stickFolders) ? 1 : '');
		this.storage('sortAlsoTreeview', (this.sortAlsoTreeview = !!alsoTreeview) ? 1 : '');
		this.trigger('sortchange');
	},
	
	_sortRules : {
		name : function(file1, file2) {
			return elFinder.prototype.naturalCompare(file1.i18 || file1.name, file2.i18 || file2.name);
		},
		size : function(file1, file2) { 
			var size1 = parseInt(file1.size) || 0,
				size2 = parseInt(file2.size) || 0;
				
			return size1 === size2 ? 0 : size1 > size2 ? 1 : -1;
		},
		kind : function(file1, file2) {
			return elFinder.prototype.naturalCompare(file1.mime, file2.mime);
		},
		date : function(file1, file2) { 
			var date1 = file1.ts || file1.date || 0,
				date2 = file2.ts || file2.date || 0;

			return date1 === date2 ? 0 : date1 > date2 ? 1 : -1;
		},
		perm : function(file1, file2) { 
			var val = function(file) { return (file.write? 2 : 0) + (file.read? 1 : 0); },
				v1  = val(file1),
				v2  = val(file2);
			return v1 === v2 ? 0 : v1 > v2 ? 1 : -1;
		},
		mode : function(file1, file2) { 
			var v1 = file1.mode || (file1.perm || ''),
				v2 = file2.mode || (file2.perm || '');
			return elFinder.prototype.naturalCompare(v1, v2);
		},
		owner : function(file1, file2) { 
			var v1 = file1.owner || '',
				v2 = file2.owner || '';
			return elFinder.prototype.naturalCompare(v1, v2);
		},
		group : function(file1, file2) { 
			var v1 = file1.group || '',
				v2 = file2.group || '';
			return elFinder.prototype.naturalCompare(v1, v2);
		}
	},
	
	/**
	 * Valid sort rule names
	 * 
	 * @type Object
	 */
	sorters : {},
	
	/**
	 * Compare strings for natural sort
	 *
	 * @param  String
	 * @param  String
	 * @return Number
	 */
	naturalCompare : function(a, b) {
		var self = elFinder.prototype.naturalCompare;
		if (typeof self.loc == 'undefined') {
			self.loc = (navigator.userLanguage || navigator.browserLanguage || navigator.language || 'en-US');
		}
		if (typeof self.sort == 'undefined') {
			if ('11'.localeCompare('2', self.loc, {numeric: true}) > 0) {
				// Native support
				if (window.Intl && window.Intl.Collator) {
					self.sort = new Intl.Collator(self.loc, {numeric: true}).compare;
				} else {
					self.sort = function(a, b) {
						return a.localeCompare(b, self.loc, {numeric: true});
					};
				}
			} else {
				/*
				 * Edited for elFinder (emulates localeCompare() by numeric) by Naoki Sawada aka nao-pon
				 */
				/*
				 * Huddle/javascript-natural-sort (https://github.com/Huddle/javascript-natural-sort)
				 */
				/*
				 * Natural Sort algorithm for Javascript - Version 0.7 - Released under MIT license
				 * Author: Jim Palmer (based on chunking idea from Dave Koelle)
				 * http://opensource.org/licenses/mit-license.php
				 */
				self.sort = function(a, b) {
					var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
					sre = /(^[ ]*|[ ]*$)/g,
					dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
					hre = /^0x[0-9a-f]+$/i,
					ore = /^0/,
					syre = /^[\x01\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/, // symbol first - (Naoki Sawada)
					i = function(s) { return self.sort.insensitive && (''+s).toLowerCase() || ''+s; },
					// convert all to strings strip whitespace
					// first character is "_", it's smallest - (Naoki Sawada)
					x = i(a).replace(sre, '').replace(/^_/, "\x01") || '',
					y = i(b).replace(sre, '').replace(/^_/, "\x01") || '',
					// chunk/tokenize
					xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
					yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
					// numeric, hex or date detection
					xD = parseInt(x.match(hre)) || (xN.length != 1 && x.match(dre) && Date.parse(x)),
					yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null,
					oFxNcL, oFyNcL,
					locRes = 0;

					// first try and sort Hex codes or Dates
					if (yD) {
						if ( xD < yD ) return -1;
						else if ( xD > yD ) return 1;
					}
					// natural sorting through split numeric strings and default strings
					for(var cLoc=0, numS=Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {

						// find floats not starting with '0', string or 0 if not defined (Clint Priest)
						oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
						oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;

						// handle numeric vs string comparison - number < string - (Kyle Adams)
						// but symbol first < number - (Naoki Sawada)
						if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
							if (isNaN(oFxNcL) && (typeof oFxNcL !== 'string' || ! oFxNcL.match(syre))) {
								return 1;
							} else if (typeof oFyNcL !== 'string' || ! oFyNcL.match(syre)) {
								return -1;
							}
						}

						// use decimal number comparison if either value is string zero
						if (parseInt(oFxNcL, 10) === 0) oFxNcL = 0;
						if (parseInt(oFyNcL, 10) === 0) oFyNcL = 0;

						// rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
						if (typeof oFxNcL !== typeof oFyNcL) {
							oFxNcL += '';
							oFyNcL += '';
						}

						// use locale sensitive sort for strings when case insensitive
						// note: localeCompare interleaves uppercase with lowercase (e.g. A,a,B,b)
						if (self.sort.insensitive && typeof oFxNcL === 'string' && typeof oFyNcL === 'string') {
							locRes = oFxNcL.localeCompare(oFyNcL, self.loc);
							if (locRes !== 0) return locRes;
						}

						if (oFxNcL < oFyNcL) return -1;
						if (oFxNcL > oFyNcL) return 1;
					}
					return 0;
				};
				self.sort.insensitive = true;
			}
		}
		return self.sort(a, b);
	},
	
	/**
	 * Compare files based on elFinder.sort
	 *
	 * @param  Object  file
	 * @param  Object  file
	 * @return Number
	 */
	compare : function(file1, file2) {
		var self  = this,
			type  = self.sortType,
			asc   = self.sortOrder == 'asc',
			stick = self.sortStickFolders,
			rules = self.sortRules,
			sort  = rules[type],
			d1    = file1.mime == 'directory',
			d2    = file2.mime == 'directory',
			res;
			
		if (stick) {
			if (d1 && !d2) {
				return -1;
			} else if (!d1 && d2) {
				return 1;
			}
		}
		
		res = asc ? sort(file1, file2) : sort(file2, file1);
		
		return type !== 'name' && res === 0
			? res = asc ? rules.name(file1, file2) : rules.name(file2, file1)
			: res;
	},
	
	/**
	 * Sort files based on config
	 *
	 * @param  Array  files
	 * @return Array
	 */
	sortFiles : function(files) {
		return files.sort(this.compare);
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
	 *    hideCnt  : false,   // true for not show count
	 *    progress : 10,      // progress bar percents (use cnt : 0 to update progress bar)
	 *    cancel   : callback // callback function for cancel button
	 * })
	 * @return elFinder
	 */
	notify : function(opts) {
		var self     = this,
			type     = opts.type,
			id       = opts.id? 'elfinder-notify-'+opts.id : '',
			msg      = this.i18n((typeof opts.msg !== 'undefined')? opts.msg : (this.messages['ntf'+type] ? 'ntf'+type : 'ntfsmth')),
			hiddens  = this.arrayFlip(this.options.notifyDialog.hiddens || []),
			ndialog  = this.ui.notify,
			dialog   = ndialog.closest('.ui-dialog'),
			notify   = ndialog.children('.elfinder-notify-'+type+(id? ('.'+id) : '')),
			button   = notify.children('div.elfinder-notify-cancel').children('button'),
			ntpl     = '<div class="elfinder-notify elfinder-notify-{type}'+(id? (' '+id) : '')+'"><span class="elfinder-dialog-icon elfinder-dialog-icon-{type}"></span><span class="elfinder-notify-msg">{msg}</span> <span class="elfinder-notify-cnt"></span><div class="elfinder-notify-progressbar"><div class="elfinder-notify-progress"></div></div><div class="elfinder-notify-cancel"></div></div>',
			delta    = opts.cnt + 0,
			size     = (typeof opts.size != 'undefined')? parseInt(opts.size) : null,
			progress = (typeof opts.progress != 'undefined' && opts.progress >= 0) ? opts.progress : null,
			fakeint  = opts.fakeinterval || 200,
			cancel   = opts.cancel,
			clhover  = 'ui-state-hover',
			close    = function() {
				var prog = notify.find('.elfinder-notify-progress'),
					rm = function() {
						notify.remove();
						if (!ndialog.children(dialog.data('minimized')? void(0) : ':visible').length) {
							if (dialog.data('minimized')) {
								dialog.data('minimized').hide();
							} else {
								ndialog.elfinderdialog('close');
							}
						}
						setProgressbar();
					};
				notify._esc && $(document).off('keydown', notify._esc);
				if (notify.data('cur') < 100) {
					prog.animate({
						width : '100%'
					}, 50, function() { requestAnimationFrame(function() { rm(); }); });
				} else {
					rm();
				}
			},
			fakeUp = function(interval) {
				var cur;
				if (notify.length) {
					cur = notify.data('cur') + 1;
					if (cur <= 98) {
						notify.find('.elfinder-notify-progress').width(cur + '%');
						notify.data('cur', cur);
						setProgressbar();
						setTimeout(function() {
							interval *= 1.05; 
							fakeUp(interval);
						}, interval);
					}
				}
			},
			setProgressbar = function() {
				var cnt = 0,
					val = 0,
					ntfs = ndialog.children('.elfinder-notify'),
					w;
				if (ntfs.length) {
					ntfs.each(function() {
						cnt++;
						val += Math.min($(this).data('cur'), 100);
					});
					w = cnt? Math.floor(val / (cnt * 100) * 100) + '%' : 0;
					self.ui.progressbar.width(w);
					if (dialog.data('minimized')) {
						dialog.data('minimized').title(w);
						dialog.data('minimized').dialog().children('.ui-dialog-titlebar').children('.elfinder-ui-progressbar').width(w);
					}
				} else {
					self.ui.progressbar.width(0);
					dialog.data('minimized') && dialog.data('minimized').hide();
				}
			},
			cnt, total, prc;

		if (!type) {
			return this;
		}
		
		if (!notify.length) {
			notify = $(ntpl.replace(/\{type\}/g, type).replace(/\{msg\}/g, msg));
			if (hiddens[type]) {
				notify.hide();
			} else {
				ndialog.on('minimize', function(e) {
					dialog.data('minimized') && setProgressbar();
				});
			}
			notify.appendTo(ndialog).data('cnt', 0);

			if (progress != null) {
				notify.data({progress : 0, total : 0, cur : 0});
			} else {
				notify.data({cur : 0});
				fakeUp(fakeint);
			}

			if (cancel) {
				button = $('<span class="elfinder-notify-button ui-icon ui-icon-close" title="'+this.i18n('btnCancel')+'"></span>')
					.on('mouseenter mouseleave', function(e) { 
						$(this).toggleClass(clhover, e.type === 'mouseenter');
					});
				notify.children('div.elfinder-notify-cancel').append(button);
			}
			ndialog.trigger('resize');
		} else if (typeof opts.msg !== 'undefined') {
			notify.children('span.elfinder-notify-msg').html(msg);
		}

		cnt = delta + parseInt(notify.data('cnt'));
		
		if (cnt > 0) {
			if (cancel && button.length) {
				if ($.isFunction(cancel) || (typeof cancel === 'object' && cancel.promise)) {
					notify._esc = function(e) {
						if (e.type == 'keydown' && e.keyCode != $.ui.keyCode.ESCAPE) {
							return;
						}
						e.preventDefault();
						e.stopPropagation();
						close();
						if (cancel.promise) {
							cancel.reject(0); // 0 is canceling flag
						} else {
							cancel(e);
						}
					};
					button.on('click', function(e) {
						notify._esc(e);
					});
					$(document).on('keydown.' + this.namespace, notify._esc);
				}
			}
			
			!opts.hideCnt && notify.children('.elfinder-notify-cnt').text('('+cnt+')');
			if (delta > 0 && ndialog.is(':hidden') && !hiddens[type]) {
				if (dialog.data('minimized')) {
					dialog.data('minimized').show();
				} else {
					ndialog.elfinderdialog('open', this).height('auto');
				}
			}
			notify.data('cnt', cnt);
			
			if ((progress != null)
			&& (total = notify.data('total')) >= 0
			&& (prc = notify.data('progress')) >= 0) {

				total += size != null? size : delta;
				prc   += progress;
				(size == null && delta < 0) && (prc += delta * 100);
				notify.data({progress : prc, total : total});
				if (size != null) {
					prc *= 100;
					total = Math.max(1, total);
				}
				progress = Math.min(parseInt(prc/total), 100);
				
				notify.find('.elfinder-notify-progress')
					.animate({
						width : (progress < 100 ? progress : 100)+'%'
					}, 20, function() {
						notify.data('cur', progress);
						setProgressbar();
					});
			}
			
		} else {
			close();
		}
		
		return this;
	},
	
	/**
	 * Open confirmation dialog 
	 *
	 * @param  Object  options
	 * @example  
	 * this.confirm({
	 *    cssClass : 'elfinder-confirm-mydialog',
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
	 *    },
	 *    buttons : [ // additional buttons callback - optionally
	 *      {
	 *        label : 'Btn1',
	 *        callback : function(applyToAll) { fm.log('Btn1')}
	 *      }
	 *    ],
	 *    all : true  // display checkbox "Apply to all"
	 * })
	 * @return elFinder
	 */
	confirm : function(opts) {
		var self     = this,
			complete = false,
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
			label, checkbox, btnNum;

		if (opts.cssClass) {
			options.cssClass += ' ' + opts.cssClass;
		}
		options.buttons[this.i18n(opts.accept.label)] = function() {
			opts.accept.callback(!!(checkbox && checkbox.prop('checked')));
			complete = true;
			$(this).elfinderdialog('close');
		};
		options.buttons[this.i18n(opts.accept.label)]._cssClass = 'elfinder-confirm-accept';
		
		if (opts.reject) {
			options.buttons[this.i18n(opts.reject.label)] = function() {
				opts.reject.callback(!!(checkbox && checkbox.prop('checked')));
				complete = true;
				$(this).elfinderdialog('close');
			};
			options.buttons[this.i18n(opts.reject.label)]._cssClass = 'elfinder-confirm-reject';
		}
		
		if (opts.buttons && opts.buttons.length > 0) {
			btnNum = 1;
			$.each(opts.buttons, function(i, v){
				options.buttons[self.i18n(v.label)] = function() {
					v.callback(!!(checkbox && checkbox.prop('checked')));
					complete = true;
					$(this).elfinderdialog('close');
				};
				options.buttons[self.i18n(v.label)]._cssClass = 'elfinder-confirm-extbtn' + (btnNum++);
				if (v.cssClass) {
					options.buttons[self.i18n(v.label)]._cssClass += ' ' + v.cssClass;
				}
			});
		}
		
		options.buttons[this.i18n(opts.cancel.label)] = function() {
			$(this).elfinderdialog('close');
		};
		options.buttons[this.i18n(opts.cancel.label)]._cssClass = 'elfinder-confirm-cancel';
		
		if (opts.all) {
			options.create = function() {
				var base = $('<div class="elfinder-dialog-confirm-applyall"></div>');
				checkbox = $('<input type="checkbox" />');
				$(this).next().find('.ui-dialog-buttonset')
					.prepend(base.append($('<label>'+apply+'</label>').prepend(checkbox)));
			};
		}
		
		if (opts.optionsCallback && $.isFunction(opts.optionsCallback)) {
			opts.optionsCallback(options);
		}
		
		return this.dialog('<span class="elfinder-dialog-icon elfinder-dialog-icon-confirm"></span>' + this.i18n(opts.text), options);
	},
	
	/**
	 * Create unique file name in required dir
	 * 
	 * @param  String  file name
	 * @param  String  parent dir hash
	 * @param  String  glue
	 * @return String
	 */
	uniqueName : function(prefix, phash, glue) {
		var i = 0, ext = '', p, name;
		
		prefix = this.i18n(false, prefix);
		phash = phash || this.cwd().hash;
		glue = (typeof glue === 'undefined')? ' ' : glue;

		if (p = prefix.match(/^(.+)(\.[^.]+)$/)) {
			ext    = p[2];
			prefix = p[1];
		}
		
		name   = prefix+ext;
		
		if (!this.fileByName(name, phash)) {
			return name;
		}
		while (i < 10000) {
			name = prefix + glue + (++i) + ext;
			if (!this.fileByName(name, phash)) {
				return name;
			}
		}
		return prefix + Math.random() + ext;
	},
	
	/**
	 * Return message translated onto current language
	 * Allowed accept HTML element that was wrapped in jQuery object
	 * To be careful to XSS vulnerability of HTML element Ex. You should use `fm.escape(file.name)`
	 *
	 * @param  String|Array  message[s]|Object jQuery
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
			i, j, m, escFunc, start = 0, isErr;
		
		if (arguments.length && arguments[0] === false) {
			escFunc = function(m){ return m; };
			start = 1;
		}
		for (i = start; i< arguments.length; i++) {
			m = arguments[i];
			
			if (Array.isArray(m)) {
				for (j = 0; j < m.length; j++) {
					if (m[j] instanceof jQuery) {
						// jQuery object is HTML element
						input.push(m[j]);
					} else if (typeof m[j] !== 'undefined'){
						input.push(message('' + m[j]));
					}
				}
			} else if (m instanceof jQuery) {
				// jQuery object is HTML element
				input.push(m[j]);
			} else if (typeof m !== 'undefined'){
				input.push(message('' + m));
			}
		}
		
		for (i = 0; i < input.length; i++) {
			// dont translate placeholders
			if ($.inArray(i, ignore) !== -1) {
				continue;
			}
			m = input[i];
			if (typeof m == 'string') {
				isErr = !!(messages[m] && m.match(/^err/));
				// translate message
				m = messages[m] || (escFunc? escFunc(m) : self.escape(m));
				// replace placeholders in message
				m = m.replace(/\$(\d+)/g, function(match, placeholder) {
					var res;
					placeholder = i + parseInt(placeholder);
					if (placeholder > 0 && input[placeholder]) {
						ignore.push(placeholder);
					}
					res = escFunc? escFunc(input[placeholder]) : self.escape(input[placeholder]);
					if (isErr) {
						res = '<span class="elfinder-err-var elfinder-err-var' + placeholder + '">' + res + '</span>';
					}
					return res;
				});
			} else {
				// get HTML from jQuery object
				m = m.get(0).outerHTML;
			}

			input[i] = m;
		}

		return $.grep(input, function(m, i) { return $.inArray(i, ignore) === -1 ? true : false; }).join('<br>');
	},
	
	/**
	 * Get icon style from file.icon
	 * 
	 * @param  Object  elFinder file object
	 * @return String|Object
	 */
	getIconStyle : function(file, asObject) {
		var self = this,
			template = {
				'background' : 'url(\'{url}\') 0 0 no-repeat',
				'background-size' : 'contain'
			},
			style = '',
			cssObj = {},
			i = 0;
		if (file.icon) {
			style = 'style="';
			$.each(template, function(k, v) {
				if (i++ === 0) {
					v = v.replace('{url}', self.escape(file.icon));
				}
				if (asObject) {
					cssObj[k] = v;
				} else {
					style += k+':'+v+';';
				}
			});
			style += '"';
		}
		return asObject? cssObj : style;
	},
	
	/**
	 * Convert mimetype into css classes
	 * 
	 * @param  String  file mimetype
	 * @return String
	 */
	mime2class : function(mimeType) {
		var prefix = 'elfinder-cwd-icon-',
			mime   = mimeType.toLowerCase(),
			isText = this.textMimes[mime];
		
		mime = mime.split('/');
		if (isText) {
			mime[0] += ' ' + prefix + 'text';
		} else if (mime[1] && mime[1].match(/\+xml$/)) {
			mime[0] += ' ' + prefix + 'xml';
		}
		
		return prefix + mime[0] + (mime[1] ? ' ' + prefix + mime[1].replace(/(\.|\+)/g, '-') : '');
	},
	
	/**
	 * Return localized kind of file
	 * 
	 * @param  Object|String  file or file mimetype
	 * @return String
	 */
	mime2kind : function(f) {
		var isObj = typeof(f) == 'object' ? true : false,
			mime  = isObj ? f.mime : f,
			kind;
		

		if (isObj && f.alias && mime != 'symlink-broken') {
			kind = 'Alias';
		} else if (this.kinds[mime]) {
			if (isObj && mime === 'directory' && (! f.phash || f.isroot)) {
				kind = 'Root';
			} else {
				kind = this.kinds[mime];
			}
		} else if (this.mimeTypes[mime]) {
			kind = this.mimeTypes[mime].toUpperCase();
			if (!this.messages['kind'+kind]) {
				kind = null;
			}
		}
		if (! kind) {
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
	},
	
	/**
	 * Return boolean Is mime-type text file
	 * 
	 * @param  String  mime-type
	 * @return Boolean
	 */
	mimeIsText : function(mime) {
		return (this.textMimes[mime.toLowerCase()] || (mime.indexOf('text/') === 0 && mime.substr(5, 3) !== 'rtf') || mime.match(/^application\/.+\+xml$/))? true : false;
	},
	
	/**
	 * Returns a date string formatted according to the given format string
	 * 
	 * @param  String  format string
	 * @param  Object  Date object
	 * @return String
	 */
	date : function(format, date) {
		var self = this,
			output, d, dw, m, y, h, g, i, s;
		
		if (! date) {
			date = new Date();
		}
		
		h  = date[self.getHours]();
		g  = h > 12 ? h - 12 : h;
		i  = date[self.getMinutes]();
		s  = date[self.getSeconds]();
		d  = date[self.getDate]();
		dw = date[self.getDay]();
		m  = date[self.getMonth]() + 1;
		y  = date[self.getFullYear]();
		
		output = format.replace(/[a-z]/gi, function(val) {
			switch (val) {
				case 'd': return d > 9 ? d : '0'+d;
				case 'j': return d;
				case 'D': return self.i18n(self.i18.daysShort[dw]);
				case 'l': return self.i18n(self.i18.days[dw]);
				case 'm': return m > 9 ? m : '0'+m;
				case 'n': return m;
				case 'M': return self.i18n(self.i18.monthsShort[m-1]);
				case 'F': return self.i18n(self.i18.months[m-1]);
				case 'Y': return y;
				case 'y': return (''+y).substr(2);
				case 'H': return h > 9 ? h : '0'+h;
				case 'G': return h;
				case 'g': return g;
				case 'h': return g > 9 ? g : '0'+g;
				case 'a': return h >= 12 ? 'pm' : 'am';
				case 'A': return h >= 12 ? 'PM' : 'AM';
				case 'i': return i > 9 ? i : '0'+i;
				case 's': return s > 9 ? s : '0'+s;
			}
			return val;
		});
		
		return output;
	},
	
	/**
	 * Return localized date
	 * 
	 * @param  Object  file object
	 * @return String
	 */
	formatDate : function(file, t) {
		var self = this, 
			ts   = t || file.ts, 
			i18  = self.i18,
			date, format, output, d, dw, m, y, h, g, i, s;

		if (self.options.clientFormatDate && ts > 0) {

			date = new Date(ts*1000);
			format = ts >= this.yesterday 
				? this.fancyFormat 
				: this.dateFormat;

			output = self.date(format, date);
			
			return ts >= this.yesterday
				? output.replace('$1', this.i18n(ts >= this.today ? 'Today' : 'Yesterday'))
				: output;
		} else if (file.date) {
			return file.date.replace(/([a-z]+)\s/i, function(a1, a2) { return self.i18n(a2)+' '; });
		}
		
		return self.i18n('dateUnknown');
	},
	
	/**
	 * Return localized number string
	 * 
	 * @param  Number
	 * @return String
	 */
	toLocaleString : function(num) {
		var v = new Number(num);
		if (v) {
			if (v.toLocaleString) {
				return v.toLocaleString();
			} else {
				return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			}
		}
		return num;
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
		
		if (o.type) {
			c += ' elfinder-' + this.escape(o.type);
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
		var n = 1, u = 'b';
		
		if (s == 'unknown') {
			return this.i18n('unknown');
		}
		
		if (s > 1073741824) {
			n = 1073741824;
			u = 'GB';
		} else if (s > 1048576) {
			n = 1048576;
			u = 'MB';
		} else if (s > 1024) {
			n = 1024;
			u = 'KB';
		}
		s = s/n;
		return (s > 0 ? n >= 1048576 ? s.toFixed(2) : Math.round(s) : 0) +' '+u;
	},
	
	/**
	 * Return formated file mode by options.fileModeStyle
	 * 
	 * @param  String  file mode
	 * @param  String  format style
	 * @return String
	 */
	formatFileMode : function(p, style) {
		var i, o, s, b, sticy, suid, sgid, str, oct;
		
		if (!style) {
			style = this.options.fileModeStyle.toLowerCase();
		}
		p = $.trim(p);
		if (p.match(/[rwxs-]{9}$/i)) {
			str = p = p.substr(-9);
			if (style == 'string') {
				return str;
			}
			oct = '';
			s = 0;
			for (i=0; i<7; i=i+3) {
				o = p.substr(i, 3);
				b = 0;
				if (o.match(/[r]/i)) {
					b += 4;
				}
				if (o.match(/[w]/i)) {
					b += 2;
				}
				if (o.match(/[xs]/i)) {
					if (o.match(/[xs]/)) {
						b += 1;
					}
					if (o.match(/[s]/i)) {
						if (i == 0) {
							s += 4;
						} else if (i == 3) {
							s += 2;
						}
					}
				}
				oct += b.toString(8);
			}
			if (s) {
				oct = s.toString(8) + oct;
			}
		} else {
			p = parseInt(p, 8);
			oct = p? p.toString(8) : '';
			if (!p || style == 'octal') {
				return oct;
			}
			o = p.toString(8);
			s = 0;
			if (o.length > 3) {
				o = o.substr(-4);
				s = parseInt(o.substr(0, 1), 8);
				o = o.substr(1);
			}
			sticy = ((s & 1) == 1); // not support
			sgid = ((s & 2) == 2);
			suid = ((s & 4) == 4);
			str = '';
			for(i=0; i<3; i++) {
				if ((parseInt(o.substr(i, 1), 8) & 4) == 4) {
					str += 'r';
				} else {
					str += '-';
				}
				if ((parseInt(o.substr(i, 1), 8) & 2) == 2) {
					str += 'w';
				} else {
					str += '-';
				}
				if ((parseInt(o.substr(i, 1), 8) & 1) == 1) {
					str += ((i==0 && suid)||(i==1 && sgid))? 's' : 'x';
				} else {
					str += '-';
				}
			}
		}
		if (style == 'both') {
			return str + ' (' + oct + ')';
		} else if (style == 'string') {
			return str;
		} else {
			return oct;
		}
	},
	
	/**
	 * Regist this.decodeRawString function
	 * 
	 * @return void
	 */
	registRawStringDecoder : function(rawStringDecoder) {
		if ($.isFunction(rawStringDecoder)) {
			this.decodeRawString = this.options.rawStringDecoder = rawStringDecoder;
		}
	},
	
	/**
	 * Return boolean that uploadable MIME type into target folder
	 * 
	 * @param  String  mime    MIME type
	 * @param  String  target  target folder hash
	 * @return Bool
	 */
	uploadMimeCheck : function(mime, target) {
		target = target || this.cwd().hash;
		var res   = true, // default is allow
			mimeChecker = this.option('uploadMime', target),
			allow,
			deny,
			check = function(checker) {
				var ret = false;
				if (typeof checker === 'string' && checker.toLowerCase() === 'all') {
					ret = true;
				} else if (Array.isArray(checker) && checker.length) {
					$.each(checker, function(i, v) {
						v = v.toLowerCase();
						if (v === 'all' || mime.indexOf(v) === 0) {
							ret = true;
							return false;
						}
					});
				}
				return ret;
			};
		if (mime && $.isPlainObject(mimeChecker)) {
			mime = mime.toLowerCase();
			allow = check(mimeChecker.allow);
			deny = check(mimeChecker.deny);
			if (mimeChecker.firstOrder === 'allow') {
				res = false; // default is deny
				if (! deny && allow === true) { // match only allow
					res = true;
				}
			} else {
				res = true; // default is allow
				if (deny === true && ! allow) { // match only deny
					res = false;
				}
			}
		}
		return res;
	},
	
	/**
	 * call chained sequence of async deferred functions
	 * 
	 * @param  Array   tasks async functions
	 * @return Object  jQuery.Deferred
	 */
	sequence : function(tasks) {
		var l = tasks.length,
			chain = function(task, idx) {
				++idx;
				if (tasks[idx]) {
					return chain(task.then(tasks[idx]), idx);
				} else {
					return task;
				}
			};
		if (l > 1) {
			return chain(tasks[0](), 0);
		} else {
			return tasks[0]();
		}
	},
	
	/**
	 * Reload contents of target URL for clear browser cache
	 * 
	 * @param  String  url target URL
	 * @return Object  jQuery.Deferred
	 */
	reloadContents : function(url) {
		var dfd = $.Deferred(),
			ifm;
		try {
			ifm = $('<iframe width="1" height="1" scrolling="no" frameborder="no" style="position:absolute; top:-1px; left:-1px" crossorigin="use-credentials">')
				.attr('src', url)
				.one('load', function() {
					var ifm = $(this);
					try {
						this.contentDocument.location.reload(true);
						ifm.one('load', function() {
							ifm.remove();
							dfd.resolve();
						});
					} catch(e) {
						ifm.attr('src', '').attr('src', url).one('load', function() {
							ifm.remove();
							dfd.resolve();
						});
					}
				})
				.appendTo('body');
		} catch(e) {
			ifm && ifm.remove();
			dfd.reject();
		}
		return dfd;
	},
	
	/**
	 * Make netmount option for OAuth2
	 * 
	 * @param  String   protocol
	 * @param  String   name
	 * @param  String   host
	 * @param  Object   opts  Default {noOffline: false, root: 'root', pathI18n: 'folderId', folders: true}
			}
	 * 
	 * @return Object
	 */
	makeNetmountOptionOauth : function(protocol, name, host, opt) {
		var noOffline = typeof opt === 'boolean'? opt : null, // for backward compat
			opts = Object.assign({
				noOffline : false,
				root      : 'root',
				pathI18n  : 'folderId',
				folders   : true
			}, (noOffline === null? (opt || {}) : {noOffline : noOffline})),
			addFolders = function(fm, bro, folders) {
				var self = this,
					cnt  = Object.keys($.isPlainObject(folders)? folders : {}).length,
					select;
				
				bro.next().remove();
				if (cnt) {
					select = $('<select class="ui-corner-all elfinder-tabstop" style="max-width:200px;">').append(
						$($.map(folders, function(n,i){return '<option value="'+fm.escape((i+'').trim())+'">'+fm.escape(n)+'</option>';}).join(''))
					).on('change click', function(e){
						var node = $(this),
							path = node.val(),
							spn;
						self.inputs.path.val(path);
						if (opts.folders && (e.type === 'change' || node.data('current') !== path)) {
							node.next().remove();
							node.data('current', path);
							if (path != opts.root) {
								spn = spinner();
								if (xhr && xhr.state() === 'pending') {
									fm.abortXHR(xhr, { quiet: true , abort: true });
								}
								node.after(spn);
								xhr = fm.request({
									data : {cmd : 'netmount', protocol: protocol, host: host, user: 'init', path: path, pass: 'folders'},
									preventDefault : true
								}).done(function(data){
									addFolders.call(self, fm, node, data.folders);
								}).always(function() {
									fm.abortXHR(xhr, { quiet: true });
									spn.remove();
								}).xhr;
							}
						}
					});
					bro.after($('<div></div>').append(select))
						.closest('.ui-dialog').trigger('tabstopsInit');
					select.trigger('focus');
				}
			},
			spinner = function() {
				return $('<div class="elfinder-netmount-spinner"></div>').append('<span class="elfinder-spinner"></span>');
			},
			xhr;
		return {
			vars : {},
			name : name,
			inputs: {
				offline  : $('<input type="checkbox"/>').on('change', function() {
					$(this).parents('table.elfinder-netmount-tb').find('select:first').trigger('change', 'reset');
				}),
				host     : $('<span><span class="elfinder-spinner"></span></span><input type="hidden"/>'),
				path     : $('<input type="text" value="'+opts.root+'"/>'),
				user     : $('<input type="hidden"/>'),
				pass     : $('<input type="hidden"/>'),
				mnt2res  : $('<input type="hidden"/>')
			},
			select: function(fm, ev, d){
				var f = this.inputs,
					oline = f.offline,
					f0 = $(f.host[0]),
					data = d || null;
				this.vars.mbtn = f.host.closest('.ui-dialog').children('.ui-dialog-buttonpane:first').find('button.elfinder-btncnt-0');
				if (! f0.data('inrequest')
						&& (f0.find('span.elfinder-spinner').length
							|| data === 'reset'
							|| (data === 'winfocus' && ! f0.siblings('span.elfinder-button-icon-reload').length))
							)
				{
					if (oline.parent().children().length === 1) {
						f.path.parent().prev().html(fm.i18n(opts.pathI18n));
						oline.attr('title', fm.i18n('offlineAccess'));
						oline.uniqueId().after($('<label></label>').attr('for', oline.attr('id')).html(' '+fm.i18n('offlineAccess')));
					}
					f0.data('inrequest', true).empty().addClass('elfinder-spinner')
						.parent().find('span.elfinder-button-icon').remove();
					fm.request({
						data : {cmd : 'netmount', protocol: protocol, host: host, user: 'init', options: {id: fm.id, offline: oline.prop('checked')? 1:0, pass: f.host[1].value}},
						preventDefault : true
					}).done(function(data){
						f0.removeClass("elfinder-spinner").html(data.body.replace(/\{msg:([^}]+)\}/g, function(whole,s1){return fm.i18n(s1, host);}));
					});
					opts.noOffline && oline.closest('tr').hide();
				} else {
					oline.closest('tr')[(opts.noOffline || f.user.val())? 'hide':'show']();
					f0.data('funcexpup') && f0.data('funcexpup')();
				}
				this.vars.mbtn[$(f.host[1]).val()? 'show':'hide']();
			},
			done: function(fm, data){
				var f = this.inputs,
					p = this.protocol,
					f0 = $(f.host[0]),
					f1 = $(f.host[1]),
					expires = '&nbsp;',
					vars = this.vars,
					chk = function() {
						if (vars.oauthW && !document.hasFocus() && --vars.chkCnt) {
							p.trigger('change', 'winfocus');
							vars.tm = setTimeout(chk, 3000);
						}
					},
					btn;
				
				opts.noOffline && f.offline.closest('tr').hide();
				if (data.mode == 'makebtn') {
					f0.removeClass('elfinder-spinner').removeData('expires').removeData('funcexpup');
					btn = f.host.find('input').on('mouseenter mouseleave', function(){$(this).toggleClass('ui-state-hover');});
					if (data.url) {
						btn.on('click', function() {
							vars.tm && clearTimeout(vars.tm);
							vars.oauthW = window.open(data.url);
							// To correspond to safari, authentication tab sometimes not closing in CORS environment.
							// This may be a safari bug and may improve in the future.
							if ((fm.UA.iOS || fm.UA.Mac) && fm.isCORS && !vars.chkdone) {
								vars.chkCnt = 60;
								vars.tm = setTimeout(chk, 5000);
							}
						});
					}
					f1.val('');
					f.path.val(opts.root).next().remove();
					f.user.val('');
					f.pass.val('');
					! opts.noOffline && f.offline.closest('tr').show();
					vars.mbtn.hide();
				} else if (data.mode == 'folders') {
					if (data.folders) {
						addFolders.call(this, fm, f.path.nextAll(':last'), data.folders);
					}
				} else {
					if (vars.oauthW) {
						vars.tm && clearTimeout(vars.tm);
						vars.oauthW.close();
						delete vars.oauthW;
						// The problem that Safari's authentication tab doesn't close only affects the first time.
						vars.chkdone = true;
					}
					if (data.expires) {
						expires = '()';
						f0.data('expires', data.expires);
					}
					f0.html(host + expires).removeClass('elfinder-spinner');
					if (data.expires) {
						f0.data('funcexpup', function() {
							var rem = Math.floor((f0.data('expires') - (+new Date()) / 1000) / 60);
							if (rem < 3) {
								f0.parent().children('.elfinder-button-icon-reload').click();
							} else {
								f0.text(f0.text().replace(/\(.*\)/, '('+fm.i18n(['minsLeft', rem])+')'));
								setTimeout(function() {
									if (f0.is(':visible')) {
										f0.data('funcexpup')();
									}
								}, 60000);
							}
						});
						f0.data('funcexpup')();
					}
					if (data.reset) {
						p.trigger('change', 'reset');
						return;
					}
					f0.parent().append($('<span class="elfinder-button-icon elfinder-button-icon-reload" title="'+fm.i18n('reAuth')+'">')
						.on('click', function() {
							f1.val('reauth');
							p.trigger('change', 'reset');
						}));
					f1.val(protocol);
					vars.mbtn.show();
					if (data.folders) {
						addFolders.call(this, fm, f.path, data.folders);
					}
					if (data.mnt2res) {
						f.mnt2res.val('1');
					}
					f.user.val('done');
					f.pass.val('done');
					f.offline.closest('tr').hide();
				}
				f0.removeData('inrequest');
			},
			fail: function(fm, err){
				$(this.inputs.host[0]).removeData('inrequest');
				this.protocol.trigger('change', 'reset');
			},
			integrateInfo: opts.integrate
		};
	},
	
	/**
	 * Find cwd's nodes from files
	 * 
	 * @param  Array    files
	 * @param  Object   opts   {firstOnly: true|false}
	 */
	findCwdNodes : function(files, opts) {
		var self    = this,
			cwd     = this.getUI('cwd'),
			cwdHash = this.cwd().hash,
			newItem = $();
		
		opts = opts || {};
		
		$.each(files, function(i, f) {
			if (f.phash === cwdHash || self.searchStatus.state > 1) {
				newItem = newItem.add(self.cwdHash2Elm(f.hash));
				if (opts.firstOnly) {
					return false;
				}
			}
		});
		
		return newItem;
	},
	
	/**
	 * Convert from relative URL to abstract URL based on current URL
	 * 
	 * @param  String  URL
	 * @return String
	 */
	convAbsUrl : function(url) {
		if (url.match(/^http/i)) {
			return url;
		}
		if (url.substr(0,2) === '//') {
			return window.location.protocol + url;
		}
		var root = window.location.protocol + '//' + window.location.host,
			reg  = /[^\/]+\/\.\.\//,
			ret;
		if (url.substr(0, 1) === '/') {
			ret = root + url;
		} else {
			ret = root + window.location.pathname.replace(/\/[^\/]+$/, '/') + url;
		}
		ret = ret.replace('/./', '/');
		while(reg.test(ret)) {
			ret = ret.replace(reg, '');
		}
		return ret;
	},
	
	/**
	 * Is same origin to current site
	 * 
	 * @param  String  check url
	 * @return Boolean
	 */
	isSameOrigin : function (checkUrl) {
		var url;
		checkUrl = this.convAbsUrl(checkUrl);
		if (location.origin && window.URL) {
			try {
				url = new URL(checkUrl);
				return location.origin === url.origin;
			} catch(e) {}
		}
		url = document.createElement('a');
		url.href = checkUrl;
		return location.protocol === url.protocol && location.host === url.host && location.port && url.port;
	},
	
	navHash2Id : function(hash) {
		return this.navPrefix + hash;
	},
	
	navId2Hash : function(id) {
		return typeof(id) == 'string' ? id.substr(this.navPrefix.length) : false;
	},
	
	cwdHash2Id : function(hash) {
		return this.cwdPrefix + hash;
	},
	
	cwdId2Hash : function(id) {
		return typeof(id) == 'string' ? id.substr(this.cwdPrefix.length) : false;
	},
	
	/**
	 * navHash to jQuery element object
	 *
	 * @param      String  hash    nav hash
	 * @return     Object  jQuery element object
	 */
	navHash2Elm : function(hash) {
		return $(document.getElementById(this.navHash2Id(hash)));
	},

	/**
	 * cwdHash to jQuery element object
	 *
	 * @param      String  hash    cwd hash
	 * @return     Object  jQuery element object
	 */
	cwdHash2Elm : function(hash) {
		return $(document.getElementById(this.cwdHash2Id(hash)));
	},

	isInWindow : function(elem, nochkHide) {
		var elm, rect;
		if (! (elm = elem.get(0))) {
			return false;
		}
		if (! nochkHide && elm.offsetParent === null) {
			return false;
		}
		rect = elm.getBoundingClientRect();
		return document.elementFromPoint(rect.left, rect.top)? true : false;
	},
	
	/**
	 * calculate elFinder node z-index
	 * 
	 * @return void
	 */
	zIndexCalc : function() {
		var self = this,
			node = this.getUI(),
			ni = node.css('z-index');
		if (ni && ni !== 'auto' && ni !== 'inherit') {
			self.zIndex = ni;
		} else {
			node.parents().each(function(i, n) {
				var z = $(n).css('z-index');
				if (z !== 'auto' && z !== 'inherit' && (z = parseInt(z))) {
					self.zIndex = z;
					return false;
				}
			});
		}
	},
	
	/**
	 * Load JavaScript files
	 * 
	 * @param  Array    urls      to load JavaScript file URLs
	 * @param  Function callback  call back function on script loaded
	 * @param  Object   opts      Additional options to $.ajax OR {loadType: 'tag'} to load by script tag
	 * @param  Object   check     { obj: (Object)ParentObject, name: (String)"Attribute name", timeout: (Integer)milliseconds }
	 * @return elFinder
	 */
	loadScript : function(urls, callback, opts, check) {
		var defOpts = {
				dataType : 'script',
				cache    : true
			},
			success, cnt, scripts = {}, results = {};
		
		opts = opts || {};
		if (opts.tryRequire && this.hasRequire) {
			require(urls, callback, opts.error);
		} else {
			success = function() {
				var cnt, fi, hasError;
				$.each(results, function(i, status) {
					if (status !== 'success' && status !== 'notmodified') {
						hasError = true;
						return false;
					}
				});
				if (!hasError) {
					if ($.isFunction(callback)) {
						if (check) {
							if (typeof check.obj[check.name] === 'undefined') {
								cnt = check.timeout? (check.timeout / 10) : 1;
								fi = setInterval(function() {
									if (--cnt < 0 || typeof check.obj[check.name] !== 'undefined') {
										clearInterval(fi);
										callback();
									}
								}, 10);
							} else {
								callback();
							}
						} else {
							callback();
						}
					}
				} else {
					if (opts.error && $.isFunction(opts.error)) {
						opts.error({ loadResults: results });
					}
				}
			};

			if (opts.loadType === 'tag') {
				$('head > script').each(function() {
					scripts[this.src] = this;
				});
				cnt = urls.length;
				$.each(urls, function(i, url) {
					var done = false,
						script;
					
					if (scripts[url]) {
						results[i] = scripts[url]._error || 'success';
						(--cnt < 1) && success();
					} else {
						script = document.createElement('script');
						script.charset = opts.charset || 'UTF-8';
						$('head').append(script);
						script.onload = script.onreadystatechange = function() {
							if ( !done && (!this.readyState ||
									this.readyState === 'loaded' || this.readyState === 'complete') ) {
								done = true;
								results[i] = 'success';
								(--cnt < 1) && success();
							}
						};
						script.onerror = function(err) {
							results[i] = script._error = (err && err.type)? err.type : 'error';
							(--cnt < 1) && success();
						};
						script.src = url;
					}
				});
			} else {
				opts = $.isPlainObject(opts)? Object.assign(defOpts, opts) : defOpts;
				cnt = 0;
				(function appendScript(d, status) {
					if (d !== void(0)) {
						results[cnt++] = status;
					}
					if (urls.length) {
						$.ajax(Object.assign({}, opts, {
							url: urls.shift(),
							success: appendScript,
							error: appendScript
						}));
					} else {
						success();
					}
				})();
			}
		}
		return this;
	},
	
	/**
	 * Load CSS files
	 * 
	 * @param  Array    to load CSS file URLs
	 * @param  Object   options
	 * @return elFinder
	 */
	loadCss : function(urls, opts) {
		var self = this,
			clName, dfds;
		if (typeof urls === 'string') {
			urls = [ urls ];
		}
		if (opts) {
			if (opts.className) {
				clName = opts.className;
			}
			if (opts.dfd && opts.dfd.promise) {
				dfds = [];
			}
		}
		$.each(urls, function(i, url) {
			var link, df;
			url = self.convAbsUrl(url).replace(/^https?:/i, '');
			if (dfds) {
				dfds[i] = $.Deferred();
			}
			if (! $('head > link[href="' + self.escape(url) + '"]').length) {
				link = document.createElement('link');
				link.type = 'text/css';
				link.rel = 'stylesheet';
				link.href = url;
				if (clName) {
					link.className = clName;
				}
				if (dfds) {
					link.onload = function() {
						dfds[i].resolve();
					};
					link.onerror = function() {
						dfds[i].reject();
					};
				}
				$('head').append(link);
			} else {
				dfds && dfds[i].resolve();
			}
		});
		if (dfds) {
			$.when.apply(null, dfds).done(function() {
				opts.dfd.resolve();
			}).fail(function() {
				opts.dfd.reject();
			});
		}
		return this;
	},
	
	/**
	 * Abortable async job performer
	 * 
	 * @param func Function
	 * @param arr  Array
	 * @param opts Object
	 * 
	 * @return Object $.Deferred that has an extended method _abort()
	 */
	asyncJob : function(func, arr, opts) {
		var dfrd = $.Deferred(),
			abortFlg = false,
			parms = Object.assign({
				interval : 0,
				numPerOnce : 1
			}, opts || {}),
			resArr = [],
			vars =[],
			curVars = [],
			exec,
			tm;
		
		dfrd._abort = function(resolve) {
			tm && clearTimeout(tm);
			vars = [];
			abortFlg = true;
			if (dfrd.state() === 'pending') {
				dfrd[resolve? 'resolve' : 'reject'](resArr);
			}
		};
		
		dfrd.fail(function() {
			dfrd._abort();
		}).always(function() {
			dfrd._abort = function() {};
		});

		if (typeof func === 'function' && Array.isArray(arr)) {
			vars = arr.concat();
			exec = function() {
				var i, len, res;
				if (abortFlg) {
					return;
				}
				curVars = vars.splice(0, parms.numPerOnce);
				len = curVars.length;
				for (i = 0; i < len; i++) {
					if (abortFlg) {
						break;
					}
					res = func(curVars[i]);
					(res !== null) && resArr.push(res);
				}
				if (abortFlg) {
					return;
				}
				if (vars.length) {
					tm = setTimeout(exec, parms.interval);
				} else {
					dfrd.resolve(resArr);
				}
			};
			if (vars.length) {
				tm = setTimeout(exec, 0);
			} else {
				dfrd.resolve(resArr);
			}
		} else {
			dfrd.reject();
		}
		return dfrd;
	},
	
	getSize : function(targets) {
		var self = this,
			reqs = [],
			tgtlen = targets.length,
			dfrd = $.Deferred().fail(function() {
				$.each(reqs, function(i, req) {
					if (req) {
						req.syncOnFail && req.syncOnFail(false);
						req.reject();
					}
				});
			}),
			getLeafRoots = function(file) {
				var targets = [];
				if (file.mime === 'directory') {
					$.each(self.leafRoots, function(hash, roots) {
						var phash;
						if (hash === file.hash) {
							targets.push.apply(targets, roots);
						} else {
							phash = (self.file(hash) || {}).phash;
							while(phash) {
								if (phash === file.hash) {
									targets.push.apply(targets, roots);
								}
								phash = (self.file(phash) || {}).phash;
							}
						}
					});
				}
				return targets;
			},
			checkPhash = function(hash) {
				var dfd = $.Deferred(),
					dir = self.file(hash),
					target = dir? dir.phash : hash;
				if (target && ! self.file(target)) {
					self.request({
						data : {
							cmd    : 'parents',
							target : target
						},
						preventFail : true
					}).done(function() {
						self.one('parentsdone', function() {
							dfd.resolve();
						});
					}).fail(function() {
						dfd.resolve();
					});
				} else {
					dfd.resolve();
				}
				return dfd;
			},
			cache = function() {
				var dfd = $.Deferred(),
					cnt = Object.keys(self.leafRoots).length;
				
				if (cnt > 0) {
					$.each(self.leafRoots, function(hash) {
						checkPhash(hash).done(function() {
							--cnt;
							if (cnt < 1) {
								dfd.resolve();
							}
						});
					});
				} else {
					dfd.resolve();
				}
				return dfd;
			};

		self.autoSync('stop');
		cache().done(function() {
			var files = [], grps = {}, dfds = [], cache = [], singles = {};
			
			$.each(targets, function() {
				files.push.apply(files, getLeafRoots(self.file(this)));
			});
			targets.push.apply(targets, files);
			
			$.each(targets, function() {
				var root = self.root(this),
					file = self.file(this);
				if (file && (file.sizeInfo || file.mime !== 'directory')) {
					cache.push($.Deferred().resolve(file.sizeInfo? file.sizeInfo : {size: file.size, dirCnt: 0, fileCnt : 1}));
				} else {
					if (! grps[root]) {
						grps[root] = [ this.toString() ];
					} else {
						grps[root].push(this.toString());
					}
				}
			});
			
			$.each(grps, function() {
				var idx = dfds.length;
				if (this.length === 1) {
					singles[idx] = this[0];
				}
				dfds.push(self.request({
					data : {cmd : 'size', targets : this},
					preventDefault : true
				}));
			});
			reqs.push.apply(reqs, dfds);
			dfds.push.apply(dfds, cache);
			
			$.when.apply($, dfds).fail(function() {
				dfrd.reject();
			}).done(function() {
				var cache = function(h, data) {
						var file;
						if (file = self.file(h)) {
							file.sizeInfo = { isCache: true };
							$.each(['size', 'dirCnt', 'fileCnt'], function() {
								file.sizeInfo[this] = data[this] || 0;
							});
							file.size = parseInt(file.sizeInfo.size);
							changed.push(file);
						}
					},
					size = 0,
					fileCnt = 0,
					dirCnt = 0,
					argLen = arguments.length,
					cnts = [],
					cntsTxt = '',
					changed = [],
					i, file, data;
				
				for (i = 0; i < argLen; i++) {
					data = arguments[i];
					file = null;
					if (!data.isCache) {
						if (singles[i] && (file = self.file(singles[i]))) {
							cache(singles[i], data);
						} else if (data.sizes && $.isPlainObject(data.sizes)) {
							$.each(data.sizes, function(h, sizeInfo) {
								cache(h, sizeInfo);
							});
						}
					}
					size += parseInt(data.size);
					if (fileCnt !== false) {
						if (typeof data.fileCnt === 'undefined') {
							fileCnt = false;
						} else {
							fileCnt += parseInt(data.fileCnt || 0);
						}
					}
					if (dirCnt !== false) {
						if (typeof data.dirCnt === 'undefined') {
							dirCnt = false;
						} else {
							dirCnt += parseInt(data.dirCnt || 0);
						}
					}
				}
				changed.length && self.change({changed: changed});
				
				if (dirCnt !== false){
					cnts.push(self.i18n('folders') + ': ' + (dirCnt - (tgtlen > 1? 0 : 1)));
				}
				if (fileCnt !== false){
					cnts.push(self.i18n('files') + ': ' + fileCnt);
				}
				if (cnts.length) {
					cntsTxt = '<br>' + cnts.join(', ');
				}
				dfrd.resolve({
					size: size,
					fileCnt: fileCnt,
					dirCnt: dirCnt,
					formated: (size >= 0 ? self.formatSize(size) : self.i18n('unknown')) + cntsTxt
				});
			});
			
			self.autoSync();
		});
		
		return dfrd;
	},

	/**
	 * Worker Object URL for Blob URL of getWorker()
	 */
	wkObjUrl : null,

	/**
	 * Gets the web worker.
	 *
	 * @param      {Object}  options  The options
	 * @return     {Worker}  The worker.
	 */
	getWorker : function(options){
		// for to make blob URL
		function woker() {
			self.onmessage = function(e) {
				var d = e.data;
				try {
					self.data = d.data;
					if (d.scripts) {
						for(var i = 0; i < d.scripts.length; i++) {
							importScripts(d.scripts[i]);
						}
					}
					self.postMessage(self.res);
				} catch (e) {
					self.postMessage({error: e.toString()});
				}
			};
		}
		// get woker
		var wk;
		try {
			if (!this.wkObjUrl) {
				this.wkObjUrl = (window.URL || window.webkitURL).createObjectURL(new Blob(
					[woker.toString().replace(/\s+/g, ' ').replace(/ *([^\w]) */g, '$1').replace(/^function\b.+?\{|\}$/g, '')],
					{ type:'text/javascript' }
				));
			}
			wk = new Worker(this.wkObjUrl, options);
		} catch(e) {
			this.debug('error', e.toString());
		}
		return wk;
	},

	/**
	 * Get worker absolute URL by filename
	 *
	 * @param      {string}  filename  The filename
	 * @return     {<type>}  The worker url.
	 */
	getWorkerUrl : function(filename) {
		return this.convAbsUrl(this.workerBaseUrl + filename);
	},

	/**
	 * Gets the theme object by settings of options.themes
	 *
	 * @param  String  themeid  The themeid
	 * @return Object  jQuery.Deferred
	 */
	getTheme : function(themeid) {
		var self = this,
			dfd = $.Deferred(),
			absUrl = function(url, base) {
				if (!base) {
					base = self.convAbsUrl(self.baseUrl);
				}
				if (Array.isArray(url)) {
					return $.map(url, function(v) {
						return absUrl(v, base);
					});
				} else {
					return url.match(/^(?:http|\/\/)/i)? url : base + url.replace(/^(?:\.\/|\/)/, '');
				}
			},
			themeObj, m;
		if (themeid && (themeObj = self.options.themes[themeid])) {
			if (typeof themeObj === 'string') {
				url = absUrl(themeObj);
				if (m = url.match(/^(.+\/)[^/]+\.json$/i)) {
					$.getJSON(url).done(function(data) {
						themeObj = data;
						themeObj.id = themeid;
						if (themeObj.cssurls) {
							themeObj.cssurls = absUrl(themeObj.cssurls, m[1]);
						}
						dfd.resolve(themeObj);
					}).fail(function() {
						dfd.reject();
					});
				} else {
					dfd.resolve({
						id: themeid,
						name: themeid,
						cssurls: [url]
					});
				}
			} else if ($.isPlainObject(themeObj) && themeObj.cssurls) {
				themeObj.id = themeid;
				themeObj.cssurls = absUrl(themeObj.cssurls);
				if (!Array.isArray(themeObj.cssurls)) {
					themeObj.cssurls = [themeObj.cssurls];
				}
				if (!themeObj.name) {
					themeObj.name = themeid;
				}
				dfd.resolve(themeObj);
			} else {
				dfd.reject();
			}
		} else {
			dfd.reject();
		}
		return dfd;
	},

	/**
	 * Change current theme
	 *
	 * @param  String  themeid  The themeid
	 * @return Object  this elFinder instance
	 */
	changeTheme : function(themeid) {
		var self = this;
		if (themeid) {
			if (self.options.themes[themeid] && (!self.theme || self.theme.id !== themeid)) {
				self.getTheme(themeid).done(function(themeObj) {
					if (themeObj.cssurls) {
						$('head>link.elfinder-theme-ext').remove();
						self.loadCss(themeObj.cssurls, {
							className: 'elfinder-theme-ext',
							dfd: $.Deferred().done(function() {
								self.theme = themeObj;
								self.trigger && self.trigger('themechange');
							})
						});
					}
				});
			} else if (themeid === 'default' && self.theme && self.theme.id !== 'default') {
				$('head>link.elfinder-theme-ext').remove();
				self.theme = null;
				self.trigger && self.trigger('themechange');
			}
		}
		return this;
	},

	/**
	 * Apply leaf root stats to target directory
	 *
	 * @param      object     dir     object of target directory
	 * @param      boolean    update  is force update
	 * 
	 * @return     boolean    dir object was chenged 
	 */
	applyLeafRootStats : function(dir, update) {
		var self = this,
			prev = update? dir : (self.file(dir.hash) || dir),
			prevTs = prev.ts,
			change = false;
		// backup original stats
		if (update || !dir._realStats) {
			dir._realStats = {
				locked: dir.locked || 0,
				dirs: dir.dirs || 0,
				ts: dir.ts
			};
		}
		// set lock
		dir.locked = 1;
		if (!prev.locked) {
			change = true;
		}
		// has leaf root to `dirs: 1`
		dir.dirs = 1;
		if (!prev.dirs) {
			change = true;
		}
		// set ts
		$.each(self.leafRoots[dir.hash], function() {
			var f = self.file(this);
			if (f && f.ts && (dir.ts || 0) < f.ts) {
				dir.ts = f.ts;
			}
		});
		if (prevTs !== dir.ts) {
			change = true;
		}

		return change;
	},

	/**
	 * To aborted XHR object
	 * 
	 * @param Object xhr
	 * @param Object opts
	 * 
	 * @return void
	 */
	abortXHR : function(xhr, o) {
		var opts = o || {};
		
		if (xhr) {
			opts.quiet && (xhr.quiet = true);
			if (opts.abort && xhr._requestId) {
				this.request({
					data: {
						cmd: 'abort',
						id: xhr._requestId
					},
					preventDefault: true
				});
			}
			xhr.abort();
			xhr = void 0;
		}
	},

	/**
	 * Sets the custom header by xhr response header with options.parrotHeaders
	 *
	 * @param Object xhr
	 * 
	 * @return void
	 */
	setCustomHeaderByXhr : function(xhr) {
		var self = this;
		if (xhr.getResponseHeader && self.parrotHeaders && self.parrotHeaders.length) {
			$.each(self.parrotHeaders, function(i, h) {
				var val = xhr.getResponseHeader(h);
				if (val) {
					self.customHeaders[h] = val;
					self.sessionStorage('core-ph:'+h, val);
				} else if (typeof val === 'string') {
					delete self.customHeaders[h];
					self.sessionStorage('core-ph:'+h, null);
				}
			});
		}
	},

	/**
	 * Determines if parrot headers.
	 *
	 * @return     {boolean}  True if parrot headers, False otherwise.
	 */
	hasParrotHeaders : function() {
		var res = false,
			phs = this.parrotHeaders;
		if (Object.keys(this.customHeaders).length) {
			for (var i = 0; i < phs.length; i++) {
				if (this.customHeaders[phs[i]]) {
					res = true;
					break;
				}
			}
		}
		return res;
	},

	/**
	 * Gets the request identifier
	 *
	 * @return  String  The request identifier.
	 */
	getRequestId : function() {
		return (+ new Date()).toString(16) + Math.floor(1000 * Math.random()).toString(16);
	},
	
	/**
	 * Flip key and value of array or object
	 * 
	 * @param  Array | Object  { a: 1, b: 1, c: 2 }
	 * @param  Mixed           Static value
	 * @return Object          { 1: "b", 2: "c" }
	 */
	arrayFlip : function (trans, val) {
		var key,
			tmpArr = {},
			isArr = $.isArray(trans);
		for (key in trans) {
			if (isArr || trans.hasOwnProperty(key)) {
				tmpArr[trans[key]] = val || key;
			}
		}
		return tmpArr;
	},
	
	/**
	 * Return array ["name without extention", "extention"]
	 * 
	 * @param String name
	 * 
	 * @return Array
	 * 
	 */
	splitFileExtention : function(name) {
		var m;
		if (m = name.match(/^(.+?)?\.((?:tar\.(?:gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(?:gz|bz2)|[a-z0-9]{1,10})$/i)) {
			if (typeof m[1] === 'undefined') {
				m[1] = '';
			}
			return [m[1], m[2]];
		} else {
			return [name, ''];
		}
	},
	
	/**
	 * Slice the ArrayBuffer by sliceSize
	 *
	 * @param      arraybuffer  arrayBuffer  The array buffer
	 * @param      Number       sliceSize    The slice size
	 * @return     Array   Array of sleced arraybuffer
	 */
	sliceArrayBuffer : function(arrayBuffer, sliceSize) {
		var segments= [],
			fi = 0;
		while(fi * sliceSize < arrayBuffer.byteLength){
			segments.push(arrayBuffer.slice(fi * sliceSize, (fi + 1) * sliceSize));
			fi++;
		}
		return segments;
	},

	arrayBufferToBase64 : function(ab) {
		if (!window.btoa) {
			return '';
		}
		var dView = new Uint8Array(ab), // Get a byte view
			arr = Array.prototype.slice.call(dView), // Create a normal array
			arr1 = arr.map(function(item) {
				return String.fromCharCode(item); // Convert
			});
	    return window.btoa(arr1.join('')); // Form a string
	},

	log : function(m) { window.console && window.console.log && window.console.log(m); return this; },
	
	debug : function(type, m) {
		var self = this,
			d = this.options.debug,
			tb = this.options.toastBackendWarn,
			tbOpts, showlog;

		if (type === 'backend-error') {
			if (! this.cwd().hash || (d && (d === 'all' || d['backend-error']))) {
				m = Array.isArray(m)? m : [ m ];
				this.error(m);
			}
		} else if (type === 'backend-warning') {
			showlog = true;
			if (tb) {
				tbOpts = $.isPlainObject(tb)? tb : {};
				$.each(Array.isArray(m)? m : [ m ], function(i, m) {
					self.toast(Object.assign({
						mode : 'warning',
						msg: m
					}, tbOpts));
				});
			}
		} else if (type === 'backend-debug') {
			this.trigger('backenddebug', m);
		}
		
		if (showlog || (d && (d === 'all' || d[type]))) {
			window.console && window.console.log && window.console.log('elfinder debug: ['+type+'] ['+this.id+']', m);
		}

		return this;
	},

	/**
	 * Parse response.debug and trigger debug
	 *
	 * @param      Object  response  The response
	 */
	responseDebug : function(response) {
		var rd = response.debug,
			d;
		if (rd) {
			// set options.debug
			d = this.options.debug;
			if (!d || d !== 'all') {
				if (!d) {
					d = this.options.debug = {};
				}
				d['backend-error'] = true;
				d['warning'] = true;
			}
			if (rd.mountErrors && (typeof rd.mountErrors === 'string' || (Array.isArray(rd.mountErrors) && rd.mountErrors.length))) {
				this.debug('backend-error', rd.mountErrors);
			}
			if (rd.backendErrors && (typeof rd.backendErrors === 'string' || (Array.isArray(rd.backendErrors) && rd.backendErrors.length))) {
				this.debug('backend-warning', rd.backendErrors);
			}
		}
	},

	time : function(l) { window.console && window.console.time && window.console.time(l); },
	timeEnd : function(l) { window.console && window.console.timeEnd && window.console.timeEnd(l); }
	

};

/**
 * for conpat ex. ie8...
 *
 * Object.keys() - JavaScript | MDN
 * https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
 */
if (!Object.keys) {
	Object.keys = (function () {
		var hasOwnProperty = Object.prototype.hasOwnProperty,
				hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
				dontEnums = [
					'toString',
					'toLocaleString',
					'valueOf',
					'hasOwnProperty',
					'isPrototypeOf',
					'propertyIsEnumerable',
					'constructor'
				],
				dontEnumsLength = dontEnums.length;

		return function (obj) {
			if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object');

			var result = [];

			for (var prop in obj) {
				if (hasOwnProperty.call(obj, prop)) result.push(prop);
			}

			if (hasDontEnumBug) {
				for (var i=0; i < dontEnumsLength; i++) {
					if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
				}
			}
			return result;
		};
	})();
}
// Array.isArray
if (!Array.isArray) {
	Array.isArray = function(arr) {
		return jQuery.isArray(arr);
	};
}
// Object.assign
if (!Object.assign) {
	Object.assign = function() {
		return jQuery.extend.apply(null, arguments);
	};
}
// String.repeat
if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		'use strict';
		if (this == null) {
			throw new TypeError('can\'t convert ' + this + ' to object');
		}
		var str = '' + this;
		count = +count;
		if (count != count) {
			count = 0;
		}
		if (count < 0) {
			throw new RangeError('repeat count must be non-negative');
		}
		if (count == Infinity) {
			throw new RangeError('repeat count must be less than infinity');
		}
		count = Math.floor(count);
		if (str.length == 0 || count == 0) {
			return '';
		}
		// Ensuring count is a 31-bit integer allows us to heavily optimize the
		// main part. But anyway, most current (August 2014) browsers can't handle
		// strings 1 << 28 chars or longer, so:
		if (str.length * count >= 1 << 28) {
			throw new RangeError('repeat count must not overflow maximum string size');
		}
		var rpt = '';
		for (var i = 0; i < count; i++) {
			rpt += str;
		}
		return rpt;
	};
}
// String.trim
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, '');
	};
}
// Array.apply
(function () {
	try {
		Array.apply(null, {});
		return;
	} catch (e) { }

	var toString = Object.prototype.toString,
		arrayType = '[object Array]',
		_apply = Function.prototype.apply,
		slice = /*@cc_on @if (@_jscript_version <= 5.8)
			function () {
				var a = [], i = this.length;
				while (i-- > 0) a[i] = this[i];
				return a;
			}@else@*/Array.prototype.slice/*@end@*/;

	Function.prototype.apply = function apply(thisArg, argArray) {
		return _apply.call(this, thisArg,
			toString.call(argArray) === arrayType ? argArray : slice.call(argArray));
	};
})();
// Array.from
if (!Array.from) {
	Array.from = function(obj) {
		return obj.length === 1 ? [obj[0]] : Array.apply(null, obj);
	};
}
// window.requestAnimationFrame and window.cancelAnimationFrame
if (!window.cancelAnimationFrame) {
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
}
