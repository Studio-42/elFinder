/**
 * @class elFinder command "rename". 
 * Rename selected file.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.rename = function() {
	"use strict";
	var self = this,
		fm = self.fm,
		request = function(dfrd, targtes, file, name) {
			var cnt = targtes? targtes.length : 0,
				sel = targtes? [file.hash].concat(targtes) : [file.hash],
				data = {};
			
			fm.lockfiles({files : sel});
			
			data = {
				cmd : 'rename',
				name : name,
				target : file.hash
			};
			if (cnt > 0) {
				data['targets'] = targtes;
				if (name.match(/\*/)) {
					data['q'] = name;
				}
			}
			
			fm.request({
					data   : data,
					notify : {type : 'rename', cnt : cnt},
					navigate : {}
				})
				.fail(function(error) {
					dfrd && dfrd.reject();
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
					dfrd && dfrd.resolve(data);
					if (fm.cwd().hash === file.hash) {
						fm.exec('open', data.added[0].hash);
					}
				})
				.always(function() {
					fm.unlockfiles({files : sel}).trigger('selectfiles', {files : sel});
				}
			);
		},
		getHint = function(name, target) {
			var sel = target || fm.selected(),
				splits = fm.splitFileExtention(name),
				f1 = fm.file(sel[0]),
				f2 = fm.file(sel[1]),
				ext, hint, add;
			
			ext = splits[1]? ('.' + splits[1]) : '';
			if (splits[1] && splits[0] === '*') {
				// change extention
				hint =  '"' + fm.splitFileExtention(f1.name)[0] + ext + '", ';
				hint += '"' + fm.splitFileExtention(f2.name)[0] + ext + '"';
			} else if (splits[0].length > 1) {
				if (splits[0].substr(-1) === '*') {
					// add prefix
					add = splits[0].substr(0, splits[0].length - 1);
					hint =  '"' + add + f1.name+'", ';
					hint += '"' + add + f2.name+'"';
				} else if (splits[0].substr(0, 1) === '*') {
					// add suffix
					add = splits[0].substr(1);
					hint =  '"'+fm.splitFileExtention(f1.name)[0] + add + ext + '", ';
					hint += '"'+fm.splitFileExtention(f2.name)[0] + add + ext + '"';
				}
			}
			if (!hint) {
				hint = '"'+splits[0] + '1' + ext + '", "' + splits[0] + '2' + ext + '"';
			}
			if (sel.length > 2) {
				hint += ' ...';
			}
			return hint;
		},
		batchRename = function() {
			var sel = fm.selected(),
				tplr = '<input name="type" type="radio" class="elfinder-tabstop">',
				mkChk = function(node, label) {
					return $('<label class="elfinder-rename-batch-checks">' + fm.i18n(label) + '</label>').prepend(node);
				},
				name = $('<input type="text" class="ui-corner-all elfinder-tabstop">'),
				num  = $(tplr),
				prefix  = $(tplr),
				suffix  = $(tplr),
				extention  = $(tplr),
				checks = $('<div/>').append(
					mkChk(num, 'plusNumber'),
					mkChk(prefix, 'asPrefix'),
					mkChk(suffix, 'asSuffix'),
					mkChk(extention, 'changeExtention')
				),
				preview = $('<div class="elfinder-rename-batch-preview"/>'),
				node = $('<div class="elfinder-rename-batch"/>').append(
						$('<div class="elfinder-rename-batch-name"/>').append(name),
						$('<div class="elfinder-rename-batch-type"/>').append(checks),
						preview
					),
				opts = {
					title : fm.i18n('batchRename'),
					modal : true,
					destroyOnClose : true,
					width: Math.min(380, fm.getUI().width() - 20),
					buttons : {},
					open : function() {
						name.on('input', mkPrev).focus();
					}
				},
				getName = function() {
					var vName = name.val(),
						ext = fm.splitFileExtention(fm.file(sel[0]).name)[1];
					if (vName !== '' || num.is(':checked')) {
						if (prefix.is(':checked')) {
							vName += '*';
						} else if (suffix.is(':checked')) {
							vName = '*' + vName + '.' + ext;
						} else if (extention.is(':checked')) {
							vName = '*.' + vName;
						} else if (ext) {
							vName += '.' + ext;
						}
					}
					return vName;
				},
				mkPrev = function() {
					var vName = getName();
					if (vName !== '') {
						preview.html(fm.i18n(['renameMultiple', sel.length, getHint(vName)]));
					} else {
						preview.empty();
					}
				},
				radios = checks.find('input:radio').on('change', mkPrev),
				dialog;
			
			opts.buttons[fm.i18n('btnApply')] = function() {
				var vName = getName(),
					file, targets;
				if (vName !== '') {
					dialog.elfinderdialog('close');
					targets = sel;
					file = fm.file(targets.shift());
					request(void(0), targets, file, vName);
				}
			};
			opts.buttons[fm.i18n('btnCancel')] = function() {
				dialog.elfinderdialog('close');
			};
			if ($.fn.checkboxradio) {
				radios.checkboxradio({
					create: function(e, ui) {
						if (this === num.get(0)) {
							num.prop('checked', true).change();
						}
					}
				});
			} else {
				checks.buttonset({
					create: function(e, ui) {
						num.prop('checked', true).change();
					}
				});
			}
			dialog = fm.dialog(node, opts);
		};
	
	this.noChangeDirOnRemovedCwd = true;
	
	this.shortcuts = [{
		pattern : 'f2' + (fm.OS == 'mac' ? ' enter' : '')
	}, {
		pattern : 'shift+f2',
		description : 'batchRename',
		callback : function() {
			fm.selected().length > 1 && batchRename();
		}
	}];
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length,
			phash, ext, mime, brk, state;
		
		if (!cnt) {
			return -1;
		}
		
		if (sel.length > 1 && sel[0].phash) {
			phash = sel[0].phash;
			ext = fm.splitFileExtention(sel[0].name)[1].toLowerCase();
			mime = sel[0].mime;
		}

		state = ((cnt === 1 && !sel[0].locked && !fm.isRoot(sel[0])) || (fm.api > 2.1030 && cnt === $.grep(sel, function(f) {
			if (!brk && !f.locked && f.phash === phash && !fm.isRoot(f) && (mime === f.mime || ext === fm.splitFileExtention(f.name)[1].toLowerCase())) {
				return true;
			} else {
				brk && (brk = true);
				return false;
			}
		}).length)) ? 0 : -1;
		
		if (state !== -1 && cnt > 1) {
			self.extra = {
				icon: 'preference',
				node: $('<span/>')
					.attr({title: fm.i18n('batchRename')})
					.on('click touchstart', function(e){
						if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) {
							return;
						}
						e.stopPropagation();
						e.preventDefault();
						fm.getUI().trigger('click'); // to close the context menu immediately
						batchRename();
					})
			};
		} else {
			delete self.extra;
		}
			
		return state;
	};
	
	this.exec = function(hashes, cOpts) {
		var cwd      = fm.getUI('cwd'),
			sel      = hashes || (fm.selected().length? fm.selected() : false) || [fm.cwd().hash],
			cnt      = sel.length,
			file     = fm.file(sel.shift()),
			filename = '.elfinder-cwd-filename',
			opts     = cOpts || {},
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
				req = function() {
					input.off();
					rest();
					(navbar? input : node).html(fm.escape(name));
					request(dfrd, sel, file, name);
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
						fm.error(file.mime === 'directory'? 'errInvDirname' : 'errInvName', {modal: true, close: function(){setTimeout(select, 120);}});
						return false;
					}
					if (cnt === 1 && fm.fileByName(name, file.phash)) {
						inError = true;
						fm.error(['errExists', name], {modal: true, close: function(){setTimeout(select, 120);}});
						return false;
					}
					
					if (cnt === 1) {
						req();
					} else {
						fm.confirm({
							title : 'cmdrename',
							text  : ['renameMultiple', cnt, getHint(name, [file.hash].concat(sel))],
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
						setTimeout(function() {
							fm.trigger('unselectfiles', {files: fm.selected()})
								.trigger('selectfiles', {files : [file.hash].concat(sel)});
						}, 120);
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
				! fm.enabled() && fm.enable();
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
		});
		
		input.trigger('keyup');
		
		select();
		
		return dfrd;
	};

};
