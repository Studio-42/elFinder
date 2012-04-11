"use strict";
/**
 * @class  elFinder command "help"
 * "About" dialog
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.help = function() {
	var fm   = this.fm,
		self = this,
		linktpl = '<div class="elfinder-help-link"> <a href="{url}">{link}</a></div>',
		atpl    = '<div class="elfinder-help-team"><div>{author}</div>{work}</div>',
		url     = /\{url\}/,
		link    = /\{link\}/,
		author  = /\{author\}/,
		work    = /\{work\}/,
		r       = 'replace',
		prim    = 'ui-priority-primary',
		sec     = 'ui-priority-secondary',
		lic     = 'elfinder-help-license',
		tab     = '<li class="ui-state-default ui-corner-top"><a href="#{id}">{title}</a></li>',
		html    = ['<div class="ui-tabs ui-widget ui-widget-content ui-corner-all elfinder-help">', 
				'<ul class="ui-tabs-nav ui-helper-reset ui-helper-clearfix ui-widget-header ui-corner-all">'],
		stpl    = '<div class="elfinder-help-shortcut"><div class="elfinder-help-shortcut-pattern">{pattern}</div> {descrip}</div>',
		sep     = '<div class="elfinder-help-separator"/>',
		
		
		about = function() {
			html.push('<div id="about" class="ui-tabs-panel ui-widget-content ui-corner-bottom"><div class="elfinder-help-logo"/>')
			html.push('<h3>elFinder</h3>');
			html.push('<div class="'+prim+'">'+fm.i18n('webfm')+'</div>');
			html.push('<div class="'+sec+'">'+fm.i18n('ver')+': '+fm.version+', '+fm.i18n('protocol')+': '+fm.api+'</div>');
			html.push('<div class="'+sec+'">jQuery/jQuery UI: '+$().jquery+'/'+$.ui.version+'</div>');
			
			html.push(sep);
			
			html.push(linktpl[r](url, 'http://elfinder.org/')[r](link, fm.i18n('homepage')));
			html.push(linktpl[r](url, 'https://github.com/Studio-42/elFinder/wiki')[r](link, fm.i18n('docs')));
			html.push(linktpl[r](url, 'https://github.com/Studio-42/elFinder')[r](link, fm.i18n('github')));
			html.push(linktpl[r](url, 'http://twitter.com/elrte_elfinder')[r](link, fm.i18n('twitter')));
			
			html.push(sep);
			
			html.push('<div class="'+prim+'">'+fm.i18n('team')+'</div>');
			
			html.push(atpl[r](author, 'Dmitry "dio" Levashov &lt;dio@std42.ru&gt;')[r](work, fm.i18n('chiefdev')));
			html.push(atpl[r](author, 'Troex Nevelin &lt;troex@fury.scancode.ru&gt;')[r](work, fm.i18n('maintainer')));
			html.push(atpl[r](author, 'Alexey Sukhotin &lt;strogg@yandex.ru&gt;')[r](work, fm.i18n('contributor')));
			html.push(atpl[r](author, 'Naoki Sawada &lt;hypweb@gmail.com&gt;')[r](work, fm.i18n('contributor')));
			
			fm.i18[fm.lang].translator && html.push(atpl[r](author, fm.i18[fm.lang].translator)[r](work, fm.i18n('translator')+' ('+fm.i18[fm.lang].language+')'));
			
			html.push(sep);
			html.push('<div class="'+lic+'">'+fm.i18n('icons')+': <a href="http://pixelmixer.ru/" target="_blank">Pixelmixer</a>, <a href="http://p.yusukekamiyamane.com" target="_blank">Fugue</a></div>');
			
			html.push(sep);
			html.push('<div class="'+lic+'">Licence: BSD Licence</div>');
			html.push('<div class="'+lic+'">Copyright © 2009-2011, Studio 42</div>');
			html.push('<div class="'+lic+'">„ …'+fm.i18n('dontforget')+' ”</div>');
			html.push('</div>');
		},
		shortcuts = function() {
			var sh = fm.shortcuts();
			// shortcuts tab
			html.push('<div id="shortcuts" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			
			if (sh.length) {
				html.push('<div class="ui-widget-content elfinder-help-shortcuts">');
				$.each(sh, function(i, s) {
					html.push(stpl.replace(/\{pattern\}/, s[0]).replace(/\{descrip\}/, s[1]));
				});
			
				html.push('</div>');
			} else {
				html.push('<div class="elfinder-help-disabled">'+fm.i18n('shortcutsof')+'</div>')
			}
			
			
			html.push('</div>')
			
		},
		help = function() {
			// help tab
			html.push('<div id="help" class="ui-tabs-panel ui-widget-content ui-corner-bottom">');
			html.push('<a href="http://elfinder.org/forum/" target="_blank" class="elfinder-dont-panic"><span>DON\'T PANIC</span></a>');
			html.push('</div>');
			// end help
		},
		content;
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.state = 0;
	
	this.shortcuts = [{
		pattern     : 'f1',
		description : this.title
	}];
	
	setTimeout(function() {
		var parts = self.options.view || ['about', 'shortcuts', 'help'];
		
		$.each(parts, function(i, title) {
			html.push(tab[r](/\{id\}/, title)[r](/\{title\}/, fm.i18n(title)));
		});
		
		html.push('</ul>');

		$.inArray('about', parts) !== -1 && about();
		$.inArray('shortcuts', parts) !== -1 && shortcuts();
		$.inArray('help', parts) !== -1 && help();
		
		html.push('</div>');
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
			.filter(':first').click();
		
	}, 200)
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function() {
		if (!this.dialog) {
			this.dialog = this.fm.dialog(content, {title : this.title, width : 530, autoOpen : false, destroyOnClose : false});
		}
		
		this.dialog.elfinderdialog('open').find('.ui-tabs-nav li a:first').click();
	}

}
