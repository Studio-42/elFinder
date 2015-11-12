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
					node.parent().zIndex('').css('position', '');
					node.css('max-height', '');
				}
			},
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
				.keyup(function(){
					if (tarea) {
						this.style.height = '1px';
						this.style.height = this.scrollHeight + 'px';
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

					if (parent.length) {
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
						parent.html(fm.escape(name));
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
							})
							.always(function() {
								fm.unlockfiles({files : [file.hash]})
							});
						
					}
				}),
			node = (type === 'navbar')? $('#'+fm.navHash2Id(file.hash)).contents().filter(function(){ return this.nodeType==3 && $(this).parent().attr('id') === fm.navHash2Id(file.hash); }).replaceWith(input.val(file.name))
					                  : cwd.find('#'+file.hash).find(filename).empty().append(input.val(file.name)),
			name = input.val().replace(/\.((tar\.(gz|bz|bz2|z|lzo))|cpio\.gz|ps\.gz|xcf\.(gz|bz2)|[a-z0-9]{1,4})$/ig, '')
			;
		
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
		
		if (tarea) {
			node.parent().zIndex((node.parent().zIndex()) + 1).css('position', 'relative');
			node.css('max-height', 'none');
			input.trigger('keyup');
		}
		
		input.select().focus();
		
		input[0].setSelectionRange && input[0].setSelectionRange(0, name.length);
		
		return dfrd;
	};

}
