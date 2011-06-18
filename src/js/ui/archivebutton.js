$.fn.elfinderarchivebutton = function(cmd) {
	return this.each(function() {
		var fm     = cmd.fm,
			active = 'ui-state-active',
			item   = 'elfinder-button-menu-item',
			speed  = 100,
			button = $(this).addClass('elfinder-menubutton').elfinderbutton(cmd),
			menu   = $('<div class="ui-widget ui-widget-content elfinder-button-menu ui-corner-all">menu</div>')
				.hide()
				.appendTo(button)
				.zIndex(10+button.zIndex())
				.delegate('.'+item, 'click', function(e) {
					e.preventDefault();
					cmd.exec(fm.selected(), $(this).data('mime'));
				})
				.delegate('.'+item, 'hover', function() {
					$(this).toggleClass('ui-state-hover')
				})
				,
			hide = function() {
				menu.slideUp(speed, function() { menu.html('') });
				button.removeClass(active);
			};
		
		
		fm.bind('disable select', hide).getUI().click(hide);
		
		this._click = function(e) {
			var cnt = cmd.mimes.length;

			if (cnt == 1) {
				return cmd.exec(cmd.fm.selected(), cmd.mimes[0])
			} else if (cnt) {
				e.stopPropagation();
				if (menu.is(':visible')) {
					hide();
					
				} else {
					$.each(cmd.mimes, function(i, mime) {
						menu.append($('<div class="'+item+'">'+fm.i18n('Create')+' '+fm.mime2kind({mime : mime})+'</div>').data('mime', mime));
					});
					menu.children(':first').addClass('ui-corner-top');
					menu.children(':last').addClass('ui-corner-bottom');
					menu.slideDown(speed);
					button.addClass(active);
				}
			}
		}
		
	});
	
}