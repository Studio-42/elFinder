elFinder.prototype.resources = {
	'class' : {
		hover      : 'ui-state-hover',
		active     : 'ui-state-active',
		disabled   : 'ui-state-disabled',
		draggable  : 'ui-draggable',
		droppable  : 'ui-droppable',
		adroppable : 'elfinder-droppable-active',
		cwdfile    : 'elfinder-cwd-file',
		cwd        : 'elfinder-cwd',
		navdir     : 'elfinder-navbar-dir',
		navdirwrap : 'elfinder-navbar-dir-wrapper'
	},
	tpl : {
		perms : '<span class="elfinder-perms"/>',
		symlink : '<span class="elfinder-symlink"/>'
	},
	error : {
		
	},
	
	msg : {
		
	},
	
	mixin : {
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
				date = new Date(),
				file   = {
					hash  : id,
					name  : fm.uniqueName(this.prefix),
					mime  : this.mime,
					read  : true,
					write : true,
					date  : 'Today '+date.getHours()+':'+date.getMinutes()
				},
				node = cwd.trigger('create.'+fm.namespace, file).find('#'+id),
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
								return dfrd.reject(errors.name);
							}
							if (fm.fileByName(name, phash)) {
								return dfrd.reject([errors.exists, name]);
							}

							parent.html(fm.escape(name));

							fm.lockfiles({files : [id]});

							fm.ajax({
									data        : {cmd : cmd, name : name, current : phash, target : phash}, // current - for old api
									notify      : {type : cmd, cnt : 1},
									preventFail : true,
									syncOnFail  : true
								})
								.fail(function(error) {
									dfrd.reject(error);
								})
								.done(function(data) {
									dfrd.resolve(data);
								});
						}
					});


			if (!node.length) {
				return dfrd.reject();
			}

			fm.disable();
			node.find('.elfinder-cwd-filename').empty('').append(input.val(file.name));
			input.select().focus();

			return dfrd;



		}
		
	}
}

