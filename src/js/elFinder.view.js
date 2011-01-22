(function($) {
	
	elFinder.prototype.view = function(fm, el) {
		var self = this,
			error = function(m) {
				self.errorMsg.text(fm.i18n(m));
				self.error.fadeIn('slow');
				setTimeout(function() { 
					self.error.fadeOut('slow');
				}, 4000);
			};
		
		this.fm = fm;
		
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
		
		
		this.toolbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar"/>');
		
		this.workzone = $('<div class="ui-helper-clearfix elfinder-workzone"/>')
		
		this.nav = $('<div class="ui-state-default elfinder-nav"/>');
		
		this.cwd = $('<div class="elfinder-cwd"/>');
		
		this.spinner = $('<div class="elfinder-spinner"/>');
		
		this.overlay = $('<div class="ui-widget-overlay elfinder-overlay"/>');
		
		this.errorMsg = $('<div/>');
		
		this.error = $('<div class="ui-state-error ui-corner-all elfinder-error"><span class="ui-icon ui-icon-alert"/><strong>'+fm.i18n('Error')+'!</strong></div>')
			.prepend($('<span class="ui-icon ui-icon-close"/>').click(function() { self.error.hide() }))
			.append(this.errorMsg);
		
		this.statusbar = $('<div class="ui-widget-header ui-corner-all elfinder-statusbar"/>')
		
		this.viewport = el.empty()
			.attr('id', fm.id)
			.addClass('ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+fm.dir+' '+(fm.options.cssClass||''))
			.append(this.toolbar.hide())
			.append(this.workzone.append(this.nav).append(this.cwd))
			.append(this.overlay.hide())
			.append(this.spinner)
			.append(this.error)
			.append(this.statusbar.hide());
	
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			var s = e.type == 'ajaxstart';
			
			self.spinner[s ? 'show' : 'hide']();
			e.type == 'ajaxerror' && error(e.data.state == '404' ? 'Unable to connect to backend' : 'Invalid backend configuration');
		})
		.bind('lock', function(e) {
			self.overlay[fm.locks.ui ? 'show' : 'hide']();
		})
		.bind('reload', function(e) {
			
			self.renderCdc();
		})
		;


		this.renderNav = function(tree) {
			
		}
		
		this.renderCdc = function() {
			var fm   = this.fm,
				l    = this.fm.viewType() == 'list',
				c    = 'ui-widget-header',
				html = l ? '<table><tr><td class="'+c+'">'+fm.i18n('Name')+'</td><td class="'+c+'">'+fm.i18n('Permissions')+'</td><td class="'+c+'">'+fm.i18n('Modified')+'</td><td class="'+c+'">'+fm.i18n('Size')+'</td><td class="'+c+'">'+fm.i18n('Kind')+'</td></tr>' : '',
				r    = l ? 'rowHtml' : 'iconHtml';
			
			$.each(this.fm.cdc, function(k, o) {
				html += self[r](o);
			});
			
			this.cwd.html(html + (l ? '</table>' : ''));
		}

		this.iconHtml = function(o) {
			return '<a href="#'+o.hash+'" class="ui-corner-all">'
					+ '<span class="elfinder-big-icon elfinder-big-icon-'+this.mime2class(o.mime)+'"></span>'
					+ '<span class="elfinder-filename">'+o.name+'</span>'
					+'</a>';
			
		}
		
		this.rowHtml = function(o) {
			return '<tr>'
					+ '<td class="ui-widget-content"><span class="elfinder-small-icon elfinder-small-icon-'+this.mime2class(o.mime)+'"></span><span class="elfinder-filename">'+o.name+'</span></td>'
					+ '<td class="ui-widget-content">'+this.formatPermissions(o.read, o.write, o.rm)+'</td>'
					+ '<td class="ui-widget-content">'+this.formatDate(o.date)+'</td>'
					+ '<td class="ui-widget-content">'+this.mime2kind(o.mime)+'</td>'
					+ '<td class="ui-widget-content">'+this.formatSize(o.size)+'</td>'
					+ '</tr>'
		}

		/*
		 * Convert mimetype into css class
		*/
		this.mime2class = function(mime) {
			return mime.replace('/' , ' ').replace(/\./g, '-');
		}

		/*
		 * Return kind of file
		*/
		this.mime2kind = function(mime) {
			return this.fm.i18n(this.kinds[mime]||'unknown');
		}
		
		/*
		 * Return localized date
		*/
		this.formatDate = function(d) {
			return d.replace(/([a-z]+)\s/i, function(a1, a2) { return self.fm.i18n(a2)+' '; });
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

	}
	
})(jQuery);