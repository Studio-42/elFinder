/**
 * @class elFinder.history
 * Store visited directory
 * and provide "back" and "forward" methods
 *
 * @author Dmitry (dio) Levashov
 */
elFinder.prototype.history = function(fm) {
	var 
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
	this.canForward = function() {
		return current < history.length - 1;
	}
	
	/**
	 * Go back
	 *
	 * @return void
	 */
	this.back = function() {
		if (this.canBack()) {
			ignor = true;
			fm.exec('open', history[--current])
		}
	}
	
	/**
	 * Go forward
	 *
	 * @return void
	 */
	this.forward = function() {
		if (this.canForward()) {
			ignor = true;
			fm.exec('open', history[++current]);
		}
	}
	
	
	fm.open(function(e) {
		var l = history.length,
			cwd = fm.cwd().hash;

		if (ignor) {
			return ignor = false;
		}

		current >= 0 && l > current + 1 && history.splice(current+1);

		history[history.length-1] != cwd && history.push(cwd);
		current = history.length - 1;
		
	})
	.reload(function() {
		history = [fm.cwd().hash];
		current = 0;
	});
	
}