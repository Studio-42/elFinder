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
			this.cmd[cmd].exec(arg);
			this.update();
		}
	}
	
	this.isCmdAllowed = function(cmd) {
		return self.cmd[cmd] && self.cmd[cmd].isAllowed();
	}
	
	this.showMenu = function(e) {
		this.hideMenu();
		var id = '';
		if (!self.fm.selected.length) {
			cwdMenu();
		} else if (self.fm.selected.length == 1 && self.fm.cdc[self.fm.selected[0]]) {
			// id = self.fm.cdc[self.fm.selected[0]].hash;
			fileMenu();
		} else {
			groupMenu();
		}
		
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
			).click(function() {
				var cmd = $.trim($(this).attr('class').replace('hover', ''));
				// self.fm.log(cmd+' '+id)
				self.exec(cmd);
				self.hideMenu();
			})
		
		// self.fm.log(self.fm.cwd)
		
		function cwdMenu() {
			self.isCmdAllowed('mkdir') && self.menu.append($('<div class="mkdir" />').text(self.fm.i18n('New folder')));
			self.isCmdAllowed('mkfile') && self.menu.append($('<div class="mkfile" />').text(self.fm.i18n('New text files')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.isCmdAllowed('upload') && self.menu.append($('<div class="upload" />').text(self.fm.i18n('Upload files')));
			self.isCmdAllowed('paste') && self.menu.append($('<div class="paste" />').text(self.fm.i18n('Paste')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.menu.append($('<div class="reload" />').text(self.fm.i18n('Reload')));
			self.menu.append($('<div class="delim" />'));
			self.menu.append($('<div class="info" />').text(self.fm.i18n('Get info')));
		}
		
		function groupMenu() {
			self.menu.append($('<div class="compress" />').text(self.fm.i18n('Compress')));
			self.menu.append($('<div class="copy" />').text(self.fm.i18n('Copy')));
			self.menu.append($('<div class="cut" />').text(self.fm.i18n('Cut')));
			self.menu.append($('<div class="rm" />').text(self.fm.i18n('Remove')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.menu.append($('<div class="info" />').text(self.fm.i18n('Get info')));
		}
		
		function fileMenu() {
			var f = self.fm.cdc[self.fm.selected[0]];
			
			self.fm.log(f)
			self.isCmdAllowed('select') && self.menu.append($('<div class="select" />').text(self.fm.i18n('Select file')));
			self.isCmdAllowed('open') && self.menu.append($('<div class="open" />').text(self.fm.i18n('Open')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.isCmdAllowed('rename') && self.menu.append($('<div class="rename" />').text(self.fm.i18n('Rename')));
			self.isCmdAllowed('resize') && self.menu.append($('<div class="resize" />').text(self.fm.i18n('Resize')));
			self.isCmdAllowed('copy') && self.menu.append($('<div class="copy" />').text(self.fm.i18n('Copy')));
			self.isCmdAllowed('cut') && self.menu.append($('<div class="cut" />').text(self.fm.i18n('Cut')));
			self.isCmdAllowed('duplicate') && self.menu.append($('<div class="duplicate" />').text(self.fm.i18n('Duplicate')));
			self.isCmdAllowed('rm') && self.menu.append($('<div class="rm" />').text(self.fm.i18n('Remove')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.isCmdAllowed('edit') && self.menu.append($('<div class="edit" />').text(self.fm.i18n('Edit')));
			self.menu.children().length && self.menu.append($('<div class="delim" />'));
			self.menu.append($('<div class="info" />').text(self.fm.i18n('Get info')));
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
			disabled.push('select')
		}
		for (i in this.commands) {
			if ($.inArray(i, disabled) == -1) {
				this.commands[i].prototype = this.command.prototype;
				// this.commands[i].prototype = elFinderUI.prototype.command.prototype;
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
					this.buttons[n] = $('<li />').addClass(n).appendTo(this.fm.view.tlb)
						.bind('click', (function(ui){ return function() {  
								if (!$(this).hasClass('disabled')) {
									// ui.fm.log($(this).attr('class'))
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
		this.menu.css('z-index', zindex)
	}

}

elFinder.prototype.ui.prototype.command = function(fm) {  }

elFinder.prototype.ui.prototype.command.prototype.isAllowed = function(f) {
	return true;
}

elFinder.prototype.ui.prototype.command.prototype.ajax = function(data, callback) {
	var self = this;
	this.fm.lock(true);
	$.ajax({
		url      : this.fm.options.url,
		data     : data,
		dataType : 'json',
		error    : function(t) { self.fm.view.error(t.status != '404' ? 'Invalid backend configuration!' : 'Unable to connect to backend!'); },
		success  : function(data) {
			self.fm.log(data)
			self.fm.lock();
			if (data.error) {
				return self.fm.view.error(data.error+self.fm.ui.errorData(data.errorData));
			}
			if (data.warning) {
				self.fm.view.warning(data.warning+self.fm.ui.errorData(data.errorData));
			}
			callback(data);
			data.debug && self.fm.log(data.debug);
		}
	});

}


elFinder.prototype.ui.prototype.commands = {
	
	/**
	 * @ class Go into previous folder
	 * @ param Object  elFinder
	 **/
	back : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			if (this.fm.history.length) {
				this.fm.ajax({ cmd : 'open', target : this.fm.history.pop()}, function(data) {
					self.fm.setCwd(data.cwd, data.cdc);
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
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.fm.ajax({ cmd : 'reload', target : this.fm.cwd.hash}, function(data) {
				self.fm.setNav(data.tree);
				self.fm.setCwd(data.cwd, data.cdc);
			});
		}
	},
	
	/**
	 * @ class Open file/folder
	 * @ param Object  elFinder
	 **/
	open : function(fm) {
		var self = this;
		this.fm = fm;
		
		/**
		 * Open file/folder
		 * @ param String  file/folder id (only from click on nav tree)
		 **/
		this.exec = function(id) {
			var t = id 
				? (self.fm.dirs[id]||(self.fm.cdc[id]||null))
				: (this.fm.selected.length == 1 ? this.fm.getSelected()[0] : null);
			
			if (!t) {
				return; 
			}
			if (!t.read) {
				return this.fm.view.error('Access denied!');
			}
			if (t.type == 'link' && !t.link) {
				return this.fm.view.error('Broken link!');
			}
			if (!t.mime || t.mime == 'directory') {
				openDir(t.link||t.hash);
			} else {
				openFile(t);
			}
			
			function openDir(id) {
				self.fm.history.push(self.fm.cwd.hash);
				self.fm.ajax({ cmd : 'open', target : id }, function(data) {
					self.fm.setCwd(data.cwd, data.cdc);
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
			var s = this.fm.getSelected();
			return s.length == 1 && s[0].read;
		}
	},
	
	/**
	 * @ class. Call this.fm.options.editorCallback with argument = selected file url
	 * @ param Object  elFinder
	 **/
	select : function(fm) {
		var self = this;
		this.fm  = fm;
		
		this.exec = function() { 
			var s = this.fm.getSelected();
			if (this.fm.options.editorCallback && s[0]) {
				if (s[0].url) {
					this.fm.options.editorCallback(s[0].url);
				} else if (s[0].type == 'link' && !s[0].link) {
					this.fm.options.editorCallback('');
				} else {
					this.fm.ajax({ cmd: 'geturl', current : this.fm.cwd.hash, file : s[0].hash}, function(data) {
						self.fm.options.editorCallback(data.url||'');
					});
				}
			}
		}
				
		this.isAllowed = function() {
			var s = this.fm.getSelected();
			return s.length == 1 && s[0].type != 'dir';
		}
	},
	
	/**
	 * @ class Display files/folders info in dialog window
	 * @ param Object  elFinder
	 **/
	info : function(fm) {
		var self = this;
		this.fm  = fm;
		
		/**
		 * Open dialog windows for each selected file/folder or for current folder
		 **/
		this.exec = function() {
			var f, s;
			if (!this.fm.selected.length) {
				/** nothing selected - show cwd info **/
				f      = self.fm.cwd;
				f.type = 'dir';
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
				
				if (f.type == 'link' && f.link) {
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
					title   : self.fm.i18n(f.type == 'dir' ? 'Folder info' : 'File info'),
					// width   : 450,
					buttons : { Ok : function() { $(this).dialog('close'); }}
				});
			}
		}
	},
	
	/**
	 * @ class Rename file/folder
	 * @ param Object  elFinder
	 **/
	rename : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			var s = this.fm.getSelected(), el, c, input, f, n;
			
			if (s.length == 1) {
				f  = s[0];
				el = this.fm.view.cwd.find('[key="'+f.hash+'"]')
				c  = this.fm.viewMode() == 'icons' ? el.children('label') : el.find('td').eq(1);
				n  = c.html();
				input = $('<input type="text" />').val(f.name).appendTo(c.empty())
					.bind('change blur', rename)
					.keyup(function(e) {
						if (e.keyCode == 27 || (e.keyCode == 13 && f.name == input.val())) {
							restore();
						} 
					})
					.keydown(function(e) {
						e.stopPropagation();
					})
					.click(function(e) { e.stopPropagation(); })
					.select()
					.focus();

			}

			function restore() {
				c.html(n);
			}
			
			function rename() {
				
				if (!self.fm.locked) {
					var err, name = input.val();
					if (f.name == input.val()) {
						return restore();
					}
					self.fm.lock(true);
					if (!self.fm.isValidName(name)) {
						err = 'Invalid name';
					} else if (self.fm.fileExists(name)) {
						err = 'File or folder with the same name already exists';
					}
					
					if (err) {
						self.fm.lock();
						self.fm.view.error(err);
						return input.select().focus();
					}
					
					self.fm.ajax({cmd : 'rename', current : self.fm.cwd.hash, target : f.hash, name : name}, function(data) {
						if (!data.cwd) {
							restore();
						} else {
							data.tree && self.fm.setNav(data.tree);
							self.fm.setCwd(data.cwd, data.cdc);
						}
					});
				}
			}
		}
		
		this.isAllowed = function() {
			return this.fm.selected.length == 1 && this.fm.cwd.write;
		}
	},
	
	copy : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.fm.setBuffer(this.fm.selected);
			this.fm.log(this.fm.buffer)
		}
		
		this.isAllowed = function() {
			return self.fm.selected.length;
		}
	},
	
	cut : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.fm.setBuffer(this.fm.selected, 1);
			this.fm.log(this.fm.buffer)
		}
		
		this.isAllowed = function() {
			return self.fm.selected.length;
		}
	},
	
	paste : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			var i, f, r, msg = '';
			
			if (!this.fm.buffer.target) {
				this.fm.buffer.target = this.fm.cwd.hash;
			}
			if (!this.fm.dirs[this.fm.buffer.target].write) {
				return this.fm.view.error('Access denied!');
			}
			if (this.fm.buffer.src == this.fm.buffer.target) {
				return this.fm.view.error('Unable to copy files into himselves!');
			}
			/* check for files with same names and propmt to overwrite (not for dragndrop moving) */
			if (this.fm.buffer.target == this.fm.cwd.hash) {
				for (i=0; i<this.fm.buffer.names.length; i++) {
					f = this.fm.buffer.names[i];
					if (this.fm.fileExists(f)) {
						msg += f+"\n";
					}
				}

				if (msg) {
					r = confirm(this.fm.i18n('Following files/folders already exists in this location:')+"\n\n"+msg+"\n"+this.fm.i18n('Do you want to replace it with the one you’re moving?')) 
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
				target    : this.fm.buffer.target,
				cut       : this.fm.buffer.cut
			}, function(data) {
				if (data.tree) {
					self.fm.setNav(data.tree);
					self.fm.setCwd(data.cwd, data.cdc);
				}
			});
		}
		
		
		this.isAllowed = function() {
			return this.fm.buffer.files;
		}
	},
	
	rm : function(fm) {
		var self = this;
		this.fm  = fm;
		
		this.exec = function() {
			var i, ids = [], s =this.fm.getSelected();
			for (var i=0; i < s.length; i++) {
				if (!s[i].rm) {
					return this.fm.view.error(s[i].name+': '+this.fm.i18n('Access denied!'));
				}
				ids.push(s[i].hash);
			};
			if (ids.length) {
				this.ajax({ cmd : 'rm', current : this.fm.cwd.hash, 'rm[]' : ids}, function(data) {
					if (data.tree) {
						self.fm.setNav(data.tree);
						self.fm.setCwd(data.cwd, data.cdc);
					}
				});
			}
		}
		
		this.isAllowed = function(f) {
			return this.fm.selected.length;
		}
	},
	
	/**
	 * @ class Create new folder
	 * @ param Object  elFinder
	 **/
	mkdir : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			var n     = this.fm.uniqueName('untitled folder');
				input = $('<input type="text"/>').val(n);
				prev  = this.fm.view.cwd.find('[key][class*="directory"]:last');
				el    = this.fm.viewMode() == 'icons' 
					? $('<div/>').append('<p/>').append($('<label/>').append(input))
					: $('<tr/>').append('<td class="icon"><p/></td>').append($('<td colspan="5"/>').append(input));
			el.addClass('directory ui-selected');
			if (prev.length) {
				el.insertAfter(prev);
			} else {
				el.appendTo(this.fm.viewMode() == 'icons' ? this.fm.view.cwd : this.fm.view.cwd.children('table'));
			}
			
			input.select().focus()
				.click(function(e) { e.stopPropagation(); })
				.bind('change blur', mkdir);

			$(document.body).bind('keyup', keyup);
		
			function keyup(e) {
				if (e.keyCode == 27) {
					el.remove();
					$(document.body).bind('keyup', keyup);
				} else if (e.keyCode == 13) {
					input.trigger('change');
				}
			}
		
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
						return input.select().focus();
					}
					
					self.fm.ajax({cmd : 'mkdir', current : self.fm.cwd.hash, name : name}, function(data) {
						if (data.error) {
							return input.select().focus();
						}
						$(document.body).unbind('keyup', keyup);
						self.fm.setNav(data.tree);
						self.fm.setCwd(data.cwd, data.cdc);
					});
				}
			}
		}
		
		this.isAllowed = function() {
			return this.fm.cwd.write;
		}
	},
	
	/**
	 * @ class Create new text file
	 * @ param Object  elFinder
	 **/
	mkfile : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			var n     = this.fm.uniqueName('untitled file', '.txt'),
				input = $('<input type="text"/>').val(n), 
				prev  = this.fm.view.cwd.find('[key][class*="directory"]:last'),
				el    = this.fm.viewMode() == 'icons' 
					? $('<div/>').append('<p/>').append($('<label/>').append(input))
					: $('<tr/>').append('<td class="icon"><p/></td>').append($('<td colspan="5"/>').append(input));
			el.addClass('text ui-selected');
			if (prev.length) {
				el.insertAfter(prev);
			} else {
				el.appendTo(this.fm.viewMode() == 'icons' ? this.fm.view.cwd : this.fm.view.cwd.children('table'));
			}
			
			input.select().focus()
				.bind('change blur', mkfile)
				.click(function(e) { e.stopPropagation(); });
			
			$(document.body).bind('keyup', keyup);


			function keyup(e) {
				if (e.keyCode == 27) {
					el.remove();
					$(document.body).bind('keyup', keyup);
				} else if (e.keyCode == 13) {
					input.trigger('change');
				}
			}
			
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
						return input.select().focus();
					}
					self.ajax({cmd : 'mkfile', current : self.fm.cwd.hash, name : name}, function(data) {
						if (data.error) {
							return input.select().focus();
						}
						$(document.body).unbind('keyup', keyup);
						self.fm.setCwd(data.cwd, data.cdc);
					});
				}
			}
			
		}
		
		this.isAllowed = function(f) {
			return this.fm.cwd.write;
		}
	},
	
	upload : function(fm) {
		var self = this;
		this.fm = fm;
		
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

			d.append(err.hide()).append(f).append(b).dialog({
				dialogClass : 'el-finder-dialog',
				title     : self.fm.i18n('Upload files'),
				modal     : true,
				resizable : false,
				buttons   : {
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
					self.fm.setCwd(data.cwd, data.cdc);

					data.debug && self.fm.log(data.debug);
				}
			});
		}
		
		this.isAllowed = function() {
			return this.fm.cwd.write;
		}
	},
	
	duplicate : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			
			this.fm.ajax({
				cmd     : 'duplicate',
				current : this.fm.cwd.hash,
				file    : this.fm.selected[0]
			},
			function(data) {
				if (!data.error) {
					self.fm.setCwd(data.cwd, data.cdc);
				}
			});

		}
		
		this.isAllowed = function() {
			var s = this.fm.getSelected();
			return this.fm.cwd.write && s.length == 1 && s[0].read;
		}
	},
	
	edit : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			
		}
		
		this.isAllowed = function() {
			var f = this.fm.getSelected();
			return f.length == 1 && f[0].write && f[0].type != 'dir' && f[0].mime.indexOf('text') == 0;
		}
	},
	
	compress : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.ajax({
				cmd : 'compress'
			}, function(data) {})
		}
	},
	
	uncompress : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			
		}
	},
	
	resize : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			var s = this.fm.getSelected();
			if (s[0] && s[0].write && s[0].dim) {
				var size = s[0].dim.split('x'), w = parseInt(size[0]), h = parseInt(size[1]), rel = w/h;
				
				var iw = $('<input type="text" size="9" value="'+w+'" name="width"/>')
				var ih = $('<input type="text" size="9" value="'+h+'" name="height"/>')
				self.fm.log(w + ' ' + h+' '+rel)
				var f = $('<form/>').append('Image size: ').append(iw).append(ih)
				iw.add(ih).bind('change', calc)
				
				var d = $('<div/>').append(f).dialog({
					modal : true,
					buttons : {
						Cancel : function() { $(this).dialog('close'); },
						Ok     : function() {
							var _w = parseInt(iw.val()) || 0,
								_h = parseInt(ih.val()) || 0;
							if (_w>0 && _w != w && _h>0 && _h != h) {
								self.fm.ajax({
									cmd : 'resize',
									current : self.fm.cwd.hash,
									file : s[0].hash,
									width : _w,
									height : _h
								},
								function (data) {
									self.fm.log(data)
									data.cwd && self.fm.setCwd(data.cwd, data.cdc);
								}
								);
							}
							$(this).dialog('close');
						}
					}
				})
				
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
			return this.fm.selected.length == 1 && this.fm.cdc[this.fm.selected[0]].write && this.fm.cdc[this.fm.selected[0]].dim;
		}
	},
	
	icons : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.fm.viewMode('icons');
			this.fm.updateCwd();
		}
		
		this.isAllowed = function() {
			return this.fm.viewMode() != 'icons';
		}
	},
	
	list : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			this.fm.viewMode('list');
			this.fm.updateCwd();
		}
		
		this.isAllowed = function() {
			return this.fm.viewMode() != 'list';
		}
	},
	
	help : function(fm) {
		var self = this;
		this.fm = fm;
		
		this.exec = function() {
			
		}
	}
}


