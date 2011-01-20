(function($) {
elFinder.prototype.view = function(fm, el) {
	var self = this;
	this.fm = fm;
	/**
	 * Object. Mimetypes to kinds mapping
	 **/
	this.kinds = {
		'unknown'                       : 'Unknown',
		'directory'                     : 'Folder',
		'symlink'                       : 'Alias',
		'symlink-broken'                : 'Broken alias',
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
		'application/x-7z-compressed'   : '7z archive',
		'application/x-tar'             : 'TAR archive', 
	    'application/x-gzip'            : 'GZIP archive', 
	    'application/x-bzip2'           : 'BZIP archive', 
	    'application/zip'               : 'ZIP archive',  
	    'application/x-rar'             : 'RAR archive',
		'application/javascript'        : 'Javascript application',
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
		'image/x-targa'                 : 'TGA image',
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
		'video/x-flv'                   : 'Flash video',
		'video/x-matroska'              : 'Matroska video'
	}
	
	this.tlb = $('<ul />');

	this.nav = $('<div class="el-finder-nav"/>').resizable({handles : 'e', autoHide : true, minWidth : 200, maxWidth: 500});
	this.cwd = $('<div class="el-finder-cwd"/>').attr('unselectable', 'on');
	this.spn = $('<div class="el-finder-spinner"/>');
	this.err = $('<p class="el-finder-err"><strong/></p>').click(function() { $(this).hide(); });
	this.nfo = $('<div class="el-finder-stat"/>');
	this.pth = $('<div class="el-finder-path"/>');
	this.sel = $('<div class="el-finder-sel"/>');
	this.stb = $('<div class="el-finder-statusbar"/>')
		.append(this.pth)
		.append(this.nfo)
		.append(this.sel);
	this.wrz = $('<div class="el-finder-workzone" />')
		.append(this.nav)
		.append(this.cwd)
		.append(this.spn)
		.append(this.err)
		.append('<div style="clear:both" />');
	this.win = $(el).empty().attr('id', this.fm.id).addClass('el-finder '+(fm.options.cssClass||''))
		.append($('<div class="el-finder-toolbar" />').append(this.tlb))
		.append(this.wrz)
		.append(this.stb);

	this.tree = $('<ul class="el-finder-tree"></ul>').appendTo(this.nav);
	this.plc  = $('<ul class="el-finder-places"><li><a href="#" class="el-finder-places-root"><div/>'+this.fm.i18n(this.fm.options.places)+'</a><ul/></li></ul>').hide();

	this.nav[this.fm.options.placesFirst ? 'prepend' : 'append'](this.plc);

	/*
	 * Render ajax spinner
	*/
	this.spinner = function(show) {
		this.win.toggleClass('el-finder-disabled', show);
		this.spn.toggle(show);
	}
	
	/*
	 * Display ajax error
	*/
	this.fatal = function(t) {
		self.error(t.status != '404' ? 'Invalid backend configuration' : 'Unable to connect to backend')
	}
	
	/*
	 * Render error
	*/
	this.error = function(err, data) {
		this.fm.lock();
		this.err.show().children('strong').html(this.fm.i18n(err)+'!'+this.formatErrorData(data));
		setTimeout(function() { self.err.fadeOut('slow'); }, 4000);
	}
	
	/*
	 * Render navigation panel with dirs tree
	*/
	this.renderNav = function(tree) {
		var d = tree.dirs.length ? traverse(tree.dirs) : '',
			li = '<li><a href="#" class="el-finder-tree-root" key="'+tree.hash+'"><div'+(d ? ' class="collapsed expanded"' : '')+'/>'+tree.name+'</a>'+d+'</li>';
		this.tree.html(li);
		
		this.fm.options.places && this.renderPlaces();
		
		function traverse(tree) {
			var i, hash, c, html = '<ul style="display:none">';
			for (i=0; i < tree.length; i++) {
				if (!tree[i].name || !tree[i].hash) {
					continue;
				}
				c = '';
				if (!tree[i].read && !tree[i].write) {
					c = 'noaccess';
				} else if (!tree[i].read) {
					c = 'dropbox';
				} else if (!tree[i].write) {
					c = 'readonly';
				} 
				
				html += '<li><a href="#" class="'+c+'" key="'+tree[i].hash+'"><div'+(tree[i].dirs.length ? ' class="collapsed"' : '')+'/>'+tree[i].name+'</a>';

				if (tree[i].dirs.length) {
					html += traverse(tree[i].dirs);
				}
				html += '</li>';
			}
			return html +'</ul>';
		}
	}
	
	/*
	 * Render places
	*/
	this.renderPlaces = function() {
		var i, c, 
			pl = this.fm.getPlaces(),	
			ul = this.plc.show().find('ul').empty().hide();
		$('div:first', this.plc).removeClass('collapsed expanded');

		if (pl.length) {
			pl.sort(function(a, b) {
				var _a = self.tree.find('a[key="'+a+'"]').text()||'',
					_b = self.tree.find('a[key="'+b+'"]').text()||'';
				return _a.localeCompare(_b);
			});
			
			for (i=0; i < pl.length; i++) {
				if ((c = this.tree.find('a[key="'+pl[i]+'"]:not(.dropbox)').parent()) && c.length) {
					ul.append(c.clone().children('ul').remove().end().find('div').removeClass('collapsed expanded').end());
				} else {
					this.fm.removePlace(pl[i]);
				}
			};
			ul.children().length && $('div:first', this.plc).addClass('collapsed');
		}
	}
	
	/*
	 * Render current directory
	*/
	this.renderCwd = function() {
		this.cwd.empty();
		
		var num  = 0, size = 0, html = '';
		for (var hash in this.fm.cdc) {
			num++;
			size += this.fm.cdc[hash].size;
			html += this.fm.options.view == 'icons'
				? this.renderIcon(this.fm.cdc[hash])
				: this.renderRow(this.fm.cdc[hash], num%2);
		}
		if (this.fm.options.view == 'icons') {
			this.cwd.append(html);
		} else {
			this.cwd.append('<table><tr><th colspan="2">'+this.fm.i18n('Name')+'</th><th>'+this.fm.i18n('Permissions')+'</th><th>'+this.fm.i18n('Modified')+'</th><th class="size">'+this.fm.i18n('Size')+'</th><th>'+this.fm.i18n('Kind')+'</th></tr>'+html+'</table>');
		}
		
		this.pth.text(fm.cwd.rel);
		this.nfo.text(fm.i18n('items')+': '+num+', '+this.formatSize(size));
		this.sel.empty();
	}

	/*
	 * Render one file as icon
	*/
	this.renderIcon = function(f) {
		var str = '<p'+(f.tmb ? ' style="'+"background:url('"+f.tmb+"') 0 0 no-repeat"+'"' : '')+'/><label>'+this.formatName(f.name)+'</label>';
		if (f.link || f.mime == 'symlink-broken') {
			str += '<em/>';
		}
		if (!f.read && !f.write) {
			str += '<em class="noaccess"/>';
		} else if (f.read && !f.write) {
			str += '<em class="readonly"/>';
		} else if (!f.read && f.write) {
			str += '<em class="'+(f.mime == 'directory' ? 'dropbox' :'noread')+'" />';
		}
		return '<div class="'+this.mime2class(f.mime)+'" key="'+f.hash+'">'+str+'</div>';
	}

	/*
	 * Render one file as table row
	*/
	this.renderRow = function(f, odd) {
		var str = f.link || f.mime =='symlink-broken' ? '<em/>' : '';
		if (!f.read && !f.write) {
			str += '<em class="noaccess"/>';
		} else if (f.read && !f.write) {
			str += '<em class="readonly"/>';
		} else if (!f.read && f.write) {
			str += '<em class="'+(f.mime == 'directory' ? 'dropbox' :'noread')+'" />';
		}
		return '<tr key="'+f.hash+'" class="'+self.mime2class(f.mime)+(odd ? ' el-finder-row-odd' : '')+'"><td class="icon"><p>'+str+'</p></td><td>'+f.name+'</td><td>'+self.formatPermissions(f.read, f.write, f.rm)+'</td><td>'+self.formatDate(f.date)+'</td><td class="size">'+self.formatSize(f.size)+'</td><td>'+self.mime2kind(f.link ? 'symlink' : f.mime)+'</td></tr>';
	}

	/*
	 * Re-render file (after editing)
	*/
	this.updateFile = function(f) {
		var e = this.cwd.find('[key="'+f.hash+'"]');
		e.replaceWith(e[0].nodeName == 'DIV' ? this.renderIcon(f) : this.renderRow(f));
	}

	/*
	 * Update info about selected files
	*/
	this.selectedInfo = function() {
		var i, s = 0, sel;
		
		if (self.fm.selected.length) {
			sel = this.fm.getSelected();
			for (i=0; i<sel.length; i++) {
				s += sel[i].size;
			}
		}
		this.sel.text(i>0 ? this.fm.i18n('selected items')+': '+sel.length+', '+this.formatSize(s) : '');
	}

	/*
	 * Return wraped file name if needed
	*/
	this.formatName = function(n) {
		var w = self.fm.options.wrap;
		if (w>0) {
			if (n.length > w*2) {
				return n.substr(0, w)+"&shy;"+n.substr(w, w-5)+"&hellip;"+n.substr(n.length-3);
			} else if (n.length > w) {
				return n.substr(0, w)+"&shy;"+n.substr(w);
			}
		}
		return n;
	}

	/*
	 * Return error message
	*/
	this.formatErrorData = function(data) {
		var i, err = ''
		if (typeof(data) == 'object') {
			err = '<br />';
			for (i in data) {
				err += i+' '+self.fm.i18n(data[i])+'<br />';
			}
		}
		return err;
	}

	/*
	 * Convert mimetype into css class
	*/
	this.mime2class = function(mime) {
		return mime.replace('/' , ' ').replace(/\./g, '-');
	}

	/*
	 * Return localized date
	*/
	this.formatDate = function(d) {
		return d.replace(/([a-z]+)\s/i, function(a1, a2) { return self.fm.i18n(a2)+' '; });
	}

	/*
	 * Return formated file size
	*/
	this.formatSize = function(s) {
		var n = 1, u = 'bytes';
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
        return Math.round(s/n)+' '+u;
	}

	/*
	 * Return localized string with file permissions
	*/
	this.formatPermissions = function(r, w, rm) {
		var p = [];
		r  && p.push(self.fm.i18n('read'));
		w  && p.push(self.fm.i18n('write'));
		rm && p.push(self.fm.i18n('remove'));
		return p.join('/');
	}
	
	/*
	 * Return kind of file
	*/
	this.mime2kind = function(mime) {
		return this.fm.i18n(this.kinds[mime]||'unknown');
	}
	
}

})(jQuery);
