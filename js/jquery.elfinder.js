/*** jQuery UI droppable performance tune for elFinder ***/
(function(){
var origin = $.ui.ddmanager.prepareOffsets;
$.ui.ddmanager.prepareOffsets = function( t, event ) {
	var isOutView = function(elem) {
		if (elem.is(':hidden')) {
			return true;
		}
		var rect = elem[0].getBoundingClientRect();
		return document.elementFromPoint(rect.left, rect.top)? false : true;
	}
	
	var i, d,
	m = $.ui.ddmanager.droppables[ t.options.scope ] || [],
	l = m.length;
	for ( i = 0; i < l; i++ ) {
		d = m[ i ];
		if (d.options.autoDisable) {
			d.options.disabled = isOutView(d.element);
		}
	}
	
	// call origin function
	return origin( t, event );
};
})();

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
