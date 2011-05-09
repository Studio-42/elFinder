
$.fn.elfinderdialog = function(opts, parent) {
	
	var self   = this,
		dialog = this.closest('.ui-dialog'), options;
		close  = function(e) {
			if (e.keyCode == $.ui.keyCode.ESCAPE){
				$(document).unbind('keyup');
				self.elfinderdialog('close');
			} 
		};
	
	if (dialog.length && (options = dialog[0].dialogOptions) && typeof(opts) == 'string') {
		if (opts == 'open') {
			options.modal && options.overlay.show();
			dialog.fadeIn('fast', function() {
				dialog.find('.ui-button:first').focus()//.addClass('ui-state-hover')
				dialog.find(':text:first').focus();
				options.open && options.open()
			});
		} else if (opts == 'close') {
			options.modal && options.overlay.hide();
			dialog.fadeOut('fast', function() {
				options.close && options.close();
				dialog.remove();
				
			});
		}
	}
	
	opts = $.extend({}, $.fn.elfinderdialog.defaults, opts);
	
	opts.closeOnEscape && !dialog.length && $(document).one('keyup', close);

	this.filter(':not(.ui-dialog-content)').each(function() {
		var self       = $(this).addClass('ui-dialog-content ui-widget-content'),
			buttonset  = $('<div class="ui-dialog-buttonset"/>'),
			buttonpane = $('<div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix"/>')
				.append(buttonset),
			dialog = $('<div class="ui-dialog ui-widget ui-widget-content ui-corner-all ui-draggable std42-dialog  elfinder-dialog '+opts.cssClass+'"/>')
				.hide()
				.append(self)
				.appendTo(parent)
				.draggable({ handle : '.ui-dialog-titlebar'})
				.data('modal', opts.modal)
				.zIndex($(parent).zIndex() + 10)
				.css({
					width  : opts.width,
					height : opts.height
				})
				
			;
		
		if (!opts.position) {
			opts.position = {
				top  : parseInt((parent.height() - dialog.outerHeight())/2 - 42)+'px',
				left : parseInt((parent.width() - dialog.outerWidth())/2)+'px'
			}
		}	

		dialog.css(opts.position)[0].dialogOptions = {
			modal   : opts.modal,
			overlay : dialog.parent().children('.elfinder-overlay'),
			open    : typeof(opts.open)  == 'function' ? $.proxy(opts.open, this)  : null,
			close   : typeof(opts.close) == 'function' ? $.proxy(opts.close, this) : null
		};

		dialog.prepend(
			$('<div class="ui-dialog-titlebar ui-widget-header ui-corner-all ui-helper-clearfix">'+opts.title+'</div>')
				.prepend($('<a href="#" class="ui-dialog-titlebar-close ui-corner-all"><span class="ui-icon ui-icon-closethick"/></a>')
					.click(function(e) {
						e.preventDefault();
						self.elfinderdialog('close')
					}))

		);
			
		
			
		$.each(opts.buttons, function(name, cb) {
			var button = $('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">'+name+'</span></button>')
				.click($.proxy(cb, self[0]))
				.hover(function(e) { $(this)[e.type == 'mouseenter' ? 'focus' : 'blur']() })
				.focus(function() { $(this).addClass('ui-state-hover') })
				.blur(function() { $(this).removeClass('ui-state-hover') })
				.keydown(function(e) { 
					var next;
					
					if (e.keyCode == $.ui.keyCode.ENTER) {
						$(this).click();
					}  else if (e.keyCode == $.ui.keyCode.TAB) {
						next = $(this).next('.ui-button');
						next.length ? next.focus() : $(this).parent().children('.ui-button:first').focus()
					}
				})
			buttonset.append(button);
		})
			
		buttonset.children().length && dialog.append(buttonpane);
			
		if (opts.resizable && $.fn.resizable) {
			dialog.resizable({
					
					minWidth   : opts.minWidth,
					minHeight  : opts.minHeight,
					alsoResize : this
				});
			
		} 
			
		typeof(opts.create) == 'function' && $.proxy(opts.create, this)();
			
		opts.autoOpen && self.elfinderdialog('open');

	});
	
	return this;
}

$.fn.elfinderdialog.defaults = {
	cssClass  : '',
	title     : '',
	modal     : false,
	resizable : true,
	autoOpen  : true,
	closeOnEscape : true,
	buttons   : {},
	position  : null,
	width     : 300,
	height    : 'auto',
	minWidth  : 150,
	minHeight : 110
}