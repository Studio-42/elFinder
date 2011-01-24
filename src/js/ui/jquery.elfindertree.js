(function($) {
	
	$.fn.elfindertree = function(fm) {
		var
			/**
			 * slideToggle method name
			 *
			 * @type String
			 **/
			 slideToggle = $.browser.msie ? 'toggle' : 'slideToggle',
			/**
			 * slideDown method name
			 *
			 * @type String
			 **/
			slideDown = $.browser.msie ? 'show'   : 'slideDown';
		
		return this.each(function() {
			var $this = $(this)
					.delegate('a', 'hover', function() {
						$(this).toggleClass('ui-state-hover');
					})
					.delegate('a', 'click', function(e) {
						var $this = $(this),
							key   = $this.attr('key');

						e.preventDefault();

						if (key == fm.cwd.hash) {
							$this.trigger('toggle');
						} else if ($this.hasClass('elfinder-na') || $this.hasClass('elfinder-wo')) {
							fm.trigger('error', { error : 'Access denied' });
						} else {
							fm.cd(key);
						}
					})
					.delegate('a', 'toggle', function() {
						$(this).next('ul')[slideToggle]().end().children('.elfinder-nav-collapsed').toggleClass('elfinder-nav-expanded');
					})
					.delegate('.elfinder-nav-collapsed', 'click', function(e) {
						e.stopPropagation();
						e.preventDefault();
						$(this).parent().trigger('toggle');
					})
					;
			
			// set current dir visible and actve and show subdirs		
			fm.bind('cd', function(e) {
				var dir = $this.find('[key="'+e.data.cwd.hash+'"]');
				
				$this.find('.ui-state-active')
					.removeClass('ui-state-active')
					.children('.elfinder-nav-icon-folder')
					.removeClass('elfinder-nav-icon-folder-open');
				
				dir.children('.elfinder-nav-icon-folder').addClass('elfinder-nav-icon-folder-open');
				dir.addClass('ui-state-active').parents('ul:hidden').prev('a').trigger('toggle');
				dir.next('ul')[slideDown]();
				dir.children('.elfinder-nav-collapsed').addClass('elfinder-nav-expanded');
			})

			
			
		})
	}
	
})(jQuery);