/**
 * @class elFinder plugin
 * Display number of files/selected files and its size in statusbar
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.plugins.stat = function(fm) {
	var size       = $('<span class="elfinder-plugin-stat-size"/>'),
		sel        = $('<span class="elfinder-plugin-stat-selected"/>'),
		titlesize  = fm.i18n('size'),
		titleitems = fm.i18n('items'),
		titlesel   = fm.i18n('selected items');
		
	fm.one('load', function() {
		fm.getUI('statusbar').append(size.add(sel)).show();
	})
	.bind('open reload add remove change', function() {
		var cwd = fm.cwd().hash,
			c = 0, 
			s = 0;
		
		$.each(fm.files(), function(i, file) {
			if (file.phash == cwd) {
				c++;
				s += file.size||0
			}
		})
		size.html(titleitems+': '+c+' '+titlesize+': '+fm.formatSize(s));
	})
	.select(function() {
		var s = 0,
			c = 0;
			
		$.each(fm.selectedFiles(), function(i, file) {
			c++;
			s += file.size||0
		});
		
		sel.html(c ? titlesel+': '+c+' '+titlesize+': '+fm.formatSize(s) : '');
	});
	
}