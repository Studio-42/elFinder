"use strict";
/**
 * @class elFinder ui
 * Display number of files/selected files and its size in statusbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderstat = function(fm) {
	return this.each(function() {
		var size       = $(this).addClass('elfinder-stat-size'),
			sel        = $('<div class="elfinder-stat-selected"/>')
				.on('click', 'a', function(e) {
					var hash = $(this).data('hash');
					e.preventDefault();
					fm.exec('opendir', [ hash ]);
				}),
			titlesize  = fm.i18n('size'),
			titleitems = fm.i18n('items'),
			titlesel   = fm.i18n('selected'),
			setstat    = function(files) {
				var c = 0, 
					s = 0;

				$.each(files, function(i, file) {
					c++;
					s += parseInt(file.size)||0;
				})
				size.html(titleitems+': <span class="elfinder-stat-incsearch"></span>'+c+', '+titlesize+': '+fm.formatSize(s));
			},
			setIncsearchStat = function(data) {
				size.find('span.elfinder-stat-incsearch').html(data? data.hashes.length + ' / ' : '');
			};

		fm.getUI('statusbar').prepend(size).append(sel).show();
		
		fm
		.bind('cwdhasheschange', function(e) {
			setstat($.map(e.data, function(h) { return fm.file(h); }));
		})
		.select(function() {
			var s = 0,
				c = 0,
				files = fm.selectedFiles(),
				dirs = [],
				file;

			if (files.length == 1) {
				file = files[0];
				s = file.size;
				if (fm.searchStatus.state === 2) {
					dirs.push('<a href="#elf_'+file.phash+'" data-hash="'+file.hash+'">'+(file.path? file.path.replace(/\/[^\/]*$/, '') : '..')+'</a>');
				}
				dirs.push(fm.escape(file.i18 || file.name));
				sel.html(dirs.join('/') + (s > 0 ? ', '+fm.formatSize(s) : ''));
				
				return;
			}

			$.each(files, function(i, file) {
				c++;
				s += parseInt(file.size)||0;
			});

			sel.html(c ? titlesel+': '+c+', '+titlesize+': '+fm.formatSize(s) : '&nbsp;');
		})
		.bind('incsearch', function(e) {
			setIncsearchStat(e.data);
		})
		.bind('incsearchend', function() {
			setIncsearchStat();
		})
		;
	})
};
