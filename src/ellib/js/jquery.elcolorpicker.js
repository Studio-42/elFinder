/**
 * elColorPicker. JQuery plugin
 * Create drop-down colors palette.
 *
 * Usage:
 * $(selector).elColorPicker(opts)
 *
 * set color after init:
 * var c = $(selector).elColorPicker(opts)
 * c.val('#ffff99)
 *
 * Get selected color:
 * var color = c.val();
 *
 * Notice!
 *   Palette created only after first click on element (lazzy loading)
 *
 * Options:
 *   colors - colors array (by default display 256 web safe colors)
 *   color  - current (selected) color
 *   class - css class for display "button" (element on wich plugin was called)
 *   paletteClass - css class for colors palette
 *   palettePosition - string indicate where palette will created:
 *      'inner' - palette will attach to element (acceptable in most cases)
 *      'outer' - palette will attach to document.body. 
 *                Use, when create color picker inside element with overflow == 'hidden', for example in ui.dialog
 *   update - function wich update button view on select color (by default set selected color as background)
 *   change - callback, called when color was selected (by default write color to console.log)
 *   name   - hidden text field in wich selected color value will saved
 *
 * @author:    Dmitry Levashov (dio) dio@std42.ru
 *
 **/
(function($) {

	$.fn.elColorPicker = function(o) {
		var self     = this;
		var opts     = $.extend({}, $.fn.elColorPicker.defaults, o);
		this.hidden  = $('<input type="hidden" />').attr('name', opts.name).val(opts.color||'').appendTo(this);
		this.palette = null;
		this.preview = null;
		this.input   = null;

		function setColor(c) {
			self.val(c);
			opts.change && opts.change(self.val());
			self.palette.slideUp();
		}

		function init() {
			self.palette  = $('<div />').addClass(opts.paletteClass+' rounded-3');
			for (var i=0; i < opts.colors.length; i++) {
				$('<div />')
					.addClass('color')
					.css('background-color', opts.colors[i])
					.attr({title : opts.colors[i], unselectable : 'on'})
					.appendTo(self.palette)
					.mouseenter(function() {
						var v = $(this).attr('title');
						self.input.val(v);
						self.preview.css('background-color', v);
					})
					.click(function(e) {
						e.stopPropagation(); 
						setColor($(this).attr('title'));
					});
			};
			self.input = $('<input type="text" />')
				.addClass('rounded-3')
				.attr('size', 8)
				.click(function(e) {
					e.stopPropagation();
				})
				.keydown(function(e) {
					if (e.ctrlKey || e.metaKey) {
						return true;
					}
					var k = e.keyCode;
					// on esc - close palette
					if (k == 27) {
						return self.mouseleave();
					}
					// allow input only hex color value
					if (k!=8 && k != 13 && k!=46 && k!=37 && k != 39 && (k<48 || k>57) && (k<65 || k > 70)) {
						return false;
					}
					var c = $(this).val();
					if (c.length == 7 || c.length == 0) {
						if (k == 13) {
							e.stopPropagation();
							e.preventDefault();
							setColor(c);
							self.palette.slideUp();
						}
						if (e.keyCode != 8 && e.keyCode != 46 && k!=37 && k != 39) {
							return false;
						}
					}
				})
				.keyup(function(e) {
					var c = $(this).val(); 
					c.length == 7 && /^#[0-9abcdef]{6}$/i.test(c) && self.val(c);
				});
				
			self.preview = $('<div />')
				.addClass('preview rounded-3')
				.click(function(e) {
					e.stopPropagation();
					setColor(self.input.val());
				});
			
			self.palette
				.append($('<div />').addClass('clearfix'))
				.append($('<div />').addClass('panel').append(self.input).append(self.preview));
			
			if (opts.palettePosition == 'outer') {
				self.palette.hide()
					.appendTo(self.parents('body').eq(0))
					.mouseleave(function() {
						$(this).slideUp();
						self.val(self.val());
					})
				self.mouseleave(function(e) {
					if (e.relatedTarget != self.palette.get(0)) {
						self.palette.slideUp();
						self.val(self.val());
					}
				})
			} else {
				self.append(self.palette.hide())
					.mouseleave(function(e) {
						self.palette.slideUp();
						self.val(self.val());
					});
			}
			self.val(self.val());
		}
		
		this.empty().addClass(opts['class']+' rounded-3')
			.css({'position' : 'relative', 'background-color' : opts.color||''})
		.click(function(e) { 
			if (!self.hasClass('disabled')) {
				!self.palette && init();
				if (opts.palettePosition == 'outer' && self.palette.css('display') == 'none') {
					var o = $(this).offset();
					var w = self.palette.width();
					var l = self.parents('body').width() - o.left >= w ? o.left : o.left + $(this).outerWidth() - w;
					self.palette.css({left : l+'px', top : o.top+$(this).height()+1+'px'});
				}
				self.palette.slideToggle();
			}
		});
		
		this.val = function(v) {
			if (!v && v!=='') {
				return this.hidden.val();
			} else {
				this.hidden.val(v);
				if (opts.update) {
					opts.update(this.hidden.val());
				} else {
					this.css('background-color', v);
				}
				
				if (self.palette) {
					self.preview.css('background-color', v);
					self.input.val(v);
				}
			}
			return this;
		}
		
		return this;
	}

	$.fn.elColorPicker.defaults = {
		'class'         : 'el-colorpicker',
		paletteClass    : 'el-palette',
		palettePosition : 'inner',
		name            : 'color',
		color           : '',
		update          : null,
		change          : function(c) { window.console && window.console.log && window.console.log(c) },
		colors          : [
			'#ffffff', '#cccccc', '#999999', '#666666', '#333333', '#000000', 
			'#ffcccc', '#cc9999', '#996666', '#663333', '#330000', 
			'#ff9999', '#cc6666', '#cc3333', '#993333', '#660000', 
			'#ff6666', '#ff3333', '#ff0000', '#cc0000', '#990000',
			'#ff9966', '#ff6633', '#ff3300', '#cc3300', '#993300',
			'#ffcc99', '#cc9966', '#cc6633', '#996633', '#663300',
			'#ff9933', '#ff6600', '#ff9900', '#cc6600', '#cc9933',
			'#ffcc66', '#ffcc33', '#ffcc00', '#cc9900', '#996600',
			'#ffffcc', '#cccc99', '#999966', '#666633', '#333300',
			'#ffff99', '#cccc66', '#cccc33', '#999933', '#666600',
			'#ffff66', '#ffff33', '#ffff00', '#cccc00', '#999900',
			'#ccff66', '#ccff33', '#ccff00', '#99cc00', '#669900',
			'#ccff99', '#99cc66', '#99cc33', '#669933', '#336600',
			'#99ff33', '#99ff00', '#66ff00', '#66cc00', '#66cc33',
			'#99ff66', '#66ff33', '#33ff00', '#33cc00', '#339900',
			'#ccffcc', '#99cc99', '#669966', '#336633', '#003300',
			'#99ff99', '#66cc66', '#33cc33', '#339933', '#006600',
			'#66ff66', '#33ff33', '#00ff00', '#00cc00', '#009900',
			'#66ff99', '#33ff66', '#00ff33', '#00cc33', '#009933',			
			'#99ffcc', '#66cc99', '#33cc66', '#339966', '#006633',						
			'#33ff99', '#00ff66', '#00ff99', '#00cc66', '#33cc99',						
			'#66ffcc', '#33ffcc', '#00ffcc', '#00cc99', '#009966',						
			'#ccffff', '#99cccc', '#669999', '#336666', '#003333',						
			'#99ffff', '#66cccc', '#33cccc', '#339999', '#006666',						
			'#66cccc', '#33ffff', '#00ffff', '#00cccc', '#009999',						
			'#66ccff', '#33ccff', '#00ccff', '#0099cc', '#006699',																		
			'#99ccff', '#6699cc', '#3399cc', '#336699', '#003366',						
			'#3399ff', '#0099ff', '#0066ff', '#066ccc', '#3366cc',																		
			'#6699ff', '#3366ff', '#0033ff', '#0033cc', '#003399',						
			'#ccccff', '#9999cc', '#666699', '#333366', '#000033',																		
			'#9999ff', '#6666cc', '#3333cc', '#333399', '#000066',																		
			'#6666ff', '#3333ff', '#0000ff', '#0000cc', '#009999',																		
			'#9966ff', '#6633ff', '#3300ff', '#3300cc', '#330099',																		
			'#cc99ff', '#9966cc', '#6633cc', '#663399', '#330066',
			'#9933ff', '#6600ff', '#9900ff', '#6600cc', '#9933cc',			
			'#cc66ff', '#cc33ff', '#cc00ff', '#9900cc', '#660099',
			'#ffccff', '#cc99cc', '#996699', '#663366', '#330033',			
			'#ff99ff', '#cc66cc', '#cc33cc', '#993399', '#660066',
			'#ff66ff', '#ff33ff', '#ff00ff', '#cc00cc', '#990099',			
			'#ff66cc', '#ff33cc', '#ff00cc', '#cc0099', '#990066',
			'#ff99cc', '#cc6699', '#cc3399', '#993366', '#660033',			
			'#ff3399', '#ff0099', '#ff0066', '#cc0066', '#cc3366',
			'#ff6699', '#ff3366', '#ff0033', '#cc0033', '#990033'		
			]
	};

})(jQuery);
