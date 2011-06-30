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
			sel        = $('<div class="elfinder-stat-selected"/>'),
			titlesize  = fm.i18n(fm.res('msg', 'size')),
			titleitems = fm.i18n(fm.res('msg', 'items')),
			titlesel   = fm.i18n(fm.res('msg', 'selitems')),
			setstat    = function(files, cwd) {
				var c = 0, 
					s = 0;

				$.each(files, function(i, file) {
					if (!cwd || file.phash == cwd) {
						c++;
						s += file.size||0
					}
				})
				size.html(titleitems+': '+c+', '+titlesize+': '+fm.formatSize(s));
			};

		fm.getUI('statusbar').prepend(size).append(sel).show();
		
		fm
		.bind('open reload add remove change searchend', function() {
			setstat(fm.files(), fm.cwd().hash)
		})
		.search(function(e) {
			setstat(e.data.files);
		})
		.select(function() {
			var s = 0,
				c = 0;

			$.each(fm.selectedFiles(), function(i, file) {
				c++;
				s += file.size||0
			});

			sel.html(c ? titlesel+': '+c+', '+titlesize+': '+fm.formatSize(s) : '&nbsp;');
		})

		;
	})
}