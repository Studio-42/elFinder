/**
 * elSelect JQuery plugin
 * Replacement for select input
 * Allow to put any html and css decoration in drop-down list
 *
 * Usage:
 *   $(selector).elSelect(opts)
 *
 * set value after init:
 *   var c = $(selector).elSelect(opts)
 *   c.val('some value')
 *
 * Get selected value:
 *   var val = c.val();
 *
 * Notice!
 *   1. When called on multiply elements, elSelect create drop-down list only for fist element
 *   2. Elements list created only after first click on element (lazzy loading)
 *
 * Options:
 *   src       - object with pairs value:label to create drop-down list 
 *   value     - current (selected) value
 *   class     - css class for display "button" (element on wich plugin was called)
 *   listClass - css class for drop down elements list
 *   select    - callback, called when value was selected (by default write value to console.log)
 *   name      - hidden text field in wich selected value will saved
 *   maxHeight - elements list max height (if height greater - scroll will appear)
 *   tpl       - template for element in list (contains 2 vars: %var - for src key, %label - for src[val] )
 *   labelTpl  - template for label (current selected element) (contains 2 placeholders: %var - for src key, %label - for src[val] )
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
(function($) {
	
	$.fn.elSelect = function(o) {
		var $self    = this;
		var self     = this.eq(0);
		var opts     = $.extend({}, $.fn.elSelect.defaults, o);
		var hidden   = $('<input type="hidden" />').attr('name', opts.name);
		var label    = $('<label />').attr({unselectable : 'on'}).addClass('rounded-left-3');
		var list     = null;
		var ieWidth  = null;

		if (self.get(0).nodeName == 'SELECT') {
			opts.src = {};
			self.children('option').each(function() {
				opts.src[$(this).val()] = $(this).text();
			});
			opts.value = self.val();
			opts.name  = self.attr('name');
			self.replaceWith((self = $('<div />')));
		}
		
		if (!opts.value || !opts.src[opts.val]) {
			opts.value = null;
			var i = 0;
			for (var v in opts.src) {
				if (i++ == 0) {
					opts.value = v;
				}
			}
		}

		this.val = function(v) {
			if (!v && v!=='') {
				return hidden.val();
			} else {
				if (opts.src[v]) {
					hidden.val(v);
					updateLabel(v);
					if (list) {
						list.children().each(function() {
							if ($(this).attr('name') == v) {
								$(this).addClass('active');
							} else {
								$(this).removeClass('active');
							}
						});
					}
				}
				return this;
			}
		}
	
		// update label content
		function updateLabel(v) {
			var tpl = opts.labelTpl || opts.tpls[v] || opts.tpl;
			label.html(tpl.replace(/%val/g, v).replace(/%label/, opts.src[v])).children().attr({unselectable : 'on'});
		}
		
		// init "select"
		self.empty()
			.addClass(opts['class']+' rounded-3')
			.attr({unselectable : 'on'})
			.append(hidden)
			.append(label)
			.hover(
				function() { $(this).addClass('hover') },
				function() { $(this).removeClass('hover') }
			)
			.click(function(e) {
				!list && init();
				list.slideToggle();
				// stupid ie inherit width from parent
				if ($.browser.msie && !ieWidth) { 
					list.children().each(function() {
						ieWidth = Math.max(ieWidth, $(this).width());
					});
					if (ieWidth > list.width()) {
						list.width(ieWidth+40);
					}
				}
			});
			
		this.val(opts.value);
	
		// create drop-down list
		function init() {
			// not ul because of ie is stupid with mouseleave in it :(
			list = $('<div />')
				.addClass(opts.listClass+' rounded-3')
				.hide()
				.appendTo(self.mouseleave(function(e) { list.slideUp(); }));

			for (var v in opts.src) {
				var tpl = opts.tpls[v] || opts.tpl; 
				$('<div />')
					.attr('name', v)
					.append( $(tpl.replace(/%val/g, v).replace(/%label/g, opts.src[v])).attr({unselectable : 'on'}) )
					.appendTo(list)
					.hover(
						function() { $(this).addClass('hover') },
						function() { $(this).removeClass('hover') }
					)
					.click(function(e) {
						e.stopPropagation();
						e.preventDefault();
						
						var v = $(this).attr('name');
						$self.val(v);
						opts.select(v);
						list.slideUp();
					});
			};
			
			var w = self.outerWidth();
			if (list.width() < w) {
				list.width(w);
			}
			
			var h = list.height();
			if (opts.maxHeight>0 && h>opts.maxHeight) {
				list.height(opts.maxHeight);
			}
			
			$self.val(hidden.val());
		}
		
		return this;
	}
	
	$.fn.elSelect.defaults = {
		name      : 'el-select',
		'class'   : 'el-select',
		listClass : 'list',
		labelTpl  : null,
		tpl       : '<%val>%label</%val>',
		tpls      : {},
		value     : null,
		src       : {},
		select    : function(v) {  window.console &&  window.console.log && window.console.log('selected: '+v); },
		maxHeight : 310
	}
	
})(jQuery);
