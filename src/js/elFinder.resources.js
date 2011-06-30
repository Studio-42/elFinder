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
		navdirwrap : 'elfinder-navbar-dir-wrapper',
		searchbtn  : 'elfinder-button-search'
	},
	tpl : {
		perms   : '<span class="elfinder-perms"/>',
		symlink : '<span class="elfinder-symlink"/>'
	},
	error : {
		uknown     : 'Unknown error.',
		jqui       : 'Invalid jQuery UI configuration. Check selectable, draggable and droppable components included.',
		node       : 'elFinder required DOM Element to be created.',
		url        : 'Invalid elFinder configuration! You have to set URL option.',
		access     : 'Access denied.',
		connect    : 'Unable to connect to backend.',
		abort      : 'Connection aborted.',
		timeout    : 'Connection timeout.',
		response   : 'Invalid backend response.',
		json       : 'Data is not JSON.',
		empty      : 'Data is empty.',
		nocmd      : 'Backend request required command name.',
		open       : 'Unable to open "$1".',
		notdir     : 'Object is not a folder.', 
		notfile    : 'Object is not a file.', 
		read       : 'Unable to read "$1".',
		write      : 'Unable to write into "$1".',
		denied     : 'Permission denied.',
		locked     : '"$1" is locked and can not be renamed, moved or removed.',
		exists     : 'File named "$1" already exists in this location.',
		name       : 'Invalid file name.',
		notfound   : 'File not found.',
		popup      : 'Browser prevented opening popup window. To open file enable it in browser options.',
		copy       : 'Unable to copy "$1".',
		move       : 'Unable to move "$1".',
		copyinself : 'Unable to copy "$1" into itself.',
		rm         : 'Unable to remove "$1".',
		extract    : 'Unable to extract files from "$1".',
		archive    : 'Unable to create archive.',
		notarchive : 'File is not archive or has unsupported archive type.'
	},
	
	msg : {
		
	},
	
	mimes : {
		text : [
			'application/javascript', 
			'application/xhtml+xml', 
			'audio/x-mp3-playlist', 
			'application/x-bittorrent', 
			'application/x-web-config',
			'application/docbook+xml',
			'application/x-php',
			'application/x-perl',
			'application/x-awk',
			'application/x-config',
			'application/x-csh',
			'application/xml'
		]
	},
	
	mixin : {
		make : function() {
			var fm     = this.fm,
				cmd    = this.name,
				cwd    = fm.getUI('cwd'),
				errors = fm.errors(),
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

