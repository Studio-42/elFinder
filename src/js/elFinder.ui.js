(function($) {
	/**
	 * @class elFinder ui - main controller to interact with user
	 * Create filemanager view and ui-widgets.
	 * Add some events handlers
	 * 
	 */
	elFinder.prototype.ui = function(fm, el) {
		var self = this,
			/**
			 * Bind some shortcuts to keypress instead of keydown
			 * Required for procces repeated key in ff and for opera 
			 *
			 * @type Boolean
			 */
			keypress = $.browser.mozilla || $.browser.opera,
			/**
			 * Shortcuts config
			 *
			 * @type Array
			 */
			shortcuts = [
				{
					pattern     : 'arrowLeft',
					description : 'Select file on left or last file',
					callback    : function() { move('left'); },
					keypress    : keypress
				},
				{
					pattern     : 'arrowUp',
					description : 'Select file upside then current',
					callback    : function() { move('up'); },
					keypress    : keypress
				},
				{
					pattern     : 'arrowRight',
					description : 'Select file on right or first file',
					callback    : function() { move('right'); },
					keypress    : keypress
				},
				{
					pattern     : 'arrowDown',
					description : 'Select file downside then current',
					callback    : function() { move('down'); },
					keypress    : keypress
				},
				{
					pattern     : 'shift+arrowLeft',
					description : 'Append file on left to selected',
					callback    : function() { move('left', true); },
					keypress    : keypress
				},
				{
					pattern     : 'shift+arrowUp',
					description : 'Append upside file to selected',
					callback    : function() { move('up', true); },
					keypress    : keypress
				},
				{
					pattern     : 'shift+arrowRight',
					description : 'Append file on right to selected',
					callback    : function() { move('right', true); },
					keypress    : keypress
				},
				{
					pattern     : 'shift+arrowDown',
					description : 'Append downside file to selected',
					callback    : function() { move('down', true); },
					keypress    : keypress
				},
				{
					pattern     : 'ctrl+arrowDown',
					description : 'Open directory or file',
					callback    : function() { 
							if (fm.selected.length == 1 && fm.selected[0].mime == 'directory') {
								fm.cd(fm.selected[0].hash)
							} else if (fm.selected.length) {
								fm.exec('open', fm.selected)
							}
						}
				},
				{
					pattern     : 'ctrl+a',
					description : 'Select all files',
					callback    : function() { 
							self.select('all')
						}
				},
				{
					pattern     : 'ctrl+arrowLeft',
					description : 'Return to previous directory',
					callback    : function() { fm.back(); }
				},
				{
					pattern     : 'enter',
					description : 'Open directory or file',
					callback    : function() { 
							if (fm.selected.length == 1 && fm.selected[0].mime == 'directory') {
								fm.cd(fm.selected[0].hash)
							} else if (fm.selected.length) {
								fm.exec('open', fm.selected)
							}
						}
				},
				{
					pattern : 'ctrl+shift+r',
					description : 'Reload current directory',
					callback : function() { fm.reload(); }
				},
				{
					pattern     : 'ctrl+c',
					description : 'Copy',
					callback    : function() { fm.copy(fm.selected); }
				},
				{
					pattern     : 'ctrl+x',
					description : 'Cut',
					callback    : function() { fm.cut(fm.selected); }
				},
				{
					pattern     : 'ctrl+v',
					description : 'Paste',
					callback    : function() { fm.paste(); }
				},
				{
					pattern     : 'delete',
					description : 'Delete files',
					callback    : function() { fm.rm(); }
				},
				{
					pattern     : 'ctrl+backspace',
					description : 'Delete files',
					callback    : function() { fm.rm(); }
				},
			],
			/**
			 * Move selection to prev/next file
			 *
			 * @param String  move direction
			 8 @param Boolean append to current selection
			 * @return String
			 * @rise select			
			 */
			move = function(dir, append) {
				var cwd = self.cwd,
					prev = dir == 'left' || dir == 'up',
					selector = prev ? 'first' : 'last',
					list = fm._view == 'list',
					s, n, top, left;
				
				if (fm.selected.length) {
					// find fist/last selected file
					s = cwd.find('[id].ui-selected:'+(prev ? 'first' : 'last'));
					
					if (!s[prev ? 'prev' : 'next']('[id]').length) {
						// there is no sibling on required side - do not move selection
						n = s;
					} else if (list || dir == 'left' || dir == 'right') {
						// find real prevoius file
						n = s[prev ? 'prev' : 'next']('[id]');
					} else {
						// find up/down side file in icons view
						top = s.position().top;
						left = s.position().left;

						n = s;
						if (prev) {
							do {
								n = n.prev('[id]');
							} while (n.length && !(n.position().top < top && n.position().left <= left))
							
						} else {
							do {
								n = n.next('[id]');
							} while (n.length && !(n.position().top > top && n.position().left >= left))
							// there is row before last one - select last file
							if (!n.length && cwd.find('[id]:last').position().top > top) {
								n = cwd.find('[id]:last');
							}
						}
					}
					
				} else {
					// there are no selected file - select first/last one
					n = cwd.find('[id]:'+(prev ? 'last' : 'first'))
				}
				
				// new file to select exists
				if (n && n.length) {

					if (append) {
						// append new files to selected
						// found strange bug in ff - prevUntil/nextUntil by id not always returns correct set >_< wtf?
						n = s.add(s[prev ? 'prevUntil' : 'nextUntil']($.browser.mozilla ? '[id="'+n.attr('id')+'"]' : '#'+n.attr('id'))).add(n);
					} else {
						// unselect selected files
						$.each(fm.selected, function() {
							cwd.find('#'+this.hash).removeClass('ui-selected');
						});
					}
					// select file(s)
					n.addClass('ui-selected');
					// set its visible
					scrollToView(n.filter(prev ? ':first' : ':last'));
					// update cache/view
					self.select();
				}
				
			},
			/**
			 * Scroll file to set it visible
			 *
			 * @param DOMElement  file/dir node
			 * @return void
			 */
			scrollToView = function(o) {
				var cwd = self.cwd,
					t   = o.position().top;
					h   = o.outerHeight(true);
					ph  = cwd.innerHeight();
					st  = cwd.scrollTop();
				
				if (t < 0) {
					cwd.scrollTop(Math.ceil(t + st) - 9);
				} else if (t + h > ph) {
					cwd.scrollTop(Math.ceil(t + h - ph + st));
				}
			}
			;

		/**
		 * elFinder instance
		 * 
		 * @type  elFinder
		 */
		this.fm = fm;
		
		/**
		 * Toolbar
		 * 
		 * @type  jQuery
		 */
		this.toolbar = $('<div class="ui-helper-clearfix ui-widget-header ui-corner-all elfinder-toolbar"/>');
		
		/**
		 * Directories tree
		 * 
		 * @type  jQuery
		 */
		this.tree = $('<ul/>');
		
		/**
		 * Places
		 * 
		 * @type  jQuery
		 */
		this.places = $('<ul/>');
		
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
		this.cwd = $('<div/>');
		
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
		this.error = $('<div class="ui-state-error ui-corner-all elfinder-error"><span class="ui-icon ui-icon-close"/><span class="ui-icon ui-icon-alert"/><strong>'+fm.i18n('Error')+'!</strong></div>')
			.append(this.errorMsg)
			.click(function() { self.error.hide() });
		
		/**
		 * Statusbar
		 * 
		 * @type  jQuery
		 */
		this.statusbar = $('<div class="ui-widget-header ui-corner-all elfinder-statusbar"/>');
		
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
			.append(this.statusbar.hide())
			.click(function(e) {
				e.stopPropagation();
				// fire event to enable fm shortcuts
				fm.trigger('focus');
			});
	
		
	
		


		// register shortcuts
		$.each(shortcuts, function(i, s) {
			// fm.shortcut(s);
		});


		this.init = function() {
			// init dirs tree view and events
			this.tree.elfindertree(this.fm);
			
			// init current dir view and events
			this.cwd.elfindercwd(this.fm);
			
			// bind events handlers
			fm.bind('ajaxstart ajaxstop', function(e) {
				self.spinner[e.type == 'ajaxstart' ? 'show' : 'hide']();
				self.error.hide();
			})
			.bind('lock', function(e) {
				self.overlay[fm.locks.ui ? 'show' : 'hide']();
			})
			.bind('error ajaxerror', function(e) {
				self.errorMsg.text(fm.i18n(e.data.error));
				self.error.fadeIn('slow');
				setTimeout(function() { 
					self.error.fadeOut('slow');
				}, 4000);
			})

			;
		}


		/**
		 * Add thumbnails for icons view
		 * 
		 * @param  Object  thumbnails
		 * @return void
		 */
		// this.tmb = function(tmb) {
		// 	$.each(tmb, function(id, t) {
		// 		self.cwd.find('#'+id).children('.elfinder-cwd-icon').css('background', 'url("'+t+'") center center no-repeat');
		// 	});
		// }

	}
	
	elFinder.prototype.ui.prototype = {
		/**
		 * Convert mimetype into css classes
		 * 
		 * @param  String  file mimetype
		 * @return String
		 */
		mime2class : function(mime) {
			return 'elfinder-cwd-icon-'+mime.replace('/' , ' elfinder-cwd-icon-').replace(/\./g, '-');
		},
		
		/**
		 * Return localized kind of file
		 * 
		 * @param  String  file mimetype
		 * @return String
		 */
		mime2kind : function(mime) {
			return this.fm.i18n(this.kinds[mime]||'unknown');
		},
		
		/**
		 * Return localized date
		 * 
		 * @param  String  date
		 * @return String
		 */
		formatDate : function(d) {
			var fm = this.fm;
			return d.replace(/([a-z]+)\s/i, function(a1, a2) { return fm.i18n(a2)+' '; });
		},
		
		/**
		 * Return localized string with file permissions
		 * 
		 * @param  Object  file
		 * @return String
		 */
		formatPermissions : function(f) {
			var r  = !!f.read,
				w  = !!f.read,
				rm = !!f.rm,
				p  = [];
				
			r  && p.push(this.fm.i18n('read'));
			w  && p.push(this.fm.i18n('write'));
			rm && p.push(this.fm.i18n('remove'));
			return p.join('/');
		},
		
		/**
		 * Return css class marks file permissions
		 * 
		 * @param  Object  file 
		 * @return String
		 */
		perms2class : function(o) {
			var c = '';
			
			if (!o.read && !o.write) {
				c = 'elfinder-na';
			} else if (!o.read) {
				c = 'elfinder-wo';
			} else if (!o.write) {
				c = 'elfinder-ro';
			}
			return c;
		},
		
		/**
		 * Return formated file size
		 * 
		 * @param  Number  file size
		 * @return String
		 */
		formatSize : function(s) {
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
		},
		
		/**
		 * Default options for jquery-ui draggable
		 * 
		 * @type  Object
		 */
		draggable : {
			addClasses : false,
			delay      : 20,
			revert     : true,
			cursor     : 'move',
			cursorAt   : {left : 52, top : 47},
			refreshPositions : true,
			drag       : function(e, ui) { ui.helper.toggleClass('elfinder-drag-helper-plus', e.shiftKey||e.ctrlKey||e.metaKey); },
		},
		
		/**
		 * Default options for jquery-ui droppable
		 * 
		 * @type  Object
		 */
		droppable : {
			tolerance : 'pointer',
			over : function() {
				this.id.indexOf('nav-') === 0
					? $(this).addClass('ui-state-hover').children('.elfinder-nav-icon-folder').addClass('elfinder-nav-icon-folder-open')
					: $(this).find('.elfinder-cwd-icon').addClass('elfinder-cwd-icon-directory-opened')
			},
			out : function() {
				this.id.indexOf('nav-') === 0
					? $(this).removeClass('ui-state-hover').children('.elfinder-nav-icon-folder').removeClass('elfinder-nav-icon-folder-open')
					: $(this).find('.elfinder-cwd-icon').removeClass('elfinder-cwd-icon-directory-opened');
			},
			drop : function(e, ui) {
				var fm = $(this).parents('.elfinder')[0].elfinder,
					nav = this.id.indexOf('nav-') === 0;
				
				nav	? $(this).removeClass('ui-state-hover').children('.elfinder-nav-icon-folder').removeClass('elfinder-nav-icon-folder-open')
					: $(this).find('.elfinder-cwd-icon').removeClass('elfinder-cwd-icon-directory-opened');
				
				ui.helper.hide();
				fm.copy(ui.helper.data('files'), ui.helper.data('src'), !(e.shiftKey || e.ctrlKey || e.metaKey));
				fm.paste(nav ? this.id.substr(4) : this.id);
				fm.buffer = [];
			}
		},
		
		/**
		 * File mimetype to kind mapping
		 * 
		 * @type  Object
		 */
		kinds : {
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
		
		
		
	}
	
})(jQuery);