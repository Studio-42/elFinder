
elFinder.prototype.commands.quicklook.plugins = [
	
	/**
	 * Images preview plugin
	 *
	 * @param elFinder.commands.quicklook
	 **/
	function(ql) {
		var mimes   = ['image/jpeg', 'image/png', 'image/gif'],
			win     = ql.window,
			preview = ql.preview;
		
		// what kind of images we can display
		$.each(navigator.mimeTypes, function(i, o) {
			var mime = o.type;
			
			if (mime.indexOf('image/') === 0 && $.inArray(mime, mimes)) {
				mimes.push(mime);
			} 
		});
			
		win.bind('preview', function(e) {
			var file = e.file,
				img, prop;
			
			if ($.inArray(file.mime, mimes) !== -1) {
				e.stopImmediatePropagation();

				img = $('<img/>')
					.hide()
					.appendTo(preview)
					.load(function() {
						
						setTimeout(function() {
							prop = (img.width()/img.height()).toFixed(2);
							preview.bind('resize', function() {
								var pw = parseInt(preview.width()),
									ph = parseInt(preview.height()),
									w, h;

								if (prop < (pw/ph).toFixed(2)) {
									h = ph;
									w = Math.floor(h * prop);
								} else {
									w = pw;
									h = Math.floor(w/prop);
								}
								img.width(w).height(h).css('margin-top', h < ph ? Math.floor((ph - h)/2) : 0);

							})
							.trigger('resize');

							ql.info.stop(true).hide();
							img.fadeIn(100);
						}, 1)
						
					})
					.attr('src', ql.fm.url(file.hash));
			}
			
		});
	},
	
	function(ql) {
		var mimes   = ['image/jpeg', 'image/png', 'image/gif'],
			win     = ql.window,
			preview = ql.preview;
			
		win.bind('preview', function(e) {
			ql.fm.log('event')
		})
	}
	
]