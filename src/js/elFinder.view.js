(function($) {
	
	elFinder.prototype.view = function(fm, el) {
		var self = this,
			error = function(m) {
				self.errorMsg.text(fm.i18n(m));
				self.error.fadeIn('slow');
				setTimeout(function() { 
					self.error.fadeOut('slow');
				}, 4000);
			},
			perms = function(o) {
				var c = '', e = '';
			
				if (!o.read && !o.write) {
					c = 'elfinder-na';
					e = '<span class="elfinder-perms"/>';
				} else if (!o.read) {
					c = 'elfinder-wo';
					e = '<span class="elfinder-perms"/>';
				} else if (!o.write) {
					c = 'elfinder-ro';
					e = '<span class="elfinder-perms"/>';
				}
				return { cssclass : c, element : e };
			},
			symlink = function(o) {
				return o.link || o.mime == 'symlink-broken' ? '<span class="elfinder-symlink"/>' : ''
			}
			;

		/**
		 * elFinder instance
		 * 
		 * @type  elFinder
		 */
		this.fm = fm;
		
		/**
		 * File mimetype to kind mapping
		 * 
		 * @type  Object
		 */
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
		
		/**
		 * Tolbar
		 * 
		 * @type  jQuery
		 */
		this.toolbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar"/>');
		
		/**
		 * Directories tree
		 * 
		 * @type  jQuery
		 */
		this.tree = $('<ul class="elfinder-tree"/>');
		
		/**
		 * Places
		 * 
		 * @type  jQuery
		 */
		this.places = $('<ul class="elfinder-tree"/>');
		
		/**
		 * Navigation panel
		 * 
		 * @type  jQuery
		 */
		this.nav = $('<div class="ui-state-default elfinder-nav"/>').append(this.tree);
		
		/**
		 * Current working directory panel
		 * 
		 * @type  jQuery
		 */
		this.cwd = $('<div class="elfinder-cwd"/>');
		
		/**
		 * Nav and cwd container
		 * 
		 * @type  jQuery
		 */
		this.workzone = $('<div class="ui-helper-clearfix elfinder-workzone"/>').append(this.nav).append(this.cwd)
		
		/**
		 * Ajax spinner
		 * 
		 * @type  jQuery
		 */
		this.spinner = $('<div class="elfinder-spinner"/>');
		
		/**
		 * Overlay
		 * 
		 * @type  jQuery
		 */
		this.overlay = $('<div class="ui-widget-overlay elfinder-overlay"/>');
		
		/**
		 * Error message place
		 * 
		 * @type  jQuery
		 */
		this.errorMsg = $('<div/>');
		
		/**
		 * Error message container
		 * 
		 * @type  jQuery
		 */
		this.error = $('<div class="ui-state-error ui-corner-all elfinder-error"><span class="ui-icon ui-icon-alert"/><strong>'+fm.i18n('Error')+'!</strong></div>')
			.prepend($('<span class="ui-icon ui-icon-close"/>').click(function() { self.error.hide() }))
			.append(this.errorMsg);
		
		/**
		 * Statusbar
		 * 
		 * @type  jQuery
		 */
		this.statusbar = $('<div class="ui-widget-header ui-corner-all elfinder-statusbar"/>')
		
		/**
		 * Common elFinder container
		 * 
		 * @type  jQuery
		 */
		this.viewport = el.empty()
			.attr('id', fm.id)
			.addClass('ui-helper-reset ui-helper-clearfix ui-widget ui-widget-content ui-corner-all elfinder elfinder-'+fm.dir+' '+(fm.options.cssClass||''))
			.append(this.toolbar.hide())
			.append(this.workzone)
			.append(this.overlay.hide())
			.append(this.spinner)
			.append(this.error)
			.append(this.statusbar.hide());
	
		fm.bind('ajaxstart ajaxstop ajaxerror', function(e) {
			var s = e.type == 'ajaxstart';
			
			self.spinner[s ? 'show' : 'hide']();
			self.error.hide();
			e.type == 'ajaxerror' && error(e.data.error);
		})
		.bind('lock', function(e) {
			self.overlay[fm.locks.ui ? 'show' : 'hide']();
		})
		.bind('error', function(e) {
			error(e.data.error);
		})
		.bind('reload', function(e) {
			self.renderNav(e.data.tree).renderCdc();

		})
		.bind('cd', function() {
			self.renderCdc();
		})
		;


		this.renderNav = function(tree) {
			var html = '',
				traverse = function(tree) {
					var html = '<ul style="display:none">',	i, o, p;

					for (i=0; i < tree.length; i++) {
						o = tree[i];
						if (o.name && o.hash) {
							p = perms(o);

							html += '<li><a href="#" key="'+o.hash+'" class="ui-corner-all '+p.cssclass+'">'
									+ '<span class="elfinder-nav-'+(o.dirs.length ? 'collapsed' : 'empty')+'"/>'
									+ '<span class="elfinder-nav-icon elfinder-nav-icon-folder"/>'
									+ p.element + o.name + '</a>';

							if (o.dirs.length) {
								html += traverse(o.dirs);
							}
							html += '</li>'
						}
						
					}
					return html + '</ul>';
				},
				p = perms(tree);
				
			if (tree.length) {
				
			} else {
				p = perms(tree);
				html = '<li><a href="#" key="'+tree.hash+'" class="ui-corner-all '+p.cssclass+'">'
						+'<span class="elfinder-nav-'+(tree.dirs.length ? 'collapsed' : 'empty')+'"/>'
						+'<span class="elfinder-nav-icon elfinder-nav-icon-home"/>'
						+p.element+tree.name+'</a>' + traverse(tree.dirs) + '</li>';
			}
			
			this.tree.html(html)//.children('li:first').children('a').change();
			return this;
		}
		
		this.renderCdc = function() {
			var l    = this.fm.viewType() == 'list',
				c    = 'ui-widget-header',
				html = l ? '<table><tr><td class="'+c+'">'+fm.i18n('Name')+'</td><td class="'+c+'">'+fm.i18n('Permissions')+'</td><td class="'+c+'">'+fm.i18n('Modified')+'</td><td class="'+c+'">'+fm.i18n('Size')+'</td><td class="'+c+'">'+fm.i18n('Kind')+'</td></tr>' : '',
				r    = l ? 'rowHtml' : 'iconHtml';
			
			$.each(this.fm.cdc, function(k, o) {
				html += self[r](o);
			});
			
			this.cwd.html(html + (l ? '</table>' : ''));
			return this;
		}

		this.iconHtml = function(o) {
			var style = o.tmb ? ' style="background:url(\''+o.tmb+'\') 0 0 no-repeat"' : '',
				p = perms(o)
			;
			o.tmb && fm.log(o.tmb)
			return '<a href="#" key="'+o.hash+'" class="ui-corner-all '+p.cssclass+'">'
					+ '<span class="elfinder-big-icon elfinder-big-icon-'+this.mime2class(o.mime)+'"'+style+'/>'
					+ '<span class="elfinder-filename">'+o.name+'</span>'
					+ p.element
					+ symlink(o)
					+ '</a>'

		}
		
		this.rowHtml = function(o) {
			var p = perms(o);
			return '<tr key="'+o.hash+'" class="'+p.cssclass+'">'
					+ '<td class="ui-widget-content"><div><span class="elfinder-small-icon elfinder-small-icon-'+this.mime2class(o.mime)+'"/>'+p.element + symlink(o) + '<span class="elfinder-filename">'+o.name+'</span></div></td>'
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