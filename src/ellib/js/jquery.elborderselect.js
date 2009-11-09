/**
 * jQuery plugin. Create group of text input, elSelect and elColorPicker. 
 * Allow input border-width, border-style and border-color. Used in elRTE
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
(function($) {
	
	$.fn.elBorderSelect = function(o) {
		
		var $self = this;
		var self  = this.eq(0);
		var opts  = $.extend({}, $.fn.elBorderSelect.defaults, o);
		var width = $('<input type="text" />')
			.attr({'name' : opts.name+'[width]', size : 3}).css('text-align', 'right')
			.change(function() { $self.change(); });
		
		var color = $('<div />').css('position', 'relative')
			.elColorPicker({
				'class'         : 'el-colorpicker ui-icon ui-icon-pencil',
				name            : opts.name+'[color]', 
				palettePosition : 'outer',
				change          : function() { $self.change(); }
			});
		
		
		var style = $('<div />').elSelect({
			tpl       : '<div style="border-bottom:4px %val #000;width:100%;margin:7px 0"> </div>',
			tpls      : { '' : '%label'},
			maxHeight : opts.styleHeight || null,
			select    : function() { $self.change(); },
			src       : {
				''       : 'none',
				solid    : 'solid',
				dashed   : 'dashed',
				dotted   : 'dotted',
				'double' : 'double',
				groove   : 'groove',
				ridge    : 'ridge',
				inset    : 'inset',
				outset   : 'outset'
			}
		});
		
		self.empty()
			.addClass(opts['class'])
			.attr('name', opts.name||'')
			.append(
				$('<table />').attr('cellspacing', 0).append(
					$('<tr />')
						.append($('<td />').append(width).append(' px'))
						.append($('<td />').append(style))
						.append($('<td />').append(color))
				)
			);
		
		function rgb2hex(str) {
		    function hex(x)  {
		    	hexDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8","9", "a", "b", "c", "d", "e", "f"];
		        return !x  ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x% 16];
		    }
			var rgb = str.match(/\(([0-9]{1,3}),\s*([0-9]{1,3}),\s*([0-9]{1,3})\)/); 
			return rgb ? "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]) : '';
		}
		
		function toPixels(num) {
			var m = num.match(/([0-9]+\.?[0-9]*)\s*(px|pt|em|%)/);
			if (m) {
				num  = m[1];
				unit = m[2];
			} 
			if (num[0] == '.') {
				num = '0'+num;
			}
			num = parseFloat(num);

			if (isNaN(num)) {
				return '';
			}
			var base = parseInt($(document.body).css('font-size')) || 16;
			switch (unit) {
				case 'em': return parseInt(num*base);
				case 'pt': return parseInt(num*base/12);
				case '%' : return parseInt(num*base/100);
			}
			return num;
		}
		
		this.change = function() {
			opts.change && opts.change(this.val());
		}
		
		this.val = function(v) {
			if (!v && v !== '') {
				var w = parseInt(width.val());
				return {width : !isNaN(w) ? w+'px' : '', style : style.val(), color : color.val()};
			} else {
				var m, w, s, c, b = '';
				if (v.nodeName || v.css) {
					if (!v.css) {
						v = $(v);					
					}
					var b = v.css('border')
					if ((b = v.css('border'))) {
						w = s = c = b;
					} else {
						w = v.css('border-width');
						s = v.css('border-style');
						c = v.css('border-color');
					}

				} else {
					w = v.width||'';
					s = v.style||'';
					c = v.color||'';
				}

				width.val(toPixels(w));
				var m = s.match(/(solid|dashed|dotted|double|groove|ridge|inset|outset)/i);
				style.val(m ? m[1] : '');
				color.val(rgb2hex(c));
				return this;
			}
		}
		
		this.val(opts.value);
		return this;
	}
	
	$.fn.elBorderSelect.defaults = {
		name      : 'el-borderselect',
		'class'   : 'el-borderselect',
		value     : {},
		change    : null
	}
	
})(jQuery);
