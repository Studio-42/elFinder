/**
 * @class  elFinder toolbar button widget.
 * If command has variants - create menu
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderbutton = function(cmd) {
	"use strict";
	return this.each(function() {
		
		var c        = 'class',
			fm       = cmd.fm,
			disabled = fm.res(c, 'disabled'),
			active   = fm.res(c, 'active'),
			hover    = fm.res(c, 'hover'),
			item     = 'elfinder-button-menu-item',
			selected = 'elfinder-button-menu-item-selected',
			menu,
			text     = $('<span class="elfinder-button-text">'+cmd.title+'</span>'),
			prvCname = cmd.className? cmd.className : cmd.name,
			button   = $(this).addClass('ui-state-default elfinder-button')
				.attr('title', cmd.title)
				.append('<span class="elfinder-button-icon elfinder-button-icon-' + prvCname + '"/>', text)
				.on('mouseenter mouseleave', function(e) { !button.hasClass(disabled) && button[e.type == 'mouseleave' ? 'removeClass' : 'addClass'](hover);})
				.on('click', function(e) { 
					if (!button.hasClass(disabled)) {
						if (menu && cmd.variants.length >= 1) {
							// close other menus
							menu.is(':hidden') && fm.getUI().click();
							e.stopPropagation();
							menu.css(getMenuOffset()).slideToggle({
								duration: 100,
								done: function(e) {
									fm[menu.is(':visible')? 'toFront' : 'toHide'](menu);
								}
							});
						} else {
							fm.exec(cmd.name, getSelected(), {_userAction: true, _currentType: 'toolbar', _currentNode: button });
						}
						
					}
				}),
			hideMenu = function() {
				fm.toHide(menu);
			},
			getMenuOffset = function() {
				var fmNode = fm.getUI(),
					baseOffset = fmNode.offset(),
					buttonOffset = button.offset();
				return {
					top : buttonOffset.top - baseOffset.top,
					left : buttonOffset.left - baseOffset.left,
					maxHeight : fmNode.height() - 40
				};
			},
			getSelected = function() {
				var sel = fm.selected(),
					cwd;
				if (!sel.length) {
					if (cwd = fm.cwd()) {
						sel = [ fm.cwd().hash ];
					} else {
						sel = void(0);
					}
				}
				return sel;
			},
			tm;
			
		text.hide();
		
		// set self button object to cmd object
		cmd.button = button;
		
		// if command has variants create menu
		if (Array.isArray(cmd.variants)) {
			button.addClass('elfinder-menubutton');
			
			menu = $('<div class="ui-front ui-widget ui-widget-content elfinder-button-menu elfinder-button-' + prvCname + '-menu ui-corner-all"/>')
				.hide()
				.appendTo(fm.getUI())
				.on('mouseenter mouseleave', '.'+item, function() { $(this).toggleClass(hover); })
				.on('click', '.'+item, function(e) {
					var opts = $(this).data('value');
					e.preventDefault();
					e.stopPropagation();
					button.removeClass(hover);
					fm.toHide(menu);
					if (typeof opts === 'undefined') {
						opts = {};
					}
					if (typeof opts === 'object') {
						opts._userAction = true;
					}
					fm.exec(cmd.name, getSelected(), opts);
				})
				.on('close', hideMenu);

			fm.bind('disable select', hideMenu).getUI().on('click', hideMenu);
			
			cmd.change(function() {
				menu.html('');
				$.each(cmd.variants, function(i, variant) {
					menu.append($('<div class="'+item+'">'+variant[1]+'</div>').data('value', variant[0]).addClass(variant[0] == cmd.value ? selected : ''));
				});
			});
		}	
			
		cmd.change(function() {
			var cName;
			tm && cancelAnimationFrame(tm);
			tm = requestAnimationFrame(function() {
				if (cmd.disabled()) {
					button.removeClass(active+' '+hover).addClass(disabled);
				} else {
					button.removeClass(disabled);
					button[cmd.active() ? 'addClass' : 'removeClass'](active);
				}
				if (cmd.syncTitleOnChange) {
					cName = cmd.className? cmd.className : cmd.name;
					if (prvCname !== cName) {
						button.children('.elfinder-button-icon').removeClass('elfinder-button-icon-' + prvCname).addClass('elfinder-button-icon-' + cName);
						if (menu) {
							menu.removeClass('elfinder-button-' + prvCname + '-menu').addClass('elfinder-button-' + cName + '-menu');
						}
						prvCname = cName;
					}
					text.html(cmd.title);
					button.attr('title', cmd.title);
				}
			});
		})
		.change();
	});
};
