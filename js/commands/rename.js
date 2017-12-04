"use strict";
/**
 * @class elFinder command "rename". 
 * Rename selected file.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.rename = function() {
	this.noChangeDirOnRemovedCwd = true;
	
	this.shortcuts = [{
		pattern     : 'f2'+(this.fm.OS == 'mac' ? ' enter' : '')
	}];
	
	this.getstate = function(sel) {
		var fm  = this.fm,
			sel = this.files(sel),
			cnt = sel.length,
			phash, ext, brk;
		
		if (!cnt) {
			return -1;
		}
		
		if (sel.length > 1 && sel[0].phash) {
			phash = sel[0].phash;
			ext = fm.splitFileExtention(sel[0].name)[1];
		}

		return ((sel.length === 1 && !sel[0].locked && !fm.isRoot(sel[0])) || (fm.api > 2.1030 && cnt === $.map(sel, function(f) {
			if (!brk && !f.locked && f.phash === phash && !fm.isRoot(f) && ext === fm.splitFileExtention(f.name)[1]) {
				return f;
			} else {
				brk = true;
				return null;
			}
		}).length)) ? 0 : -1;
	};
	
	this.exec = function(hashes, opts) {
		var fm       = this.fm,
			cwd      = fm.getUI('cwd'),
			sel      = hashes || (fm.selected().length? fm.selected() : false) || [fm.cwd().hash],
			cnt      = sel.length,
			file     = fm.file(sel.shift()),
			filename = '.elfinder-cwd-filename',
			opts     = opts || {},
			incwd    = (fm.cwd().hash == file.hash),
			type     = opts._currentType? opts._currentType : (incwd? 'navbar' : 'files'),
			navbar   = (type === 'navbar'),
			target   = $('#'+fm[navbar? 'navHash2Id' : 'cwdHash2Id'](file.hash)),
			tarea    = (type !== 'navbar' && fm.storage('view') != 'list'),
			split    = function(name) {
				var ext = fm.splitFileExtention(name)[1];
				return [name.substr(0, name.length - ext.length - 1), ext];
			},
			unselect = function() {
				setTimeout(function() {
					input && input.blur();
				}, 50);
			},
			rest     = function(){
				if (!overlay.is(':hidden')) {
					overlay.elfinderoverlay('hide').off('click', cancel);
				}
				pnode.removeClass('ui-front')
					.css('position', '')
					.off('unselect.'+fm.namespace, unselect);
				if (tarea) {
					node && node.css('max-height', '');
				} else if (!navbar) {
					pnode.css('width', '')
						.parent('td').css('overflow', '');
				}
			}, colwidth,
			dfrd     = $.Deferred()
				.fail(function(error) {
					var parent = input.parent(),
						name   = fm.escape(file.i18 || file.name);

					input.off();
					if (tarea) {
						name = name.replace(/([_.])/g, '&#8203;$1');
					}
					setTimeout(function() {
						if (navbar) {
							input.replaceWith(name);
						} else {
							if (parent.length) {
								input.remove();
								parent.html(name);
							} else {
								target.find(filename).html(name);
								setTimeout(function() {
									cwd.find('#'+fm.cwdHash2Id(file.hash)).click();
								}, 50);
							}
						}
					}, 0);
					error && fm.error(error);
				})
				.always(function() {
					rest();
					fm.unbind('resize', resize);
					fm.enable();
				}),
			blur = function(e) {
				var name   = $.trim(input.val()),
				splits = fm.splitFileExtention(name),
				valid  = true,
				data = {},
				req = function() {
					input.off();
					rest();
					
					data = {
						cmd : 'rename',
						name : name,
						target : file.hash
					};
					if (cnt > 1) {
						data['targets'] = sel;
					}
					
					(navbar? input : node).html(fm.escape(name));
					fm.lockfiles({files : [file.hash]});
					fm.request({
							data   : data,
							notify : {type : 'rename', cnt : cnt},
							navigate : {}
						})
						.fail(function(error) {
							dfrd.reject();
							if (! error || ! Array.isArray(error) || error[0] !== 'errRename') {
								fm.sync();
							}
						})
						.done(function(data) {
							if (data.added && data.added.length && cnt === 1) {
								data.undo = {
									cmd : 'rename',
									callback : function() {
										return fm.request({
											data   : {cmd : 'rename', target : data.added[0].hash, name : file.name},
											notify : {type : 'undo', cnt : 1}
										});
									}
								};
								data.redo = {
									cmd : 'rename',
									callback : function() {
										return fm.request({
											data   : {cmd : 'rename', target : file.hash, name : name},
											notify : {type : 'rename', cnt : 1}
										});
									}
								};
							}
							dfrd.resolve(data);
							if (incwd) {
								fm.exec('open', data.added[0].hash);
							}
						})
						.always(function() {
							fm.unlockfiles({files : [file.hash]});
						}
					);
				};

				if (!overlay.is(':hidden')) {
					pnode.css('z-index', '');
				}
				if (name === '') {
					return cancel();
				}
				if (!inError && pnode.length) {
					
					input.off('blur');
					
					if (cnt === 1 && name === file.name) {
						return dfrd.reject();
					}
					if (fm.options.validName && fm.options.validName.test) {
						try {
							valid = fm.options.validName.test(name);
						} catch(e) {
							valid = false;
						}
					}
					if (!name || name === '.' || name === '..' || !valid) {
						inError = true;
						fm.error(file.mime === 'directory'? 'errInvDirname' : 'errInvName', {modal: true, close: select});
						return false;
					}
					if (cnt === 1 && fm.fileByName(name, file.phash)) {
						inError = true;
						fm.error(['errExists', name], {modal: true, close: select});
						return false;
					}
					
					if (cnt === 1) {
						req();
					} else {
						fm.confirm({
							title : 'cmdrename',
							text  : ['renameMultiple', cnt, '"'+splits[0]+'1.'+splits[1]+'", "'+splits[0]+'2.'+splits[1]+'"'],
							accept : {
								label : 'btnYes',
								callback : req
							},
							cancel : {
								label : 'btnCancel',
								callback : function() {
									setTimeout(function() {
										inError = true;
										select();
									}, 120);
								}
							}
						});
					}
				}
			},
			input = $(tarea? '<textarea/>' : '<input type="text"/>')
				.on('keyup text', function(){
					if (tarea) {
						this.style.height = '1px';
						this.style.height = this.scrollHeight + 'px';
					} else if (colwidth) {
						this.style.width = colwidth + 'px';
						if (this.scrollWidth > colwidth) {
							this.style.width = this.scrollWidth + 10 + 'px';
						}
					}
				})
				.on('keydown', function(e) {
					e.stopImmediatePropagation();
					if (e.keyCode == $.ui.keyCode.ESCAPE) {
						dfrd.reject();
					} else if (e.keyCode == $.ui.keyCode.ENTER) {
						e.preventDefault();
						input.blur();
					}
				})
				.on('mousedown click dblclick', function(e) {
					e.stopPropagation();
					if (e.type === 'dblclick') {
						e.preventDefault();
					}
				})
				.on('blur', blur),
			select = function() {
				var name = fm.splitFileExtention(input.val())[0];
				if (!inError && fm.UA.Mobile && !fm.UA.iOS) { // since iOS has a bug? (z-index not effect) so disable it
					overlay.on('click', cancel).elfinderoverlay('show');
					pnode.css('z-index', overlay.css('z-index') + 1);
				}
				if (inError) {
					inError = false;
					input.on('blur', blur);
				}
				input.focus().select();
				input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
			},
			node = navbar? target.contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); })
					: target.find(filename),
			pnode = node.parent(),
			overlay = fm.getUI('overlay'),
			cancel = function(e) { 
				if (!overlay.is(':hidden')) {
					pnode.css('z-index', '');
				}
				if (! inError) {
					dfrd.reject();
					if (e) {
						e.stopPropagation();
						e.preventDefault();
					}
				}
			},
			resize = function() {
				target.trigger('scrolltoview', {blink : false});
			},
			inError = false;
		
		if (fm.UA.iOS) {
			// prevent auto zoom
			input.css('font-size', '16px');
		}
		
		pnode.addClass('ui-front')
			.css('position', 'relative')
			.on('unselect.'+fm.namespace, unselect);
		fm.bind('resize', resize);
		if (navbar) {
			node.replaceWith(input.val(file.name));
		} else {
			if (tarea) {
				node.css('max-height', 'none');
			} else if (!navbar) {
				colwidth = pnode.width();
				pnode.width(colwidth - 15)
					.parent('td').css('overflow', 'visible');
			}
			node.empty().append(input.val(file.name));
		}
		
		if (cnt > 1 && fm.api <= 2.1030) {
			return dfrd.reject();
		}
		
		if (!file || !node.length) {
			return dfrd.reject('errCmdParams', this.title);
		}
		
		if (file.locked) {
			return dfrd.reject(['errLocked', file.name]);
		}
		
		fm.one('select', function() {
			input.parent().length && file && $.inArray(file.hash, fm.selected()) === -1 && input.blur();
		})
		
		input.trigger('keyup');
		
		select();
		
		return dfrd;
	};

};
