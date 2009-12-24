elFinder.prototype.ui = function(fm) {
	
	var self     = this;
	this.fm      = fm;
	this.cmd     = {};
	this.buttons = {};
	this.menu    = $('<div />').addClass('el-finder-contextmenu rounded-5').appendTo(document.body).hide();
	
	
	this.exec = function(cmd, arg) {
		if (this.cmd[cmd]) {
			if (cmd != 'open' && !this.cmd[cmd].isAllowed()) {
				return this.fm.view.warning('Command not allowed!');
			}
			if (!this.fm.locked) {
				this.fm.quickLook.hide();
				this.cmd[cmd].exec(arg);
				this.update();
				
			}
		}
	}
	
	this.cmdName = function(cmd) {
		return this.cmd[cmd] && this.cmd[cmd].name ? this.fm.i18n(this.cmd[cmd].name) : '';
	}
	
	this.isCmdAllowed = function(cmd) {
		return self.cmd[cmd] && self.cmd[cmd].isAllowed();
	}
	
	this.execIfAllowed = function(cmd) {
		this.isCmdAllowed(cmd) && this.exec(cmd);
	}
	
	this.includeInCm = function(cmd, t) {
		return this.isCmdAllowed(cmd) && this.cmd[cmd].cm(t);
	}
	
	this.showMenu = function(e) {
		this.hideMenu();
		var t, id = '';
		if (!self.fm.selected.length) {
			t = 'cwd';
		} else if (self.fm.selected.length == 1) {
			t = 'file';
		} else {
			t = 'group';
		}
		
		menu(t);
		
		var size = {
	      'height' : $(window).height(),
	      'width'  : $(window).width(),
	      'sT'     : $(window).scrollTop(),
	      'cW'     : $(this.menu).width(),
	      'cH'     : $(this.menu).height()
	    };
		$(this.menu).css({
				'left' : ((e.clientX + size.cW) > size.width ? ( e.clientX - size.cW) : e.clientX),
				'top'  : ((e.clientY + size.cH) > size.height && e.clientY > size.cH ? (e.clientY + size.sT - size.cH) : e.clientY + size.sT)
			})
			.show()
			.children('div:not([class="delim"])')
			.hover(
				function() { $(this).addClass('hover'); }, 
				function() { $(this).removeClass('hover'); }
			).click(function(e) {
				e.stopPropagation();
				self.exec($.trim($(this).attr('class').replace('hover', '')));
				self.hideMenu();
			});
		
		function menu(t) {
			var i, l, src = self.fm.options.contextmenu[t]||[];
			for (i=0; i < src.length; i++) {
				if (src[i] == 'delim') {
					self.menu.children().length && !self.menu.children(':last').hasClass('delim') && self.menu.append($('<div class="delim" />'));
				} else if (self.fm.ui.includeInCm(src[i], t)) {
					self.menu.append($('<div />').addClass(src[i]).text(self.cmdName(src[i])));
				}
			};
		}
	}
	
	this.hideMenu = function() {
		this.menu.hide().empty();
	}
	
	this.update = function() {
		for (var i in this.buttons) {
			if (this.cmd[i].isAllowed()) {
				this.buttons[i].removeClass('disabled');
			} else {
				this.buttons[i].addClass('disabled');
			}
		}
	}
	
	this.init = function(disabled) {
		var i, j, n, c=false, t = this.fm.options.toolbar;
		if (!this.fm.options.editorCallback) {
			disabled.push('select');
		}
		for (i in this.commands) {
			if ($.inArray(i, disabled) == -1) {
				this.commands[i].prototype = this.command.prototype;
				this.cmd[i] = new this.commands[i](this.fm);
			}
		}

		for (i=0; i<t.length; i++) {
			if (c) {
				this.fm.view.tlb.append($('<li />').addClass('delim'));
			}
			c = false;
			for (j=0; j<t[i].length; j++) {
				n = t[i][j];
				if (this.cmd[n]) {
					c = true;
					this.buttons[n] = $('<li />').addClass(n).attr('title', this.cmdName(n))
						.appendTo(this.fm.view.tlb)
						.bind('click', (function(ui){ return function() {  
								if (!$(this).hasClass('disabled')) {
									ui.exec($.trim($(this).attr('class')));
								}
							} })(this)
						);
				}
			}
		}
		this.update();
		var zindex = 2;
		$('*', document.body).each(function() {
			var z = $(this).css('z-index');
			if (z > zindex) {
				zindex = z+1;
			}
		})
		this.menu.css('z-index', zindex);
	}

}

