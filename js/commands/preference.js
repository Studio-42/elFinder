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
		tab     = '<li class="ui-state-default ui-corner-top elfinder-preference-tab-{id}"><a href="#'+fm.namespace+'-preference-{id}" id="'+fm.namespace+'-preference-tab-{id}" class="{class}">{title}</a></li>',
		base    = $('<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-preference">'), 
		ul      = $('<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">'),
		tabs    = $('<div class="elfinder-preference-tabs ui-tabs-panel ui-widget-content ui-corner-bottom"/>'),
		sep     = '<div class="elfinder-preference-separator"/>',
		selfUrl = $('base').length? document.location.href.replace(/#.*$/, '') : '',
		selectTab = function(tab) {
			$('#'+fm.namespace+'-preference-tab-'+tab).trigger('mouseover').trigger('click');
			openTab = tab;
		},
		build   = function() {
			var cats = self.options.categories || {
					'language' : ['language'],
					'toolbar' : ['toolbarPref'],
					'workspace' : ['iconSize','columnPref', 'selectAction', 'useStoredEditor'],
					'dialog' : ['autoFocusDialog'],
					'selectionInfo' : ['infoItems', 'hashChecker'],
					'reset' : ['clearBrowserData'],
					'all' : true
				},
				forms = self.options.prefs || ['language', 'toolbarPref', 'iconSize', 'columnPref', 'selectAction', 'useStoredEditor', 'infoItems', 'hashChecker', 'autoFocusDialog', 'clearBrowserData'];
			
			forms = fm.arrayFlip(forms, true);
			
			if (fm.options.getFileCallback) {
				delete forms.selectAction;
			}
			
			forms.language && (forms.language = (function() {
				var langSel = $('<select/>').on('change', function() {
						var lang = $(this).val();
						fm.storage('lang', lang);
						$('#'+fm.id).elfinder('reload');
					}),
					optTags = [],
					langs = self.options.langs || {
						ar: 'اللغة العربية',
						bg: 'Български',
						ca: 'Català',
						cs: 'Čeština',
						da: 'Dansk',
						de: 'Deutsch',
						el: 'Ελληνικά',
						en: 'English',
						es: 'Español',
						fa: 'فارسی‌‎, پارسی‌',
						fo: 'Føroyskt',
						fr: 'Français',
						he: 'עברית‎',
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
				$.each(langs, function(lang, name) {
					optTags.push('<option value="'+lang+'">'+name+'</option>');
				});
				return langSel.append(optTags.join('')).val(fm.lang);
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
					size = fm.storage('iconsize') || 0;
				return $('<div class="touch-punch"/>').slider({
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
				var actSel = $('<select/>').on('change', function() {
						var act = $(this).val();
						fm.storage('selectAction', act === 'default'? null : act);
					}),
					optTags = [],
					acts = self.options.selectActions;
				
				if ($.inArray('open', acts) === -1) {
					acts.unshift('open');
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
				return actSel.append(optTags.join('')).val(fm.storage('selectAction') || 'open');
			})());
			
			forms.useStoredEditor && (forms.useStoredEditor = $('<input type="checkbox"/>').prop('checked', (function() {
				var s = fm.storage('useStoredEditor');
				return s? (s > 0) : fm.options.commandsOptions.edit.useStoredEditor;
			})()).on('change', function(e) {
				fm.storage('useStoredEditor', $(this).is(':checked')? 1 : -1);
				fm.trigger('selectfiles', {files : fm.selected()});
			}));
			
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
			
			forms.clearBrowserData && (forms.clearBrowserData = $('<button/>').text(fm.i18n('reset')).button().on('click', function(e) {
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
						var f, title, chks = '';
						if (f = forms[n]) {
							found = 2;
							title = fm.i18n(n);
							if (f instanceof jQuery && f.length === 1 && f.is('input:checkbox')) {
								if (!f.attr('id')) {
									f.attr('id', 'elfinder-preference-'+n+'-checkbox');
								}
								title = '<label for="'+f.attr('id')+'">'+title+'</label>';
							} else if (f.find('input[type="checkbox"]').length > 1) {
								chks = ' elfinder-preference-checkboxes';
							}
							dls = dls.add($('<dt class="elfinder-preference-'+n+chks+'">'+title+'</dt>')).add($('<dd class="elfinder-preference-'+n+chks+'"/>').append(f));
						}
					});
				}
				if (found) {
					ul.append(tab[r](/\{id\}/g, id)[r](/\{title\}/, fm.i18n(id))[r](/\{class\}/, openTab === id? 'elfinder-focus' : ''));
					if (found === 2) {
						tabs.append(
							$('<div id="'+fm.namespace+'-preference-'+id+'" class="elfinder-preference-content"/>')
							.hide()
							.append($('<dl/>').append(dls))
						);
					}
				}
			});

			ul.on('click', 'a', function(e) {
				var t = $(e.target),
					h = t.attr('href');
				e.preventDefault();
				e.stopPropagation();

				ul.children().removeClass('ui-tabs-selected ui-state-active');
				t.removeClass('ui-state-hover').parent().addClass('ui-tabs-selected ui-state-active');

				if (h.match(/all$/)) {
					tabs.children().show();
				} else {
					tabs.children().hide();
					$(h).show();
				}
			});

			base.append(ul, tabs).find('a,input,select,button').addClass('elfinder-tabstop');

			dialog = fm.dialog(base, {
				title : self.title,
				width : 600,
				height: 400,
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