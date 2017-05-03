"use strict";
/**
 * @class  elFinder command "restore"
 * Restore items from the trash
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.restore = function() {
	var self = this,
		fm = this.fm,
		restore = function(dfrd, files, targets) {
			var rHashes = {},
				others = [],
				found = false;
			
			fm.lockfiles({files : targets});
			
			$.each(files, function(i, f) {
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
						rHashes[srcRoot][tPath].push(f.hash);
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
					})
					.fail(function(error) {
						dfrd.reject(error);
						fm.unlockfiles({files : targets});
					})
					.done(function(data) {
						var margeRes = function(data) {
								$.each(data, function(k, v) {
									if (Array.isArray(v)) {
										if (res[k]) {
											res[k] = res[k].concat(v);
										} else {
											res[k] = v;
										}
									}
								});
								if (data.sync) {
									res.sync = 1;
								}
							},
							err = ['errRestore'],
							res = {},
							hasNtf = function() {
								return fm.ui.notify.children('.elfinder-notify-restore').length;
							},
							hashes, hasNtf, tm, prg, prgSt;
						
						if (hashes = data.hashes) {
							prg = 1 / cnt * 100;
							prgSt = 1;
							tm = setTimeout(function() {
								fm.notify({type : 'restore', cnt : 1, hideCnt : true, progress : prgSt});
							}, fm.notifyDelay);
							$.each(dsts, function(dir, files) {
								if (hashes[dir]) {
									fm.request({
										data   : {cmd : 'paste', dst : hashes[dir], targets : files, cut : 1},
										preventDefault : true
									})
									.fail(function(error) {
										if (error) {
											err = err.concat(error);
										}
									})
									.done(function(data) {
										margeRes(data);
										if (data.warning) {
											err = err.concat(data.warning);
											delete data.warning;
										}
										// fire some event to update cache/ui
										data.removed && data.removed.length && fm.remove(data);
										data.added   && data.added.length   && fm.add(data);
										data.changed && data.changed.length && fm.change(data);
										// fire event with command name
										fm.trigger('paste', data);
										// fire event with command name + 'done'
										fm.trigger('pastedone');
										// force update content
										data.sync && fm.sync();
									})
									.always(function() {
										var hashes, addTexts, end = 2;
										if (hasNtf()) {
											fm.notify({type : 'restore', cnt : 0, hideCnt : true, progress : prg});
										} else {
											prgSt+= prg;
										}
										if (--cnt < 1) {
											tm && clearTimeout(tm);
											hasNtf() && fm.notify({type : 'restore', cnt  : -1});
											fm.unlockfiles({files : targets});
											if (Object.keys(res).length) {
												if (err.length > 1) {
													fm.error(err);
												}
												dfrd.done(res);
											} else {
												dfrd.reject(err);
											}
											if (others.length) {
												// Restore items of other trash
												fm.exec('restore', others);
											}
										}
									});
								}
							});
						} else {
							dfrd.reject('errFolderNotFound');
							fm.unlockfiles({files : targets});
						}
					});
				});
			} else {
				fm.unlockfiles({files : targets});
				dfrd.reject('errRestore');
			}
		};
	
	this.updateOnSelect  = false;
	this.shortcuts = [{
		pattern     : 'ctrl+z'
	}];
	
	this.getstate = function(sel, e) {
		sel = sel || fm.selected();
		return sel.length && $.map(sel, function(h) {var f = fm.file(h); return f && ! f.locked && ! fm.isRoot(f)? h : null }).length == sel.length
			? 0 : -1;
	}
	
	this.exec = function(hashes) {
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
			restore(dfrd, files, hashes);
		}
			
		return dfrd;
	}

};
