
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
		var fm     = this.fm,
			errors = fm.errors,
			dst    = dst ? fm.file(dst) : fm.cwd(),
			files  = fm.clipboard(),
			cnt    = files.length,
			cut    = cnt ? files[0].cut : false,
			dfrd   = $.Deferred().fail(function(error) {
				error && fm.error(error)
			}),
			paste     = [],
			duplicate = [],
			dopaste, doduplicate,
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
		
		
		parents = fm.parents(dst.hash);

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
		
		doduplicate = function() {
			return duplicate.length && fm._commands.duplicate
				? function() { return fm.exec('duplicate', duplicate) }
				: $.Deferred.resolve();
		}
		
		dopaste = function() {
			var phash = fm.cwd().hash,
				nim = 0, 
				dfrd = $.Deferred();
				
			if (paste.length) {
				if (fm.newAPI) {
					return fm.ajax({
							data   : {cmd : paste, targets : paste, current : phash, cut : cut},
							notify : {type : 'paste', cnt : paste.length}
						});
				} 
				
				dfrd= $.Deferred();
				
				$.each(paste, function(i, hash) {
					fm.ajax({
						data : {cmd : 'paste', current : phash, src : fm.file(hash).phash, dst : dst, targets : [hash]},
						notify : {type : 'paste', cnt : 1}
					})
					.fail(function(error) {
						num++;
						if (!dfrd.isRejected()) {
							dfrd.reject(error);
						}
					})
					.done(function() {
						if (++num == paste.length && !dfrd.isRejected()) {
							dfrd.resolve();
						}
					});
				});
				
				return dfrd;
			}
			
			return dfrd.resolve();
		}
		
		$.when(
				dopaste(),
				doduplicate()
			)
			.fail(function(error) {
				dfrd.reject(error);
			})
			.done(function() {
				dfrd.resolve();
			});
		
		return dfrd;	
	}

}