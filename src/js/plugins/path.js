/**
 * @class elFinder plugin
 * Display current folder path in statusbar.
 * Click on folder name in path - open folder
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.plugins.path = function(fm) {
	var path = $('<span class="elfinder-plugin-path">&nbsp;</span>')
			.delegate('a', 'click', function(e) {
				var hash = $(this).attr('href').substr(1);
				
				e.preventDefault();
				hash != fm.cwd().hash && fm.exec('open', hash);
			});
	
	fm.one('load', function() {
		fm.getUI('statusbar').prepend(path).show();
	})
	.bind('open searchend', function() {
		var dirs = [];

		$.each(fm.parents(fm.cwd().hash), function(i, hash) {
			dirs.push('<a href="#'+hash+'">'+fm.escape(fm.file(hash).name)+'</a>');
		});
		
		path.html(dirs.join(fm.option('separator')));
	})
	.bind('search', function() {
		path.html(fm.i18n('Search results'))
	});
	
}