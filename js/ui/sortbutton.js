"use strict"
/**
 * @class  elFinder toolbar button widget.
 * If command has variants - create menu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersortbutton = function(cmd) {
	return this.each(function() {
		var c        = 'class',
			fm       = cmd.fm,
			disabled = fm.res(c, 'disabled'),
			active   = fm.res(c, 'active'),
			hover    = fm.res(c, 'hover'),
			item     = 'elfinder-button-menu-item',
			selected = 'elfinder-button-menu-item-selected',
			sort     = 'elfinder-menu-item-sort-',
			menu,
			button   = $(this).addClass('ui-state-default elfinder-button elfiner-button-'+cmd.name)
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+cmd.name+'"/>')
				.hover(function(e) { !button.is('.'+disabled) && button.toggleClass(hover); })
				.click(function(e) { 
					if (!button.is('.'+disabled) && menu && cmd.variants.length > 1) {
						// close other menus
						menu.is(':hidden') && cmd.fm.getUI().click();
						e.stopPropagation();
						menu.slideToggle(100);
					}
				}),
			hideMenu = function() {
				menu.hide();
			};

		// if command has variants create menu
		if ($.isArray(cmd.variants)) {
			button.addClass('elfinder-menubutton');
			
			menu = $('<div class="ui-widget ui-widget-content elfinder-button-menu ui-corner-all"/>')
				.hide()
				.appendTo(button)
				.zIndex(10+button.zIndex())
				.delegate('.'+item, 'hover', function() { $(this).toggleClass(hover) })
				.delegate('.'+item, 'click', function(e) {
					e.preventDefault();
					e.stopPropagation();
					button.removeClass(hover);
					cmd.exec([], $(this).data('value'));
				});

			cmd.fm.bind('disable select', hideMenu).getUI().click(hideMenu);

			$.each(cmd.variants, function(i, variant) {
				menu.append($('<div class="'+item+' '+(variant[0] == cmd.value ? selected : '')+' '+sort+fm.sortDirect+'"><span class="elfinder-menu-item-sort-dir"/>'+variant[1]+'</div>').data('value', variant[0]));
			});
		}	
			
		cmd.change(function() {

			if (cmd.disabled()) {
				button.removeClass(active+' '+hover).addClass(disabled);
			} else {
				button.removeClass(disabled);
				button[cmd.active() ? 'addClass' : 'removeClass'](active);
				menu.children('.'+item).each(function() {
					var item = $(this).removeClass(sort+'asc '+sort+'desc')

					item.data('value') == cmd.value
						? item.addClass(selected+' '+sort+fm.sortDirect)
						: item.removeClass(selected);
				});
			}
		})
		.change();
	});
}
