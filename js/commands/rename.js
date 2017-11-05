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
		var sel = this.files(sel);

		return sel.length == 1 && sel[0].phash && !sel[0].locked  ? 0 : -1;
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
			unselect = function() {
				setTimeout(function() {
					input && input.blur();
				}, 50);
			},
			rest     = function(){
				if (!overlay.is(':hidden')) {
					overlay.addClass('ui-front')
						.elfinderoverlay('hide')
						.off('click', cancel);
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
				valid  = true;

				if (name === '') {
					return cancel();
				}
				if (!inError && pnode.length) {
					
					input.off('blur');
					
					if (name == file.name) {
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
					if (fm.fileByName(name, file.phash)) {
						inError = true;
						fm.error(['errExists', name], {modal: true, close: select});
						return false;
					}
					
					input.off();
					rest();
					
					(navbar? input : node).html(fm.escape(name));
					fm.lockfiles({files : [file.hash]});
					fm.request({
							data   : {cmd : 'rename', target : file.hash, name : name},
							notify : {type : 'rename', cnt : 1},
							navigate : {}
						})
						.fail(function(error) {
							dfrd.reject();
							if (! error || ! Array.isArray(error) || error[0] !== 'errRename') {
								fm.sync();
							}
						})
						.done(function(data) {
							if (data.added && data.added.length) {
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
						});
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
				var name = input.val().replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, '');
				if (!inError && fm.UA.Mobile && !fm.UA.iOS) { // since iOS has a bug? so disable it
					overlay.on('click', cancel)
						.removeClass('ui-front').elfinderoverlay('show');
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
				if (! inError) {
					dfrd.reject();
					if (e) {
						e.stopPropagation();
						e.preventDefault();
					}
				}
			},
			resize = function() {
				target.trigger('scrolltoview');
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
		
		if (cnt > 1) {
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
