
$.fn.elfinderoverlay = function(opts) {
	"use strict";
	var fm = this.parent().elfinder('instance'),
		o, cnt, show, hide;
	
	this.filter(':not(.elfinder-overlay)').each(function() {
		opts = Object.assign({}, opts);
		$(this).addClass('ui-front ui-widget-overlay elfinder-overlay')
			.hide()
			.on('mousedown', function(e) {
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
		o    = this.eq(0);
		cnt  = o.data('cnt') + 1;
		show = o.data('show');

		fm.toFront(o);
		o.data('cnt', cnt);

		if (o.is(':hidden')) {
			o.show();
			show();
		}
	} 
	
	if (opts == 'hide') {
		o    = this.eq(0);
		cnt  = o.data('cnt') - 1;
		hide = o.data('hide');
		
		o.data('cnt', cnt);
			
		if (cnt <= 0) {
			o.hide();
			hide();
		}
	}
	
	return this;
};
