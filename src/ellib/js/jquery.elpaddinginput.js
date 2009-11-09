/**
 * jQuery plugin. Create group of text input fields and selects for setting padding/margin. Used in elRTE
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 **/
(function($) {
	
	$.fn.elPaddingInput = function(o) {
		var self = this;
		var opts = $.extend({}, $.fn.elPaddingInput.defaults, {name : this.attr('name')}, o);
		this.regexps = {
			main   : new RegExp(opts.type == 'padding' ? 'padding\s*:\s*([^;"]+)'        : 'margin\s*:\s*([^;"]+)',       'im'),
			left   : new RegExp(opts.type == 'padding' ? 'padding-left\s*:\s*([^;"]+)'   : 'margin-left\s*:\s*([^;"]+)',  'im'),
			top    : new RegExp(opts.type == 'padding' ? 'padding-top\s*:\s*([^;"]+)'    : 'margin-top\s*:\s*([^;"]+)',    'im'),
			right  : new RegExp(opts.type == 'padding' ? 'padding-right\s*:\s*([^;"]+)'  : 'margin-right\s*:\s*([^;"]+)',  'im'),
			bottom : new RegExp(opts.type == 'padding' ? 'padding-bottom\s*:\s*([^;"]+)' : 'margin-bottom\s*:\s*([^;"]+)', 'im')
		};
			
		$.each(['left', 'top', 'right', 'bottom'], function() {
			self[this] = $('<input type="text" />')
				.attr('size', 3)
				.css('text-align', 'right')
				.bind('change', function() { $(this).val(parseNum($(this).val())); change(); })
				.attr('name', opts.name+'['+this+']');
		});
		$.each(['uleft', 'utop', 'uright', 'ubottom'], function() {
			self[this] = $('<select />')
				.append('<option value="px">px</option>')
				.append('<option value="em">em</option>')
				.append('<option value="pt">pt</option>')
				.bind('change', function() { change(); })
				.attr('name', opts.name+'['+this+']');
			if (opts.percents) {
				self[this].append('<option value="%">%</option>');
			}
		});
		
		this.empty().addClass(opts['class'])
			.append(this.left).append(this.uleft).append(' x ')
			.append(this.top).append(this.utop).append(' x ')
			.append(this.right).append(this.uright).append(' x ')
			.append(this.bottom).append(this.ubottom);
			
		this.val = function(v) {
			if (!v && v!=='') {
				var l = parseNum(this.left.val());
				var t = parseNum(this.top.val());
				var r = parseNum(this.right.val());
				var b = parseNum(this.bottom.val());
				var ret = {
					left   : l=='auto' || l==0 ? l : (l!=='' ? l+this.uleft.val()   : ''), 
					top    : t=='auto' || t==0 ? t : (t!=='' ? t+this.utop.val()    : ''),
					right  : r=='auto' || r==0 ? r : (r!=='' ? r+this.uright.val()  : ''),
					bottom : b=='auto' || b==0 ? b : (b!=='' ? b+this.ubottom.val() : ''),
					css    : ''
				};
				if (ret.left!=='' && ret.right!=='' && ret.top!=='' && ret.bottom!=='') {
					if (ret.left == ret.right && ret.top == ret.bottom) {
						ret.css = ret.top+' '+ret.left;
					} else{
						ret.css = ret.top+' '+ret.right+' '+ret.bottom+' '+ret.left;
					}
				}
				
				return ret;
			} else {
				
				if (v.nodeName || v.css) {
					if (!v.css) {
						v = $(v);
					}
					var val   = {left : '', top : '', right: '', bottom : ''};
					var style = (v.attr('style')||'').toLowerCase();

					if (style) {
						style   = $.trim(style);
						var m = style.match(this.regexps.main);
						if (m) {
							var tmp    = $.trim(m[1]).replace(/\s+/g, ' ').split(' ', 4);
							val.top    = tmp[0];
							val.right  = tmp[1] && tmp[1]!=='' ? tmp[1] : val.top;
							val.bottom = tmp[2] && tmp[2]!=='' ? tmp[2] : val.top;
							val.left   = tmp[3] && tmp[3]!=='' ? tmp[3] : val.right;
						} else {
							$.each(['left', 'top', 'right', 'bottom'], function() {
								var name = this.toString();
								m = style.match(self.regexps[name]);
								if (m) {
									val[name] = m[1];
								}
							});
						}
					}
					var v = val;
				} 

				$.each(['left', 'top', 'right', 'bottom'], function() {
					var name = this.toString();
					if (typeof(v[name]) != 'undefined' && v[name] !== null) {
						v[name] = v[name].toString();
						var _v = parseNum(v[name]);
						self[name].val(_v);
						var m = v[name].match(/(px|em|pt|%)/i);
						self['u'+name].val(m ? m[1] : 'px');
					}
				});
				return this;
			}
		}
			
		function parseNum(num) {
			num = $.trim(num.toString());
			if (num[0] == '.') { 
				num = '0'+num;
			}
			n = parseFloat(num);
			return !isNaN(n) ? n : (num == 'auto' ? num : '');
		}
			
		function change() {
			opts.change && opts.change(self);
		}
		
		this.val(opts.value);
		
		return this;
	}
	
	$.fn.elPaddingInput.defaults = {
		name     : 'el-paddinginput',
		'class'  : 'el-paddinginput',
		type     : 'padding',
		value    : {},
		percents : true,
		change   : null
	}
	
})(jQuery);
