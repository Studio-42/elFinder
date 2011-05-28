elFinder.prototype.mixins = {
	make : function() {
		var fm     = this.fm,
			cmd    = this.name,
			cwd    = fm.getUI('cwd'),
			errors = fm.errors,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				})
				.always(function() {
					input.remove();
					node.remove();
					fm.enable();
				}),
			id    = 'tmp_'+parseInt(Math.random()*100000),
			phash = fm.cwd().hash,
			file   = {
				hash  : id,
				name  : fm.uniqueName(this.prefix),
				mime  : this.mime,
				read  : true,
				write : true
			},
			input = $('<input type="text"/>')
				.keydown(function(e) {
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

						if (!name) {
							return dfrd.reject(errors.invName);
						}
						if (fm.fileByName(name, phash)) {
							return dfrd.reject([errors.nameExists, name]);
						}
						
						parent.html(fm.escape(name));

						fm.lockfiles({files : [id]});
						fm.ajax({
								data   : {cmd : cmd, name : name, current : phash, target : phash}, // current - for old api
								notify : {type : cmd, cnt : 1},
								preventFail : true
							})
							.fail(function(error) {
								dfrd.reject(error)
							})
							.done(function(data) {
								dfrd.resolve(data);
							});
						
					}
				}),
			node = cwd.trigger('create.'+fm.namespace, file).find('#'+id);
			
		if (!node.length) {
			return dfrd.reject(errors.invParams);
		}
			
		fm.disable();
		node.find('.elfinder-cwd-filename').empty('').append(input.val(file.name));
		input.select().focus();

		return dfrd;
		
		
		
	}
}