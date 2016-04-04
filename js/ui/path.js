"use strict";
/**
 * @class elFinder ui
 * Display current folder path in statusbar.
 * Click on folder name in path - open folder
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderpath = function(fm) {
	return this.each(function() {
		var query  = '',
			target = '',
			mimes  = [],
			path   = $(this).addClass('elfinder-path').html('&nbsp;')
				.on('click', 'a', function(e) {
					var hash = $(this).attr('href').substr(5);

					e.preventDefault();
					if (hash != fm.cwd().hash) {
						if (query) {
							fm.exec('search', query, { target: hash, mime: mimes.join(' ') });
						} else {
							fm.exec('open', hash);
						}
					}
				})
				.prependTo(fm.getUI('statusbar').show())

			fm.bind('open searchend parents', function() {
				var dirs = [];

				query  = '';
				target = '';
				mimes  = [];
				
				$.each(fm.parents(fm.cwd().hash), function(i, hash) {
					dirs.push('<a href="#elf_'+hash+'">'+fm.escape(fm.file(hash).name)+'</a>');
				});

				path.html(dirs.join(fm.option('separator')));
			})
			.bind('searchstart', function(e) {
				if (e.data) {
					query  = e.data.query || '';
					target = e.data.target || '';
					mimes  = e.data.mimes || []
				}
			})
			.bind('search', function(e) {
				var dirs = [],
					html = '';
				if (target) {
					$.each(fm.parents(target), function(i, hash) {
						dirs.push('<a href="#elf_'+hash+'">'+fm.escape(fm.file(hash).name)+'</a>');
					});
					html = dirs.join(fm.option('separator'));
				} else {
					html = fm.i18n('btnAll');
				}
				path.html(fm.i18n('searcresult') + ': ' + html);
			});
	});
};
