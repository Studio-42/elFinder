"use strict";
/**
 * @class  elFinder command "help"
 * "About" dialog
 *
 * @author Dmitry (dio) Levashov
 **/
(elFinder.prototype.commands.help = function() {
	var fm   = this.fm,
		self = this,
		linktpl = '<div class="elfinder-help-link"> <a href="{url}">{link}</a></div>',
		linktpltgt = '<div class="elfinder-help-link"> <a href="{url}" target="_blank">{link}</a></div>',
		atpl    = '<div class="elfinder-help-team"><div>{author}</div>{work}</div>',
		url     = /\{url\}/,
		link    = /\{link\}/,
		author  = /\{author\}/,
		work    = /\{work\}/,
		r       = 'replace',
		prim    = 'ui-priority-primary',
		sec     = 'ui-priority-secondary',
		lic     = 'elfinder-help-license',
		tab     = '<li class="ui-state-default ui-corner-top elfinder-help-tab-{id}"><a href="#'+fm.namespace+'-help-{id}">{title}</a></li>',
		html    = ['<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-help">', 
				'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">'],
		stpl    = '<div class="elfinder-help-shortcut"><div class="elfinder-help-shortcut-pattern">{pattern}</div> {descrip}</div>',
		sep     = '<div class="elfinder-help-separator"/>',
		selfUrl = $('base').length? document.location.href.replace(/#.*$/, '') : '',
		
		
		about = function() {
			html.push('<div id="'+fm.namespace+'-help-about" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="elfinder-help-logo"/>');
			html.push('<h3>elFinder</h3>');
			html.push('<div class="'+prim+'">'+fm.i18n('webfm')+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('ver')+': '+fm.version+', '+fm.i18n('protocolver')+': <span class="apiver"></span></div>');
			html.push('<div class="'+sec+'">jQuery/jQuery UI: '+$().jquery+'/'+$.ui.version+'</div>');

			html.push(sep);
			
			html.push(linktpltgt[r](url, 'http://elfinder.org/')[r](link, fm.i18n('homepage')));
			html.push(linktpltgt[r](url, 'https://github.com/Studio-42/elFinder/wiki')[r](link, fm.i18n('docs')));
			html.push(linktpltgt[r](url, 'https://github.com/Studio-42/elFinder')[r](link, fm.i18n('github')));
			//html.push(linktpltgt[r](url, 'http://twitter.com/elrte_elfinder')[r](link, fm.i18n('twitter')));
			
			html.push(sep);
			
			html.push('<div class="'+prim+'">'+fm.i18n('team')+'</div>');
			
			html.push(atpl[r](author, 'Dmitry "dio" Levashov &lt;dio@std42.ru&gt;')[r](work, fm.i18n('chiefdev')));
			html.push(atpl[r](author, 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;')[r](work, fm.i18n('maintainer')));
			html.push(atpl[r](author, 'Alexey Sukhotin &lt;strogg@yandex.ru&gt;')[r](work, fm.i18n('contributor')));
			html.push(atpl[r](author, 'Naoki Sawada &lt;hypweb@gmail.com&gt;')[r](work, fm.i18n('contributor')));
			
			if (fm.i18[fm.lang].translator) {
				$.each(fm.i18[fm.lang].translator.split(', '), function() {
					html.push(atpl[r](author, $.trim(this))[r](work, fm.i18n('translator')+' ('+fm.i18[fm.lang].language+')'));
				});	
			}
			
			html.push(sep);
			html.push('<div class="'+lic+'">'+fm.i18n('icons')+': Pixelmixer, <a href="http://p.yusukekamiyamane.com" target="_blank">Fugue</a></div>');
			
			html.push(sep);
			html.push('<div class="'+lic+'">Licence: 3-clauses BSD Licence</div>');
			html.push('<div class="'+lic+'">Copyright © 2009-2017, Studio 42</div>');
			html.push('<div class="'+lic+'">„ …'+fm.i18n('dontforget')+' ”</div>');
			html.push('</div>');
		},
		shortcuts = function() {
			var sh = fm.shortcuts();
			// shortcuts tab
			html.push('<div id="'+fm.namespace+'-help-shortcuts" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			
			if (sh.length) {
				html.push('<div class="ui-widget-content elfinder-help-shortcuts">');
				$.each(sh, function(i, s) {
					html.push(stpl.replace(/\{pattern\}/, s[0]).replace(/\{descrip\}/, s[1]));
				});
			
				html.push('</div>');
			} else {
				html.push('<div class="elfinder-help-disabled">'+fm.i18n('shortcutsof')+'</div>');
			}
			
			
			html.push('</div>');
			
		},
		help = function() {
			// help tab
			html.push('<div id="'+fm.namespace+'-help-help" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<a href="https://github.com/Studio-42/elFinder/wiki" target="_blank" class="elfinder-dont-panic"><span>DON\'T PANIC</span></a>');
			html.push('</div>');
			// end help
		},
		usePref = false,
		preference = function() {
			usePref = true;
			// preference tab
			html.push('<div id="'+fm.namespace+'-help-preference" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<div class="ui-widget-content elfinder-help-preference"></div>');
			html.push('</div>');
			// end preference
		},
		useDebug = false,
		debug = function() {
			useDebug = true;
			// debug tab
			html.push('<div id="'+fm.namespace+'-help-debug" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<div class="ui-widget-content elfinder-help-debug"><ul></ul></div>');
			html.push('</div>');
			// end debug
		},
		debugRender = function() {
			var render = function(elm, obj) {
				$.each(obj, function(k, v) {
					elm.append($('<dt/>').text(k));
					if (typeof v === 'undefined') {
						elm.append($('<dd/>').append($('<span/>').text('undfined')));
					} else if (typeof v === 'object' && !v) {
						elm.append($('<dd/>').append($('<span/>').text('null')));
					} else if (typeof v === 'object' && ($.isPlainObject(v) || v.length)) {
						elm.append( $('<dd/>').append(render($('<dl/>'), v)));
					} else {
						elm.append($('<dd/>').append($('<span/>').text((v && typeof v === 'object')? '[]' : (v? v : '""'))));
					}
				});
				return elm;
			},
			cnt = debugUL.children('li').length,
			targetL, target, tabId,
			info, lastUL, lastDIV;
			
			if (self.debug.options || self.debug.debug) {
				if (cnt >= 5) {
					lastUL = debugUL.children('li:last');
					lastDIV = debugDIV.children('div:last');
					if (lastDIV.is(':hidden')) {
						lastUL.remove();
						lastDIV.remove();
					} else {
						lastUL.prev().remove();
						lastDIV.prev().remove();
					}
				}
				
				tabId = fm.namespace + '-help-debug-' + (+new Date());
				targetL = $('<li/>').html('<a href="'+selfUrl+'#'+tabId+'">'+self.debug.debug.cmd+'</a>').prependTo(debugUL);
				target = $('<div id="'+tabId+'"/>').data('debug', self.debug);
				
				targetL.on('click.debugrender', function() {
					var debug = target.data('debug');
					target.removeData('debug');
					if (debug) {
						target.hide();
						if (debug.debug) {
							info = $('<fieldset>').append($('<legend/>').text('debug'), render($('<dl/>'), debug.debug));
							target.append(info);
						}
						if (debug.options) {
							info = $('<fieldset>').append($('<legend/>').text('options'), render($('<dl/>'), debug.options));
							target.append(info);
						}
						target.show();
					}
					targetL.off('click.debugrender');
				});
				
				debugUL.after(target);
				
				opened && debugDIV.tabs('refresh');
			}
		},
		content = '',
		initCallbacks = [],
		init = function(fn) {
			if (fn && typeof fn === 'function') {
				initCallbacks.push(fn);
			} else if (initCallbacks.length) {
				$.each(initCallbacks, function() {
					this.call(self);
				});
				initCallbacks = [];
			}
		},
		loaded, opened, tabDebug, debugDIV, debugUL;
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = -1;
	
	this.shortcuts = [{
		pattern     : 'f1',
		description : this.title
	}];
	
	fm.bind('load', function() {
		var setupPref = function() {
				var tab = content.find('.elfinder-help-preference'),
					forms = { language: '', toolbarPref: '', autoFocusDialog: '', clearBrowserData: '' },
					dls = $();
				
				forms.language = (function() {
					var node = $('<div/>');
					init(function() {
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
								jp: '日本語',
								ko: '한국어',
								nl: 'Nederlands',
								no: 'Norsk',
								pl: 'Polski',
								pt_BR: 'Português',
								ro: 'Română',
								ru: 'Pусский',
								si: 'සිංහල',
								sk: 'Slovenský',
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
						node.replaceWith(langSel.append(optTags.join('')).val(fm.lang));
					});
					return node;
				})();
				
				forms.toolbarPref = (function() {
					var node = $('<div/>');
					init(function() {
						var pnls = $.map(fm.options.uiOptions.toolbar, function(v) {
								return $.isArray(v)? v : null
							}),
							tags = [],
							hides = fm.storage('toolbarhides') || {};
						$.each(pnls, function() {
							var cmd = this,
								name = fm.i18n('cmd'+cmd);
							if (name === 'cmd'+cmd) {
								name = cmd;
							}
							tags.push('<span class="elfinder-help-toolbar-item"><label><input type="checkbox" value="'+cmd+'" '+(hides[cmd]? '' : 'checked')+'/>'+name+'</label></span>');
						});
						node.replaceWith($(tags.join(' ')).on('change', 'input', function() {
							var v = $(this).val(),
								o = $(this).is(':checked');
							if (!o && !hides[v]) {
								hides[v] = true;
							} else if (o && hides[v]) {
								delete hides[v];
							}
							fm.storage('toolbarhides', hides);
							fm.trigger('toolbarpref');
						}));
					});
					return node;
				})();
				
				forms.autoFocusDialog = $('<input type="checkbox"/>').prop('checked', (function() {
					var s = fm.storage('autoFocusDialog');
					return s? (s > 0) : fm.options.uiOptions.dialog.focusOnMouseOver;
				})()).on('change', function(e) {
					e.preventDefault();
					fm.storage('autoFocusDialog', $(this).is(':checked')? 1 : -1);
				});
				
				forms.clearBrowserData = $('<button/>').text(fm.i18n('reset')).button().on('click', function(e) {
					e.preventDefault();
					fm.storage();
					$('#'+fm.id).elfinder('reload');
				});
				
				$.each(forms, function(n, f) {
					dls = dls.add($('<dt>'+fm.i18n(n)+'</dt>')).add($('<dd class="elfinder-help-'+n+'"/>').append(f));
				});
				
				tab.append($('<dl/>').append(dls));
			},
			parts = self.options.view || ['about', 'shortcuts', 'help', 'preference', 'debug'],
			i, helpSource, tabBase, tabNav, tabs, delta;
		
		// force enable 'preference' tab
		if ($.inArray('preference', parts) === -1) {
			parts.push('preference');
		}
		
		// debug tab require jQueryUI Tabs Widget
		if (! $.fn.tabs) {
			if ((i = $.inArray(parts, 'debug')) !== false) {
				parts.splice(i, 1);
			}
		}
		
		$.each(parts, function(i, title) {
			html.push(tab[r](/\{id\}/g, title)[r](/\{title\}/, fm.i18n(title)));
		});
		
		html.push('</ul>');

		$.inArray('about', parts) !== -1 && about();
		$.inArray('shortcuts', parts) !== -1 && shortcuts();
		if ($.inArray('help', parts) !== -1) {
			helpSource = fm.baseUrl+'js/i18n/help/%s.html.js';
			help();
		}
		$.inArray('preference', parts) !== -1 && preference();
		$.inArray('debug', parts) !== -1 && debug();
		
		html.push('</div>');
		content = $(html.join(''));
		
		content.find('.ui-tabs-nav li')
			.hover(function() {
				$(this).toggleClass('ui-state-hover');
			})
			.children()
			.on('click', function(e) {
				var link = $(this);
				
				e.preventDefault();
				e.stopPropagation();
				
				if (!link.hasClass('ui-tabs-selected')) {
					link.parent().addClass('ui-tabs-selected ui-state-active').siblings().removeClass('ui-tabs-selected').removeClass('ui-state-active');
					content.children('.ui-tabs-panel').hide().filter(link.attr('href')).show();
				}
				
			})
			.filter(':first').click();
		
		// preference
		usePref && setupPref();
		
		// debug
		if (useDebug) {
			tabDebug = content.find('.elfinder-help-tab-debug').hide();
			debugDIV = content.find('#'+fm.namespace+'-help-debug').children('div:first');
			debugUL = debugDIV.children('ul:first').on('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
			});

			self.debug = {};
	
			fm.bind('backenddebug', function(e) {
				// CAUTION: DO NOT TOUCH `e.data`
				if (useDebug && e.data && e.data.debug) {
					self.debug = { options : e.data.options, debug : Object.assign({ cmd : fm.currentReqCmd }, e.data.debug) };
					if (self.dialog) {
						debugRender();
					}
				}
			});
		}

		content.find('#'+fm.namespace+'-help-about').find('.apiver').text(fm.api);
		self.dialog = fm.dialog(content, {
				title : self.title,
				width : 530,
				maxWidth: 'window',
				maxHeight: 'window',
				autoOpen : false,
				destroyOnClose : false,
				close : function() {
					if (useDebug) {
						tabDebug.hide();
						debugDIV.tabs('destroy');
					}
					opened = false;
				}
			})
			.on('click', function(e) {
				e.stopPropagation();
			})
			.css({
				overflow: 'hidden'
			});
		
		tabBase = self.dialog.children('.ui-tabs');
		tabNav = tabBase.children('.ui-tabs-nav:first');
		tabs = tabBase.children('.ui-tabs-panel');
		delta = self.dialog.outerHeight(true) - self.dialog.height();
		self.dialog.closest('.ui-dialog').on('resize', function() {
			tabs.height(self.dialog.height() - delta - tabNav.outerHeight(true) - 20);
		});
		
		if (helpSource) {
			self.dialog.one('initContents', function() {
				$.ajax({
					url: self.options.helpSource? self.options.helpSource : helpSource.replace('%s', fm.lang),
					dataType: 'html'
				}).done(function(source) {
					$('#'+fm.namespace+'-help-help').html(source);
				}).fail(function() {
					$.ajax({
						url: helpSource.replace('%s', 'en'),
						dataType: 'html'
					}).done(function(source) {
						$('#'+fm.namespace+'-help-help').html(source);
					});
				});
			});
		}
		
		self.state = 0;
	}).one('open', function() {
		var debug = false;
		fm.one('backenddebug', function() {
			debug =true;
		}).one('opendone', function() {
			setTimeout(function() {
				if (! debug && useDebug) {
					useDebug = false;
					tabDebug.hide();
					debugDIV.hide();
					debugUL.hide();
				}
			}, 0);
		});
	});
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(sel, opts) {
		var tab = opts? opts.tab : void(0),
			debugShow = function() {
				if (useDebug) {
					debugDIV.tabs();
					debugUL.find('a:first').trigger('click');
					tabDebug.show();
					opened = true;
				}
			};
		if (! loaded) {
			loaded = true;
			fm.lazy(init).done(debugShow);
		} else {
			debugShow();
		}
		this.dialog.trigger('initContents').elfinderdialog('open').find((tab? '.elfinder-help-tab-'+tab : '.ui-tabs-nav li') + ' a:first').click();
		return $.Deferred().resolve();
	};

}).prototype = { forceLoad : true }; // this is required command

elFinder.prototype.commands.preference = function() {
	
	this.linkedCmds = ['help'];
	this.alwaysEnabled  = true;
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function() {
		return this.fm.exec('help', void(0), {tab: 'preference'});
	};
};

