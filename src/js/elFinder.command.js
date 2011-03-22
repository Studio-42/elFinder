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
	 * Command prototype object.
	 * Added by elFinder on command creation
	 *
	 * @type  elFinder.command
	 */
	this._super = null;
	
	/**
	 * elFinder events handlers
	 *
	 * @type  Object
	 */
	this._handlers = {};
	
	/**
	 * Shortcuts
	 *
	 * @type  Array
	 */
	this._shortcuts = [];
	
	/**
	 * Command states list
	 *
	 * @type  Object
	 */
	this._state = {
		disabled : -1,
		enabled  : 0,
		active   : 1
	};
	
	/**
	 * Current command state
	 *
	 * @type  Number
	 */
	this.state = this._state.disabled;
	
	/**
	 * Every root directory can disable commands on it.
	 * If this command disabled - set to false
	 *
	 * @type  Boolen
	 */
	this._enabled = false;
	
	/**
	 * If true - command can not be disabled in any case
	 *
	 * @type  Boolen
	 */
	this._required = false;
	
	/**
	 * Prepare object -
	 * bind events and shortcuts
	 *
	 * @return void
	 */
	this.setup = function(name, opts) {
		var self     = this,
			fm       = this.fm,
			handlers = {
				'focus open' : function() { self._update(); },
				blur  : function() { self._update(self._state.disabled); }
			};
		
		this.name      = name;
		this.title     = fm.i18n(this.title || this.name);
		this.options   = $.extend({ui : 'button'}, opts);
		this._listeners = [];

		!this._required && fm.bind('open', function() {
			self._enabled = $.inArray(self.name, fm.param('disabled')) === -1;
		});
		
		$.each($.extend(handlers, this._handlers), function(e, c) {
			fm.bind(e, c);
		});
		
		$.each(this._shortcuts, function(i, s) {
			fm.shortcut(s);
		});
		
		this.init();
	}

	this.init = function() { }

	/**
	 * Exec command if it is enabled and return result
	 *
	 * @param  mixed  command value
	 * @return mixed
	 */
	this.exec = function(v) { 
		if (this.enabled()) {
			return this._exec(v);
		}
	}
	
	this._exec = function() { }
	
	/**
	 * Return true if command enabled.
	 *
	 * @return Boolen
	 */
	this.enabled = function() {
		return this._getstate() >= this._state.enabled;
	}
	
	/**
	 * Return true if command active.
	 *
	 * @return Boolen
	 */
	this.active = function() {
		return this._getstate() == this._state.active;
	}
	
	/**
	 * Return current command state.
	 * Should be overloaded in most commands
	 *
	 * @return Number
	 */
	this._getstate = function() {
		return (this._enabled || this._required) ? this._state.enabled : this._state.disabled;
	}
	
	/**
	 * If command enabled set command state
	 *
	 * @return elFinder.command
	 */
	this._update = function(state, value) {
		var state    = state === void(0) ? this._getstate() : state,
			oldState = this.state,
			oldValue = this.value;
			
		// change state only if command is not disabled
		if (this._enabled || this._required) {
			this.state = state;
			this.value = value;
		}
		(oldState !== this.state || oldValue != this.value) && this.change();
		return this;
	}
	
	/**
	 * Without argument - notify listeners,
	 * With argument of type function - add new listener
	 *
	 * @param  Function  callback
	 * @return elFinder.command
	 */
	this.change = function(c) {
		var l = this._listeners.length;
		
		if (c === void(0)) {
			while (l--) {
				this._listeners[l](this);
			}
		} else if (typeof(c) === 'function') {
			this._listeners.push(c);
		}
		return this;
	}
}

