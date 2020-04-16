/**
 * @class  elFinder toolbar search button widget.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindersearchbutton = function(cmd) {
	"use strict";
	return this.each(function() {
		var result = false,
			fm     = cmd.fm,
			disabled = fm.res('class', 'disabled'),
			isopts = cmd.options.incsearch || { enable: false },
			sTypes = cmd.options.searchTypes,
			id     = function(name){return fm.namespace + fm.escape(name);},
			toolbar= fm.getUI('toolbar'),
			btnCls = fm.res('class', 'searchbtn'),
			button = $(this)
				.hide()
				.addClass('ui-widget-content elfinder-button '+btnCls)
				.on('click', function(e) {
					e.stopPropagation();
				}),
			getMenuOffset = function() {
				var fmNode = fm.getUI(),
					baseOffset = fmNode.offset(),
					buttonOffset = button.offset();
				return {
					top : buttonOffset.top - baseOffset.top,
					maxHeight : fmNode.height() - 40
				};
			},
			search = function() {
				input.data('inctm') && clearTimeout(input.data('inctm'));
				var val = $.trim(input.val()),
					from = !$('#' + id('SearchFromAll')).prop('checked'),
					mime = $('#' + id('SearchMime')).prop('checked'),
					type = '';
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
				if (typeSet) {
					type = typeSet.children('input:checked').val();
				}
				if (val) {
					input.trigger('focus');
					cmd.exec(val, from, mime, type).done(function() {
						result = true;
					}).fail(function() {
						abort();
					});
					
				} else {
					fm.trigger('searchend');
				}
			},
			abort = function() {
				input.data('inctm') && clearTimeout(input.data('inctm'));
				input.val('').trigger('blur');
				if (result || incVal) {
					result = false;
					incVal = '';
					fm.lazy(function() {
						fm.trigger('searchend');
					});
				}
			},
			incVal = '',
			input  = $('<input type="text" size="42"/>')
				.on('focus', function() {
					// close other menus
					!button.hasClass('ui-state-active') && fm.getUI().click();
					inFocus = true;
					incVal = '';
					button.addClass('ui-state-active');
					fm.trigger('uiresize');
					opts && opts.css(getMenuOffset()).slideDown(function() {
						// Care for on browser window re-active
						button.addClass('ui-state-active');
						fm.toFront(opts);
					});
				})
				.on('blur', function() {
					inFocus = false;
					if (opts) {
						if (!opts.data('infocus')) {
							opts.slideUp(function() {
								button.removeClass('ui-state-active');
								fm.trigger('uiresize');
								fm.toHide(opts);
							});
						} else {
							opts.data('infocus', false);
						}
					} else {
						button.removeClass('ui-state-active');
					}
				})
				.appendTo(button)
				// to avoid fm shortcuts on arrows
				.on('keypress', function(e) {
					e.stopPropagation();
				})
				.on('keydown', function(e) {
					e.stopPropagation();
					if (e.keyCode === $.ui.keyCode.ENTER) {
						search();
					} else if (e.keyCode === $.ui.keyCode.ESCAPE) {
						e.preventDefault();
						abort();
					}
				}),
			opts, typeSet, cwdReady, inFocus;
		
		if (isopts.enable) {
			isopts.minlen = isopts.minlen || 2;
			isopts.wait = isopts.wait || 500;
			input
				.attr('title', fm.i18n('incSearchOnly'))
				.on('compositionstart', function() {
					input.data('composing', true);
				})
				.on('compositionend', function() {
					input.removeData('composing');
					input.trigger('input'); // for IE, edge
				})
				.on('input', function() {
					if (! input.data('composing')) {
						input.data('inctm') && clearTimeout(input.data('inctm'));
						input.data('inctm', setTimeout(function() {
							var val = input.val();
							if (val.length === 0 || val.length >= isopts.minlen) {
								(incVal !== val) && fm.trigger('incsearchstart', {
									query: val,
									type: typeSet? typeSet.children('input:checked').val() : 'searchName'
								});
								incVal = val;
								if (val === '' && fm.searchStatus.state > 1 && fm.searchStatus.query) {
									input.val(fm.searchStatus.query).trigger('select');
								} 
							}
						}, isopts.wait));
					}
				});
			
			if (fm.UA.ltIE8) {
				input.on('keydown', function(e) {
						if (e.keyCode === 229) {
							input.data('imetm') && clearTimeout(input.data('imetm'));
							input.data('composing', true);
							input.data('imetm', setTimeout(function() {
								input.removeData('composing');
							}, 100));
						}
					})
					.on('keyup', function(e) {
						input.data('imetm') && clearTimeout(input.data('imetm'));
						if (input.data('composing')) {
							e.keyCode === $.ui.keyCode.ENTER && input.trigger('compositionend');
						} else {
							input.trigger('input');
						}
					});
			}
		}
		
		$('<span class="ui-icon ui-icon-search" title="'+cmd.title+'"></span>')
			.appendTo(button)
			.on('mousedown', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if (button.hasClass('ui-state-active')) {
					search();
				} else {
					input.trigger('focus');
				}
			});
		
		$('<span class="ui-icon ui-icon-close"></span>')
			.appendTo(button)
			.on('mousedown', function(e) {
				e.stopPropagation();
				e.preventDefault();
				if (input.val() === '' && !button.hasClass('ui-state-active')) {
					input.trigger('focus');
				} else {
					abort();
				}
			});
		
		// wait when button will be added to DOM
		fm.bind('toolbarload', function(){
			var parent = button.parent();
			if (parent.length) {
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
			}
		});
		
		fm
			.one('init', function() {
				fm.getUI('cwd').on('touchstart click', function() {
					inFocus && input.trigger('blur');
				});
			})
			.one('open', function() {
				opts = (fm.api < 2.1)? null : $('<div class="ui-front ui-widget ui-widget-content elfinder-button-menu elfinder-button-search-menu ui-corner-all"></div>')
					.append(
						$('<div class="buttonset"></div>')
							.append(
								$('<input id="'+id('SearchFromCwd')+'" name="serchfrom" type="radio" checked="checked"/><label for="'+id('SearchFromCwd')+'">'+fm.i18n('btnCwd')+'</label>'),
								$('<input id="'+id('SearchFromVol')+'" name="serchfrom" type="radio"/><label for="'+id('SearchFromVol')+'">'+fm.i18n('btnVolume')+'</label>'),
								$('<input id="'+id('SearchFromAll')+'" name="serchfrom" type="radio"/><label for="'+id('SearchFromAll')+'">'+fm.i18n('btnAll')+'</label>')
							),
						$('<div class="buttonset elfinder-search-type"></div>')
							.append(
								$('<input id="'+id('SearchName')+'" name="serchcol" type="radio" checked="checked" value="SearchName"/><label for="'+id('SearchName')+'">'+fm.i18n('btnFileName')+'</label>')
							)
					)
					.hide()
					.appendTo(fm.getUI());
				if (opts) {
					if (sTypes) {
						typeSet = opts.find('.elfinder-search-type');
						$.each(cmd.options.searchTypes, function(i, v) {
							typeSet.append($('<input id="'+id(i)+'" name="serchcol" type="radio" value="'+fm.escape(i)+'"/><label for="'+id(i)+'">'+fm.i18n(v.name)+'</label>'));
						});
					}
					opts.find('div.buttonset').buttonset();
					$('#'+id('SearchFromAll')).next('label').attr('title', fm.i18n('searchTarget', fm.i18n('btnAll')));
					if (sTypes) {
						$.each(sTypes, function(i, v) {
							if (v.title) {
								$('#'+id(i)).next('label').attr('title', fm.i18n(v.title));
							}
						});
					}
					opts.on('mousedown', 'div.buttonset', function(e){
							e.stopPropagation();
							opts.data('infocus', true);
						})
						.on('click', 'input', function(e) {
							e.stopPropagation();
							$.trim(input.val())? search() : input.trigger('focus');
						})
						.on('close', function() {
							input.trigger('blur');
						});
				}
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
			.bind('open', function() {
				incVal && abort();
			})
			.bind('cwdinit', function() {
				cwdReady = false;
			})
			.bind('cwdrender',function() {
				cwdReady = true;
			})
			.bind('keydownEsc', function() {
				if (incVal && incVal.substr(0, 1) === '/') {
					incVal = '';
					input.val('');
					fm.trigger('searchend');
				}
			})
			.shortcut({
				pattern     : 'ctrl+f f3',
				description : cmd.title,
				callback    : function() { 
					input.trigger('select').trigger('focus');
				}
			})
			.shortcut({
				pattern     : 'a b c d e f g h i j k l m n o p q r s t u v w x y z dig0 dig1 dig2 dig3 dig4 dig5 dig6 dig7 dig8 dig9 num0 num1 num2 num3 num4 num5 num6 num7 num8 num9',
				description : fm.i18n('firstLetterSearch'),
				callback    : function(e) { 
					if (! cwdReady) { return; }
					
					var code = e.originalEvent.keyCode,
						next = function() {
							var sel = fm.selected(),
								key = $.ui.keyCode[(!sel.length || fm.cwdHash2Elm(sel[0]).next('[id]').length)? 'RIGHT' : 'HOME'];
							$(document).trigger($.Event('keydown', { keyCode: key, ctrlKey : false, shiftKey : false, altKey : false, metaKey : false }));
						},
						val;
					if (code >= 96 && code <= 105) {
						code -= 48;
					}
					val = '/' + String.fromCharCode(code);
					if (incVal !== val) {
						input.val(val);
						incVal = val;
						fm
							.trigger('incsearchstart', { query: val })
							.one('cwdrender', next);
					} else{
						next();
					}
				}
			});

	});
};
