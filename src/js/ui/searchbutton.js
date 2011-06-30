"use strict"
/**
 * @class  elFinder toolbar search button widget.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersearchbutton = function(cmd) {
	return this.each(function() {
		var active = false,
			button = $(this).hide().addClass('ui-widget-content elfinder-button '+cmd.fm.res('class', 'searchbtn')+''),
			input  = $('<input type="text" size="42"/>')
				.appendTo(button)
				.bind('keydown keypress', function(e) {
					var val;
					
					e.stopPropagation();

					e.type == 'keydown' && e.keyCode == 13 && (val = $.trim(input.val())) && cmd.exec(val).done(function() { active = true; input.focus(); });
				})
				.keyup(function(e) {
					e.keyCode == 27 && input.val('');
					active && cmd.fm.trigger('searchend') && (active = false);
				});
		
		$('<span class="ui-icon ui-icon-search" title="'+cmd.title+'"/>')
			.appendTo(button)
			.click(function() { input.trigger($.Event('keydown', {keyCode : 13})).focus(); });
		
		$('<span class="ui-icon ui-icon-close"/>')
			.appendTo(button)
			.click(function() { input.trigger($.Event('keyup', {keyCode : 27})); })
		
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
		
		// register shortcut
		cmd.fm
			.select(function() {
				input.blur();
			})
			.searchend(function() {
				input.val('');
			})
			.shortcut({
				pattern     : 'ctrl+f f3',
				description : cmd.title,
				callback    : function() { input.select().focus(); }
			});

	});
}