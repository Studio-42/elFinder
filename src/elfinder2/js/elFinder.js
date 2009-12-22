(function($) {

	elFinder = function(el, o) {
		var self      = this;
		this.cwd      = {};
		this.dirs     = {};
		this.cdc      = {};
		this.places   = [];
		this.buffer   = {};
		this.selected = [];
		this.history  = [];
		this.loaded   = false;
		this.locked   = false;
		
		this.options = $.extend({}, this.options, o);
		
		if (!this.options.url) {
			alert('Invalid configuration! You have to set URL option.');
			return;
		}
		
		
		
		this.view = new this.view(this, el);
		
		this.quickLook = new this.quickLook(this);
		
		this.ui = new this.ui(this)
		
		this.eventsManager = new this.eventsManager(this);
		
		this.log = function(m) {
			window.console && window.console.log && window.console.log(m)
		}
		
		/**
		 * make ajax request, show message on error, call callback on success
		 *
		 * @param  data  Object  data for ajax request
		 * @param  callback Function  
		 * @param  boolean  call callback on error?
		 * @param  Object   overrwrite some ajax options (type/async)
		 * @param  Boolean  do not lock fm before ajax?
		 */
		this.ajax = function(data, callback, force, options, dontLock) {
			!dontLock && this.lock(true);

			var opts = {
				url      : this.options.url,
				async    : true,
				type     : 'GET',
				data     : data,
				dataType : 'json',
				cache    : false,
				error    : self.view.fatal,
				success  : function(data) {
					self.lock();

					if (data.error) {
						self.view.error(data.error, data.errorData) 
						if (!force) {
							return;
						}
					}
					callback(data);
					data.debug && self.log(data.debug);
					/* tell connector to generate thumbnails */
					if (!self.locked && self.options.view == 'icons') {
						data.tmb && self.tmb();
					}
				}
			}
			if (typeof(options) == 'object') {
				opts = $.extend({}, opts, options);
			}
			
			$.ajax(opts);
		}
		
		/**
		 * Load generated thumbnails in background
		 *
		 **/
		this.tmb = function() {
			this.ajax({cmd : 'tmb', current : self.cwd.hash}, function(data) {
				if (self.options.view == 'icons' && data.images) {
					var i, el;
					for (i in data.images) {
						el = self.view.cwd.find('div[key="'+i+'"]').children('p:not(:has(span))');
						el.length && el.append($('<span/>').addClass('rnd-5').css('background', ' url("'+data.images[i]+'") 0 0 no-repeat'));
					}
				}
			}, false, null, true);
		}
		
		/**
		 * Set/get cookie value
		 *
		 * @param  String  name  cookie name
		 * @param  String  value cookie value, null to unset
		 **/
		this.cookie = function(name, value) {
			if (typeof value == 'undefined') {
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
		
		this.lock = function(l) {
			// this.locked = l||false;
			this.view.spinner((this.locked = l||false));
			this.eventsManager.lock = this.locked;
		}

		this.lockShortcuts = function(l) {
			this.eventsManager.lock = l;
		}
		/**
		 * Set file manager view (list|icons)
		 *
		 * @param  String  v  view name
		 **/
		this.setView = function(v) {
			if (v == 'list' || v == 'icons') {
				this.options.view = v;
				this.cookie('el-finder-view', v);
			}
		}
		
		this.getPlaces = function() {
			var pl = [], p = this.cookie('el-finder-places');
			if (p.length) {
				if (p.indexOf(':')!=-1) {
					pl = p.split(':');
				} else {
					pl.push(p);
				}
			}
			return pl;
		}
		
		this.addPlace = function(id) {
			var p = this.getPlaces();
			if ($.inArray(id, p) == -1) {
				p.push(id);
				this.savePlaces(p);
				return true;
			}
		}
		
		this.removePlace = function(id) {
			var p = this.getPlaces();
			if ($.inArray(id, p) != -1) {
				this.savePlaces($.map(p, function(o) { return o == id?null:o; }));
				return true;
			}
		}
		
		this.savePlaces = function(p) {
			this.cookie('el-finder-places', p.join(':'));
		}
		
		this.reload = function(data) {
			if (data.tree) {
				this.view.renderNav(data.tree);
				this.eventsManager.updateNav();
			}
			this.cwd = data.cwd;
			this.cdc = {};
			var l = data.cdc.length;
			for (var i=0; i<l ; i++) {
				this.cdc[''+data.cdc[i].hash] = data.cdc[i];
				this.cwd.size += data.cdc[i].size;
				delete data.cdc[i]; // ?????
			}
			this.updateCwd();
		}
		
		
		/**
		 * Redraw current directory and make files/folders draggable
		 *
		 */
		this.updateCwd = function() {
			this.lockShortcuts();
			this.selected = [];
			this.view.tree.find('a[key="'+this.cwd.hash+'"]').trigger('select');
			this.view.renderCwd();
			this.eventsManager.updateCwd();
		}
		
		this.updateElement = function(id, f) {
			delete this.cdc[id];
			this.cdc[f.hash] = f;
			this.view.updateElement(id, f);
			this.updateSelected();
			this.ui.update();
		}
		
		this.drop = function(e, ui, target) {
			if (ui.helper.find('[key="'+target+'"]').length) {
				return self.view.error('Unable to copy into itself!');
			}
			var ids = [];
			ui.helper.find('div:not(.noaccess):has(>label):not(:has(em[class="readonly"],em[class=""]))').each(function() {
				ids.push($(this).hide().attr('key'));
			});
		
			if (!ui.helper.find('div:has(>label):visible').length) {
				ui.helper.hide();
			}
			if (ids.length) {
				self.setBuffer(ids, e.shiftKey?0:1, target);
				if (self.buffer.files) {
					setTimeout(function() {self.ui.exec('paste'); self.buffer = {}}, 500);
				}
			} else {
				$(this).removeClass('el-finder-droppable');
			}
		}
		
		this.getSelected = function(ndx) {
			var i, s = [];
			for (i=0; i<this.selected.length; i++) {
				this.cdc[this.selected[i]] && s.push(this.cdc[this.selected[i]]);
			}
			return ndx>=0 && ndx<s.length ? s[ndx] : s;
		}
		
		this.updateSelected = function() {
			this.selected = [];
			this.view.cwd.find('(div,tr)[key]')
				.draggable('disable')
				.removeClass('ui-state-disabled')
				.filter('.ui-selected').each(function() {
					self.selected.push($(this).draggable('enable').attr('key'));
				});
			this.ui.update();
			this.view.selectedInfo();
			this.quickLook.update();
		}
		
		this.unselectAll = function() {
			self.view.cwd.find('.ui-selected').removeClass('ui-selected');
		}
		
		this.setBuffer = function(files, cut, dst) {
			this.buffer = {
				src   : this.cwd.hash,
				dst   : dst,
				files : [],
				names : [],
				cut   : cut||0
			};
			
			for (var i=0; i<files.length; i++) {
				var id = files[i], f = this.cdc[id];
				if (f && f.read && f.type != 'link') {
					this.buffer.files.push(f.hash);
					this.buffer.names.push(f.name);
				}
			}
			
			if (!this.buffer.files.length) {
				this.buffer = {};
			}
			
		}
		
		this.isValidName = function(n) {
			return self.dotFiles ? n.match(/^[^\\\/\<\>]+$/) : n.match(/^[^\.\\\/\<\>][^\\\/\<\>]*$/);
		}
		
		this.fileExists = function(n) {
			for (var i in this.cdc) {
				if (this.cdc[i].name == n) {
					return i;
				}
			}
			return false;
		}
		
		this.fileURL = function() {
			var url = '', s = this.getSelected();
			
			if (s.length == 1 && s[0].mime != 'directory' && !s['broken']) {
				if (s[0].url) {
					url = s[0].url;
				} else {
					this.ajax({
							cmd     : 'geturl', 
							current : self.cwd.hash, 
							file    : s[0].hash
						}, 
						function(data) { url = data.url||''; }, 
						true, {async : false });
				}
			}
			return url;		
		}
		
		this.uniqueName = function(n, ext) {
			n = self.i18n(n);
			var name = n, i = 0, ext = ext||'';

			if (!this.fileExists(name+ext)) {
				return name+ext;
			}

			while (i++<100) {
				if (!this.fileExists(name+i+ext)) {
					return name+i+ext;
				}
			}
			return name.replace('100', '')+Math.random()+ext;
		}
		
		this.checkSelectedPos = function(last) {
			if (self.selected.length) {
				var s = self.view.cwd.find('.ui-selected:'+(last ? 'last' : 'first')).eq(0),
					p = s.position(),
					h = s.outerHeight(),
					ph = self.view.cwd.height();
				if (p.top < 0) {
					self.view.cwd.scrollTop(p.top+self.view.cwd.scrollTop()-2);
				} else if (ph - p.top < h) {
					self.view.cwd.scrollTop(p.top+h-ph+self.view.cwd.scrollTop());
				}
			}
		}
		
		if (!this.loaded) {
			
			/* load view from cookie */
			this.setView(this.cookie('el-finder-view'));

			this.loaded = true;
			this.id = $(el).attr('id')||Math.random();
			// this.log(this.id)
			this.ajax({}, function(data) {
				self.eventsManager.init();
				self.dotFiles = data.dotFiles;
				self.reload(data)
				self.ui.init(data.disabled);
			});
			
		}
		
		
		
		this.open = function() {}
		
		this.close = function() {}
	}
	
	elFinder.prototype.i18n = function(m) {
		return this.options.i18n[this.options.lang] && this.options.i18n[this.options.lang][m] ? this.options.i18n[this.options.lang][m] :  m;
	}
	
	elFinder.prototype.options = {
		url            : '',
		lang           : 'en',
		cssClass       : '',
		wrap           : 14,
		places         : 'Places',
		placesFirst    : true,
		editorCallback : null,
		i18n           : {},
		view           : 'icons',
		cookie         : {
			expires : 30,
			domain  : '',
			path    : '/',
			secure  : false
		},
		toolbar        : [
			['back', 'reload'],
			['select', 'open'],
			['mkdir', 'mkfile', 'upload'],
			['copy', 'paste', 'rm'],
			['rename', 'edit'],
			['info', 'help'],
			['icons', 'list'],
			['help']
		]
		
	}

	
	$.fn.elfinder = function(o) {
		
		return this.each(function() {
			
			
			if (!this.elfinder) {
				this.elfinder = new elFinder(this, o||{})
			}
			
			// log(this.elfinder)
		})
	}
	
})(jQuery);