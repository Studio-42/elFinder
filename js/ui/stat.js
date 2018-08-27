/**
 * @class elFinder ui
 * Display number of files/selected files and its size in statusbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderstat = function(fm) {
	"use strict";
	return this.each(function() {
		var size       = $(this).addClass('elfinder-stat-size'),
			sel        = $('<div class="elfinder-stat-selected"/>')
				.on('click', 'a', function(e) {
					var hash = $(this).data('hash');
					e.preventDefault();
					fm.exec('opendir', [ hash ]);
				}),
			titleitems = fm.i18n('items'),
			titlesel   = fm.i18n('selected'),
			titlesize  = fm.i18n('size'),
			setstat    = function(files) {
				var c = 0, 
					s = 0,
					cwd = fm.cwd(),
					calc = true,
					hasSize = true;

				if (cwd.sizeInfo || cwd.size) {
					s = cwd.size;
					calc = false;
				}
				$.each(files, function(i, file) {
					c++;
					if (calc) {
						s += parseInt(file.size) || 0;
						if (hasSize === true && file.mime === 'directory' && !file.sizeInfo) {
							hasSize = false;
						}
					}
				});
				size.html(titleitems+': <span class="elfinder-stat-incsearch"></span>'+c+',&nbsp;<span class="elfinder-stat-size'+(hasSize? ' elfinder-stat-size-recursive' : '')+'">'+fm.i18n(hasSize? 'sum' : 'size')+': '+fm.formatSize(s)+'</span>')
					.attr('title', size.text());
				fm.trigger('uistatchange');
			},
			setIncsearchStat = function(data) {
				size.find('span.elfinder-stat-incsearch').html(data? data.hashes.length + ' / ' : '');
				size.attr('title', size.text());
				fm.trigger('uistatchange');
			},
			setSelect = function(files) {
				var s = 0,
					c = 0,
					dirs = [],
					path, file;

				if (files.length === 1) {
					file = files[0];
					s = file.size;
					if (fm.searchStatus.state === 2) {
						path = fm.escape(file.path? file.path.replace(/\/[^\/]*$/, '') : '..');
						dirs.push('<a href="#elf_'+file.phash+'" data-hash="'+file.hash+'" title="'+path+'">'+path+'</a>');
					}
					dirs.push(fm.escape(file.i18 || file.name));
					sel.html(dirs.join('/') + (s > 0 ? ', '+fm.formatSize(s) : ''));
				} else if (files.length) {
					$.each(files, function(i, file) {
						c++;
						s += parseInt(file.size)||0;
					});
					sel.html(c ? titlesel+': '+c+', '+titlesize+': '+fm.formatSize(s) : '&nbsp;');
				} else {
					sel.html('');
				}
				sel.attr('title', sel.text());
				fm.trigger('uistatchange');
			};

		fm.getUI('statusbar').prepend(size).append(sel).show();
		if (fm.UA.Mobile && $.fn.tooltip) {
			fm.getUI('statusbar').tooltip({
				classes: {
					'ui-tooltip': 'elfinder-ui-tooltip ui-widget-shadow'
				},
				tooltipClass: 'elfinder-ui-tooltip ui-widget-shadow',
				track: true
			});
		}
		
		fm
		.bind('cwdhasheschange', function(e) {
			setstat($.map(e.data, function(h) { return fm.file(h); }));
		})
		.change(function(e) {
			var files = e.data.changed || [],
				cwdHash = fm.cwd().hash;
			$.each(files, function() {
				if (this.hash === cwdHash) {
					if (this.size) {
						size.children('.elfinder-stat-size').addClass('elfinder-stat-size-recursive').html(fm.i18n('sum')+': '+fm.formatSize(this.size));
						size.attr('title', size.text());
					}
					return false;
				}
			});
		})
		.select(function() {
			setSelect(fm.selectedFiles());
		})
		.bind('open', function() {
			setSelect([]);
		})
		.bind('incsearch', function(e) {
			setIncsearchStat(e.data);
		})
		.bind('incsearchend', function() {
			setIncsearchStat();
		})
		;
	});
};
