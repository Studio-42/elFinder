/**
 * @class elFinder.history
 * Store visited directory
 * and provide "back" and "forward" methods
 *
 * @author Dmitry (dio) Levashov
 */
elFinder.prototype.history = function(fm) {
	var self    = this,
		/**
		 * Flag. Do not store current opened directory hash
		 *
		 * @type Boolean
		 */
		ignor   = false,
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
		current;
	
	/**
	 * Return true if there is previous visited directories
	 *
	 * @return Boolen
	 */
	this.canBack = function() {
		return history.length > 1 && current > 0;
	}
	
	/**
	 * Return true if can go forward
	 *
	 * @return Boolen
	 */
	this.canFwd = function() {
		return 1 + current < history.length;
	}
	
	/**
	 * Go back
	 *
	 * @return void
	 */
	this.back = function() {
		if (this.canBack()) {
			ignor = true;
			fm.open(history[--current]);
		}
	}
	
	/**
	 * Go forward
	 *
	 * @return void
	 */
	this.fwd = function() {
		if (this.canFwd()) {
			ignor = true;
			fm.open(history[++current]);
		}
	}
	
	fm
		// store opened dir in history
		.bind('open', function(e) {
			var l = history.length;

			if (ignor) {
				return ignor = false;
			}

			if (current >= 0 && l > current + 1) {
				history.splice(current+1);
			}
			history.push(fm.cwd().hash);
			current = history.length - 1;
		})
		// clear history
		.bind('reload', function() {
			history = [];
			current = void(0);
		})
		.shortcut({
			pattern     : 'ctrl+left',
			description : 'Go back',
			callback    : function() { self.back(); }
		})
		.shortcut({
			pattern     : 'ctrl+right',
			description : 'Go forward',
			callback    : function() { self.fwd(); }
		})
		;
	
}