"use strict";
/**
 * @class elFinder command "rename". 
 * Rename selected file.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.rename = function() {
	
	this.shortcuts = [{
		pattern     : 'f2'+(this.fm.OS == 'mac' ? ' enter' : '')
	}];
	
	this.getstate = function(sel) {
		var sel = this.files(sel);

		return !this._disabled && sel.length == 1 && sel[0].phash && !sel[0].locked  ? 0 : -1;
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
			tarea    = (type === 'files' && fm.storage('view') != 'list'),
			rest     = function(){
				if (!overlay.is(':hidden')) {
					overlay.addClass('ui-front')
						.elfinderoverlay('hide')
						.off('click', cancel);
				}
				pnode.removeClass('ui-front').css('position', '');
				if (tarea) {
					node.css('max-height', '');
				} else if (!navbar) {
					pnode.css('width', '')
						.parent('td').css('overflow', '');
				}
			}, colwidth,
			dfrd     = $.Deferred()
				.done(function(data){
					incwd && fm.exec('open', data.added[0].hash);
				})
				.fail(function(error) {
					var parent = input.parent(),
						name   = fm.escape(file.name);

					if (tarea) {
						name = name.replace(/([_.])/g, '&#8203;$1');
					}
					if (navbar) {
						input.replaceWith(name);
					} else {
						if (parent.length) {
							input.remove();
							parent.html(name);
						} else {
							//cwd.find('#'+fm.cwdHash2Id(file.hash)).find(filename).html(name);
							target.find(filename).html(name);
							setTimeout(function() {
								cwd.find('#'+fm.cwdHash2Id(file.hash)).click();
							}, 50);
						}
					}
					
					error && fm.error(error);
				})
				.always(function() {
					rest();
					fm.unbind('resize', resize);
					fm.enable();
				}),
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
				.keydown(function(e) {
					e.stopImmediatePropagation();
					if (e.keyCode == $.ui.keyCode.ESCAPE) {
						dfrd.reject();
					} else if (e.keyCode == $.ui.keyCode.ENTER) {
						e.preventDefault();
						input.blur();
					}
				})
				.mousedown(function(e) {
					e.stopPropagation();
				})
				.click(function(e) { // for touch device
					e.stopPropagation();
				})
				.dblclick(function(e) {
					e.stopPropagation();
					e.preventDefault();
				})
				.blur(function() {
					var name   = $.trim(input.val()),
						parent = input.parent(),
						valid  = true;

					if (!inError && pnode.length) {
						if (input[0].setSelectionRange) {
							input[0].setSelectionRange(0, 0)
						}
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
						if (!name || name === '..' || !valid) {
							inError = true;
							fm.error('errInvName', {modal: true, close: select});
							return false;
						}
						if (fm.fileByName(name, file.phash)) {
							inError = true;
							fm.error(['errExists', name], {modal: true, close: select});
							return false;
						}
						
						rest();
						(navbar? pnode : node).html(fm.escape(name));
						fm.lockfiles({files : [file.hash]});
						fm.request({
								data   : {cmd : 'rename', target : file.hash, name : name},
								notify : {type : 'rename', cnt : 1}
							})
							.fail(function(error) {
								dfrd.reject();
								fm.sync();
							})
							.done(function(data) {
								dfrd.resolve(data);
								if (!navbar && data && data.added && data.added[0]) {
									var newItem = cwd.find('#'+fm.cwdHash2Id(data.added[0].hash));
									if (newItem.length) {
										newItem.trigger('scrolltoview');
									}
								}
							})
							.always(function() {
								fm.unlockfiles({files : [file.hash]})
							});
						
					}
				}),
			select = function() {
				var name = input.val().replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, '');
				inError = false;
				if (fm.UA.Mobile) {
					overlay.on('click', cancel)
						.removeClass('ui-front').elfinderoverlay('show');
				}
				input.select().focus();
				input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
			},
			node = navbar? target.contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); })
					: target.find(filename),
			pnode = node.parent(),
			overlay = fm.getUI().children('.elfinder-overlay'),
			cancel = function(e) { 
				if (! inError) {
					e.stopPropagation();
					dfrd.reject();
				}
			},
			resize = function() {
				target.trigger('scrolltoview');
			},
			inError = false;
		
		pnode.addClass('ui-front').css('position', 'relative');
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
		
		if (cnt > 1 || this.getstate([file.hash]) < 0) {
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
