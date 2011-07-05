
$.fn.elfinderoverlay = function(opts) {
	
	this.filter(':not(.elfinder-overlay)').each(function() {
		opts = $.extend({}, opts);
		$(this).addClass('ui-widget-overlay elfinder-overlay')
			.hide()
			.mousedown(function(e) {
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
		var o    = this.eq(0),
			cnt  = o.data('cnt') + 1,
			show = o.data('show');

		o.data('cnt', cnt);

		if (o.is(':hidden')) {
			o.zIndex(o.parent().zIndex()+1);
			o.show();
			show();
		}
	} 
	
	if (opts == 'hide') {
		var o    = this.eq(0),
			cnt  = o.data('cnt') - 1,
			hide = o.data('hide');
		
		o.data('cnt', cnt);
			
		if (cnt == 0 && o.is(':visible')) {
			o.hide();
			hide();        
		}
	}
	
	return this;
}