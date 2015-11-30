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
	
	this.exec = function(hashes) {
		var fm       = this.fm,
			cwd      = fm.getUI('cwd'),
			sel      = hashes || (fm.selected().length? fm.selected() : false) || [fm.cwd().hash],
			cnt      = sel.length,
			file     = fm.file(sel.shift()),
			filename = '.elfinder-cwd-filename',
			type     = (hashes && hashes._type)? hashes._type : (fm.selected().length? 'files' : 'navbar'),
			incwd    = (fm.cwd().hash == file.hash),
			tarea    = (type === 'files' && fm.storage('view') != 'list'),
			rest     = function(){
				if (tarea) {
					pnode.zIndex('').css('position', '');
					node.css('max-height', '');
				} else if (type !== 'navbar') {
					pnode.css('width', '');
					pnode.parent('td').css('overflow', '');
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
					rest();
					if (type === 'navbar') {
						input.replaceWith(name);
					} else {
						if (parent.length) {
							input.remove();
							parent.html(name);
						} else {
							cwd.find('#'+file.hash).find(filename).html(name);
							setTimeout(function() {
								cwd.find('#'+file.hash).click();
							}, 50);
						}
					}
					
					error && fm.error(error);
				})
				.always(function() {
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
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (e.keyCode == $.ui.keyCode.ESCAPE) {
						dfrd.reject();
					} else if (e.keyCode == $.ui.keyCode.ENTER) {
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
						parent = input.parent();

					if (pnode.length) {
						if (input[0].setSelectionRange) {
							input[0].setSelectionRange(0, 0)
						}
						if (name == file.name) {
							return dfrd.reject();
						}
						if (!name) {
							return dfrd.reject('errInvName');
						}
						if (fm.fileByName(name, file.phash)) {
							return dfrd.reject(['errExists', name]);
						}
						
						rest();
						//pnode.html(fm.escape(name));
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
								if (data && data.added && data.added[0]) {
									var newItem = cwd.find('#'+data.added[0].hash);
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
			node = (type === 'navbar')? $('#'+fm.navHash2Id(file.hash)).contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); })
					                  : cwd.find('#'+file.hash).find(filename),
			name = file.name.replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, ''),
			pnode = node.parent();
		
		if (type === 'navbar') {
			node.replaceWith(input.val(file.name));
		} else {
			if (tarea) {
				pnode.zIndex((pnode.zIndex()) + 1).css('position', 'relative');
				node.css('max-height', 'none');
			} else if (type !== 'navbar') {
				colwidth = pnode.width();
				pnode.width(colwidth - 15);
				pnode.parent('td').css('overflow', 'visible');
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
		
		input.select().focus();
		
		input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
		
		return dfrd;
	};

}
