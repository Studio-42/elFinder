/**
 * @class  elFinder command "preference"
 * "Preference" dialog
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.preference = function() {
	var self    = this,
		fm      = this.fm,
		r       = 'replace',
		tab     = '<li class="' + fm.res('class', 'tabstab') + ' elfinder-preference-tab-{id}"><a href="#'+fm.namespace+'-preference-{id}" id="'+fm.namespace+'-preference-tab-{id}" class="ui-tabs-anchor {class}">{title}</a></li>',
		base    = $('<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-preference">'), 
		ul      = $('<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-top">'),
		tabs    = $('<div class="elfinder-preference-tabs ui-tabs-panel ui-widget-content ui-corner-bottom"></div>'),
		sep     = '<div class="elfinder-preference-separator"></div>',
		selfUrl = $('base').length? document.location.href.replace(/#.*$/, '') : '',
		selectTab = function(tab) {
			$('#'+fm.namespace+'-preference-tab-'+tab).trigger('mouseover').trigger('click');
			openTab = tab;
		},
		clTabActive = fm.res('class', 'tabsactive'),
		build   = function() {
			var cats = self.options.categories || {
					'language' : ['language'],
					'theme' : ['theme'],
					'toolbar' : ['toolbarPref'],
					'workspace' : ['iconSize','columnPref', 'selectAction', 'makefileTypes', 'useStoredEditor', 'editorMaximized', 'useFullscreen', 'showHidden'],
					'dialog' : ['autoFocusDialog'],
					'selectionInfo' : ['infoItems', 'hashChecker'],
					'reset' : ['clearBrowserData'],
					'all' : true
				},
				forms = self.options.prefs || ['language', 'theme', 'toolbarPref', 'iconSize', 'columnPref', 'selectAction', 'makefileTypes', 'useStoredEditor', 'editorMaximized', 'useFullscreen', 'showHidden', 'infoItems', 'hashChecker', 'autoFocusDialog', 'clearBrowserData'];
			
			if (!fm.cookieEnabled) {
				delete cats.language;
			}

			forms = fm.arrayFlip(forms, true);
			
			if (fm.options.getFileCallback) {
				delete forms.selectAction;
			}
			if (!fm.UA.Fullscreen) {
				delete forms.useFullscreen;
			}

			forms.language && (forms.language = (function() {
				var langSel = $('<select></select>').on('change', function() {
						var lang = $(this).val();
						fm.storage('lang', lang);
						$('#'+fm.id).elfinder('reload');
					}),
					optTags = [],
					langs = self.options.langs || {
						ar: 'العربية',
						bg: 'Български',
						ca: 'Català',
						cs: 'Čeština',
						da: 'Dansk',
						de: 'Deutsch',
						el: 'Ελληνικά',
						en: 'English',
						es: 'Español',
						fa: 'فارسی',
						fo: 'Føroyskt',
						fr: 'Français',
						fr_CA: 'Français (Canada)',
						he: 'עברית',
						hr: 'Hrvatski',
						hu: 'Magyar',
						id: 'Bahasa Indonesia',
						it: 'Italiano',
						ja: '日本語',
						ko: '한국어',
						nl: 'Nederlands',
						no: 'Norsk',
						pl: 'Polski',
						pt_BR: 'Português',
						ro: 'Română',
						ru: 'Pусский',
						si: 'සිංහල',
						sk: 'Slovenčina',
						sl: 'Slovenščina',
						sr: 'Srpski',
						sv: 'Svenska',
						tr: 'Türkçe',
						ug_CN: 'ئۇيغۇرچە',
						uk: 'Український',
						vi: 'Tiếng Việt',
						zh_CN: '简体中文',
						zh_TW: '正體中文'
					};
				if (!fm.cookieEnabled) {
					return $();
				}
				$.each(langs, function(lang, name) {
					optTags.push('<option value="'+lang+'">'+name+'</option>');
				});
				return langSel.append(optTags.join('')).val(fm.lang);
			})());
			
			forms.theme && (forms.theme = (function() {
				var cnt = fm.options.themes? Object.keys(fm.options.themes).length : 0;
				if (cnt === 0 || (cnt === 1 && fm.options.themes.default)) {
					return null;
				}
				var themeSel = $('<select></select>').on('change', function() {
						var theme = $(this).val();
						fm.changeTheme(theme).storage('theme', theme);
					}),
					optTags = [],
					tpl = {
						image: '<img class="elfinder-preference-theme elfinder-preference-theme-image" src="$2" />',
						link: '<a href="$1" target="_blank" title="$3">$2</a>',
						data: '<dt>$1</dt><dd><span class="elfinder-preference-theme elfinder-preference-theme-$0">$2</span></dd>'
					},
					items = ['image', 'description', 'author', 'email', 'license'],
					render = function(key, data) {
					},
					defBtn = $('<button class="ui-button ui-corner-all ui-widget elfinder-preference-theme-default"></button>').text(fm.i18n('default')).on('click', function(e) {
						themeSel.val('default').trigger('change');
					}),
					list = $('<div class="elfinder-reference-hide-taball"></div>').on('click', 'button', function() {
							var val = $(this).data('themeid');
							themeSel.val(val).trigger('change');
					});

				if (!fm.options.themes.default) {
					themeSel.append('<option value="default">'+fm.i18n('default')+'</option>');
				}
				$.each(fm.options.themes, function(id, val) {
					var opt = $('<option class="elfinder-theme-option-'+id+'" value="'+id+'">'+fm.i18n(id)+'</option>'),
						dsc = $('<fieldset class="ui-widget ui-widget-content ui-corner-all elfinder-theme-list-'+id+'"><legend>'+fm.i18n(id)+'</legend><div><span class="elfinder-spinner"></span></div></fieldset>'),
						tm;
					themeSel.append(opt);
					list.append(dsc);
					tm = setTimeout(function() {
						dsc.find('span.elfinder-spinner').replaceWith(fm.i18n(['errRead', id]));
					}, 10000);
					fm.getTheme(id).always(function() {
						tm && clearTimeout(tm);
					}).done(function(data) {
						var link, val = $(), dl = $('<dl></dl>');
						link = data.link? tpl.link.replace(/\$1/g, data.link).replace(/\$3/g, fm.i18n('website')) : '$2';
						if (data.name) {
							opt.html(fm.i18n(data.name));
						}
						dsc.children('legend').html(link.replace(/\$2/g, fm.i18n(data.name) || id));
						$.each(items, function(i, key) {
							var t = tpl[key] || tpl.data,
								elm;
							if (data[key]) {
								elm = t.replace(/\$0/g, fm.escape(key)).replace(/\$1/g, fm.i18n(key)).replace(/\$2/g, fm.i18n(data[key]));
								if (key === 'image' && data.link) {
									elm = $(elm).on('click', function() {
										themeSel.val(id).trigger('change');
									}).attr('title', fm.i18n('select'));
								}
								dl.append(elm);
							}
						});
						val = val.add(dl);
						val = val.add($('<div class="elfinder-preference-theme-btn"></div>').append($('<button class="ui-button ui-corner-all ui-widget"></button>').data('themeid', id).html(fm.i18n('select'))));
						dsc.find('span.elfinder-spinner').replaceWith(val);
					}).fail(function() {
						dsc.find('span.elfinder-spinner').replaceWith(fm.i18n(['errRead', id]));
					});
				});
				return $('<div></div>').append(themeSel.val(fm.theme && fm.theme.id? fm.theme.id : 'default'), defBtn, list);
			})());

			forms.toolbarPref && (forms.toolbarPref = (function() {
				var pnls = $.map(fm.options.uiOptions.toolbar, function(v) {
						return $.isArray(v)? v : null;
					}),
					tags = [],
					hides = fm.storage('toolbarhides') || {};
				$.each(pnls, function() {
					var cmd = this,
						name = fm.i18n('cmd'+cmd);
					if (name === 'cmd'+cmd) {
						name = fm.i18n(cmd);
					}
					tags.push('<span class="elfinder-preference-toolbar-item"><label><input type="checkbox" value="'+cmd+'" '+(hides[cmd]? '' : 'checked')+'/>'+name+'</label></span>');
				});
				return $(tags.join(' ')).on('change', 'input', function() {
					var v = $(this).val(),
						o = $(this).is(':checked');
					if (!o && !hides[v]) {
						hides[v] = true;
					} else if (o && hides[v]) {
						delete hides[v];
					}
					fm.storage('toolbarhides', hides);
					fm.trigger('toolbarpref');
				});
			})());
			
			forms.iconSize && (forms.iconSize = (function() {
				var max = fm.options.uiOptions.cwd.iconsView.sizeMax || 3,
					size = fm.storage('iconsize') || fm.options.uiOptions.cwd.iconsView.size || 0,
					sld = $('<div class="touch-punch"></div>').slider({
						classes: {
							'ui-slider-handle': 'elfinder-tabstop',
						},
						value: size,
						max: max,
						slide: function(e, ui) {
							fm.getUI('cwd').trigger('iconpref', {size: ui.value});
						},
						change: function(e, ui) {
							fm.storage('iconsize', ui.value);
						}
					});
				fm.getUI('cwd').on('iconpref', function(e, data) {
					sld.slider('option', 'value', data.size);
				});
				return sld;
			})());

			forms.columnPref && (forms.columnPref = (function() {
				var cols = fm.options.uiOptions.cwd.listView.columns,
					tags = [],
					hides = fm.storage('columnhides') || {};
				$.each(cols, function() {
					var key = this,
						name = fm.getColumnName(key);
					tags.push('<span class="elfinder-preference-column-item"><label><input type="checkbox" value="'+key+'" '+(hides[key]? '' : 'checked')+'/>'+name+'</label></span>');
				});
				return $(tags.join(' ')).on('change', 'input', function() {
					var v = $(this).val(),
						o = $(this).is(':checked');
					if (!o && !hides[v]) {
						hides[v] = true;
					} else if (o && hides[v]) {
						delete hides[v];
					}
					fm.storage('columnhides', hides);
					fm.trigger('columnpref', { repaint: true });
				});
			})());
			
			forms.selectAction && (forms.selectAction = (function() {
				var actSel = $('<select></select>').on('change', function() {
						var act = $(this).val();
						fm.storage('selectAction', act === 'default'? null : act);
					}),
					optTags = [],
					acts = self.options.selectActions,
					defAct = fm.getCommand('open').options.selectAction || 'open';
				
				if ($.inArray(defAct, acts) === -1) {
					acts.unshift(defAct);
				}
				$.each(acts, function(i, act) {
					var names = $.map(act.split('/'), function(cmd) {
						var name = fm.i18n('cmd'+cmd);
						if (name === 'cmd'+cmd) {
							name = fm.i18n(cmd);
						}
						return name;
					});
					optTags.push('<option value="'+act+'">'+names.join('/')+'</option>');
				});
				return actSel.append(optTags.join('')).val(fm.storage('selectAction') || defAct);
			})());
			
			forms.makefileTypes && (forms.makefileTypes = (function() {
				var hides = fm.getCommand('edit').getMkfileHides(),
					getTag = function() {
						var tags = [];
						// re-assign hides
						hides = fm.getCommand('edit').getMkfileHides();
						$.each(fm.mimesCanMakeEmpty, function(mime, type) {
							var name = fm.getCommand('mkfile').getTypeName(mime, type);
							tags.push('<span class="elfinder-preference-column-item" title="'+fm.escape(name)+'"><label><input type="checkbox" value="'+mime+'" '+(hides[mime]? '' : 'checked')+'/>'+type+'</label></span>');
						});
						return tags.join(' ');
					},
					elm = $('<div></div>').on('change', 'input', function() {
						var v = $(this).val(),
							o = $(this).is(':checked');
						if (!o && !hides[v]) {
							hides[v] = true;
						} else if (o && hides[v]) {
							delete hides[v];
						}
						fm.storage('mkfileHides', hides);
						fm.trigger('canMakeEmptyFile');
					}).append(getTag()),
					add = $('<div></div>').append(
						$('<input type="text" placeholder="'+fm.i18n('typeOfTextfile')+'"/>').on('keydown', function(e) {
							(e.keyCode === $.ui.keyCode.ENTER) && $(this).next().trigger('click');
						}),
						$('<button class="ui-button"></button>').html(fm.i18n('add')).on('click', function() {
							var input = $(this).prev(),
								val = input.val(),
								uiToast = fm.getUI('toast'),
								err = function() {
									uiToast.appendTo(input.closest('.ui-dialog'));
									fm.toast({
										msg: fm.i18n('errUsupportType'),
										mode: 'warning',
										onHidden: function() {
											uiToast.children().length === 1 && uiToast.appendTo(fm.getUI());
										}
									});
									input.trigger('focus');
									return false;
								},
								tmpMimes;
							if (!val.match(/\//)) {
								val = fm.arrayFlip(fm.mimeTypes)[val];
								if (!val) {
									return err();
								}
								input.val(val);
							}
							if (!fm.mimeIsText(val) || !fm.mimeTypes[val]) {
								return err();
							}
							fm.trigger('canMakeEmptyFile', {mimes: [val], unshift: true});
							tmpMimes = {};
							tmpMimes[val] = fm.mimeTypes[val];
							fm.storage('mkfileTextMimes', Object.assign(tmpMimes, fm.storage('mkfileTextMimes') || {}));
							input.val('');
							uiToast.appendTo(input.closest('.ui-dialog'));
							fm.toast({
								msg: fm.i18n(['complete', val + ' (' + tmpMimes[val] + ')']),
								onHidden: function() {
									uiToast.children().length === 1 && uiToast.appendTo(fm.getUI());
								}
							});
						}),
						$('<button class="ui-button"></button>').html(fm.i18n('reset')).on('click', function() {
							fm.one('canMakeEmptyFile', {done: function() {
								elm.empty().append(getTag());
							}});
							fm.trigger('canMakeEmptyFile', {resetTexts: true});
						})
					),
					tm;
				fm.bind('canMakeEmptyFile', {done: function(e) {
					if (e.data && e.data.mimes && e.data.mimes.length) {
						elm.empty().append(getTag());
					}
				}});
				return $('<div></div>').append(elm, add);
			})());

			forms.useStoredEditor && (forms.useStoredEditor = $('<input type="checkbox"/>').prop('checked', (function() {
				var s = fm.storage('useStoredEditor');
				return s? (s > 0) : fm.options.commandsOptions.edit.useStoredEditor;
			})()).on('change', function(e) {
				fm.storage('useStoredEditor', $(this).is(':checked')? 1 : -1);
			}));

			forms.editorMaximized && (forms.editorMaximized = $('<input type="checkbox"/>').prop('checked', (function() {
				var s = fm.storage('editorMaximized');
				return s? (s > 0) : fm.options.commandsOptions.edit.editorMaximized;
			})()).on('change', function(e) {
				fm.storage('editorMaximized', $(this).is(':checked')? 1 : -1);
			}));

			forms.useFullscreen && (forms.useFullscreen = $('<input type="checkbox"/>').prop('checked', (function() {
				var s = fm.storage('useFullscreen');
				return s? (s > 0) : fm.options.commandsOptions.fullscreen.mode === 'screen';
			})()).on('change', function(e) {
				fm.storage('useFullscreen', $(this).is(':checked')? 1 : -1);
			}));

			if (forms.showHidden) {
				(function() {
					var setTitle = function() {
							var s = fm.storage('hide'),
								t = [],
								v;
							if (s && s.items) {
								$.each(s.items, function(h, n) {
									t.push(fm.escape(n));
								});
							}
							elms.prop('disabled', !t.length)[t.length? 'removeClass' : 'addClass']('ui-state-disabled');
							v = t.length? t.join('\n') : '';
							forms.showHidden.attr('title',v);
							useTooltip && forms.showHidden.tooltip('option', 'content', v.replace(/\n/g, '<br>')).tooltip('close');
						},
						chk = $('<input type="checkbox"/>').prop('checked', (function() {
							var s = fm.storage('hide');
							return s && s.show;
						})()).on('change', function(e) {
							var o = {};
							o[$(this).is(':checked')? 'show' : 'hide'] = true;
							fm.exec('hide', void(0), o);
						}),
						btn = $('<button class="ui-button ui-corner-all ui-widget"></button>').append(fm.i18n('reset')).on('click', function() {
							fm.exec('hide', void(0), {reset: true});
							$(this).parent().find('input:first').prop('checked', false);
							setTitle();
						}),
						elms = $().add(chk).add(btn),
						useTooltip;
					
					forms.showHidden = $('<div></div>').append(chk, btn);
					fm.bind('hide', function(e) {
						var d = e.data;
						if (!d.opts || (!d.opts.show && !d.opts.hide)) {
							setTitle();
						}
					});
					if (fm.UA.Mobile && $.fn.tooltip) {
						useTooltip = true;
						forms.showHidden.tooltip({
							classes: {
								'ui-tooltip': 'elfinder-ui-tooltip ui-widget-shadow'
							},
							tooltipClass: 'elfinder-ui-tooltip ui-widget-shadow',
							track: true
						}).css('user-select', 'none');
						btn.css('user-select', 'none');
					}
					setTitle();
				})();
			}
			
			forms.infoItems && (forms.infoItems = (function() {
				var items = fm.getCommand('info').items,
					tags = [],
					hides = fm.storage('infohides') || fm.arrayFlip(fm.options.commandsOptions.info.hideItems, true);
				$.each(items, function() {
					var key = this,
						name = fm.i18n(key);
					tags.push('<span class="elfinder-preference-info-item"><label><input type="checkbox" value="'+key+'" '+(hides[key]? '' : 'checked')+'/>'+name+'</label></span>');
				});
				return $(tags.join(' ')).on('change', 'input', function() {
					var v = $(this).val(),
						o = $(this).is(':checked');
					if (!o && !hides[v]) {
						hides[v] = true;
					} else if (o && hides[v]) {
						delete hides[v];
					}
					fm.storage('infohides', hides);
					fm.trigger('infopref', { repaint: true });
				});
			})());
			
			forms.hashChecker && fm.hashCheckers.length && (forms.hashChecker = (function() {
				var tags = [],
					enabled = fm.arrayFlip(fm.storage('hashchekcer') || fm.options.commandsOptions.info.showHashAlgorisms, true);
				$.each(fm.hashCheckers, function() {
					var cmd = this,
						name = fm.i18n(cmd);
					tags.push('<span class="elfinder-preference-hashchecker-item"><label><input type="checkbox" value="'+cmd+'" '+(enabled[cmd]? 'checked' : '')+'/>'+name+'</label></span>');
				});
				return $(tags.join(' ')).on('change', 'input', function() {
					var v = $(this).val(),
						o = $(this).is(':checked');
					if (o) {
						enabled[v] = true;
					} else if (enabled[v]) {
						delete enabled[v];
					}
					fm.storage('hashchekcer', $.grep(fm.hashCheckers, function(v) {
						return enabled[v];
					}));
				});
			})());

			forms.autoFocusDialog && (forms.autoFocusDialog = $('<input type="checkbox"/>').prop('checked', (function() {
				var s = fm.storage('autoFocusDialog');
				return s? (s > 0) : fm.options.uiOptions.dialog.focusOnMouseOver;
			})()).on('change', function(e) {
				fm.storage('autoFocusDialog', $(this).is(':checked')? 1 : -1);
			}));
			
			forms.clearBrowserData && (forms.clearBrowserData = $('<button></button>').text(fm.i18n('reset')).button().on('click', function(e) {
				e.preventDefault();
				fm.storage();
				$('#'+fm.id).elfinder('reload');
			}));
			
			$.each(cats, function(id, prefs) {
				var dls, found;
				if (prefs === true) {
					found = 1;
				} else if (prefs) {
					dls = $();
					$.each(prefs, function(i, n) {
						var f, title, chks = '', cbox;
						if (f = forms[n]) {
							found = 2;
							title = fm.i18n(n);
							cbox = $(f).filter('input[type="checkbox"]');
							if (!cbox.length) {
								cbox = $(f).find('input[type="checkbox"]');
							}
							if (cbox.length === 1) {
								if (!cbox.attr('id')) {
									cbox.attr('id', 'elfinder-preference-'+n+'-checkbox');
								}
								title = '<label for="'+cbox.attr('id')+'">'+title+'</label>';
							} else if (cbox.length > 1) {
								chks = ' elfinder-preference-checkboxes';
							}
							dls = dls.add($('<dt class="elfinder-preference-'+n+chks+'">'+title+'</dt>')).add($('<dd class="elfinder-preference-'+n+chks+'"></dd>').append(f));
						}
					});
				}
				if (found) {
					ul.append(tab[r](/\{id\}/g, id)[r](/\{title\}/, fm.i18n(id))[r](/\{class\}/, openTab === id? 'elfinder-focus' : ''));
					if (found === 2) {
						tabs.append(
							$('<div id="'+fm.namespace+'-preference-'+id+'" class="elfinder-preference-content"></div>')
							.hide()
							.append($('<dl></dl>').append(dls))
						);
					}
				}
			});

			ul.on('click', 'a', function(e) {
				var t = $(e.target),
					h = t.attr('href');
				e.preventDefault();
				e.stopPropagation();

				ul.children().removeClass(clTabActive);
				t.removeClass('ui-state-hover').parent().addClass(clTabActive);

				if (h.match(/all$/)) {
					tabs.addClass('elfinder-preference-taball').children().show();
				} else {
					tabs.removeClass('elfinder-preference-taball').children().hide();
					$(h).show();
				}
			}).on('focus blur', 'a', function(e) {
				$(this).parent().toggleClass('ui-state-focus', e.type === 'focusin');
			}).on('mouseenter mouseleave', 'li', function(e) {
				$(this).toggleClass('ui-state-hover', e.type === 'mouseenter');
			});

			tabs.find('a,input,select,button').addClass('elfinder-tabstop');
			base.append(ul, tabs);

			dialog = self.fmDialog(base, {
				title : self.title,
				width : self.options.width || 600,
				height: self.options.height || 400,
				maxWidth: 'window',
				maxHeight: 'window',
				autoOpen : false,
				destroyOnClose : false,
				allowMinimize : false,
				open : function() {
					openTab && selectTab(openTab);
					openTab = null;
				},
				resize : function() {
					tabs.height(dialog.height() - ul.outerHeight(true) - (tabs.outerHeight(true) - tabs.height()) - 5);
				}
			})
			.on('click', function(e) {
				e.stopPropagation();
			})
			.css({
				overflow: 'hidden'
			});

			dialog.closest('.ui-dialog')
			.css({
				overflow: 'hidden'
			})
			.addClass('elfinder-bg-translucent');
			
			openTab = 'all';
		},
		dialog, openTab;

	this.shortcuts = [{
		pattern     : 'ctrl+comma',
		description : this.title
	}];

	this.alwaysEnabled  = true;
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(sel, cOpts) {
		!dialog && build();
		if (cOpts) {
			if (cOpts.tab) {
				selectTab(cOpts.tab);
			} else if (cOpts._currentType === 'cwd') {
				selectTab('workspace');
			}
		}
		dialog.elfinderdialog('open');
		return $.Deferred().resolve();
	};

};