/*** jQuery UI droppable performance tune for elFinder ***/
$.ui.ddmanager.prepareOffsets = function( t, event ) {
	
	/*** elFinder original ***/
	var isInView = function(elem) {
		var rect = elem.getBoundingClientRect();
		return document.elementFromPoint(rect.left, rect.top)? true : false;
	}
	
	var i, j,
		m = $.ui.ddmanager.droppables[ t.options.scope ] || [],
		type = event ? event.type : null, // workaround for #2317
		list = ( t.currentItem || t.element ).find( ":data(ui-droppable)" ).addBack();

	droppablesLoop: for ( i = 0; i < m.length; i++ ) {

		// No disabled and non-accepted
		if ( m[ i ].options.disabled || ( t && !m[ i ].accept.call( m[ i ].element[ 0 ], ( t.currentItem || t.element ) ) ) ) {
			continue;
		}

		// Filter out elements in the current dragged item
		for ( j = 0; j < list.length; j++ ) {
			if ( list[ j ] === m[ i ].element[ 0 ] ) {
				m[ i ].proportions().height = 0;
				continue droppablesLoop;
			}
		}

		m[ i ].visible = m[ i ].element.css( "display" ) !== "none" /** elFinder **/ && isInView(m[ i ].element[ 0 ]);
		if ( !m[ i ].visible ) {
			continue;
		}

		// Activate the droppable if used directly from draggables
		if ( type === "mousedown" ) {
			m[ i ]._activate.call( m[ i ], event );
		}

		m[ i ].offset = m[ i ].element.offset();
		m[ i ].proportions({ width: m[ i ].element[ 0 ].offsetWidth, height: m[ i ].element[ 0 ].offsetHeight });

	}
};

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
