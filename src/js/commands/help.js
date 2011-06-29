"use strict";

elFinder.prototype.commands.help = function() {
	var fm = this.fm,
		content;
	
	this.title = 'About this software';
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = 0;
	
	this.shortcuts = [{
		pattern     : 'f1',
		description : this.title,
	}];
	
	this.fm.one('open', function() {
		setTimeout(function() {
			var linktpl = '<div class="elfinder-help-link"> <a href="{url}">{link}</a></div>',
				atpl = '<div class="elfinder-help-team"><div>{author}</div>{work}</div>',
				url = /\{url\}/,
				link = /\{link\}/,
				author = /\{author\}/,
				work = /\{work\}/,
				r = 'replace',
				prim = 'ui-priority-primary',
				sec = 'ui-priority-secondary',
				lic = 'elfinder-help-license',
				tab = '<li class="ui-state-default ui-corner-top"><a href="#{id}">{title}</a></li>',
				html = ['<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-help">', 
						'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">'],
				stpl = '<div class="elfinder-help-shortcut"><div class="elfinder-help-shortcut-pattern">{pattern}</div>: {descrip}</div>',
				sep  = '<div class="elfinder-help-separator"/>',
				shortcuts = fm.shortcuts()
				;

			$.each({main : 'About', shortcuts : 'Shortcuts', help : 'Help'}, function(id, title) {
				html.push(tab[r](/\{id\}/, id)[r](/\{title\}/, fm.i18n(title)));
			});

			html.push('</ul>');
			
			// main tab
			html.push('<div id="main" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="elfinder-help-logo"/>')
			html.push('<h3>elFinder</h3>');
			html.push('<div class="'+prim+'">'+fm.i18n('Web file manager')+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('Version')+': '+fm.version+', '+fm.i18n('protocol version')+': '+fm.api+'</div>');
			html.push('<div class="'+sec+'">jQuery/jQuery UI: '+$().jquery+'/'+$.ui.version+'</div>');
			
			html.push(sep);
			
			html.push(linktpl[r](url, 'http://elrte.org/elfider/')[r](link, fm.i18n('Project home')));
			html.push(linktpl[r](url, 'http://elrte.org/elfider/')[r](link, fm.i18n('Documentation')));
			html.push(linktpl[r](url, 'http://github.com/')[r](link, fm.i18n('Fork us on Github')));
			html.push(linktpl[r](url, 'http://twitter.com/')[r](link, fm.i18n('Follow us in twitter')));
			html.push(linktpl[r](url, 'http://facebook.com/')[r](link, fm.i18n('Meet us on facebook')));
			
			html.push(sep);
			
			html.push('<div class="'+prim+'">'+fm.i18n('Team')+'</div>');
			
			html.push(atpl[r](author, 'Dmitry (dio) , dio@std42.ru')[r](work, fm.i18n('chief developer')));
			html.push(atpl[r](author, 'Troex Nevelin, troex@fury.scancode.ru')[r](work, fm.i18n('mantainer')+', '+fm.i18n('developer')));
			html.push(atpl[r](author, 'Alexey Sukhotin')[r](work, fm.i18n('developer')));
			
			if (fm.i18[fm.lang].translator) {
				html.push(atpl[r](author, fm.i18[fm.lang].translator)[r](work, fm.i18n('translator')+' ('+fm.i18[fm.lang].language+')'));
			}

			html.push(sep+sep);
			
			html.push('<div class="'+lic+'">Licence: BSD Licence</div>');
			html.push('<div class="'+lic+'">Copyright © 2009-2011, Studio 42</div>');
			html.push('<div class="'+lic+'">And dont forget your towel</div>');
			html.push('</div>');
			// end main
			
			// shortcuts tab
			html.push('<div id="shortcuts" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			
			if (shortcuts.length) {
				html.push('<div class="ui-widget-content elfinder-help-shortcuts">');
				$.each(shortcuts, function(i, s) {
					html.push(stpl.replace(/\{pattern\}/, s[0]).replace(/\{descrip\}/, s[1]));
				});

				html.push('</div>');
			} else {
				html.push('<div class="elfinder-help-disabled">'+fm.i18n('Shortcuts disabled')+'</div>')
			}
			
			
			html.push('</div>')
			//end shortcuts
			
			// help tab
			html.push('<div id="help" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<a href="http://elrte.org/redmine/projects/elfinder/boards" target="_blank" class="elfinder-dont-panic"><span>DON&apos;T PANIC</span></a>');
			html.push('</div>')
			// end help
			
			html.push('</div>')
			content = $(html.join(''));
			
			content.find('.ui-tabs-nav li')
				.hover(function() {
					$(this).toggleClass('ui-state-hover')
				})
				.children()
				.click(function(e) {
					var link = $(this);
					
					e.preventDefault();
					e.stopPropagation();
					
					if (!link.is('.ui-tabs-selected')) {
						link.parent().addClass('ui-tabs-selected ui-state-active').siblings().removeClass('ui-tabs-selected').removeClass('ui-state-active');
						content.find('.ui-tabs-panel').hide().filter(link.attr('href')).show();
					}
					
				})
				.filter(':first').click()
			
		}, 200)
	})
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		var opts = {
				title : this.title,
				width : 500
			},
			dialog = this.fm.dialog(content, opts);
		
		
	}

}