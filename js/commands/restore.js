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
			dfrd.fail(function() {
				fm.unlockfiles({files : targets});
			});
			
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
						var cmdPaste, hashes;
						
						if (hashes = data.hashes) {
							cmdPaste = fm.getCommand('paste');
							if (cmdPaste) {
								$.each(dsts, function(dir, files) {
									if (hashes[dir]) {
										fm.clipboard(files, true);
										cmdPaste.exec([ hashes[dir] ], {_cmd : 'restore'})
										.always(function() {
											if (--cnt < 1) {
												dfrd.resolve();
												if (others.length) {
													// Restore items of other trash
													fm.exec('restore', others);
												}
											}
										});
									}
								});
							} else {
								dfrd.reject(['errRestore', 'errCmdNoSupport', '(paste)']);
							}
						} else {
							dfrd.reject('errFolderNotFound');
						}
					});
				});
			} else {
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
