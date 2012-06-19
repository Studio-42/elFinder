"use strict"
/**
 * @class  elFinder toolbar button widget.
 * If command has variants - create menu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersortbutton = function(cmd) {
	
	return this.each(function() {
		var fm       = cmd.fm,
			name     = cmd.name,
			c        = 'class',
			disabled = fm.res(c, 'disabled'),
			hover    = fm.res(c, 'hover'),
			item     = 'elfinder-button-menu-item',
			selected = item+'-selected',
			asc      = selected+'-asc',
			desc     = selected+'-desc',
			button   = $(this).addClass('ui-state-default elfinder-button elfinder-menubutton elfiner-button-'+name)
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+name+'"/>')
				.hover(function(e) { !button.is('.'+disabled) && button.toggleClass(hover); })
				.click(function(e) {
					if (!button.is('.'+disabled)) {
						e.stopPropagation();
						menu.is(':hidden') && cmd.fm.getUI().click();
						menu.slideToggle(100);
					}
				}),
			menu = $('<div class="ui-widget ui-widget-content elfinder-button-menu ui-corner-all"/>')
				.hide()
				.appendTo(button)
				.zIndex(12+button.zIndex())
				.delegate('.'+item, 'hover', function() { $(this).toggleClass(hover) })
				.delegate('.'+item+':not(:last)', 'click', function(e) {
					cmd.exec([], {type : $(this).attr('rel'), order : fm.sortOrder == 'asc' ? 'desc' : 'asc', stick : fm.sortStickFolders});
				})
				.delegate('.'+item+':last', 'click', function(e) {
					cmd.exec([], {type : fm.sortType, order : fm.sortOrder, stick : !fm.sortStickFolders});
				})
				.delegate('.'+item, 'click', function(e) {
					e.preventDefault();
					e.stopPropagation();
					hide();
				}),
			update = function() {
				menu.children(':not(:last)').removeClass(selected+' '+asc+' '+desc)
					.filter('[rel="'+fm.sortType+'"]')
					.addClass(selected+' '+(fm.sortOrder == 'asc' ? asc : desc));

				menu.children(':last').toggleClass(selected, fm.sortStickFolders);
			},
			hide = function() { menu.hide(); };
			
			
		$.each(fm.sortVariants, function(name, value) {
			menu.append($('<div class="'+item+'" rel="'+name+'"><span class="ui-icon ui-icon-arrowthick-1-n"/><span class="ui-icon ui-icon-arrowthick-1-s"/>'+fm.i18n('sort'+name)+'</div>').data('type', name));
		});
		
		menu.append('<div class="'+item+' '+item+'-separated"><span class="ui-icon ui-icon-check"/>'+fm.i18n('sortFoldersFirst')+'</div>');
		
		
		fm.bind('disable select', hide).getUI().click(hide);
			
		cmd
			.change(function() {
				button.toggleClass(disabled, cmd.disabled());
				update();
			})
			.change();

	});
	
}


$.fn.elfindersortbutton_ = function(cmd) {
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
				.zIndex(12+button.zIndex())
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
