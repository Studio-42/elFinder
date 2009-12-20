elFinder.prototype.view = function(fm, el) {
	var self = this;
	this.fm = fm;
	
	this.kinds = {
		'directory'                     : 'Folder',
		'symlink'                       : 'Alias',
		'unknown'                       : 'Unknown',
		'application/x-empty'           : 'Plain text',
		'application/postscript'        : 'Postscript document',
		'application/octet-stream'      : 'Application',
		'application/vnd.ms-office'     : 'Microsoft Office document',
		'application/vnd.ms-word'       : 'Microsoft Word document',  
	    'application/vnd.ms-excel'      : 'Microsoft Excel document',
		'application/vnd.ms-powerpoint' : 'Microsoft Powerpoint presentation',
		'application/pdf'               : 'Portable Document Format (PDF)',
		'application/vnd.oasis.opendocument.text' : 'Open Office document',
		'application/x-shockwave-flash' : 'Flash application',
		'application/xml'               : 'XML document', 
		'application/x-bittorrent'      : 'Bittorrent file',
		'application/x-tar'             : 'TAR archive', 
	    'application/x-gzip'            : 'GZIP archive', 
	    'application/x-bzip2'           : 'BZIP archive', 
	    'application/x-zip'             : 'ZIP archive',  
	    'application/zip'               : 'ZIP archive',  
	    'application/x-rar'             : 'RAR archive',
		'application/javascript'        : 'Javascript apllication',
		'text/plain'                    : 'Plain text',
	    'text/x-php'                    : 'PHP source',
		'text/html'                     : 'HTML document', 
		'text/javascript'               : 'Javascript source',
		'text/css'                      : 'CSS style sheet',  
	    'text/rtf'                      : 'Rich Text Format (RTF)',
		'text/rtfd'                     : 'RTF with attachments (RTFD)',
		'text/x-c'                      : 'C source', 
		'text/x-c++'                    : 'C++ source', 
		'text/x-shellscript'            : 'Unix shell script',
	    'text/x-python'                 : 'Python source',
		'text/x-java'                   : 'Java source',
		'text/x-ruby'                   : 'Ruby source',
		'text/x-perl'                   : 'Perl script',
	    'text/xml'                      : 'XML document', 
		'image/x-ms-bmp'                : 'BMP image',
	    'image/jpeg'                    : 'JPEG image',   
	    'image/gif'                     : 'GIF Image',    
	    'image/png'                     : 'PNG image',    
	    'image/tiff'                    : 'TIFF image',   
	    'image/vnd.adobe.photoshop'     : 'Adobe Photoshop image',
		'audio/mpeg'                    : 'MPEG audio',  
		'audio/midi'                    : 'MIDI audio',
		'audio/ogg'                     : 'Ogg Vorbis audio',
		'audio/mp4'                     : 'MP4 audio',
		'audio/wav'                     : 'WAV audio',
		'video/x-dv'                    : 'DV video',
		'video/mp4'                     : 'MP4 video',
		'video/mpeg'                    : 'MPEG video',  
		'video/x-msvideo'               : 'AVI video',
		'video/quicktime'               : 'Quicktime video',
		'video/x-ms-wmv'                : 'WM video',   
		'video/x-flv'                   : 'Flash video'
	}
	
	this.tree = null;
	this.tlb  = $('<ul />');
	this.plc  = $('<div />').addClass('el-finder-places').append($('<label />').text('Places'));
	this.nav  = $('<div />').addClass('el-finder-nav');
	this.cwd  = $('<div />').addClass('el-finder-cwd');
	this.spn  = $('<div />').addClass('el-finder-spinner');
	this.msg  = $('<p />').addClass('el-finder-err rnd-5').append('<div />').append('<strong/>').click(function() { $(this).hide(); });
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
		setTimeout(function() { self.msg.fadeOut('slow'); }, 5000);
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
			var i, hash, c, html = '<ul>';
			for (i=0; i < tree.length; i++) {
				hash = tree[i].hash;
				fm.dirs[hash] = tree[i];
			
				c = '';
				if (root) {
					c = 'root selected';
				} else if (!tree[i].read && !tree[i].write) {
					c = 'noaccess';
				} else if (!tree[i].read) {
					c = 'dropbox';
				} else if (!tree[i].write) {
					c = 'readonly';
				} 
				html += '<li><div class="dir-handler'+(tree[i].dirs.length ? ' dir-collapsed' : '')+'"></div><a href="#" class="'+c+' rnd-3" key="'+hash+'">'+tree[i].name+'</a>'

				if (tree[i].dirs.length) {
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
		var c  = f.type == 'link' && !f.link ? 'broken' : f.mime.replace('/' , ' ').replace(/\./g, '-'),
			el = $('<div/>').addClass(c).attr('key', f.hash),
			p  = $('<p/>'),
			w  = self.fm.options.wrap,
			n  = f.name;
			
		if (f.name.length > w*2) {
			n = f.name.substr(0, w)+"&shy;"+f.name.substr(w, w-5)+"&hellip;"+f.name.substr(f.name.length-3);
		} else if (f.name.length > w) {
			n = f.name.substr(0, w)+"&shy;"+f.name.substr(w);
		}
		el.append(p).append($('<label/>').html(n).attr('title', f.name+' '+f.mime));
		f.type == 'link' && el.append('<em />');
		if (!f.read && !f.write) {
			el.addClass('noaccess')
		} else if (!f.read) {
			el.append('<em class="dropbox" />');
		} else if (!f.write) {
			el.append('<em class="readonly" />');
		}
		f.tmb && this.tmb(p, f.tmb);
		return el;
	}

	this.tmb = function(p, url) {
		p.append($('<span/>').addClass('rnd-5').css('background', ' url("'+url+'") 0 0 no-repeat'))
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
		var n = 1, u = 'b';
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