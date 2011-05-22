
elFinder.prototype.commands.paste = function() {

	this.title = 'Paste files';

	this.handlers = {
		changeclipboard : function() { this.update(); }
	}

	this.shortcuts = [{
		pattern     : 'ctrl+v shift+insert',
		description : 'Paste files'
	}];
	
	this.getstate = function() {
		return 0
		return this.fm.clipboard().length && this.fm.cwd().write ? 0 : -1;
	}
	
	this._exec = function(dst) {
		var fm    = this.fm,
			errors = fm.errors,
			dst   = dst ? fm.file(dst) : fm.cwd(),
			files = fm.clipboard(),
			cnt   = files.length,
			cut   = cnt ? files[0].cut : false,
			dfrd  = $.Deferred().fail(function(error) {
				error && fm.error(error)
			}),
			paste = [],
			duplicate = [],
			parents,
			i, file
			;

		if (!cnt) {
			return dfrd.reject('There no one files in clipboard to paste');
		}
			
		if (!dst) {
			return dfrd.reject('Destination directory not defined.');
		}

		if (dst.mime != 'directory') {
			return dfrd.reject([errors.notDir, dst.name]);
		}
		if (!dst.write)	{
			return dfrd.reject(['Unable paste files because you do not have permissions to write in "$1"', dst.name])
		}
		
		
		parents = fm.parents(dst.hash)
		// fm.log(parents)
		for (i = 0; i < cnt; i++) {
			file = files[i];
			if ($.inArray(file.hash, parents) !== -1) {
				return dfrd.reject(['Unable to copy "$1" into itself or in child folder', file.name])
			}
			if (!file.read) {
				return dfrd.reject([notCopy, file.name]);
			}
			if (cut && file.locked) {
				return dfrd.reject([fileLocked, file.name])
			}

			if (file.phash == dst.hash) {
				duplicate.push(file.hash);
			} else {
				paste.push(file.hash);
			}
		}
		
		fm.log(paste).log(duplicate)
		
		if (fm.newAPI) {
			$.when(
				// $.Deferred().resolve(),
				// $.Deferred().resolve()
				duplicate.length ? fm.exec('duplicate', duplicate) : $.Deferred().resolve(true),
				paste.length ? fm.ajax({cmd : 'paste', current : fm.cwd().hash, files : paste, dst : dst.hash, cut : cut}) : $.Deferred().resolve(true)
			).fail(function() { fm.log('fail') })
			.done(function() { fm.log('done') })
		} else {
			$.when(
				duplicate.length
					? (function() {
						var dfrd = $.Deferred();
						
						$.each(duplicate, function(i, hash) {
							fm.log(hash)
							fm.exec('duplicate', [hash])
							.fail(function(error) {
								fm.log(error)
								dfrd.reject()
							}).done(function() {
								dfrd.resolve()
							})
						})
						return dfrd;
					})()
					: $.Deferred().resolve()
			)
			.fail(function() {
				fm.log('Fail')
			})
			.done(function() {
				fm.log('Done')
			})
		}
		
		return dfrd;	
	}

}