(function($) {
	
	elFinder = function(el, o) {
		var self = this,
			$el = $(el);
		
		this.version = '1.2 beta';
		
		this.options = $.extend({}, this.options, o||{});
		if (!this.options.url) {
			alert('Invalid configuration! You have to set URL option.');
			return;
		}
		
		this.params = { dotFiles : false, arc : '', uplMaxSize : '' };
		
		this.id = (function() {
			var id = $el.attr('id');
			return id || 'elfinder-' + Math.round(Math.random()*1000000);
		})();
		
		
		
		this.lang = this.i18[this.options.lang] ? this.options.lang : 'en';
		
		this.dir = this.i18[this.lang].dir;
		
		this.messages = this.i18[this.lang].messages;
		
		this.cwd      = {};
		this.cdc      = {};
		this.selected = [];
		this.history  = [];
		
		this.locks = { 
			ui        : true, 
			shortcuts : true 
		};
		
		this.cookies = {
			view   : 'el-finder-view-'+this.id,
			places : 'el-finder-places-'+this.id,
			last   : 'el-finder-last-'+this.id
		};
		
		this.viewType = (function() {
			var v = self.cookie(self.cookies.view);
			return /^view|list$/i.test(v) ? v : 'icons';
		})();
		
		this.listeners = {
			load   : [],
			focus  : [],
			blur   : [],
			reload : [],
			select : [],
			error  : [],
			lock   : []
		};
		
		
		/**
		 * Create/normalize event - add event.data object if not exists and
		 * event.data.id - document id on wich event is fired
		 * event.data.elrte - current editor instance
		 * 
		 * @return jQuery.Event
		 */
		this.event = function(e, data) {
			if (!e.type) {
				e = $.Event(e.toLowerCase());
			}
			e.data = $.extend(e.data, data, { elfinder : this });
			return e;
		}
		
		this.bind = function(e, c) {
			if (typeof(c) == 'function') {
				$.each(e.split(/\s+/), function(i, e) {
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
		 * @param  Event|String  event or event type
		 * @param  Object        extra parameters
		 * @return elRTE
		 */
		this.trigger = function(e, d) {
			var e = this.event(e, d),
				l = this.listeners[e.type]||[], i;

			for (i = 0; i < l.length; i++) {
				if (e.isPropagationStopped()) {
					break;
				}
				try {
					l[i](e);
				} catch (ex) {
					
				}
			}
			return this;
		}
		
		this.ajax = function(data, success, error, opts) {
			
		}
		
		this.lock = function(o) {
			if (o === void(0)) {
				return this.locks;
			}
			$.extend(this.locks, o);
			this.trigger('lock')
		}
	
		this.get = function(key) {
			
		}
	
		this.last = function(key) {
			
		}
		
		this.resize = function(w, h) {
			
		}
		
		this.select = function(key) {
			
		}
		
		this.view = new this.view(this, $el);
		// this.log(this.dir)
	}
	
	elFinder.prototype.log = function(m) {
		window.console && window.console.log && window.console.log(m);
	}
	
	elFinder.prototype.cookie = function(name, value) {
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
	
})(jQuery);