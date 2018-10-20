/**
 * @class  elFinder command "rm"
 * Delete files
 *
 * @author Dmitry (dio) Levashov
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.rm = function() {
	"use strict";
	var self = this,
		fm = this.fm,
		tpl = '<div class="ui-helper-clearfix elfinder-rm-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}<div class="elfinder-rm-desc">{desc}</div></div>',
		confirm = function(dfrd, targets, files, tHash, addTexts) {
			var cnt = targets.length,
				cwd = fm.cwd().hash,
				descs = [],
				spinner = fm.i18n('calc') + '<span class="elfinder-spinner"/>',
				dialog, text, tmb, size, f, fname;
			
			if (cnt > 1) {
				size = 0;
				$.each(files, function(h, f) { 
					if (f.size && f.size != 'unknown' && f.mime !== 'directory') {
						var s = parseInt(f.size);
						if (s >= 0 && size >= 0) {
							size += s;
						}
					} else {
						size = 'unknown';
						return false;
					}
				});
				getSize = (size === 'unknown');
				descs.push(fm.i18n('size')+': '+(getSize? spinner : fm.formatSize(size)));
				text = [$(tpl.replace('{class}', 'elfinder-cwd-icon-group').replace('{title}', '<strong>' + fm.i18n('items')+ ': ' + cnt + '</strong>').replace('{desc}', descs.join('<br>')))];
			} else {
				f = files[0];
				tmb = fm.tmb(f);
				getSize = (f.mime === 'directory');
				descs.push(fm.i18n('size')+': '+(getSize? spinner : fm.formatSize(f.size)));
				descs.push(fm.i18n('modify')+': '+fm.formatDate(f));
				fname = fm.escape(f.i18 || f.name).replace(/([_.])/g, '&#8203;$1');
				text = [$(tpl.replace('{class}', fm.mime2class(f.mime)).replace('{title}', '<strong>' + fname + '</strong>').replace('{desc}', descs.join('<br>')))];
			}
			
			if (addTexts) {
				text = text.concat(addTexts);
			}
			
			text.push(tHash? 'confirmTrash' : 'confirmRm');
			
			dialog = fm.confirm({
				title  : self.title,
				text   : text,
				accept : {
					label    : 'btnRm',
					callback : function() {  
						if (tHash) {
							self.toTrash(dfrd, targets, tHash);
						} else {
							remove(dfrd, targets);
						}
					}
				},
				cancel : {
					label    : 'btnCancel',
					callback : function() {
						fm.unlockfiles({files : targets});
						if (targets.length === 1 && fm.file(targets[0]).phash !== cwd) {
							fm.select({selected : targets});
						} else {
							fm.selectfiles({files : targets});
						}
						dfrd.reject();
					}
				}
			});
			// load thumbnail
			if (tmb) {
				$('<img/>')
					.on('load', function() { dialog.find('.elfinder-cwd-icon').addClass(tmb.className).css('background-image', "url('"+tmb.url+"')"); })
					.attr('src', tmb.url);
			}
			
			if (getSize) {
				getSize = fm.getSize($.map(files, function(f) { return f.mime === 'directory'? f.hash : null; })).done(function(data) {
					dialog.find('span.elfinder-spinner').parent().html(fm.i18n('size')+': '+data.formated);
				}).fail(function() {
					dialog.find('span.elfinder-spinner').parent().html(fm.i18n('size')+': '+fm.i18n('unknown'));
				}).always(function() {
					getSize = false;
				});
			}
		},
		toTrash = function(dfrd, targets, tHash) {
			var dsts = {},
				itemCnt = targets.length,
				maxCnt = self.options.toTrashMaxItems,
				checkDirs = [],
				reqDfd = $.Deferred(),
				req, dirs, cnt;
			
			if (itemCnt > maxCnt) {
				self.confirm(dfrd, targets, self.files(targets), null, [fm.i18n('tooManyToTrash')]);
				return;
			}
			
			// Directory preparation preparation and directory enumeration
			$.each(targets, function(i, h) {
				var file = fm.file(h),
					path = fm.path(h).replace(/\\/g, '/'),
					m = path.match(/^[^\/]+?(\/(?:[^\/]+?\/)*)[^\/]+?$/);
				
				if (file) {
					if (m) {
						m[1] = m[1].replace(/(^\/.*?)\/?$/, '$1');
						if (! dsts[m[1]]) {
							dsts[m[1]] = [];
						}
						dsts[m[1]].push(h);
					}
					if (file.mime === 'directory') {
						checkDirs.push(h);
					}
				}
			});
			
			// Check directory information
			if (checkDirs.length) {
				req = fm.request({
					data : {cmd : 'size', targets : checkDirs},
					notify : {type: 'readdir', cnt: 1, hideCnt: true},
					preventDefault : true
				}).done(function(data) {
					var cnt = 0;
					data.fileCnt && (cnt += parseInt(data.fileCnt));
					data.dirCnt && (cnt += parseInt(data.dirCnt));
					reqDfd[cnt > maxCnt ? 'reject' : 'resolve']();
				}).fail(function() {
					reqDfd.reject();
				});
				setTimeout(function() {
					var xhr = (req && req.xhr)? req.xhr : null;
					if (xhr && xhr.state() == 'pending') {
						req.syncOnFail(false);
						req.reject();
						reqDfd.reject();
					}
				}, self.options.infoCheckWait * 1000);
			} else {
				reqDfd.resolve();
			}
			
			// Directory creation and paste command execution
			reqDfd.done(function() {
				dirs = Object.keys(dsts);
				cnt = dirs.length;
				if (cnt) {
					fm.request({
						data   : {cmd  : 'mkdir', target : tHash, dirs : dirs}, 
						notify : {type : 'chkdir', cnt : cnt},
						preventFail : true
					})
					.fail(function(error) {
						dfrd.reject(error);
						fm.unlockfiles({files : targets});
					})
					.done(function(data) {
						var margeRes = function(data, phash, reqData) {
								var undo, prevUndo, redo, prevRedo;
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
								if (data.added && data.added.length) {
									undo = function() {
										var targets = [],
											dirs    = $.map(data.added, function(f) { return f.mime === 'directory'? f.hash : null; });
										$.each(data.added, function(i, f) {
											if ($.inArray(f.phash, dirs) === -1) {
												targets.push(f.hash);
											}
										});
										return fm.exec('restore', targets, {noToast: true});
									};
									redo = function() {
										return fm.request({
											data   : reqData,
											notify : {type : 'redo', cnt : targets.length}
										});
									};
									if (res.undo) {
										prevUndo = res.undo;
										res.undo = function() {
											undo();
											prevUndo();
										};
									} else {
										res.undo = undo;
									}
									if (res.redo) {
										prevRedo = res.redo;
										res.redo = function() {
											redo();
											prevRedo();
										};
									} else {
										res.redo = redo;
									}
								}
							},
							err = ['errTrash'],
							res = {},
							hasNtf = function() {
								return fm.ui.notify.children('.elfinder-notify-trash').length;
							},
							hashes, tm, prg, prgSt;
						
						if (hashes = data.hashes) {
							prg = 1 / cnt * 100;
							prgSt = cnt === 1? 100 : 5;
							tm = setTimeout(function() {
								fm.notify({type : 'trash', cnt : 1, hideCnt : true, progress : prgSt});
							}, fm.notifyDelay);
							$.each(dsts, function(dir, files) {
								var phash = fm.file(files[0]).phash,
									reqData;
								if (hashes[dir]) {
									reqData = {cmd : 'paste', dst : hashes[dir], targets : files, cut : 1};
									fm.request({
										data : reqData,
										preventDefault : true
									})
									.fail(function(error) {
										if (error) {
											err = err.concat(error);
										}
									})
									.done(function(data) {
										data = fm.normalize(data);
										fm.updateCache(data);
										margeRes(data, phash, reqData);
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
										var hashes = [], addTexts, end = 2;
										if (hasNtf()) {
											fm.notify({type : 'trash', cnt : 0, hideCnt : true, progress : prg});
										} else {
											prgSt+= prg;
										}
										if (--cnt < 1) {
											tm && clearTimeout(tm);
											hasNtf() && fm.notify({type : 'trash', cnt  : -1});
											fm.unlockfiles({files : targets});
											if (Object.keys(res).length) {
												if (err.length > 1) {
													if (res.removed || res.removed.length) {
														hashes = $.grep(targets, function(h) {
															return $.inArray(h, res.removed) === -1? true : false;
														});
													}
													if (hashes.length) {
														if (err.length > end) {
															end = (fm.messages[err[end-1]] || '').indexOf('$') === -1? end : end + 1;
														}
														dfrd.reject();
														fm.exec('rm', hashes, { addTexts: err.slice(0, end), forceRm: true });
													} else {
														fm.error(err);
													}
												}
												res._noSound = true;
												if (res.undo && res.redo) {
													res.undo = {
														cmd : 'trash',
														callback : res.undo,
													};
													res.redo = {
														cmd : 'trash',
														callback : res.redo
													};
												}
												dfrd.resolve(res);
											} else {
												dfrd.reject(err);
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
				} else {
					dfrd.reject(['error', 'The folder hierarchy to be deleting can not be determined.']);
					fm.unlockfiles({files : targets});
				}
			}).fail(function() {
				self.confirm(dfrd, targets, self.files(targets), null, [fm.i18n('tooManyToTrash')]);
			});
		},
		remove = function(dfrd, targets, quiet) {
			var notify = quiet? {} : {type : 'rm', cnt : targets.length};
			fm.request({
				data   : {cmd  : 'rm', targets : targets}, 
				notify : notify,
				preventFail : true
			})
			.fail(function(error) {
				dfrd.reject(error);
			})
			.done(function(data) {
				if (data.error || data.warning) {
					data.sync = true;
				}
				dfrd.resolve(data);
			})
			.always(function() {
				fm.unlockfiles({files : targets});
			});
		},
		getTHash = function(targets) {
			var thash = null,
				root1st;
			
			if (targets && targets.length) {
				if (targets.length > 1 && fm.searchStatus.state === 2) {
					root1st = fm.file(fm.root(targets[0])).volumeid;
					if (!$.grep(targets, function(h) { return h.indexOf(root1st) !== 0? true : false ; }).length) {
						thash = fm.option('trashHash', targets[0]);
					}
				} else {
					thash = fm.option('trashHash', targets[0]);
				}
			}
			return thash;
		},
		getSize = false;
	
	// for to be able to overwrite
	this.confirm = confirm;
	this.toTrash = toTrash;
	this.remove = remove;

	this.syncTitleOnChange = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace shift+delete'
	}];
	this.value = 'rm';
	
	this.init = function() {
		// re-assign for extended command
		self = this;
		fm = this.fm;
		// bind function of change
		self.change(function() {
			var targets;
			delete self.extra;
			self.title = fm.i18n('cmd' + self.value);
			self.className = self.value;
			self.button && self.button.children('span.elfinder-button-icon')[self.value === 'trash'? 'addClass' : 'removeClass']('elfinder-button-icon-trash');
			if (self.value === 'trash') {
				self.extra = {
					icon: 'rm',
					node: $('<span/>')
						.attr({title: fm.i18n('cmdrm')})
						.on('ready', function(e, data) {
							targets = data.targets;
						})
						.on('click touchstart', function(e){
							if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
								return;
							}
							e.stopPropagation();
							e.preventDefault();
							fm.getUI().trigger('click'); // to close the context menu immediately
							fm.exec('rm', targets, {_userAction: true, forceRm : true});
						})
				};
			}
		});
	};
	
	this.getstate = function(select) {
		var sel   = this.hashes(select);
		
		return sel.length && $.grep(sel, function(h) { var f = fm.file(h); return f && ! f.locked && ! fm.isRoot(f)? true : false; }).length == sel.length
			? 0 : -1;
	};
	
	this.exec = function(hashes, cOpts) {
		var opts   = cOpts || {},
			dfrd   = $.Deferred()
				.always(function() {
					if (getSize && getSize.state && getSize.state() === 'pending') {
						getSize.reject();
					}
				})
				.fail(function(error) {
					error && fm.error(error);
				}).done(function(data) {
					!opts.quiet && !data._noSound && data.removed && data.removed.length && fm.trigger('playsound', {soundFile : 'rm.wav'});
				}),
			files  = self.files(hashes),
			cnt    = files.length,
			tHash  = null,
			addTexts = opts.addTexts? opts.addTexts : null,
			forceRm = opts.forceRm,
			quiet = opts.quiet,
			targets;

		if (! cnt) {
			return dfrd.reject();
		}
		
		$.each(files, function(i, file) {
			if (fm.isRoot(file)) {
				return !dfrd.reject(['errRm', file.name, 'errPerm']);
			}
			if (file.locked) {
				return !dfrd.reject(['errLocked', file.name]);
			}
		});

		if (dfrd.state() === 'pending') {
			targets = self.hashes(hashes);
			cnt     = files.length;
			
			if (forceRm || (self.event && self.event.originalEvent && self.event.originalEvent.shiftKey)) {
				tHash = '';
				self.title = fm.i18n('cmdrm');
			}
			
			if (tHash === null) {
				tHash = getTHash(targets);
			}
			
			fm.lockfiles({files : targets});
			
			if (tHash && self.options.quickTrash) {
				self.toTrash(dfrd, targets, tHash);
			} else {
				if (quiet) {
					remove(dfrd, targets, quiet);
				} else {
					self.confirm(dfrd, targets, files, tHash, addTexts);
				}
			}
		}
			
		return dfrd;
	};

	fm.bind('select contextmenucreate closecontextmenu', function(e) {
		var targets = (e.data? (e.data.selected || e.data.targets) : null) || fm.selected();
		if (targets && targets.length) {
			self.update(void(0), (targets? getTHash(targets) : fm.option('trashHash'))? 'trash' : 'rm');
		}
	});

};
