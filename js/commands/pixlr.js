elFinder.prototype.commands.pixlr = function() {
	this.updateOnSelect = false;

	this.getstate = function(sel) {
		var fm = this.fm;
		var sel = fm.selectedFiles();
		return !this._disabled && sel.length == 1 && sel[0].read && sel[0].mime.indexOf('image/') !== -1 && fm.file(sel[0].phash) && fm.file(sel[0].phash).write ? 0 : -1;
	};

	this.exec = function(hashes) {
		var fm    = this.fm,
		dfrd  = $.Deferred().fail(function(error) { error && fm.error(error); }),
		files = this.files(hashes),
		cnt   = files.length,
		fire = function(mode) {
			var file, url, target, exit;
			file = files[0];
			
			target = fm.options.url;
			target = target + (target.indexOf('?') === -1 ? '?' : '&')
				+ 'cmd=pixlr'
				+ '&target=' + file.phash
				+ '&node=' + encodeURIComponent(fm.id);

			exit = fm.options.url;
			exit = exit + (exit.indexOf('?') === -1 ? '?' : '&')
				+ 'cmd=pixlr';
			
			url = 'http://pixlr.com/'+mode+'/?image=' + encodeURIComponent(fm.url(file.hash))
				+ '&target=' + encodeURIComponent(target)
				+ '&title=' + encodeURIComponent('pixlr_'+file.name)
				+ '&exit=' + encodeURIComponent(exit);
			
			if (!window.open(url)) {
				return dfrd.reject('errPopup');
			}
		},
		selector = $('<div/>'),
		opts    = {
			title : 'Pixlr Editor or Pixlr Express ?',
			width : 'auto',
			close : function() { $(this).elfinderdialog('destroy'); }
		}
		;
		
		if (!cnt) {
			return dfrd.reject();
		}
		
		selector.css('text-align', 'center')
		        .append($('<button/>').css('margin', '30px').append('Pixlr Editor').button().click(
					function(){
						fire('editor');
						$(this).elfinderdialog('destroy');
						return false;
					}))
		        .append($('<button/>').css('margin', '30px').append('Pixlr Express').button().click(
		        	function(){
		        		fire('express');
		        		$(this).elfinderdialog('destroy');
		        		return false;
		        	}));
		
		dialog = fm.dialog(selector, opts);

		return dfrd.resolve();
	};
};