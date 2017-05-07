"use strict";
/**
 * @class  elFinder command "rm"
 * Delete files
 *
 * @author Dmitry (dio) Levashov
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.rm = function() {
	var self = this,
		fm = this.fm,
		tpl = '<div class="ui-helper-clearfix elfinder-rm-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}<div class="elfinder-rm-desc">{desc}</div></div>',
		confirm = function(dfrd, targets, files, tHash, addTexts) {
			var cnt = targets.length,
				cwd = fm.cwd().hash,
				descs = [],
				dialog, text, tmb, size, f, fname;
			
			if (cnt > 1) {
				if (!$.map(files, function(f) { return f.mime == 'directory' ? 1 : null ; }).length) {
					size = 0;
					$.each(files, function(h, f) { 
						if (f.size && f.size != 'unknown') {
							var s = parseInt(f.size);
							if (s >= 0 && size >= 0) {
								size += s;
							}
						} else {
							size = 'unknown';
							return false;
						}
					});
					descs.push(fm.i18n('size')+': '+fm.formatSize(size));
				}
				text = [$(tpl.replace('{class}', 'elfinder-cwd-icon-group').replace('{title}', '<strong>' + fm.i18n('items')+ ': ' + cnt + '</strong>').replace('{desc}', descs.join('<br>')))];
			} else {
				f = files[0];
				tmb = fm.tmb(f);
				if (f.size) {
					descs.push(fm.i18n('size')+': '+fm.formatSize(f.size));
				}
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
							toTrash(dfrd, targets, tHash);
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
		},
		toTrash = function(dfrd, targets, tHash) {
			var dsts = {},
				dirs, cnt;
			
			$.each(targets, function(i, h) {
				var path = fm.path(h).replace(/\\/g, '/'),
					m = path.match(/^[^\/]+?(\/(?:[^\/]+?\/)*)[^\/]+?$/);
				
				if (m) {
					m[1] = m[1].replace(/(^\/.*?)\/?$/, '$1');
					if (! dsts[m[1]]) {
						dsts[m[1]] = [];
					}
					dsts[m[1]].push(h);
				}
			});
			
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
						err = ['errTrash'],
						res = {},
						hasNtf = function() {
							return fm.ui.notify.children('.elfinder-notify-trash').length;
						},
						hashes, hasNtf, tm, prg, prgSt;
					
					if (hashes = data.hashes) {
						prg = 1 / cnt * 100;
						prgSt = 1;
						tm = setTimeout(function() {
							fm.notify({type : 'trash', cnt : 1, hideCnt : true, progress : prgSt});
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
													hashes = $.map(targets, function(h) {
														return $.inArray(h, res.removed) === -1? h : null;
													});
												}
												if (hashes.length) {
													if (err > end) {
														end = (fm.messages[err[end-1]] || '').indexOf('$') === -1? end : end + 1;
													}
													self.exec(hashes, { addTexts: err.slice(0, end) });
												} else {
													fm.error(err);
												}
											}
											res._noSound = true;
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
					if (!$.map(targets, function(h) { return h.indexOf(root1st) !== 0? 1 : null ; }).length) {
						thash = fm.option('trashHash', targets[0]);
					}
				} else {
					thash = fm.option('trashHash', targets[0]);
				}
			}
			return thash;
		};
	
	fm.bind('contextmenu', function(e) {
		self.update(void(0), getTHash(e.data.targets)? 'trash' : 'rm');
	});
	
	this.syncTitleOnChange = true;
	this.updateOnSelect = true;
	this.shortcuts = [{
		pattern     : 'delete ctrl+backspace shift+delete'
	}];
	this.handlers = {
		'open' : function() {
			self.update(void(0), fm.i18n(self.fm.option('trashHash')? 'trash' : 'rm'));
		}
	}
	
	this.init = function() {
		self.change(function() {
			delete self.extra;
			self.title = fm.i18n('cmd' + self.value);
			self.className = self.value;
			self.button.children('span.elfinder-button-icon')[self.value === 'trash'? 'addClass' : 'removeClass']('elfinder-button-icon-trash');
			if (self.value === 'trash') {
				self.extra = {
					icon: 'rm',
					node: $('<span/>')
						.attr({title: fm.i18n('cmdrm')})
						.on('click touchstart', function(e){
							if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
								return;
							}
							e.stopPropagation();
							e.preventDefault();
							self.exec(void(0), {forceRm : true});
						})
				};
			}
		});
	}
	
	this.getstate = function(sel) {
		var name;
		sel = sel || fm.selected();
		if (sel && sel.length) {
			self.value = getTHash(sel)? 'trash' : 'rm';
		}
		return sel.length && $.map(sel, function(h) { var f = fm.file(h); return f && ! f.locked && ! fm.isRoot(f)? h : null }).length == sel.length
			? 0 : -1;
	}
	
	this.exec = function(hashes, opts) {
		var opts   = opts || {},
			dfrd   = $.Deferred()
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
			cnt     = files.length
			
			if (addTexts || forceRm || (self.event && self.event.originalEvent && self.event.originalEvent.shiftKey)) {
				tHash = '';
				self.title = fm.i18n('cmdrm');
			}
			
			if (tHash === null) {
				tHash = getTHash(targets);
			}
			
			fm.lockfiles({files : targets});
			
			if (tHash && self.options.quickTrash) {
				toTrash(dfrd, targets, tHash);
			} else {
				if (quiet) {
					remove(dfrd, targets, quiet);
				} else {
					confirm(dfrd, targets, files, tHash, addTexts);
				}
			}
		}
			
		return dfrd;
	}

};
