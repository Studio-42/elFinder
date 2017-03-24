"use strict";
/**
 * @class  elFinder command "paste"
 * Paste filesfrom clipboard into directory.
 * If files pasted in its parent directory - files duplicates will created
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.paste = function() {
	
	this.updateOnSelect  = false;
	
	this.handlers = {
		changeclipboard : function() { this.update(); }
	}

	this.shortcuts = [{
		pattern     : 'ctrl+v shift+insert'
	}];
	
	this.getstate = function(dst) {
		if (this._disabled) {
			return -1;
		}
		if (dst) {
			if (Array.isArray(dst)) {
				if (dst.length != 1) {
					return -1;
				}
				dst = this.fm.file(dst[0]);
			}
		} else {
			dst = this.fm.cwd();
		}

		return this.fm.clipboard().length && dst.mime == 'directory' && dst.write ? 0 : -1;
	}
	
	this.exec = function(dst) {
		var self   = this,
			fm     = self.fm,
			dst    = dst ? this.files(dst)[0] : fm.cwd(),
			files  = fm.clipboard(),
			cnt    = files.length,
			cut    = cnt ? files[0].cut : false,
			error  = cut ? 'errMove' : 'errCopy',
			fpaste = [],
			fcopy  = [],
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				})
				.always(function() {
					fm.unlockfiles({files : $.map(files, function(f) { return f.hash})});
				}),
			copy  = function(files) {
				return files.length && fm._commands.duplicate
					? fm.exec('duplicate', files)
					: $.Deferred().resolve();
			},
			paste = function(files) {
				var dfrd      = $.Deferred(),
					existed   = [],
					hashes  = {},
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
							title  : fm.i18n(cut ? 'moveFiles' : 'copyFiles'),
							text   : ['errExists', file.name, 'confirmRepl'], 
							all    : !last,
							accept : {
								label    : 'btnYes',
								callback : function(all) {
									!last && !all
										? confirm(++ndx)
										: paste(files);
								}
							},
							reject : {
								label    : 'btnNo',
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
								label    : 'btnCancel',
								callback : function() {
									dfrd.resolve();
								}
							},
							buttons : [
								{
									label : 'btnBackup',
									callback : function(all) {
										var i;
										if (all) {
											i = existed.length;
											while (ndx < i--) {
												files[existed[i]].rename = true
											}
										} else {
											files[existed[ndx]].rename = true;
										}
										!last && !all
											? confirm(++ndx)
											: paste(files);
									}
								}
							]
						})
					},
					valid     = function(names) {
						var exists = {}, existedArr;
						if (names) {
							if (Array.isArray(names)) {
								if (names.length) {
									if (typeof names[0] == 'string') {
										// elFinder <= 2.1.6 command `is` results
										existed = intersect(files, names);
									} else {
										$.each(names, function(i, v) {
											exists[v.name] = v.hash;
										});
										existed = intersect(files, $.map(exists, function(h, n) { return n; }));
										$.each(files, function(i, file) {
											if (exists[file.name]) {
												hashes[exists[file.name]] = file.name;
											}
										});
									}
								}
							} else {
								existedArr = [];
								existed = $.map(names, function(n) {
									if (typeof n === 'string') {
										return n;
									} else {
										// support to >=2.1.11 plugin Normalizer, Sanitizer
										existedArr = existedArr.concat(n);
										return null;
									}
								});
								if (existedArr.length) {
									existed = existed.concat(existedArr);
								}
								existed = intersect(files, existed);
								hashes = names;
							}
						}
						existed.length ? confirm(0) : paste(files);
					},
					paste     = function(files) {
						var renames = [],
							files  = $.map(files, function(file) { 
								if (file.rename) {
									renames.push(file.name);
								}
								return !file.remove ? file : null;
							}),
							cnt    = files.length,
							groups = {},
							args   = [],
							src;

						if (!cnt) {
							return dfrd.resolve();
						}

						src = files[0].phash;
						files = $.map(files, function(f) { return f.hash; });
						
						fm.request({
								data   : {cmd : 'paste', dst : dst.hash, targets : files, cut : cut ? 1 : 0, src : src, renames : renames, hashes : hashes, suffix : fm.options.backupSuffix},
								notify : {type : cut ? 'move' : 'copy', cnt : cnt}
							})
							.done(function(data) {
								var newItem, node;
								dfrd.resolve(data);
								if (data && data.added && data.added[0]) {
									fm.one('pastedone', function() {
										newItem = fm.findCwdNodes(data.added);
										if (newItem.length) {
											newItem.trigger('scrolltoview');
										} else {
											if (dst.hash !== fm.cwd().hash) {
												node = $('<div/>').append(
													$('<button type="button" class="ui-button ui-widget ui-state-default ui-corner-all"><span class="ui-button-text">'+fm.i18n('cmdopendir')+'</span></button>')
													.on('mouseenter mouseleave', function(e) { 
														$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
													}).on('click', function() {
														fm.exec('open', dst.hash).done(function() {
															fm.one('opendone', function() {
																fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
															});
														});
													})
												);
											} else {
												fm.trigger('selectfiles', {files : $.map(data.added, function(f) {return f.hash;})});
											}
											fm.toast({msg: fm.i18n(['complete', fm.i18n('cmd' + (cut ? 'move' : 'copy'))]), extNode: node});
										}
									});
								}
							})
							.always(function() {
								fm.unlockfiles({files : files});
							});
					},
					internames;

				if (!fm.isCommandEnabled(self.name, dst.hash) || !files.length) {
					return dfrd.resolve();
				}
				
				if (fm.oldAPI) {
					paste(files);
				} else {
					
					if (!fm.option('copyOverwrite')) {
						paste(files);
					} else {
						internames = $.map(files, function(f) { return f.name});
						dst.hash == fm.cwd().hash
							? valid($.map(fm.files(), function(file) { return file.phash == dst.hash ? {hash: file.hash, name: file.name} : null }))
							: fm.request({
								data : {cmd : 'ls', target : dst.hash, intersect : internames},
								notify : {type : 'prepare', cnt : 1, hideCnt : true},
								preventFail : true
							})
							.always(function(data) {
								valid(data.list);
							});
					}
				}
				
				return dfrd;
			},
			parents, fparents;


		if (!cnt || !dst || dst.mime != 'directory') {
			return dfrd.reject();
		}
			
		if (!dst.write)	{
			return dfrd.reject([error, files[0].name, 'errPerm']);
		}
		
		parents = fm.parents(dst.hash);
		
		$.each(files, function(i, file) {
			if (!file.read) {
				return !dfrd.reject([error, file.name, 'errPerm']);
			}
			
			if (cut && file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
			
			if ($.inArray(file.hash, parents) !== -1) {
				return !dfrd.reject(['errCopyInItself', file.name]);
			}
			
			if (file.mime && file.mime !== 'directory' && ! fm.uploadMimeCheck(file.mime, dst.hash)) {
				return !dfrd.reject([error, file.name, 'errUploadMime']);
			}
			
			fparents = fm.parents(file.hash);
			fparents.pop();
			if ($.inArray(dst.hash, fparents) !== -1) {
				
				if ($.map(fparents, function(h) { var d = fm.file(h); return d.phash == dst.hash && d.name == file.name ? d : null }).length) {
					return !dfrd.reject(['errReplByChild', file.name]);
				}
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

		if (dfrd.state() == 'rejected') {
			return dfrd;
		}

		return $.when(
			copy(fcopy),
			paste(fpaste)
		).always(function() {
			cut && fm.clipboard([]);
		});
	}

};
