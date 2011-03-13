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
	this.super = null;
	
	/**
	 * elFinder events handlers
	 *
	 * @type  Object
	 */
	this.handlers = {};
	
	/**
	 * Shortcuts
	 *
	 * @type  Array
	 */
	this.shortcuts = [];
	
	/**
	 * Command states list
	 *
	 * @type  Object
	 */
	this.states = {
		disabled : -1,
		enabled  : 0,
		active   : 1
	};
	
	/**
	 * Current command state
	 *
	 * @type  Number
	 */
	this.state = this.states.disabled;
	
	/**
	 * True when command disabled for current root
	 *
	 * @type  Boolen
	 */
	this.lock = false;
	
	/**
	 * Ui widget name
	 *
	 * @type  String
	 */
	this.ui = 'button';
	
	/**
	 * Bind events and shortcuts
	 *
	 * @return elFinder.command
	 */
	this.init = function() {
		var self = this,
			fm = this.fm;
		
		this.listeners = [];

		fm.bind('open', function() {
			self.lock = !!$.inArray(self.name, fm.param('disabled'));
		});
		
		$.each(this.handlers, function(e, c) {
			fm.bind(e, c);
		});
		
		$.each(this.shortcuts, function(i, s) {
			fm.shortcut(s);
		});
		return this;
	}

	/**
	 * Exec command if it is not disabled
	 *
	 * @param  mixed  command value
	 * @return elFinder.command
	 */
	this.exec = function(v) { 
		return this.enabled() ? this : this._exec(v);
	}
	
	/**
	 * Return true if command enabled.
	 *
	 * @return Boolen
	 */
	this.enabled = function() {
		return !this.lock && this.state >= this.states.enabled;
	}
	
	/**
	 * Return true if command active.
	 *
	 * @return Boolen
	 */
	this.active = function() {
		return !this.lock && this.state == this.states.active;
	}
	
	/**
	 * If command enabled set command state
	 *
	 * @return elFinder.command
	 */
	this.update = function(state) {
		var old = this.state;
		if (!this.lock) {
			this.state = state;
			old != state && this.change();
		}
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
		var l = this.listeners.length;
		
		if (c === void(0) && this.enabled()) {
			while (l--) {
				this.listeners[l](this);
			}
		} else if (typeof(c) === 'function') {
			this.listeners.push(c);
		}
		return this;
	}
}

elFinder.prototype.command.back = function() {
	var self = this;
	
	this.handlers = {
		open : function() { self.update(fm.history.canBack() ? self.states.enabled : self.states.disabled); }
	}
}