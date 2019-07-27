/**
 * @class  elFinder command "paste"
 * Paste filesfrom clipboard into directory.
 * If files pasted in its parent directory - files duplicates will created
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.paste = function() {
	"use strict";
	this.updateOnSelect  = false;
	
	this.handlers = {
		changeclipboard : function() { this.update(); }
	};

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
	};
	
	this.exec = function(select, cOpts) {
		var self   = this,
			fm     = self.fm,
			opts   = cOpts || {},
			dst    = select ? this.files(select)[0] : fm.cwd(),
			files  = fm.clipboard(),
			cnt    = files.length,
			cut    = cnt ? files[0].cut : false,
			cmd    = opts._cmd? opts._cmd : (cut? 'move' : 'copy'),
			error  = 'err' + cmd.charAt(0).toUpperCase() + cmd.substr(1),
			fpaste = [],
			fcopy  = [],
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				})
				.always(function() {
					fm.unlockfiles({files : $.map(files, function(f) { return f.hash; })});
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
							title  : fm.i18n(cmd + 'Files'),
							text   : ['errExists', file.name, cmd === 'restore'? 'confirmRest' : 'confirmRepl'], 
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
											files[existed[i]].remove = true;
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
												files[existed[i]].rename = true;
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
						});
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
										return false;
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
					paste     = function(selFiles) {
						var renames = [],
							files  = $.grep(selFiles, function(file) { 
								if (file.rename) {
									renames.push(file.name);
								}
								return !file.remove ? true : false;
							}),
							cnt    = files.length,
							groups = {},
							args   = [],
							targets, reqData;

						if (!cnt) {
							return dfrd.resolve();
						}

						targets = $.map(files, function(f) { return f.hash; });
						
						reqData = {cmd : 'paste', dst : dst.hash, targets : targets, cut : cut ? 1 : 0, renames : renames, hashes : hashes, suffix : fm.options.backupSuffix};
						if (fm.api < 2.1) {
							reqData.src = files[0].phash;
						}
						
						fm.request({
								data   : reqData,
								notify : {type : cmd, cnt : cnt},
								cancel : true,
								navigate : { 
									toast  : opts.noToast? {} : {
										inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmd' + cmd)]), action: {
											cmd: 'open',
											msg: 'cmdopendir',
											data: [dst.hash],
											done: 'select',
											cwdNot: dst.hash
										}}
									}
								}
							})
							.done(function(data) {
								var dsts = {},
									added = data.added && data.added.length? data.added : null;
								if (cut && added) {
									// undo/redo
									$.each(files, function(i, f) {
										var phash = f.phash,
											srcHash = function(name) {
												var hash;
												$.each(added, function(i, f) {
													if (f.name === name) {
														hash = f.hash;
														return false;
													}
												});
												return hash;
											},
											shash = srcHash(f.name);
										if (shash) {
											if (dsts[phash]) {
												dsts[phash].push(shash);
											} else {
												dsts[phash] = [ shash ];
											}
										}
									});
									if (Object.keys(dsts).length) {
										data.undo = {
											cmd : 'move',
											callback : function() {
												var reqs = [];
												$.each(dsts, function(dst, targets) {
													reqs.push(fm.request({
														data : {cmd : 'paste', dst : dst, targets : targets, cut : 1},
														notify : {type : 'undo', cnt : targets.length}
													}));
												});
												return $.when.apply(null, reqs);
											}
										};
										data.redo = {
											cmd : 'move',
											callback : function() {
												return fm.request({
													data : reqData,
													notify : {type : 'redo', cnt : cnt}
												});
											}
										};
									}
								}
								dfrd.resolve(data);
							})
							.fail(function(flg) {
								dfrd.reject();
								if (flg === 0) {
									// canceling
									fm.sync();
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
					
					if (!fm.option('copyOverwrite', dst.hash)) {
						paste(files);
					} else {
						internames = $.map(files, function(f) { return f.name; });
						dst.hash == fm.cwd().hash
							? valid($.map(fm.files(), function(file) { return file.phash == dst.hash ? {hash: file.hash, name: file.name} : null; }))
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
			parents, fparents, cutDfrd;


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
				
				if ($.grep(fparents, function(h) { var d = fm.file(h); return d.phash == dst.hash && d.name == file.name ? true : false; }).length) {
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

		if (dfrd.state() === 'rejected') {
			return dfrd;
		}

		cutDfrd = $.Deferred();
		if (cut && self.options.moveConfirm) {
			fm.confirm({
				title  : 'moveFiles',
				text   : fm.i18n('confirmMove', dst.i18 || dst.name),
				accept : {
					label    : 'btnYes',
					callback : function() {  
						cutDfrd.resolve();
					}
				},
				cancel : {
					label    : 'btnCancel',
					callback : function() {
						cutDfrd.reject();
					}
				}
			});
		} else {
			cutDfrd.resolve();
		}

		cutDfrd.done(function() {
			$.when(
				copy(fcopy),
				paste(fpaste)
			)
			.done(function(cr, pr) {
				dfrd.resolve(pr && pr.undo? pr : void(0));
			})
			.fail(function() {
				dfrd.reject();
			})
			.always(function() {
				cut && fm.clipboard([]);
			});
		}).fail(function() {
			dfrd.reject();
		});
		
		return dfrd;
	};

};