elFinder.prototype.ui.prototype.command = function(fm) {  }


elFinder.prototype.ui.prototype.command.prototype.isAllowed = function(f) {
	return true;
}

elFinder.prototype.ui.prototype.command.prototype.cm = function(t) {
	return false;
}


elFinder.prototype.ui.prototype.commands = {
	
	/**
	 * @ class Go into previous folder
	 * @ param Object  elFinder
	 **/
	back : function(fm) {
		var self = this;
		this.name = 'Back';
		this.fm = fm;
		
		this.exec = function() {
			if (this.fm.history.length) {
				this.fm.ajax({ cmd : 'open', target : this.fm.history.pop()	}, function(data) {
					self.fm.reload(data);
				});
			}
		}
		
		this.isAllowed = function() {
			return this.fm.history.length
		}
		
	},
	
	/**
	 * @ class Reload current directory and navigation panel
	 * @ param Object  elFinder
	 **/
	reload : function(fm) {
		var self  = this;
		this.name = 'Reload';
		this.fm   = fm;
		
		this.exec = function() {
			this.fm.ajax({ cmd : 'open', target : this.fm.cwd.hash, tree : true }, function(data) {
				self.fm.reload(data);
			});
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	/**
	 * @ class Open file/folder
	 * @ param Object  elFinder
	 **/
	open : function(fm) {
		var self  = this;
		this.name = 'Open';
		this.fm   = fm;
		
		/**
		 * Open file/folder
		 * @param String  file/folder id (only from click on nav tree)
		 **/
		this.exec = function(dir) {
			var t = null;
			if (dir) {
				t = {
					hash : $(dir).attr('key'),
					mime : 'directory',
					read : !$(dir).hasClass('noaccess') && !$(dir).hasClass('dropbox'),
				}
			} else {
				t = this.fm.getSelected(0);
			}

			if (!t.hash) {
				return; 
			}
			if (!t.read) {
				return this.fm.view.error('Access denied!');
			}
			if (t.type == 'link' && !t.link) {
				return this.fm.view.error('Broken link!');
			}
			if (t.mime == 'directory') {
				openDir(t.link||t.hash);
			} else {
				openFile(t);
			}
			
			function openDir(id) {
				self.fm.history.push(self.fm.cwd.hash);
				self.fm.ajax({ cmd : 'open', target : id }, function(data) {
					self.fm.reload(data);
				});
			}
			
			function openFile(f) {
				var s, ws = '', o;
				if (f.dim) {
					s  = f.dim.split('x');
					ws = 'width='+(parseInt(s[0])+20)+',height='+(parseInt(s[1])+20)+',';
				}
				o = 'top=50,left=50,'+ws+'scrollbars=yes,resizable=yes';
				window.open(f.url||self.fm.options.url+'?current='+(f.parent||self.fm.cwd.hash)+'&target='+(f.link||f.hash), f.name, o);
			}
		}
	
		this.isAllowed = function() {
			return this.fm.selected.length == 1 && this.fm.getSelected(0).read;
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
		
	},
	
	/**
	 * @ class. Return file url
	 * @ param Object  elFinder
	 **/
	select : function(fm) {
		var self  = this;
		this.name = 'Select file';
		this.fm   = fm;
		
		this.exec = function() { 
			this.fm.options.editorCallback(this.fm.fileURL());
		}
				
		this.isAllowed = function() {
			return this.fm.selected.length == 1 && this.fm.getSelected(0).mime != 'directory';
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	/**
	 * @ class Display files/folders info in dialog window
	 * @ param Object  elFinder
	 **/
	info : function(fm) {
		var self  = this;
		this.name = 'Get info';
		this.fm   = fm;
		
		/**
		 * Open dialog windows for each selected file/folder or for current folder
		 **/
		this.exec = function() {
			var f, s, cnt = this.fm.selected.length;
			this.fm.lockShortcuts(true);
			if (!cnt) {
				/** nothing selected - show cwd info **/
				f      = self.fm.cwd;
				f.mime = 'directory';
				info(f);
			} else {
				/** show info for each selected obj **/
				$.each(this.fm.getSelected(), function() {
					info(this);
				});
			}
			
			function info(f) {
				var tb = $('<table cellspacing="0" />')
					.append($('<tr/>').append($('<td />').text(self.fm.i18n('Name'))).append($('<td />').text(f.name)))
					.append($('<tr/>').append($('<td />').text(self.fm.i18n('Kind'))).append($('<td />').text(self.fm.view.kind(f))));
				
				if (f.link) {
					tb.append($('<tr/>')
						.append($('<td/>').text(self.fm.i18n('Link to')))
						.append($('<td/>').text(f.linkTo)));
				}
					
				tb.append($('<tr/>').append($('<td />').text(self.fm.i18n('Size'))).append($('<td />').text(self.fm.view.formatSize(f.size))))
					.append($('<tr/>').append($('<td />').text(self.fm.i18n('Modified'))).append($('<td />').text(self.fm.view.formatDate(f.date))))
					.append($('<tr/>').append($('<td />').text(self.fm.i18n('Permissions'))).append($('<td />').text(self.fm.view.formatPermissions(f.read, f.write, f.rm))));
				
				if (f.dim) {
					tb.append($('<tr/>')
						.append($('<td/>').text(self.fm.i18n('Dimensions')))
						.append($('<td/>').text(f.dim+' px.')));
				}
				if (f.url) {
					tb.append($('<tr/>')
						.append($('<td/>').text(self.fm.i18n('URL')))
						.append($('<td/>').html($('<a/>').attr({href : f.url, target : '_blank'}).text(f.url))));
				}	
				$('<div />').append(tb).dialog({
					dialogClass : 'el-finder-dialog',
					title       : self.fm.i18n(f.mime == 'directory' ? 'Folder info' : 'File info'),
					close       : function() { if (--cnt <= 0) { self.fm.lockShortcuts(); } },
					buttons     : { Ok : function() { $(this).dialog('close'); }}
				});
			}
		}
	
		this.cm = function(t) {
			return true;
		}
	},
	
	/**
	 * @ class Rename file/folder
	 * @ param Object elFinder
	 **/
	rename : function(fm) {
		var self  = this;
		this.name = 'Rename';
		this.fm   = fm;
		
		this.exec = function() {
			var s = this.fm.getSelected(), el, c, input, f, n;
			
			if (s.length == 1) {
				f  = s[0];
				el = this.fm.view.cwd.find('[key="'+f.hash+'"]');
				c  = this.fm.options.view == 'icons' ? el.children('label') : el.find('td').eq(1);
				n  = c.html();
				input = $('<input type="text" />').val(f.name).appendTo(c.empty())
					.bind('change blur', rename)
					.keydown(function(e) {
						e.stopPropagation();
						if (e.keyCode == 27) {
							restore();
						} else if (e.keyCode == 13) {
							if (f.name == input.val()) {
								restore();
							} else {
								$(this).trigger('change');
							}
						}
					})
					.click(function(e) { e.stopPropagation(); })
					.select()
					.focus();
				this.fm.lockShortcuts(true);
			}

			function restore() {
				c.html(n);
				self.fm.lockShortcuts();
			}
			
			function rename() {
				
				if (!self.fm.locked) {
					var err, name = input.val();
					if (f.name == input.val()) {
						return restore();
					}

					if (!self.fm.isValidName(name)) {
						err = 'Invalid name';
					} else if (self.fm.fileExists(name)) {
						err = 'File or folder with the same name already exists';
					}
					
					if (err) {
						self.fm.view.error(err);
						el.addClass('ui-selected');
						return input.select().focus();
					}
					
					self.fm.ajax({cmd : 'rename', current : self.fm.cwd.hash, target : f.hash, name : name}, function(data) {
						if (data.error) {
							restore();
						} else {
							f.mime == 'directory' && self.fm.removePlace(f.hash) && self.fm.addPlace(data.target);
							self.fm.reload(data); 
							self.fm.selectById(data.target);
							self.fm.checkSelectedPos();
						}
					}, true);
				}
			}
		}
		
		/**
		 * Return true if only one file selected and has write perms and current dir has write perms
		 * @return Boolean
		 */
		this.isAllowed = function() {
			return this.fm.cwd.write && this.fm.getSelected(0).write;
		}

		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	copy : function(fm) {
		var self = this;
		this.name = 'Copy';
		this.fm = fm;
		
		this.exec = function() {
			this.fm.setBuffer(this.fm.selected);
			this.fm.log(this.fm.buffer)
		}
		
		this.isAllowed = function() {
			return self.fm.selected.length;
		}
		
		this.cm = function(t) {
			return t != 'cwd';
		}
	},
	
	cut : function(fm) {
		var self = this;
		this.name = 'Cut';
		this.fm = fm;
		
		this.exec = function() {
			this.fm.setBuffer(this.fm.selected, 1);
			this.fm.log(this.fm.buffer)
		}
		
		this.isAllowed = function() {
			return self.fm.selected.length;
		}
		
		this.cm = function(t) {
			return t != 'cwd';
		}
	},
	
	paste : function(fm) {
		var self  = this;
		this.name = 'Paste';
		this.fm   = fm;
		
		this.exec = function() {
			var i, d, f, r, msg = '';
			
			if (!this.fm.buffer.dst) {
				this.fm.buffer.dst = this.fm.cwd.hash;
			}
			d = this.fm.view.tree.find('[key="'+this.fm.buffer.dst+'"]');
			if (!d.length || d.hasClass('noaccess') || d.hasClass('readonly')) {
				return this.fm.view.error('Access denied');
			}
			if (this.fm.buffer.src == this.fm.buffer.dst) {
				return this.fm.view.error('Unable to copy into itself');
			}
			/* check for files with same names and propmt to overwrite (not for dragndrop moving) */
			if (this.fm.buffer.dst == this.fm.cwd.hash) {
				for (i=0; i<this.fm.buffer.names.length; i++) {
					f = this.fm.buffer.names[i];
					if (this.fm.fileExists(f)) {
						msg += f+"\n";
					}
				}

				if (msg) {
					r = confirm(this.fm.i18n('Following files/folders already exists in this location:')+"\n\n"+msg+"\n"+this.fm.i18n('Do you want to replace it with the one you’re moving?')); 
					if (!r) {
						return;
					}
				}
			}
			
			this.fm.ajax({
				cmd       : 'paste',
				current   : this.fm.cwd.hash,
				'files[]' : this.fm.buffer.files,
				src       : this.fm.buffer.src,
				dst       : this.fm.buffer.dst,
				cut       : this.fm.buffer.cut
			}, function(data) {
				data.tree && self.fm.reload(data);
			}, true);
		}
		
		
		this.isAllowed = function() {
			return this.fm.buffer.files;
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	rm : function(fm) {
		var self  = this;
		this.name = 'Remove';
		this.fm   = fm;
		
		this.exec = function() {
			var i, ids = [], s =this.fm.getSelected();
			for (var i=0; i < s.length; i++) {
				if (!s[i].rm) {
					return this.fm.view.error(s[i].name+': '+this.fm.i18n('Access denied!'));
				}
				ids.push(s[i].hash);
			};
			if (ids.length) {
				this.fm.keydown = false;
				$('<div/>').append($('<p/>').addClass('el-finder-err el-finder-warn')
						.append('<div/>').append(this.fm.i18n('Are you shure you want to remove files?<br /> This cannot be undone!'))
					)
					.dialog({
						title       : this.fm.i18n('Confirmation required'),
						dialogClass : 'el-finder-dialog',
						width       : 350,
						close       : function() { self.fm.keydown = true; },
						buttons     : {
							Cancel : function() { $(this).dialog('close'); },
							Ok     : function() { 
								$(this).dialog('close'); 
								self.fm.ajax({ 
									cmd     : 'rm', 
									current : self.fm.cwd.hash, 
									'rm[]'  : ids
									}, 
									function(data) {
										data.tree && self.fm.reload(data);
								}, true);
							}
						}
					});
			}
		}
		
		this.isAllowed = function(f) {
			return this.fm.selected.length;
		}
		
		this.cm = function(t) {
			return t != 'cwd';
		}
	},
	
	/**
	 * @ class Create new folder
	 * @ param Object  elFinder
	 **/
	mkdir : function(fm) {
		var self  = this;
		this.name = 'New folder';
		this.fm   = fm;
		
		this.exec = function() {
			self.fm.unselectAll();
			var n     = this.fm.uniqueName('untitled folder');
				input = $('<input type="text"/>').val(n);
				prev  = this.fm.view.cwd.find('.directory:last');
				f     = {name : n, hash : '', mime :'directory', read : true, write : true, date : '', size : 0},
				el    = this.fm.options.view == 'list' 
						? this.fm.view.renderRow(f).children('td').eq(1).empty().append(input).end().end()
						: this.fm.view.renderIcon(f).children('label').empty().append(input).end()
			el.addClass('directory ui-selected');
			if (prev.length) {
				el.insertAfter(prev);
			} else if (this.fm.options.view == 'list') {
				el.insertAfter(this.fm.view.cwd.find('tr').eq(0))
			} else {
				el.prependTo(this.fm.view.cwd)
			}
			self.fm.checkSelectedPos();
			input.select().focus()
				.click(function(e) { e.stopPropagation(); })
				.bind('change blur', mkdir)
				.keydown(function(e) {
					e.stopPropagation();
					if (e.keyCode == 27) {
						el.remove();
						self.fm.lockShortcuts();
					} else if (e.keyCode == 13) {
						mkdir();
					}
				});

			self.fm.lockShortcuts(true);

			function mkdir() {
				if (!self.fm.locked) {
					var err, name = input.val();
					if (!self.fm.isValidName(name)) {
						err = 'Invalid name';
					} else if (self.fm.fileExists(name)) {
						err = 'File or folder with the same name already exists';
					}
					if (err) {
						self.fm.view.error(err);
						el.addClass('ui-selected');
						return input.select().focus();
					}
					
					self.fm.ajax({cmd : 'mkdir', current : self.fm.cwd.hash, name : name}, function(data) {
						if (data.error) {
							el.addClass('ui-selected');
							return input.select().focus();
						}
						self.fm.reload(data);
						self.fm.selectById(data.target);
						self.fm.checkSelectedPos();
					}, true);
				}
			}
		}
		
		this.isAllowed = function() {
			return this.fm.cwd.write;
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	/**
	 * @ class Create new text file
	 * @ param Object  elFinder
	 **/
	mkfile : function(fm) {
		var self  = this;
		this.name = 'New text file';
		this.fm   = fm;
		
		this.exec = function() {
			self.fm.unselectAll();
			var n     = this.fm.uniqueName('untitled file', '.txt'),
				input = $('<input type="text"/>').val(n), 
				f     = {name : n, hash : '', mime :'text/plain', read : true, write : true, date : '', size : 0},
				el    = this.fm.options.view == 'list' 
					? this.fm.view.renderRow(f).children('td').eq(1).empty().append(input).end().end()
					: this.fm.view.renderIcon(f).children('label').empty().append(input).end();
			el.addClass('text ui-selected').appendTo(this.fm.options.view == 'list' ? self.fm.view.cwd.children('table') : self.fm.view.cwd);
			
			input.select().focus()
				.bind('change blur', mkfile)
				.click(function(e) { e.stopPropagation(); })
				.keydown(function(e) {
					e.stopPropagation();
					if (e.keyCode == 27) {
						el.remove();
						self.fm.lockShortcuts();
					} else if (e.keyCode == 13) {
						mkfile();
					}
				});
			self.fm.lockShortcuts(true);
			
			// $(document).bind('click', function() { self.fm.log('click') })
			
			function mkfile() {
				if (!self.fm.locked) {
					var err, name = input.val();
					if (!self.fm.isValidName(name)) {
						err = 'Invalid name';
					} else if (self.fm.fileExists(name)) {
						err = 'File or folder with the same name already exists';
					}
					if (err) {
						self.fm.view.error(err);
						el.addClass('ui-selected');
						return input.select().focus();
					}
					self.fm.ajax({cmd : 'mkfile', current : self.fm.cwd.hash, name : name}, function(data) {
						if (data.error) {
							el.addClass('ui-selected');
							return input.select().focus();
						}
						self.fm.reload(data);
						self.fm.selectById(data.target);
						self.fm.checkSelectedPos();
					}, true);
				}
			}
			
		}
		
		this.isAllowed = function(f) {
			return this.fm.cwd.write;
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	/**
	 * @ class Upload files
	 * @ param Object  elFinder
	 **/
	upload : function(fm) {
		var self  = this;
		this.name = 'Upload files';
		this.fm   = fm;
		
		this.exec = function() {

			var err = $('<div class="ui-state-error ui-corner-all"/>').append('<span class="ui-icon ui-icon-alert"/>').append('<strong/>'),
				d = $('<div/>'), 
				f = $('<form method="post" enctype="multipart/form-data" />')
					.append('<div><input type="file" name="fm-file[]"/></div>')
					.append('<div><input type="file" name="fm-file[]"/></div>')
					.append('<div><input type="file" name="fm-file[]"/></div>'),
				b = $('<div/>').addClass('el-finder-add-field').text(this.fm.i18n('Add field'))
					.append($('<span class="ui-state-default ui-corner-all"/>').append('<em class="ui-icon ui-icon-circle-plus"/>'))
					.click(function() {
						$('<div><input type="file" name="fm-file[]"/></div>').appendTo(f);
					});
					
			self.fm.lockShortcuts(true);
			
			d.append(err.hide()).append(f).append(b).dialog({
				dialogClass : 'el-finder-dialog',
				title       : self.fm.i18n('Upload files'),
				modal       : true,
				resizable   : false,
				close       : function() { self.fm.lockShortcuts(); },
				buttons     : {
					Cancel : function() { $(this).dialog('close'); },
					Ok     : function() { f.submit(); }
				}
			});

			if (this.fm.cwd.uplMaxSize) {
				$('<div />').text(this.fm.i18n('Maximum allowed files size')+': '+this.fm.cwd.uplMaxSize).insertBefore(f);
			}

			f.ajaxForm({
				url          : this.fm.options.url,
				dataType     : 'json',
				data         : {cmd : 'upload', current : this.fm.cwd.hash},
				beforeSubmit : function() {
					var error, num=0, n;
					f.find(':file').each(function() {
						if ((n = $(this).val())) {
							if (!self.fm.isValidName(n)) {
								error = 'One of files has invalid name';
							} else {
								num++;
							}
						}
					});
					if (!num || error) {
						err.show().find('strong').empty().text(self.fm.i18n(error||'Select at least one file to upload'));
						return false;
					}
					
					self.fm.lock(true);
					d.dialog('close');
					return true;
				},
				error   : self.fm.view.fatal,
				success : function(data) {
					self.fm.lock();
					if (data.error) {
						return self.fm.view.error(data.error, data.errorData);
					}
					data.warning && self.fm.view.warning(data.warning, data.errorData);
					self.fm.reload(data);

					data.debug && self.fm.log(data.debug);
					data.tmb && self.fm.tmb();
				}
			});
		}
		
		this.isAllowed = function() {
			return this.fm.cwd.write;
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	/**
	 * @ class Make file/folder copy
	 * @ param Object  elFinder
	 **/
	duplicate : function(fm) {
		var self  = this;
		this.name = 'Duplicate';
		this.fm   = fm;
		
		this.exec = function() {
			this.fm.ajax({
				cmd     : 'duplicate',
				current : this.fm.cwd.hash,
				file    : this.fm.selected[0]
			},
			function(data) {
				self.fm.reload(data);
			});
		}
		
		this.isAllowed = function() {
			var s = this.fm.getSelected();
			return this.fm.cwd.write && s.length == 1 && s[0].read;
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	edit : function(fm) {
		var self  = this;
		this.name = 'Edit text file';
		this.fm   = fm;
		
		this.exec = function() {
			var f = this.fm.getSelected()[0];
			this.fm.lockShortcuts(true);
			this.fm.ajax({
				cmd     : 'read',
				current : this.fm.cwd.hash,
				file    : f.hash
			}, function(data) {
				var ta= $('<textarea/>').val(data.content||'').keydown(function(e) { e.stopPropagation(); });
				$('<div/>').append(ta)
					.dialog({
						dialogClass : 'el-finder-dialog',
						title   : self.fm.i18n(self.name),
						modal   : true,
						width   : 500,
						close   : function() { self.fm.lockShortcuts(); },
						buttons : {
							Cancel : function() { $(this).dialog('close'); },
							Ok     : function() {
								var c = ta.val();
								$(this).dialog('close');
								self.fm.ajax({
									cmd     : 'edit',
									current : self.fm.cwd.hash,
									file    : f.hash,
									content : c
								}, function(data) {
									if (data.file) {
										self.fm.cdc[data.file.hash] = data.file;
									}
								}, false, {type : 'POST'});
							}
						}
					});
			});
		}
		
		this.isAllowed = function() {
			var f = this.fm.getSelected();
			return f.length == 1 && f[0].write && f[0].type != 'dir' && (f[0].mime.indexOf('text') == 0 || f[0].mime == 'application/xml' || f[0].mime == 'application/x-empty');
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	compress : function(fm) {
		var self = this;
		this.name = 'Create archive';
		this.fm = fm;
		
		this.exec = function() {

		}
		
		this.isAllowed = function() {
			return self.fm.selected.length;
		}
		
		this.cm = function(t) {
			return t != 'cwd';
		}
	},
	
	uncompress : function(fm) {
		var self = this;
		this.name = 'Uncompress archive';
		this.fm = fm;
		
		this.exec = function() {
			
		}
		
		this.isAllowed = function() {
			var s = this.fm.getSelected(0);
			return this.fm.selected.length == 1 && s && s.mime.match(/\.(gz|bz|zip)$/i);
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	resize : function(fm) {
		var self  = this;
		this.name = 'Resize image';
		this.fm   = fm;
		
		this.exec = function() {
			var s = this.fm.getSelected();
			if (s[0] && s[0].write && s[0].dim) {
				var size = s[0].dim.split('x'), 
					w  = parseInt(size[0]), 
					h  = parseInt(size[1]), rel = w/h
					iw = $('<input type="text" size="9" value="'+w+'" name="width"/>'),
					ih = $('<input type="text" size="9" value="'+h+'" name="height"/>'),
					f  = $('<form/>').append(iw).append(' x ').append(ih).append(' px');
				iw.add(ih).bind('change', calc);
				self.fm.lockShortcuts(true);
				var d = $('<div/>').append($('<div/>').text(self.fm.i18n('New image dimensions')+':')).append(f).dialog({
					title : self.fm.i18n('Resize image'),
					dialogClass : 'el-finder-dialog',
					width : 230,
					modal : true,
					close : function() { self.fm.lockShortcuts(); },
					buttons : {
						Cancel : function() { $(this).dialog('close'); },
						Ok     : function() {
							var _w = parseInt(iw.val()) || 0,
								_h = parseInt(ih.val()) || 0;
							if (_w>0 && _w != w && _h>0 && _h != h) {
								self.fm.ajax({
									cmd     : 'resize',
									current : self.fm.cwd.hash,
									file    : s[0].hash,
									width   : _w,
									height  : _h
								},
								function (data) {
									self.fm.reload(data);
								});
							}
							$(this).dialog('close');
						}
					}
				});
			} 
			
			function calc() {
				self.fm.log(this)
				var _w = parseInt(iw.val()) || 0,
					_h = parseInt(ih.val()) || 0;
					
				if (_w<=0 || _h<=0) {
					_w = w;
					_h = h;
				} else if (this == iw.get(0)) {
					_h = parseInt(_w/rel);
				} else {
					_w = parseInt(_h*rel);
				}
				iw.val(_w);
				ih.val(_h);
			}
			
		}
		
		this.isAllowed = function() {
			return this.fm.selected.length == 1 && this.fm.cdc[this.fm.selected[0]].write && this.fm.cdc[this.fm.selected[0]].resize;
		}
		
		this.cm = function(t) {
			return t == 'file';
		}
	},
	
	icons : function(fm) {
		var self  = this;
		this.name = 'View as icons';
		this.fm   = fm;
		
		this.exec = function() {
			this.fm.setView('icons');
			this.fm.updateCwd();
		}
		
		this.isAllowed = function() {
			return this.fm.options.view != 'icons';
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	list : function(fm) {
		var self  = this;
		this.name = 'View as list';
		this.fm   = fm;
		
		this.exec = function() {
			this.fm.setView('list');
			this.fm.updateCwd();
		}
		
		this.isAllowed = function() {
			return this.fm.options.view != 'list';
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	},
	
	help : function(fm) {
		var self = this;
		this.name = 'Help';
		this.fm = fm;
		
		this.exec = function() {
			
		}
		
		this.cm = function(t) {
			return t == 'cwd';
		}
	}
}


