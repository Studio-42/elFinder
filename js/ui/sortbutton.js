/**
 * @class  elFinder toolbar button menu with sort variants.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersortbutton = function(cmd) {
	"use strict";
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
			text     = $('<span class="elfinder-button-text">'+cmd.title+'</span>'),
			button   = $(this).addClass('ui-state-default elfinder-button elfinder-menubutton elfiner-button-'+name)
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-'+name+'"/>', text)
				.on('mouseenter mouseleave', function(e) { !button.hasClass(disabled) && button.toggleClass(hover, e.type === 'mouseenter'); })
				.on('click', function(e) {
					if (!button.hasClass(disabled)) {
						e.stopPropagation();
						menu.is(':hidden') && fm.getUI().click();
						menu.css(getMenuOffset()).slideToggle({
							duration: 100,
							done: function(e) {
								fm[menu.is(':visible')? 'toFront' : 'toHide'](menu);
							}
						});
					}
				}),
			hide = function() { fm.toHide(menu); },
			menu = $('<div class="ui-front ui-widget ui-widget-content elfinder-button-menu elfinder-button-sort-menu ui-corner-all"/>')
				.hide()
				.appendTo(fm.getUI())
				.on('mouseenter mouseleave', '.'+item, function(e) { $(this).toggleClass(hover, e.type === 'mouseenter'); })
				.on('click', function(e) {
					e.preventDefault();
					e.stopPropagation();
				})
				.on('close', hide),
			update = function() {
				menu.children('[rel]').removeClass(selected+' '+asc+' '+desc)
					.filter('[rel="'+fm.sortType+'"]')
					.addClass(selected+' '+(fm.sortOrder == 'asc' ? asc : desc));

				menu.children('.elfinder-sort-stick').toggleClass(selected, fm.sortStickFolders);
				menu.children('.elfinder-sort-tree').toggleClass(selected, fm.sortAlsoTreeview);
			},
			getMenuOffset = function() {
				var baseOffset = fm.getUI().offset(),
					buttonOffset = button.offset();
				return {
					top : buttonOffset.top - baseOffset.top,
					left : buttonOffset.left - baseOffset.left
				};
			},
			tm;
			
		text.hide();
		
		$.each(fm.sortRules, function(name, value) {
			menu.append($('<div class="'+item+'" rel="'+name+'"><span class="ui-icon ui-icon-arrowthick-1-n"/><span class="ui-icon ui-icon-arrowthick-1-s"/>'+fm.i18n('sort'+name)+'</div>').data('type', name));
		});
		
		menu.children().on('click', function(e) {
			cmd.exec([], $(this).removeClass(hover).attr('rel'));
		});
		
		$('<div class="'+item+' '+item+'-separated elfinder-sort-ext elfinder-sort-stick"><span class="ui-icon ui-icon-check"/>'+fm.i18n('sortFoldersFirst')+'</div>')
			.appendTo(menu)
			.on('click', function() {
				cmd.exec([], 'stick');
			});

		fm.one('init', function() {
			if (fm.ui.tree && fm.options.sortAlsoTreeview !== null) {
				$('<div class="'+item+' '+item+'-separated elfinder-sort-ext elfinder-sort-tree"><span class="ui-icon ui-icon-check"/>'+fm.i18n('sortAlsoTreeview')+'</div>')
				.appendTo(menu)
				.on('click', function() {
					cmd.exec([], 'tree');
				});
			}
		})
		.bind('disable select', hide)
		.bind('sortchange', update).getUI().on('click', hide);
		
		if (menu.children().length > 1) {
			cmd.change(function() {
					tm && cancelAnimationFrame(tm);
					tm = requestAnimationFrame(function() {
						button.toggleClass(disabled, cmd.disabled());
						update();
					});
				})
				.change();
		} else {
			button.addClass(disabled);
		}

	});
	
};
