elFinder.prototype.view = function(fm, el) {
	var self = this;
	this.fm = fm;
	
	this.kinds = {
		'directory'                     : 'Folder',
		'symlink'                       : 'Alias',
		'unknown'                       : 'Unknown',
		'text/plain'                    : 'Plain text',
	    'text/x-php'                    : 'PHP source',
		'text/javascript'               : 'Javascript source',
		'text/css'                      : 'CSS style sheet',  
	    'text/html'                     : 'HTML document', 
		'text/x-c'                      : 'C source', 
		'text/x-c++'                    : 'C++ source', 
		'text/x-shellscript'            : 'Unix shell script',
	    'text/rtf'                      : 'Rich Text Format (RTF)',
		'text/rtfd'                     : 'RTF with attachments (RTFD)', 
	    'text/xml'                      : 'XML document', 
		'application/xml'               : 'XML document', 
		'application/x-tar'             : 'TAR archive', 
	    'application/x-gzip'            : 'GZIP archive', 
	    'application/x-bzip2'           : 'BZIP archive', 
	    'application/x-zip'             : 'ZIP archive',  
	    'application/zip'               : 'ZIP archive',  
	    'application/x-rar'             : 'RAR archive',  
	    'image/jpeg'                    : 'JPEG image',   
	    'image/gif'                     : 'GIF Image',    
	    'image/png'                     : 'PNG image',    
	    'image/tiff'                    : 'TIFF image',   
	    'image/vnd.adobe.photoshop'     : 'Adobe Photoshop image',
	    'application/pdf'               : 'Portable Document Format (PDF)',
	    'application/msword'            : 'Microsoft Word document',  
		'application/vnd.ms-office'     : 'Microsoft Office document',
		'application/vnd.ms-word'       : 'Microsoft Word document',  
	    'application/msexel'            : 'Microsoft Excel document', 
	    'application/vnd.ms-excel'      : 'Microsoft Excel document', 
		'application/octet-stream'      : 'Application', 
		'audio/mpeg'                    : 'MPEG audio',  
		'video/mpeg'                    : 'MPEG video',  
		'video/x-msvideo'               : 'AVI video',   
		'application/x-shockwave-flash' : 'Flash application', 
		'video/x-flv'                   : 'Flash video'
	}
	
	this.tree = null;
	this.tlb  = $('<ul />');
	this.plc  = $('<div />').addClass('el-finder-places').append($('<label />').text('Places'));
	this.nav  = $('<div />').addClass('el-finder-nav');
	this.cwd  = $('<div />').addClass('el-finder-cwd');
	this.spn  = $('<div />').addClass('el-finder-spinner');
	this.msg  = $('<p />').addClass('el-finder-err rnd-5').append('<div />').append('<strong/>');
	this.nfo  = $('<div />').addClass('stat');
	this.pth  = $('<div />').addClass('path');
	this.sel  = $('<div />').addClass('selected-files');
	this.stb  = $('<div />').addClass('el-finder-statusbar')
		.append(this.pth)
		.append(this.nfo)
		.append(this.sel);
	this.wrz  = $('<div />').addClass('el-finder-workzone')
		.append(this.nav)
		.append(this.cwd)
		.append(this.spn)
		.append(this.msg)
		.append('<div style="clear:both" />');
	this.win  = $(el).empty().addClass('el-finder').addClass(fm.options.cssClass||'')
		.append($('<div />').addClass('el-finder-toolbar').append(this.tlb))
		.append(this.wrz)
		.append(this.stb);


	this.spinner = function(show) {
		if (show) {
			this.win.addClass('el-finder-disabled');
			this.spn.show();
		} else {
			this.win.removeClass('el-finder-disabled');
			this.spn.hide();
		}
	}

	this.fatal = function(t) {
		self.error(t.status != '404' ? 'Invalid backend configuration!' : 'Unable to connect to backend!')
	}
	
	this.error = function(err, data) {
		this.fm.lock();
		err = this.fm.i18n(err)+this.formatErrorData(data);
		this.msg.removeClass('el-finder-warn').show().children('strong').empty().html(err);
		setTimeout(function() { self.msg.fadeOut('slow'); }, 3000);
	}
	
	this.warning = function(warn, data) {
		warn = this.fm.i18n(warn)+this.formatErrorData(data);
		this.msg.addClass('el-finder-warn').show().children('strong').empty().html(warn)
		setTimeout(function() { self.msg.fadeOut('slow'); }, 2000);
	}
	
	this.message = function(m) {
		this.msg.empty().removeClass('el-finder-error').removeClass('el-finder-warning').text(self.fm.i18n(m)).show();
		setTimeout(function() { self.msg.fadeOut('slow'); }, 2000);
	}

	this.renderNav = function(tree) {
		this.tree = $(traverse(tree, true)).appendTo(this.nav.empty()).addClass('el-finder-tree');
		
		if (this.fm.options.places) {
			this.places = $('<ul class="el-finder-places"><li><div class="dir-handler"></div><strong>'+this.fm.i18n(this.fm.options.places)+'</strong></li></ul>');
			if (this.fm.options.placesFirst) {
				this.nav.prepend(this.places);
			} else {
				this.nav.append(this.places);
			}
		}
		
		function traverse(tree, root) {
			var i, c, html = '<ul>';
			for (i in tree) {
				fm.dirs[i] = {
					hash  : i,
					name  : tree[i].name,
					read  : tree[i].read,
					write : tree[i].write
				};

				if (root) {
					c = 'root selected';
				} else if (!tree[i].read) {
					c = 'noaccess';
				} else if (!tree[i].write) {
					c = 'ro';
				} else {
					c = '';
				}
				html += '<li><div class="dir-handler'+(tree[i].dirs ? ' dir-collapsed' : '')+'"></div><a href="#" class="'+c+'" key="'+i+'">'+tree[i].name+'</a>'

				if (tree[i].dirs) {
					html += traverse(tree[i].dirs);
				}
				html += '</li>';
			}
			return html +'</ul>';
		}
	}
	
	this.updatePlaces = function() {
		
		this.places.children('li').children('ul').remove().end().children('div').removeClass('dir-collapsed').removeClass('dir-expanded');
		
		if (this.fm.places.length) {
			var i, ul = $('<ul/>').appendTo(this.places.children('li').eq(0));
			this.places.children('li').children('div').addClass('dir-collapsed dir-expanded');

			for (i=0; i<this.fm.places.length; i++) {
				var d = this.fm.dirs[this.fm.places[i]];
				if (d) {
					$('<li><div class="dir-handler"></div><a href="#" class="'+(!d.write ? 'ro' : '')+'" key="'+this.fm.places[i]+'">'+d.name+'</a></li>').appendTo(ul);
				}
			}
		}
	}
	
	this.renderCwd = function() {
		this.cwd.empty();

		var num  = 0, 
			size = 0, 
			vm   = this.fm.viewMode(),
			cnt = vm == 'icons' 
				? this.cwd 
				: $('<table />').append(
					$('<tr/>')
						.append($('<th/>').text(this.fm.i18n('Name')).attr('colspan', 2))
						.append($('<th/>').text(this.fm.i18n('Permissions')))
						.append($('<th/>').text(this.fm.i18n('Modified')))
						.append($('<th/>').text(this.fm.i18n('Size')))
						.append($('<th/>').text(this.fm.i18n('Kind')))
					)
					.appendTo(this.cwd);
				

		for (var hash in this.fm.cdc) {
			num++;
			size += this.fm.cdc[hash].size;
			cnt.append(vm == 'icons' ? this.renderIcon(this.fm.cdc[hash]) : render(this.fm.cdc[hash]))
		}
		
		this.pth.text(fm.cwd.rel);
		this.nfo.text(fm.i18n('items')+': '+num+', '+this.formatSize(size));
		this.sel.empty();
		
		function render(f) {
			var p = $('<p />'),  
				c = f.type == 'link' && !f.link ? 'broken' : f.mime.replace('/' , ' ').replace('.', '-'),
				el = $('<tr/>').addClass(c).attr('key', f.hash)

			el.append($('<td />').addClass('icon').append(p))
				.append($('<td />').text(f.name))
				.append($('<td />').text(self.formatPermissions(f.read, f.write, f.rm)))
				.append($('<td />').text(self.formatDate(f.date)))
				.append($('<td />').text(self.formatSize(f.size)))
				.append($('<td />').text(self.kind(f)));
			f.type == 'link' && p.append('<em/>');
			if (!f.read) {
				p.append('<em class="wo" />');
			} else if (!f.write) {
				p.append('<em class="ro" />');
			}
			return el;
		}
	}

	this.renderIcon = function(f) {
		var c  = f.type == 'link' && !f.link ? 'broken' : f.mime.replace('/' , ' ').replace('.', '-'),
			el = $('<div/>').addClass(c).attr('key', f.hash),
			p  = $('<p/>'),
			w  = self.fm.options.wrap,
			n  = f.name;
			
		if (f.name.length > w*2) {
			n = f.name.substr(0, w)+"&shy;"+f.name.substr(w, w-5)+"&hellip;"+f.name.substr(f.name.length-3);
		} else if (f.name.length > w) {
			n = f.name.substr(0, w)+"&shy;"+f.name.substr(w);
		}
		el.append(p).append($('<label/>').html(n).attr('title', f.name));
		f.type == 'link' && el.append('<em />');
		if (!f.read) {
			el.append('<em class="wo" />');
		} else if (!f.write) {
			el.append('<em class="ro" />');
		}
		// f.bg && p.css('background', 'transparent url('+f.bg+') 0 0 no-repeat');
		if (f.bg) {
			p.append($('<span/>').addClass('rnd-5').css('background', ' url("'+f.bg+'?'+Math.random()+'") 0 0 no-repeat'))
			// p.append($('<img/>').hide().attr('src', f.bg+'?'+Math.random()).load(function() {
			// 	self.fm.log('load '+f.bg)
			// 	$(this).show();
			// }))
		}
		return el;
	}

	this.updateSelected = function() {
		var i, s = 0, sel = this.fm.getSelected();
		this.sel.empty();
		if (sel.length) {
			for (i=0; i<sel.length; i++) {
				s += sel[i].size;
			}
			this.sel.text(this.fm.i18n('selected items')+': '+sel.length+', '+this.formatSize(s));
		}
	}

	this.formatErrorData = function(data) {
		var err = ''
		if (typeof(data) == 'object') {
			err = '<br />';
			for (var i in data) {
				err += i+' '+self.fm.i18n(data[i])+'<br />';
			}
		}
		return err;
	}

	this.formatDate = function(d) {
		return d.replace(/([a-z]+)\s/i, function(a1, a2) { return self.fm.i18n(a2)+' '; });
	}

	this.formatSize = function(s) {
		var n = 1, u = '';
		if (s > 1073741824) {
			n = 1073741824;
			u = 'Gb';
		} else if (s > 1048576) {
            n = 1048576;
            u = 'Mb';
        } else if (s > 1024) {
            n = 1024;
            u = 'Kb';
        }
        return parseInt(s/n)+' '+u;
	}

	this.formatPermissions = function(r, w, rm) {
		var p = [];
		r  && p.push(self.fm.i18n('read'));
		w  && p.push(self.fm.i18n('write'));
		rm && p.push(self.fm.i18n('remove'));
		return p.join('/');
	}
	
	this.kind = function(f) {
		return this.fm.i18n(f.type=='link' ? 'Alias' : this.kinds[f.mime]||'unknown');
	}
	
}