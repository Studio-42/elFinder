"use strict"
/**
 * @class  elFinder toolbar search button widget.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersearchbutton = function(cmd) {
	return this.each(function() {
		var result = false,
			button = $(this).hide().addClass('ui-widget-content elfinder-button '+cmd.fm.res('class', 'searchbtn')+''),
			search = function() {
				cmd.exec($.trim(input.val())).done(function() {
					result = true;
					input.focus();
				});
			},
			abort = function() {
				input.val('');
				if (result) {
					result = false;
					cmd.fm.trigger('searchend');
				}
			},
			input  = $('<input type="text" size="42"/>')
				.appendTo(button)
				// to avoid fm shortcuts on arrows
				.keypress(function(e) {
					e.stopPropagation();
				})
				.keydown(function(e) {
					e.stopPropagation();
					
					e.keyCode == 13 &&  search();
					
					if (e.keyCode== 27) {
						e.preventDefault();
						abort();
					}
				});
		
		$('<span class="ui-icon ui-icon-search" title="'+cmd.title+'"/>')
			.appendTo(button)
			.click(search);
		
		$('<span class="ui-icon ui-icon-close"/>')
			.appendTo(button)
			.click(abort)
		
		// wait when button will be added to DOM
		setTimeout(function() {
			button.parent().detach();
			cmd.fm.getUI('toolbar').prepend(button.show());
			// position icons for ie7
			if ($.browser.msie) {
				var icon = button.children(cmd.fm.direction == 'ltr' ? '.ui-icon-close' : '.ui-icon-search');
				icon.css({
					right : '',
					left  : parseInt(button.width())-icon.outerWidth(true)
				});
			}
		}, 200);
		
		cmd.fm
			.error(function() {
				input.unbind('keydown');
			})
			.select(function() {
				input.blur();
			})
			.bind('searchend', function() {
				input.val('');
			})
			.viewchange(abort)
			.shortcut({
				pattern     : 'ctrl+f f3',
				description : cmd.title,
				callback    : function() { input.select().focus(); }
			});

	});
}