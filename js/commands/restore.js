/**
 * @class  elFinder command "restore"
 * Restore items from the trash
 *
 * @author Naoki Sawada
 **/
(elFinder.prototype.commands.restore = function() {
	"use strict";
	var self = this,
		fm = this.fm,
		fakeCnt = 0,
		getFilesRecursively = function(files) {
			var dfd = $.Deferred(),
				dirs = [],
				results = [],
				reqs = [],
				phashes = [],
				getFile;
			
			dfd._xhrReject = function() {
				$.each(reqs, function() {
					this && this.reject && this.reject();
				});
				getFile && getFile._xhrReject();
			};
			
			$.each(files, function(i, f) {
				f.mime === 'directory'? dirs.push(f) : results.push(f);
			});
			
			if (dirs.length) {
				$.each(dirs, function(i, d) {
					reqs.push(fm.request({
						data : {cmd  : 'open', target : d.hash},
						preventDefault : true,
						asNotOpen : true
					}));
					phashes[i] = d.hash;
				});
				$.when.apply($, reqs).fail(function() {
					dfd.reject();
				}).done(function() {
					var items = [];
					$.each(arguments, function(i, r) {
						var files;
						if (r.files) {
							if (r.files.length) {
								items = items.concat(r.files);
							} else {
								items.push({
									hash: 'fakefile_' + (fakeCnt++),
									phash: phashes[i],
									mime: 'fakefile',
									name: 'fakefile',
									ts: 0
								});
							}
						}
					});
					fm.cache(items);
					getFile = getFilesRecursively(items).done(function(res) {
						results = results.concat(res);
						dfd.resolve(results);
					});
				});
			} else {
				dfd.resolve(results);
			}
			
			return dfd;
		},
		restore = function(dfrd, files, targets, ops) {
			var rHashes = {},
				others = [],
				found = false,
				dirs = [],
				opts = ops || {},
				id = +new Date(),
				tm, getFile;
			
			fm.lockfiles({files : targets});
			
			dirs = $.map(files, function(f) {
				return f.mime === 'directory'? f.hash : null;
			});
			
			dfrd.done(function() {
				dirs && fm.exec('rm', dirs, {forceRm : true, quiet : true});
			}).always(function() {
				fm.unlockfiles({files : targets});
			});
			
			tm = setTimeout(function() {
				fm.notify({type : 'search', id : id, cnt : 1, hideCnt : true, cancel : function() {
					getFile && getFile._xhrReject();
					dfrd.reject();
				}});
			}, fm.notifyDelay);

			fakeCnt = 0;
			getFile = getFilesRecursively(files).always(function() {
				tm && clearTimeout(tm);
				fm.notify({type : 'search', id: id, cnt : -1, hideCnt : true});
			}).fail(function() {
				dfrd.reject('errRestore', 'errFileNotFound');
			}).done(function(res) {
				var errFolderNotfound = ['errRestore', 'errFolderNotFound'],
					dirTop = '';
				
				if (res.length) {
					$.each(res, function(i, f) {
						var phash = f.phash,
							pfile,
							srcRoot, tPath;
						while(phash) {
							if (srcRoot = fm.trashes[phash]) {
								if (! rHashes[srcRoot]) {
									if (found) {
										// Keep items of other trash
										others.push(f.hash);
										return null; // continue $.each
									}
									rHashes[srcRoot] = {};
									found = true;
								}
		
								tPath = fm.path(f.hash).substr(fm.path(phash).length).replace(/\\/g, '/');
								tPath = tPath.replace(/\/[^\/]+?$/, '');
								if (tPath === '') {
									tPath = '/';
								}
								if (!rHashes[srcRoot][tPath]) {
									rHashes[srcRoot][tPath] = [];
								}
								if (f.mime === 'fakefile') {
									fm.updateCache({removed:[f.hash]});
								} else {
									rHashes[srcRoot][tPath].push(f.hash);
								}
								if (!dirTop || dirTop.length > tPath.length) {
									dirTop = tPath;
								}
								break;
							}
							
							// Go up one level for next check
							pfile = fm.file(phash);
							
							if (!pfile) {
								phash = false;
								// Detection method for search results
								$.each(fm.trashes, function(ph) {
									var file = fm.file(ph),
										filePath = fm.path(ph);
									if ((!file.volumeid || f.hash.indexOf(file.volumeid) === 0) && fm.path(f.hash).indexOf(filePath) === 0) {
										phash = ph;
										return false;
									}
								});
							} else {
								phash = pfile.phash;
							}
						}
					});
					if (found) {
						$.each(rHashes, function(src, dsts) {
							var dirs = Object.keys(dsts),
								cnt = dirs.length;
							fm.request({
								data   : {cmd  : 'mkdir', target : src, dirs : dirs}, 
								notify : {type : 'chkdir', cnt : cnt},
								preventFail : true
							}).fail(function(error) {
								dfrd.reject(error);
								fm.unlockfiles({files : targets});
							}).done(function(data) {
								var cmdPaste, hashes;
								
								if (hashes = data.hashes) {
									cmdPaste = fm.getCommand('paste');
									if (cmdPaste) {
										// wait until file cache made
										fm.one('mkdirdone', function() {
											var hasErr = false;
											$.each(dsts, function(dir, files) {
												if (hashes[dir]) {
													if (files.length) {
														if (fm.file(hashes[dir])) {
															fm.clipboard(files, true);
															fm.exec('paste', [ hashes[dir] ], {_cmd : 'restore', noToast : (opts.noToast || dir !== dirTop)})
															.done(function(data) {
																if (data && (data.error || data.warning)) {
																	hasErr = true;
																}
															})
															.fail(function() {
																hasErr = true;
															})
															.always(function() {
																if (--cnt < 1) {
																	dfrd[hasErr? 'reject' : 'resolve']();
																	if (others.length) {
																		// Restore items of other trash
																		fm.exec('restore', others);
																	}
																}
															});
														} else {
															dfrd.reject(errFolderNotfound);
														}
													} else {
														if (--cnt < 1) {
															dfrd.resolve();
															if (others.length) {
																// Restore items of other trash
																fm.exec('restore', others);
															}
														}
													}
												}
											});
										});
									} else {
										dfrd.reject(['errRestore', 'errCmdNoSupport', '(paste)']);
									}
								} else {
									dfrd.reject(errFolderNotfound);
								}
							});
						});
					} else {
						dfrd.reject(errFolderNotfound);
					}
				} else {
					dfrd.reject('errFileNotFound');
					dirs && fm.exec('rm', dirs, {forceRm : true, quiet : true});
				}
			});
		};
	
	// for to be able to overwrite
	this.restore = restore;

	this.linkedCmds = ['copy', 'paste', 'mkdir', 'rm'];
	this.updateOnSelect = false;
	
	this.init = function() {
		// re-assign for extended command
		self = this;
		fm = this.fm;
	};

	this.getstate = function(sel, e) {
		sel = sel || fm.selected();
		return sel.length && $.grep(sel, function(h) {var f = fm.file(h); return f && ! f.locked && ! fm.isRoot(f)? true : false; }).length == sel.length
			? 0 : -1;
	};
	
	this.exec = function(hashes, opts) {
		var dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			files  = self.files(hashes);

		if (! files.length) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (fm.isRoot(file)) {
				return !dfrd.reject(['errRestore', file.name]);
			}
			if (file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
		});

		if (dfrd.state() === 'pending') {
			this.restore(dfrd, files, hashes, opts);
		}
			
		return dfrd;
	};

}).prototype = { forceLoad : true }; // this is required command
