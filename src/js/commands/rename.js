elFinder.prototype.commands.rename = function() {
	var self     = this,
		fm       = self.fm,
		filename = '.elfinder-cwd-filename';

	this.disableOnSearch = true;
	
	this.getstate = function() {
		var sel = fm.selectedFiles();

		return sel.length == 1 && sel[0].phash && !sel[0].locked  ? 0 : -1;
	}
	
	this.init = function() {
		var o          = fm.options,
			name       = 'rename',
			title      = self.title,
			enter      = o.enter      == name,
			shiftenter = o.shiftenter == name,
			ctrlenter  = o.ctrlenter  == name,
			callback   = function() { self.exec(); };

		fm.one('load', function() {
			enter && fm.shortcut({
				pattern     : 'enter',
				description : title,
				callback    : callback
			});
			
			shiftenter && fm.shortcut({
				pattern     : 'shift+enter',
				description : title,
				callback    : callback
			});
			
			ctrlenter && fm.shortcut({
				pattern     : 'ctrl+enter',
				description : title,
				callback    : callback
			});
		})
	}
	
	this.exec = function() {
		var fm     = this.fm,
			cwd    = fm.getUI('cwd'),
			sel    = fm.selected(),
			cnt    = sel.length,
			errors = fm.errors,
			file   = fm.file(sel.shift()),
			dfrd   = $.Deferred()
				.fail(function(error) {
					var parent = input.parent(),
						name   = fm.escape(file.name);

					error && fm.error(error);
					if (parent.length) {
						input.remove();
						parent.html(name);
					} else {
						cwd.find('#'+file.hash).find(filename).html(name);
					}
				})
				.always(function() {
					fm.enable();
				}),
			input = $('<input type="text"/>')
				.keydown(function(e) {
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (e.keyCode == $.ui.keyCode.ESCAPE) {
						dfrd.reject();
					} else if (e.keyCode == $.ui.keyCode.ENTER) {
						input.blur();
					}
				})
				.mousedown(function(e) {
					e.stopPropagation();
				})
				.blur(function() {
					var name   = $.trim(input.val()),
						parent = input.parent();
					
					if (parent.length) {
						if (name == file.name) {
							return dfrd.reject();
						}
						if (!name) {
							return dfrd.reject(errors.invName);
						}
						if (fm.fileByName(name, file.phash)) {
							return dfrd.reject([errors.exists, name]);
						}
						
						parent.html(fm.escape(name));
						fm.lockfiles({files : [file.hash]});
						fm.ajax({
								data   : {cmd : 'rename', target : file.hash, name : name, current : file.phash},
								notify : {type : 'rename', cnt : 1}
							})
							.fail(function(error) {
								dfrd.reject();
								fm.sync();
							})
							.done(function(data) {
								dfrd.resolve(data);
							})
							.always(function() {
								fm.unlockfiles({files : [file.hash]})
							});
						
					}
				}),
			node = cwd.find('#'+file.hash).find(filename).empty().append(input.val(file.name));
		
		// fm.log(cwd.find('#'+file.hash+' .'+filename))
		
		if (!file || cnt > 1 || !node.length) {
			return dfrd.reject(errors.invParams);
		}
		
		if (file.locked) {
			return dfrd.reject([errors.locked, file.name]);
		}
		
		fm.disable();
		input.select().focus();
		
		return dfrd;
	}

}