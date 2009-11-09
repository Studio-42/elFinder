/**
 * jQuery plugin. Create directory tree, like Finder or Explorer directory tree
 * Used in elFinder.
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
(function($) {

	$.fn.eldirtree = function(o) {
		if (!options) {
			var options = o && o.constructor == Object
				? $.extend({}, $.fn.eldirtree.defaults, o)
				: $.fn.eldirtree.defaults;
		}

		return this.each(function() {
			var self = this;
			
			if (!this.loaded) {
				this.loaded = true;
				var root = $(this).addClass(options.cssClass)
					.find('li').prepend($('<div />')).filter(':has(ul)').children('div').addClass('el-dir-collapsed').click(function(e) {
						if ($(this).hasClass('el-dir-expanded')) {
							$(this).removeClass('el-dir-expanded').next('a').removeClass('el-dir-expanded').parent('li').children('ul').hide();
						} else {
							$(this).addClass('el-dir-expanded').next('a').addClass('el-dir-expanded').parent('li').children('ul').show();
						}
					}).end().end().end()
					.children('li').find('a').addClass('el-dir-collapsed rounded-3').end();
					
				if (root.length == 1) {
					root.children('a, div').addClass('el-dir-expanded').end().find('ul li ul').hide();
				} else {
					root.find('ul').hide();
				}

				root.find('a').bind('click cd', function(e) {
					e.stopPropagation();
					e.preventDefault();
					root.find('a').removeClass('selected');
					$(this).addClass('selected').parent().parents('li').filter(':has(ul)').children('a, div').addClass('el-dir-expanded').end().children('ul').show();
					e.type == 'click' && options.callback($(this));
				})
				root.eq(0).children('a').addClass('selected');
			}
		});
	}

	$.fn.eldirtree.defaults = {
		cssClass : 'el-dir-tree',
		callback : function() {}	
	};

})(jQuery);

