
$.fn.elfinderoverlay = function(opts) {
	
	opts = $.extend({}, opts);
	
	this.each(function() {
		$(this).addClass('ui-widget-overlay elfinder-overlay')
			.hide()
			.mousedown(function(e) {
				e.preventDefault();
				e.stopPropagation();
			})
			.data('cnt', 0)
			.data('hide', opts.hide);
	});
	
	return $.extend(this, {
		show : function() {
			var o = this.eq(0)

			if (o.is(':hidden')) {
				o.zIndex(o.parent().zIndex()+1).data('cnt', o.data('cnt')+1);
				$.fn.show.apply(this, arguments);
			}
		},
		hide : function() {
			var o = this.eq(0),
				cnt = o.data('cnt'),
				hide = o.data('hide');

			if (o.is(':visible')) {
				cnt--;
				o.data('cnt', cnt > 0 ? cnt : 0);
				if (cnt < 1) {
					$.fn.hide.apply(this, arguments);
					hide && hide();
				}

			}
		}
	})
	
}