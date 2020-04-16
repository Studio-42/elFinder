/**
 * @class  elFinder command "help"
 * "About" dialog
 *
 * @author Dmitry (dio) Levashov
 **/
(elFinder.prototype.commands.help = function() {
	"use strict";
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
		tab     = '<li class="' + fm.res('class', 'tabstab') + ' elfinder-help-tab-{id}"><a href="#'+fm.namespace+'-help-{id}" class="ui-tabs-anchor">{title}</a></li>',
		html    = ['<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-help">', 
				'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-top">'],
		stpl    = '<div class="elfinder-help-shortcut"><div class="elfinder-help-shortcut-pattern">{pattern}</div> {descrip}</div>',
		sep     = '<div class="elfinder-help-separator"></div>',
		selfUrl = $('base').length? document.location.href.replace(/#.*$/, '') : '',
		clTabActive = fm.res('class', 'tabsactive'),
		
		getTheme = function() {
			var src;
			if (fm.theme && fm.theme.author) {
				src = atpl[r]('elfinder-help-team', 'elfinder-help-team elfinder-help-term-theme')[r](author, fm.i18n(fm.theme.author) + (fm.theme.email? ' &lt;'+fm.theme.email+'&gt;' : ''))[r](work, fm.i18n('theme') + ' ('+fm.i18n(fm.theme.name)+')');
			} else {
				src = '<div class="elfinder-help-team elfinder-help-term-theme" style="display:none"></div>';
			}
			return src;
		},

		about = function() {
			html.push('<div id="'+fm.namespace+'-help-about" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="elfinder-help-logo"></div>');
			html.push('<h3>elFinder</h3>');
			html.push('<div class="'+prim+'">'+fm.i18n('webfm')+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('ver')+': '+fm.version+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('protocolver')+': <span class="apiver"></span></div>');
			html.push('<div class="'+sec+'">jQuery/jQuery UI: '+$().jquery+'/'+$.ui.version+'</div>');

			html.push(sep);
			
			html.push(linktpltgt[r](url, 'https://studio-42.github.io/elFinder/')[r](link, fm.i18n('homepage')));
			html.push(linktpltgt[r](url, 'https://github.com/Studio-42/elFinder/wiki')[r](link, fm.i18n('docs')));
			html.push(linktpltgt[r](url, 'https://github.com/Studio-42/elFinder')[r](link, fm.i18n('github')));
			//html.push(linktpltgt[r](url, 'http://twitter.com/elrte_elfinder')[r](link, fm.i18n('twitter')));
			
			html.push(sep);
			
			html.push('<div class="'+prim+'">'+fm.i18n('team')+'</div>');
			
			html.push(atpl[r](author, 'Dmitry "dio" Levashov &lt;dio@std42.ru&gt;')[r](work, fm.i18n('chiefdev')));
			html.push(atpl[r](author, 'Naoki Sawada &lt;hypweb+elfinder@gmail.com&gt;')[r](work, fm.i18n('developer')));
			html.push(atpl[r](author, 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;')[r](work, fm.i18n('maintainer')));
			html.push(atpl[r](author, 'Alexey Sukhotin &lt;strogg@yandex.ru&gt;')[r](work, fm.i18n('contributor')));
			
			if (fm.i18[fm.lang].translator) {
				$.each(fm.i18[fm.lang].translator.split(', '), function() {
					html.push(atpl[r](author, $.trim(this))[r](work, fm.i18n('translator')+' ('+fm.i18[fm.lang].language+')'));
				});	
			}
			
			html.push(getTheme());

			html.push(sep);
			html.push('<div class="'+lic+'">'+fm.i18n('icons')+': Pixelmixer, <a href="http://p.yusukekamiyamane.com" target="_blank">Fugue</a>, <a href="https://icons8.com" target="_blank">Icons8</a></div>');
			
			html.push(sep);
			html.push('<div class="'+lic+'">Licence: 3-clauses BSD Licence</div>');
			html.push('<div class="'+lic+'">Copyright © 2009-2020, Studio 42</div>');
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
		useInteg = false,
		integrations = function() {
			useInteg = true;
			html.push('<div id="'+fm.namespace+'-help-integrations" class="ui-tabs-panel ui-widget-content ui-corner-bottom"></div>');
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
					elm.append($('<dt></dt>').text(k));
					if (typeof v === 'undefined') {
						elm.append($('<dd></dd>').append($('<span></span>').text('undfined')));
					} else if (typeof v === 'object' && !v) {
						elm.append($('<dd></dd>').append($('<span></span>').text('null')));
					} else if (typeof v === 'object' && ($.isPlainObject(v) || v.length)) {
						elm.append( $('<dd></dd>').append(render($('<dl></dl>'), v)));
					} else {
						elm.append($('<dd></dd>').append($('<span></span>').text((v && typeof v === 'object')? '[]' : (v? v : '""'))));
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
				targetL = $('<li></li>').html('<a href="'+selfUrl+'#'+tabId+'">'+self.debug.debug.cmd+'</a>').prependTo(debugUL);
				target = $('<div id="'+tabId+'"></div>').data('debug', self.debug);
				
				targetL.on('click.debugrender', function() {
					var debug = target.data('debug');
					target.removeData('debug');
					if (debug) {
						target.hide();
						if (debug.debug) {
							info = $('<fieldset>').append($('<legend></legend>').text('debug'), render($('<dl></dl>'), debug.debug));
							target.append(info);
						}
						if (debug.options) {
							info = $('<fieldset>').append($('<legend></legend>').text('options'), render($('<dl></dl>'), debug.options));
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
		opened, tabInteg, integDIV, tabDebug, debugDIV, debugUL;
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = -1;
	
	this.shortcuts = [{
		pattern     : 'f1',
		description : this.title
	}];
	
	fm.bind('load', function() {
		var parts = self.options.view || ['about', 'shortcuts', 'help', 'integrations', 'debug'],
			i, helpSource, tabBase, tabNav, tabs, delta;
		
		// remove 'preference' tab, it moved to command 'preference'
		if ((i = $.inArray('preference', parts)) !== -1) {
			parts.splice(i, 1);
		}
		
		// debug tab require jQueryUI Tabs Widget
		if (! $.fn.tabs) {
			if ((i = $.inArray(parts, 'debug')) !== -1) {
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
			helpSource = fm.i18nBaseUrl + 'help/%s.html.js';
			help();
		}
		$.inArray('integrations', parts) !== -1 && integrations();
		$.inArray('debug', parts) !== -1 && debug();
		
		html.push('</div>');
		content = $(html.join(''));
		
		content.find('.ui-tabs-nav li')
			.on('mouseenter mouseleave', function(e) {
				$(this).toggleClass('ui-state-hover', e.type === 'mouseenter');
			})
			.on('focus blur', 'a', function(e) {
				$(e.delegateTarget).toggleClass('ui-state-focus', e.type === 'focusin');
			})
			.children()
			.on('click', function(e) {
				var link = $(this);
				
				e.preventDefault();
				e.stopPropagation();
				
				link.parent().addClass(clTabActive).siblings().removeClass(clTabActive);
				content.children('.ui-tabs-panel').hide().filter(link.attr('href')).show();
			})
			.filter(':first').trigger('click');
		
		if (useInteg) {
			tabInteg = content.find('.elfinder-help-tab-integrations').hide();
			integDIV = content.find('#'+fm.namespace+'-help-integrations').hide().append($('<div class="elfinder-help-integrations-desc"></div>').html(fm.i18n('integrationWith')));
			fm.bind('helpIntegration', function(e) {
				var ul = integDIV.children('ul:first'),
					data, elm, cmdUL, cmdCls;
				if (e.data) {
					if ($.isPlainObject(e.data)) {
						data = Object.assign({
							link: '',
							title: '',
							banner: ''
						}, e.data);
						if (data.title || data.link) {
							if (!data.title) {
								data.title = data.link;
							}
							if (data.link) {
								elm = $('<a></a>').attr('href', data.link).attr('target', '_blank').text(data.title);
							} else {
								elm = $('<span></span>').text(data.title);
							}
							if (data.banner) {
								elm = $('<span></span>').append($('<img/>').attr(data.banner), elm);
							}
						}
					} else {
						elm = $(e.data);
						elm.filter('a').each(function() {
							var tgt = $(this);
							if (!tgt.attr('target')) {
								tgt.attr('target', '_blank');;
							}
						});
					}
					if (elm) {
						tabInteg.show();
						if (!ul.length) {
							ul = $('<ul class="elfinder-help-integrations"></ul>').appendTo(integDIV);
						}
						if (data && data.cmd) {
							cmdCls = 'elfinder-help-integration-' + data.cmd;
							cmdUL = ul.find('ul.' + cmdCls);
							if (!cmdUL.length) {
								cmdUL = $('<ul class="'+cmdCls+'"></ul>');
								ul.append($('<li></li>').append($('<span></span>').html(fm.i18n('cmd'+data.cmd))).append(cmdUL));
							}
							elm = cmdUL.append($('<li></li>').append(elm));
						} else {
							ul.append($('<li></li>').append(elm));
						}
					}
				}
			}).bind('themechange', function() {
				content.find('div.elfinder-help-term-theme').replaceWith(getTheme());
			});
		}

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
		self.dialog = self.fmDialog(content, {
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

		fm.trigger('helpBuilded', self.dialog);
	}).one('open', function() {
		var debug = false;
		fm.one('backenddebug', function() {
			debug =true;
		}).one('opendone', function() {
			requestAnimationFrame(function() {
				if (! debug && useDebug) {
					useDebug = false;
					tabDebug.hide();
					debugDIV.hide();
					debugUL.hide();
				}
			});
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
		debugShow();
		this.dialog.trigger('initContents').elfinderdialog('open').find((tab? '.elfinder-help-tab-'+tab : '.ui-tabs-nav li') + ' a:first').trigger('click');
		return $.Deferred().resolve();
	};

}).prototype = { forceLoad : true }; // this is required command
