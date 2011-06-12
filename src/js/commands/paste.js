
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
		// return 0
		return this.fm.clipboard().length && this.fm.cwd().write ? 0 : -1;
	}
	
	this.exec = function(dst) {
		var fm = this.fm;
		var d = this._exec(dst)
			.fail(function(error) {
				fm.log('error').log(error)
			})
			.done(function() {
				// fm.log('data').log(arguments)
			})
		
		return d
	}
	
	this._exec = function(dst) {
		var fm     = this.fm,
			errors = fm.errors,
			dst    = dst ? fm.file(dst) : fm.cwd(),
			files  = fm.clipboard(),
			cnt    = files.length,
			cut    = cnt ? files[0].cut : false,
			error  = errors[cut ? 'move' : 'copy'],
			fpaste = [],
			fcopy  = [],
			dfrd   = $.Deferred()
				.fail(function(error) {
					fm.error(error)
				}),
			copy  = function(files) {
				return files.length && fm._commands.duplicate
					? fm.exec('duplicate', files)
					: $.Deferred().resolve();
			},
			paste = function(files) {
				var dfrd      = $.Deferred(),
					existed   = [],
					intersect = function(files, names) {
						var ret = [], 
							i   = files.length;

						while (i--) {
							$.inArray(files[i].name, names) !== -1 && ret.unshift(i);
						}
						return ret;
					},
					confirm   = function(ndx) {
						var i    = existed[ndx],
							file = files[i],
							last = ndx == existed.length-1;

						if (!file) {
							return;
						}

						fm.confirm({
							title  : 'Move file',
							text   : 'File '+file.name+' exists. Replace',
							all    : !last,
							accept : {
								label    : 'Replace',
								callback : function(all) {
									!last && !all
										? confirm(++ndx)
										: paste(files);
								}
							},
							reject : {
								label    : 'No',
								callback : function(all) {
									var i;

									if (all) {
										i = existed.length;
										while (ndx < i--) {
											files[existed[i]].remove = true
										}
									} else {
										files[existed[ndx]].remove = true;
									}

									!last && !all
										? confirm(++ndx)
										: paste(files);
								}
							},
							cancel : {
								label    : 'Cancel',
								callback : function() {
									dfrd.resolve();
								}
							}
						})
					},
					valid     = function(names) {
						existed = intersect(files, names);
						if (existed.length) {
							confirm(0);
						} else {
							paste(files);
						}
					},
					paste     = function(files) {
						var files  = $.map(files, function(file) { return !file.remove ? file : null } ),
							cnt    = files.length,
							groups = {},
							args   = [];

						if (!cnt) {
							return dfrd.resolve();
						}

						if (fm.oldAPI) {
							$.each(files, function(i, file) {
								if (!groups[file.phash]) {
									groups[file.phash] = [];
								}

								groups[file.phash].push(file.hash);
							});

							$.each(groups, function(src, targets) {
								args.push(function() {
									return fm.ajax({
										data   : {cmd : 'paste', current : fm.cwd().hash, src : src, dst : dst.hash, targets : targets, cut : cut ? 1 : 0},
										notify : {type : cut ? 'move' : 'copy', cnt : targets.length}
									});
								});
							});

							return fm.waterfall.apply(null, args)
								.fail(function(error) {
									dfrd.reject(error);
								})
								.done(function() {
									dfrd.resolve.apply(dfrd, Array.prototype.slice.apply(arguments));
								});
						} 
						
						// new API
						files = $.map(files, function(f) { return f.hash});
						fm.trigger('lockfiles', {files : files})
							.ajax({
								data   : {cmd : 'paste', dst : dst.hash, targets : files, cut : cut ? 1 : 0},
								notify : {type : cut ? 'move' : 'copy', cnt : cnt}
							})
							.always(function() {
								fm.trigger('unlockfiles', {files : files});
							});
					}
					;
				
				if (!files.length) {
					return dfrd.resolve();
				}
					
				if (fm.oldAPI) {
					paste(files);
				} else {
					
					if (!fm.option('copyOverwrite')) {
						paste(files);
					} else {
						dst.hash == fm.cwd().hash
							? valid($.map(fm.files(), function(file) { return file.phash == dst.hash ? file.name : null }))
							: fm.ajax({
								data : {cmd : 'ls', target : dst.hash},
								preventFail : true
							})
							.always(function(data) {
								valid(data.list || [])
							});
					}
				}
				
				return dfrd;
			},
			parents = fm.parents(dst.hash);


		if (!cnt || !dst || dst.mime != 'directory') {
			return dfrd.reject();
		}
			
		if (!dst.write)	{
			return dfrd.reject([error, files[0].name, errors.perm]);
		}
		
		$.each(files, function(i, file) {
			if (!file.read) {
				return !dfrd.reject([error, files[0].name, errors.perm]);
			}
			
			if (cut && file.locked) {
				return !dfrd.reject([errors.locked, file.name]);
			}
			
			if ($.inArray(file.hash, parents) !== -1) {
				return !dfrd.reject([errors.copyinself, file.name]);
			}
			
			if (file.phash == dst.hash) {
				fcopy.push(file.hash);
			} else {
				fpaste.push({
					hash  : file.hash,
					phash : file.phash,
					name  : file.name
				});
			}
		});
		
		return $.when(
			copy(fcopy),
			paste(fpaste)
		);
	}

}