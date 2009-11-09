/**
 * jQuery plugin. Context menu
 *
 * Usage:
 * var opts = {
 *	'.dir-r' : [
 *		{label : '<span class="icon icon-open"></span> Open',     action : function(o) { window.console.log(o); } },
 *		{},
 *		{label : '<span class="icon icon-rename"></span> Rename', action : function(o) { window.console.log(o); } },
 *		{},
 *		{label : '<span class="icon icon-remove"></span> Remove', action : function(o) { window.console.log(o); } }
 *	]
 * }
 * $('#selector').elcontextmenu(opts);
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
(function($) {
	
	var selectors = {};
	var menu = document.createElement('div');
	/**
	 * Bind function showmenu on right click 
	 *
	 * @param   Object - context menu options. Object.
	 * @context DOMElement - context for menu. if not set, document.body used
	 * @callback Function  - callback for menu click
	 **/
	$.elcontextmenu = function(options, context, callback) {
		context = context||document.body;
		$(menu).hide().addClass('el-contextmenu rounded-5').appendTo(document.body);
		for (name in options) {
			selectors[name] = options[name];
			$(name, context).bind(window.opera?'click':'contextmenu', showmenu);
		}
		menu.callback = callback;
	};
	
	function showmenu(event) {
		event.stopPropagation();
		reset();
		if (window.opera && !event.ctrlKey) { 
			return;  
		} else {
	      $(document.body).mousedown(function(event){ reset(); });
	    }
		for (name in selectors) {
			if ($.inArray(event.currentTarget, $(name)) > -1) {
				if (menu.callback) {
					menu.callback(event);
				}
				variants = selectors[name]
				$(variants).each( function() {
					if (!this.label) {
						$('<div />').addClass('delim').appendTo(menu);
					} else {
						var action = this.action
						$('<div></div>').html(this.label).mousedown(function(clickEvent) { 
							clickEvent.stopPropagation();
							reset();
							if (typeof(action) == 'function') {
								action(event.currentTarget);
							}
						})
						.hover( 
							function() { $(this).addClass('el-contextmenu-hover'); },
							function() { $(this).removeClass('el-contextmenu-hover'); }
						)
						.appendTo(menu);
					}
				})
			}
		}
		
		var size = {
	      'height' : $(window).height(),
	      'width'  : $(window).width(),
	      'sT'     : $(window).scrollTop(),
	      'cW'     : $(menu).width(),
	      'cH'     : $(menu).height()
	    };
		$(menu).css({
				'left' : ((event.clientX + size.cW) > size.width ? ( event.clientX - size.cW) : event.clientX),
				'top'  : ((event.clientY + size.cH) > size.height && event.clientY > size.cH ? (event.clientY + size.sT - size.cH) : event.clientY + size.sT)
			}).show();
	    return false;
	}
	
	function reset(event){ $(menu).hide().empty(); }
	
})(jQuery);
