"use strict";
/**
 * @class elFinder command "empty".
 * Empty the folder
 *
 * @type  elFinder.command
 * @author  Naoki Sawada
 */
elFinder.prototype.commands.empty = function() {
	var fm = this.fm,
		self = this,
		selFiles = function(sel) {
			var sel = self.files(sel);
			if (!sel.length) {
				sel = [ fm.cwd() ];
			}
			return sel;
		};
	
	this.linkedCmds = ['rm'];
	
	this.getstate = function(sel) {
		var sel = selFiles(sel),
			cnt;
		
		cnt = sel.length;
		return $.map(sel, function(f) { return f.write && f.mime === 'directory' ? f : null  }).length == cnt ? 0 : -1;
	}
	
	this.exec = function(hashes) {
		var dirs = selFiles(hashes),
			cnt  = dirs.length,
			dfrd = $.Deferred()
				.done(function() {
					var data = {changed: {}};
					fm.toast({msg: fm.i18n(['"'+success.join('", ')+'"', 'complete', fm.i18n('cmdempty')])});
					$.each(dirs, function(i, dir) {
						data.changed[dir.hash] = dir;
					});
					fm.change(data);
				})
				.always(function() {
					var cwd = fm.cwd().hash;
					fm.trigger('selectfiles', {files: $.map(dirs, function(d) { return cwd === d.phash? d.hash : null; })});
				}),
			success = [],
			done = function(res) {
				if (typeof res === 'number') {
					success.push(dirs[res].name);
					delete dirs[res].dirs;
				} else {
					res && fm.error(res);
				}
				(--cnt < 1) && dfrd[success.length? 'resolve' : 'reject']();
			};

		$.each(dirs, function(i, dir) {
			var tm;
			if (!(dir.write && dir.mime === 'directory')) {
				done(['errEmpty', dir.name, 'errPerm']);
				return null;
			}
			if (!fm.isCommandEnabled('rm', dir.hash)) {
				done(['errCmdNoSupport', '"rm"']);
				return null;
			}
			tm = setTimeout(function() {
				fm.notify({type : 'search', cnt : 1, hideCnt : cnt > 1? false : true});
			}, fm.notifyDelay);
			fm.request({
				data : {cmd  : 'open', target : dir.hash},
				preventDefault : true,
				asNotOpen : true
			}).done(function(data) {
				var targets = [];
				tm && clearTimeout(tm);
				if (fm.ui.notify.children('.elfinder-notify-search').length) {
					fm.notify({type : 'search', cnt : -1, hideCnt : cnt > 1? false : true});
				}
				if (data && data.files && data.files.length) {
					if (data.files.length > fm.maxTargets) {
						done(['errEmpty', dir.name, 'errMaxTargets', fm.maxTargets]);
					} else {
						fm.updateCache(data);
						$.each(data.files, function(i, f) {
							if (!f.write || f.locked) {
								done(['errEmpty', dir.name, 'errRm', f.name, 'errPerm']);
								targets = [];
								return false;
							}
							targets.push(f.hash);
						});
						if (targets.length) {
							fm.exec('rm', targets, { _userAction : true, addTexts : [ fm.i18n('folderToEmpty', dir.name) ] })
							.fail(function(error) {
								fm.trigger('unselectfiles', {files: fm.selected()});
								done(error || '');
							})
							.done(function() { done(i); });
						}
					}
				} else {
					fm.toast({ mode: 'warning', msg: fm.i18n('filderIsEmpty', dir.name)});
					done('');
				}
			}).fail(function(error) {
				done(error || '');
			});
		});
		
		return dfrd;
	}

};
