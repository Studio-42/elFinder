"use strict";
/**
 * @class  elFinder toolbar search button widget.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersearchbutton = function(cmd) {
	return this.each(function() {
		var result = false,
			fm     = cmd.fm,
			id     = function(name){return fm.namespace + name},
			toolbar= fm.getUI('toolbar'),
			btnCls = fm.res('class', 'searchbtn'),
			button = $(this).hide().addClass('ui-widget-content elfinder-button '+btnCls),
			search = function() {
				opts && opts.slideUp();
				var val = $.trim(input.val()),
					from = !$('#' + id('SearchFromAll')).prop('checked'),
					mime = $('#' + id('SearchMime')).prop('checked');
				if (from) {
					if ($('#' + id('SearchFromVol')).prop('checked')) {
						from = fm.root(fm.cwd().hash);
					} else {
						from = fm.cwd().hash;
					}
				}
				if (mime) {
					mime = val;
					val = '.';
				}
				if (val) {
					cmd.exec(val, from, mime).done(function() {
						result = true;
						input.focus();
					}).fail(function() {
						abort();
					});
					
				} else {
					fm.trigger('searchend');
				}
			},
			abort = function() {
				opts && opts.slideUp();
				input.val('');
				if (result) {
					result = false;
					fm.trigger('searchend');
				}
			},
			input  = $('<input type="text" size="42"/>')
				.focus(function(){
					opts && opts.slideDown();
				})
				.blur(function(){
					if (opts) {
						if (!opts.data('infocus')) {
							opts.slideUp();
						} else {
							opts.data('infocus', false);
						}
					}
				})
				.appendTo(button)
				// to avoid fm shortcuts on arrows
				.keypress(function(e) {
					e.stopPropagation();
				})
				.keydown(function(e) {
					e.stopPropagation();
					
					e.keyCode == 13 && search();
					
					if (e.keyCode== 27) {
						e.preventDefault();
						abort();
					}
				}),
			opts = (fm.api < 2.1)? null : $('<div class="ui-front ui-widget ui-widget-content elfinder-button-menu ui-corner-all"/>')
				.append(
					$('<div class="buttonset"/>')
						.append(
							$('<input id="'+id('SearchFromCwd')+'" name="serchfrom" type="radio" checked="checked"/><label for="'+id('SearchFromCwd')+'">'+fm.i18n('btnCwd')+'</label>'),
							$('<input id="'+id('SearchFromVol')+'" name="serchfrom" type="radio"/><label for="'+id('SearchFromVol')+'">'+fm.i18n('btnVolume')+'</label>'),
							$('<input id="'+id('SearchFromAll')+'" name="serchfrom" type="radio"/><label for="'+id('SearchFromAll')+'">'+fm.i18n('btnAll')+'</label>')
						),
					$('<div class="buttonset"/>')
						.append(
							$('<input id="'+id('SearchName')+'" name="serchcol" type="radio" checked="checked"/><label for="'+id('SearchName')+'">'+fm.i18n('btnFileName')+'</label>'),
							$('<input id="'+id('SearchMime')+'" name="serchcol" type="radio"/><label for="'+id('SearchMime')+'">'+fm.i18n('btnMime')+'</label>')
						)
				)
				.hide()
				.css('overflow', 'hidden')
				.appendTo(button);
		
		$('<span class="ui-icon ui-icon-search" title="'+cmd.title+'"/>')
			.appendTo(button)
			.click(search);
		
		$('<span class="ui-icon ui-icon-close"/>')
			.appendTo(button)
			.click(abort);
		
		$(function(){
			if (!opts) {
				return;
			}
			opts.find('div.buttonset').buttonset();
			$('#'+id('SearchFromAll')).next('label').attr('title', fm.i18n('searchTarget', fm.i18n('btnAll')));
			$('#'+id('SearchMime')).next('label').attr('title', fm.i18n('searchMime'));
			opts.find('input')
			.on('mousedown', function(){
				opts.data('infocus', true);
			})
			.on('click', function(){
				$.trim(input.val()) && search();
			});
		});
		
		// wait when button will be added to DOM
		toolbar.on('load', function(){
			var parent = button.parent();
			if (parent.length) {
				toolbar.children('.'+btnCls).remove();
				toolbar.prepend(button.show());
				parent.remove();
				// position icons for ie7
				if (fm.UA.ltIE7) {
					var icon = button.children(fm.direction == 'ltr' ? '.ui-icon-close' : '.ui-icon-search');
					icon.css({
						right : '',
						left  : parseInt(button.width())-icon.outerWidth(true)
					});
				}
				fm.resize();
			}
		});
		
		fm
			.select(function() {
				input.blur();
			})
			.bind('searchend', function() {
				input.val('');
			})
			.bind('open parents', function() {
				var dirs    = [],
					volroot = fm.file(fm.root(fm.cwd().hash));
				
				if (volroot) {
					$.each(fm.parents(fm.cwd().hash), function(i, hash) {
						dirs.push(fm.file(hash).name);
					});
		
					$('#'+id('SearchFromCwd')).next('label').attr('title', fm.i18n('searchTarget', dirs.join(fm.option('separator'))));
					$('#'+id('SearchFromVol')).next('label').attr('title', fm.i18n('searchTarget', volroot.name));
				}
			})
			.shortcut({
				pattern     : 'ctrl+f f3',
				description : cmd.title,
				callback    : function() { input.select().focus(); }
			});

	});
};
