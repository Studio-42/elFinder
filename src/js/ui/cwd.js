/**
 * Current working directory.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercwd = function(fm) {
	
	this.getFile = function(id) {
		return this.filter('.elfinder-cwd:first').find('#'+id)
	}
	
	this.fakeObject = function(name, mime) {
		var cwd = this.filter('.elfinder-cwd:first'),
			id = 'tmp_'+parseInt(Math.random()*100000);
		
		cwd.trigger('fakeobj', ['test'])
		
		// return dir;
	}
	
	this.unselectAll = function() {
		cwd = this.filter('.elfinder-cwd:first').trigger('unselectall');
	}
	
	// @TODO on cut add disable class to files?
	this.not('.elfinder-cwd').each(function() {
		
		$(this).parent().children('.elfinder-workzone').append(this);
		
		var 
			undef = 'undefined',
			/**
			 * Select event full name
			 *
			 * @type String
			 **/
			evtSelect = 'select.'+fm.namespace,
			
			/**
			 * Unselect event full name
			 *
			 * @type String
			 **/
			evtUnselect = 'unselect.'+fm.namespace,
			
			/**
			 * Disable event full name
			 *
			 * @type String
			 **/
			evtDisable = 'disable.'+fm.namespace,
			
			/**
			 * Disable event full name
			 *
			 * @type String
			 **/
			evtEnable = 'enable.'+fm.namespace,
			
			/**
			 * Selected css class
			 *
			 * @type String
			 **/
			clSelected = 'ui-selected',
			
			/**
			 * Disabled css class
			 *
			 * @type String
			 **/
			clDisabled = 'ui-state-disabled',
			
			/**
			 * Draggable css class
			 *
			 * @type String
			 **/
			clDraggable = 'ui-draggable',
			
			/**
			 * Droppable css class
			 *
			 * @type String
			 **/
			clDroppable = 'ui-droppable',
			
			/**
			 * Hover css class
			 *
			 * @type String
			 **/
			clHover     = 'ui-state-hover',

			/**
			 * Base thumbnails url
			 * New API only
			 *
			 * @type String
			 **/
			tmbUrl = '',
			
			/**
			 * File templates
			 *
			 * @type Object
			 **/
			templates = {
				icon : '<div id="{hash}" class="elfinder-cwd-file {permsclass} {dirclass} ui-corner-all"><div class="elfinder-cwd-file-wrapper ui-corner-all"><div class="elfinder-cwd-icon {mime} ui-corner-all" unselectable="on" {style}/>{marker}</div><div class="elfinder-cwd-filename ui-corner-all" title="{name}">{name}</div></div>',
				row  : '<tr id="{hash}" class="elfinder-file {permsclass} {dirclass}"><td><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon {mime}"/>{marker}<span class="elfinder-filename">{name}</span></div></td><td>{perms}</td><td>{date}</td><td>{size}</td><td>{kind}</td></tr>'
			},
			
			/**
			 * Template placeholders replacement rules
			 *
			 * @type Object
			 **/
			replacement = {
				permsclass : function(f) {
					return fm.perms2class(f);
				},
				perms : function(f) {
					return fm.formatPermissions(f);
				},
				dirclass : function(f) {
					return f.mime == 'directory' ? 'directory' : '';
				},
				mime : function(f) {
					return fm.mime2class(f.mime);
				},
				size : function(f) {
					return fm.formatSize(f.size);
				},
				date : function(f) {
					return fm.formatDate(f.date);
				},
				kind : function(f) {
					return fm.mime2kind(f.mime);
				},
				marker : function(f) {
					return (f.link || f.mime == 'symlink-broken' ? '<span class="elfinder-symlink"/>' : '')+(!f.read || !f.write ? '<span class="elfinder-perms"/>' : '');
				}
			},
			
			/**
			 * Return file html
			 *
			 * @param  Object  file info
			 * @return String
			 **/
			itemhtml = function(f) {
				return templates[fm.view == 'list' ? 'row' : 'icon']
						.replace(/\{([a-z]+)\}/g, function(s, e) { 
							return replacement[e] ? replacement[e](f) : (f[e] ? f[e] : ''); 
						});
			},
			
			/**
			 * Flag. Required for msie to avoid unselect files on dragstart
			 *
			 * @type Boolean
			 **/
			selectLock = false,
			
			/**
			 * Move selection to prev/next file
			 *
			 * @param String  move direction
			 * @param Boolean append to current selection
			 * @return void
			 * @rise select			
			 */
			select = function(keyCode, append) {
				var code     = $.ui.keyCode,
					prev     = keyCode == code.LEFT || keyCode == code.UP,
					sel      = cwd.find('[id].'+clSelected),
					selector = prev ? 'first' : 'last',
					list     = fm.view == 'list',
					s, n, sib, top, left;
					
				function sibling(n, direction) {
					return n[direction+'All']('[id]:not(.'+clDisabled+'):first');
				}
				
				if (sel.length) {
					s = sel.filter(prev ? ':first' : ':last');
					sib = sibling(s, prev ? 'prev' : 'next');
					
					if (!sib.length) {
						// there is no sibling on required side - do not move selection
						n = s;
					} else if (list || keyCode == code.LEFT || keyCode == code.RIGHT) {
						// find real prevoius file
						n = sib;
					} else {
						// find up/down side file in icons view
						top = s.position().top;
						left = s.position().left;

						n = s;
						if (prev) {
							do {
								n = n.prev('[id]');
							} while (n.length && !(n.position().top < top && n.position().left <= left));

							if (n.is('.'+clDisabled)) {
								n = sibling(n, 'next');
							}
						} else {
							do {
								n = n.next('[id]');
							} while (n.length && !(n.position().top > top && n.position().left >= left));
							
							if (n.is('.'+clDisabled)) {
								n = sibling(n, 'prev');
							}
							// there is row before last one - select last file
							if (!n.length) {
								sib = cwd.find('[id]:not(.'+clDisabled+'):last');
								if (sib.position().top > top) {
									n = sib;
								}
							}
						}
					}
					
				} else {
					// there are no selected file - select first/last one
					n = cwd.find('[id]:not(.'+clDisabled+'):'+(prev ? 'last' : 'first'))
				}
				
				if (n && n.length) {

					if (append) {
						// append new files to selected
						n = s.add(s[prev ? 'prevUntil' : 'nextUntil']('#'+n.attr('id'))).add(n);
					} else {
						// unselect selected files
						sel.trigger(evtUnselect);
					}
					// select file(s)
					n.trigger(evtSelect);
					// set its visible
					scrollToView(n.filter(prev ? ':first' : ':last'));
					// update cache/view
					trigger();
				}
			},
			
			/**
			 * Unselect all files
			 *
			 * @return void
			 */
			unselectAll = function() {
				cwd.find('[id].'+clSelected).trigger(evtUnselect); 
			},
			
			/**
			 * Return selected files hashes list
			 *
			 * @return Array
			 */
			selected = function() {
				return $.map(cwd.find('[id].'+clSelected), function(n) {
					n = $(n);
					return n.is('.'+clDisabled) ? null : $(n).attr('id');
				});
			},
			
			/**
			 * Fire elfinder "select" event and pass selected files to it
			 *
			 * @return void
			 */
			trigger = function() {
				fm.trigger('select', {selected : selected()});
			},
			
			/**
			 * Scroll file to set it visible
			 *
			 * @param DOMElement  file/dir node
			 * @return void
			 */
			scrollToView = function(o) {
				var t   = o.position().top;
					h   = o.outerHeight(true);
					ph  = cwd.innerHeight();
					st  = cwd.scrollTop();
				
				if (t < 0) {
					cwd.scrollTop(Math.ceil(t + st) - 9);
				} else if (t + h > ph) {
					cwd.scrollTop(Math.ceil(t + h - ph + st));
				}
			},
			
			/**
			 * Files we get from server but not show yet
			 *
			 * @type Array
			 **/
			buffer = [],
			
			/**
			 * Return index of elements with required hash in buffer 
			 *
			 * @param String  file hash
			 * @return Number
			 */
			index = function(hash) {
				var l = buffer.length;
				
				while (l--) {
					if (buffer[l].hash == hash) {
						return l;
					}
				}
				return -1;
			},
			
			/**
			 * Scroll event name
			 *
			 * @type String
			 **/
			scrollEvent = 'scroll.'+fm.namespace,

			/**
			 * Cwd scroll event handler.
			 * Lazy load - append to cwd not shown files
			 *
			 * @return void
			 */
			render = function() {
				var html  = [],  
					dirs  = false, 
					ltmb  = [],
					atmb  = {},
					last  = cwd.find('[id]:last'),
					top   = !last.length,
					place = fm.view == 'list' ? cwd.children('table').children('tbody') : cwd,
					files;

				if (!buffer.length) {
					return cwd.unbind(scrollEvent);
				}

				while ((!last.length || cwd.innerHeight() - last.position().top + fm.options.showThreshold > 0) 
					&& (files = buffer.splice(0, fm.options.showFiles)).length) {
					
					html = $.map(files, function(f) {
						if (f.hash && f.name) {
							if (f.mime == 'directory') {
								dirs = true;
							}
							if (f.tmb) {
								f.tmb === 1 ? ltmb.push(f.hash) : (atmb[f.hash] = f.tmb)
							}
							return itemhtml(f);
						}
						return null;
					});

					place.append(html.join(''));
					last = cwd.find('[id]:last');
					// scroll top on dir load to avoid scroll after page reload
					top && cwd.scrollTop(0);
					
				}
				// load/attach thumbnails
				attachThumbnails(atmb);
				loadThumbnails(fm.newAPI ? ltmb : fm.option('tmb'));

				// make directory droppable
				dirs && makeDroppable();
				
			},
			
			/**
			 * Make directory droppable
			 *
			 * @return void
			 */
			makeDroppable = function() {
				setTimeout(function() {
					cwd.find('.directory:not(.ui-droppable,.elfinder-na,.elfinder-ro)').droppable(droppable);
				}, 20);
			},
			
			/**
			 * Preload required thumbnails and on load add css to files.
			 * Return false if required file is not visible yet (in buffer) -
			 * required for old api to stop loading thumbnails.
			 *
			 * @param  Object  file hash -> thumbnail map
			 * @return Boolean
			 */
			attachThumbnails = function(images) {
				var ret = true;
				$.each(images, function(hash, tmb) {
					var node = cwd.find('#'+hash);
					if (node.length) {
						(function(node, tmb) {
							$('<img/>')
								.load(function() { node.find('.elfinder-cwd-icon').css('background', "url('"+tmb+"') center center no-repeat"); })
								.attr('src', tmb);
						})(node, tmbUrl+tmb);
					} else {
						ret = false;
						if ((ndx = index(hash)) != -1) {
							buffer[ndx].tmb = tmb;
						}
					}
				});
				return ret;
			},
			
			/**
			 * Load thumbnails from backend.
			 *
			 * @param  Array|Boolean  files hashes list for new api | true for old api
			 * @return void
			 */
			loadThumbnails = function(files) {
				if (files === true || files.length) {
					fm.ajax({
						data : {cmd : 'tmb', current : fm.cwd().hash, files : files}, // current - for old api
						preventFail : true
					}).done(function(data) {
						if (fm.view != 'list' 
						// && data.current == fm.cwd().hash
						&& attachThumbnails(data.images)
						&& data.tmb) {
							loadThumbnails(true);
						}
					});
				} 
			},
			
			/**
			 * Add new files to cwd/buffer
			 *
			 * @param  Array  new files
			 * @return void
			 */
			add = function(files) {
				var place    = fm.view == 'list' ? cwd.find('tbody') : cwd,
					l        = files.length, 
					ltmb     = [],
					atmb     = {},
					dirs     = false,
					findNode = function(file) {
						var pointer = cwd.find('[id]:first'), file2;
					
						while (pointer.length) {
							file2 = fm.file(pointer.attr('id'));
							if (file2 && fm.compare(file, file2) < 0) {
								return pointer;
							}
							pointer = pointer.next('[id]');
						}
					},
					findIndex = function(file) {
						var l = buffer.length, i;
						
						for (i =0; i < l; i++) {
							if (fm.compare(file, buffer[i]) < 0) {
								return i;
							}
						}
						return l || -1;
					},
					file, hash, node, ndx;

				
				while (l--) {
					file = files[l];
					hash = file.hash;
					
					if (cwd.find('#'+hash).length) {
						continue;
					}
					
					if ((node = findNode(file)) && node.length) {
						node.before(itemhtml(file));
					} else if ((ndx = findIndex(file)) >= 0) {
						buffer.splice(ndx, 0, file);
					} else {
						place.append(itemhtml(file));
					}
					
					if (cwd.find('#'+hash).length) {
						if (file.mime == 'directory') {
							dirs = true;
						} else if (file.tmb) {
							file.tmb === 1 ? ltmb.push(hash) : (atmb[hash] = file.tmb);
						}
					}
				}
				
				attachThumbnails(atmb);
				loadThumbnails(fm.newAPI ? ltmb : fm.option('tmb'));
				dirs && makeDroppable();
			},
			
			/**
			 * Remove files from cwd/buffer
			 *
			 * @param  Array  files hashes
			 * @return void
			 */
			remove = function(files) {
				var l = files.length, hash, n, ndx;
				
				while (l--) {
					hash = files[l];
					if ((n = cwd.find('#'+hash)).length) {
						n.detach();
					} else if ((ndx = index(hash)) != -1) {
						buffer.splice(ndx, 1);
					}
				}
			},
			
			/**
			 * Draggable options
			 *
			 * @type Array
			 **/
			draggable = $.extend({}, fm.draggable, {
				// stop   : function(e) { 
				// 	// fm.log('release')
				// 	cwd.selectable('enable').droppable('enable');
				// 	selectLock = false;
				// },
				helper : function(e, ui) {
					var element  = this.id ? $(this) : $(this).parents('[id]:first'),
						helper   = $('<div class="elfinder-drag-helper"><span class="elfinder-drag-helper-icon-plus"/></div>'),
						selected = [],
						icon     = function(mime) { return '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>'; }, l;

					cwd.selectable('disable').removeClass(clDisabled);
					fm.log('helper')
					// select dragged file if no selected
					if (!element.is('.'+clSelected)) {
						!(e.ctrlKey||e.metaKey||e.shiftKey) && unselectAll();
						element.trigger(evtSelect);
						trigger();
					}
					selectLock = true;
					
					if ((selected = fm.selected()).length) {
						l = selected.length;
						
						helper.append(icon(fm.file(selected[0]).mime))
							.data({
								files : selected,
								src   : fm.cwd().hash
							});
							
						l > 1 && helper.append(icon(fm.file(selected[l-1]).mime)+'<span class="elfinder-drag-num">'+l+'</span>');
					}
					return helper;
				}
			}),

			/**
			 * Droppable options
			 *
			 * @type Array
			 **/
			droppable = $.extend({}, fm.droppable, {
				hoverClass : 'elfinder-dropable-active',
				over       : function(e, ui) { cwd.droppable('disable').removeClass(clDisabled); },
				out        : function() { cwd.droppable('enable'); }
			}),
			
			/**
			 * CWD node itself
			 *
			 * @type JQuery
			 **/
			cwd = $(this)
				.addClass('elfinder-cwd')
				.attr('unselectable', 'on')
				// fix ui.selectable bugs and add shift+click support 
				.delegate('[id]', 'click.'+fm.namespace, function(e) {
					var p    = this.id ? $(this) : $(this).parents('[id]:first'), 
						prev = p.prevAll('.'+clSelected+':first'),
						next = p.nextAll('.'+clSelected+':first'),
						pl   = prev.length,
						nl   = next.length,
						sib;

					e.stopImmediatePropagation();

					if (e.shiftKey && (pl || nl)) {
						sib = pl ? p.prevUntil('#'+prev.attr('id')) : p.nextUntil('#'+next.attr('id'));
						sib.add(p).trigger(evtSelect);
					} else if (e.ctrlKey || e.metaKey) {
						p.trigger(p.is('.'+clSelected) ? evtUnselect : evtSelect);
					} else {
						cwd.find('[id].'+clSelected).trigger(evtUnselect);
						p.trigger(evtSelect);
					}

					trigger();
				})
				// call fm.open()
				.delegate('[id]', 'dblclick.'+fm.namespace, function(e) {
					fm.dblclick({file : this.id});
				})
				// attach draggable
				.delegate('[id]', 'mouseenter.'+fm.namespace, function(e) {
					var $this = $(this),
						target = fm.view == 'list' 
							? $this 
							: $this.children();

					!target.is('.'+clDraggable) && !$this.is('.'+clDisabled)  && target.draggable(draggable);
				})
				// add hover class to selected file
				.delegate('[id]', evtSelect, function(e) {
					var $this = $(this);
					!selectLock && !$this.is('.'+clDisabled) && $this.addClass(clSelected).children().addClass(clHover);
				})
				// remove hover class from unselected file
				.delegate('[id]', evtUnselect, function(e) {
					!selectLock && $(this).removeClass(clSelected).children().removeClass(clHover);
				})
				// disable files wich removing or moving
				.delegate('[id]', evtDisable, function() {
					var $this  = $(this).removeClass(clSelected).addClass(clDisabled), 
						list   = fm.view == 'list',
						target = (list ? $this : $this.children()).removeClass(clHover);
					
					$this.is('.'+clDroppable) && $this.droppable('disable');
					target.is('.'+clDraggable) && target.draggable('disable');
					!list && target.removeClass(clDisabled);
				})
				// if any files was not removed/moved - unlock its
				.delegate('[id]', evtEnable, function() {
					var $this  = $(this).removeClass(clDisabled), 
						target = fm.view == 'list' ? $this : $this.children();
					
					$this.is('.'+clDroppable) && $this.droppable('enable');	
					target.is('.'+clDraggable) && target.draggable('enable');
				})
				// make files selectable
				.selectable({
					filter     : '[id]',
					stop       : trigger,
					selected   : function(e, ui) { $(ui.selected).trigger(evtSelect); },
					unselected : function(e, ui) { $(ui.unselected).trigger(evtUnselect); }
				})
				// make cwd itself droppable for folders from nav panel
				.droppable($.extend({}, fm.droppable))
				.bind('create.'+fm.namespace, function(e, file) {
					var parent = fm.view == 'list' ? cwd.find('tbody') : cwd;

					cwd.scrollTop(0);
					parent.prepend(itemhtml(file));
				})
				.bind('unselectall', function() {
					cwd.find('[id].'+clSelected+'').trigger(evtUnselect); 
					trigger();
				});
		
		fm
			.open(function(e) {
				var list  = fm.view == 'list', 
					phash = fm.cwd().hash; 
			
				tmbUrl = fm.option('tmbUrl');
		
				cwd.html('')
					.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
					.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'));
		
				if (list) {
					cwd.html('<table><thead><tr><td class="ui-widget-header">'+fm.i18n('Name')+'</td><td class="ui-widget-header">'+fm.i18n('Permissions')+'</td><td class="ui-widget-header">'+fm.i18n('Modified')+'</td><td class="ui-widget-header">'+fm.i18n('Size')+'</td><td class="ui-widget-header">'+fm.i18n('Kind')+'</td></tr></thead><tbody/></table>');
				}
		
				buffer = $.map(e.data.files, function(f) { return f.phash == phash ? f : null; });
				
				buffer = fm.sortFiles(buffer)
		
				cwd.bind(scrollEvent, render).trigger(scrollEvent);
		
				trigger();
			
			})
			.add(function(e) {
				var phash = fm.cwd().hash;
				return add($.map(e.data.added || [], function(f) { return f.phash == phash && f.hash && f.name ? f : null; }))
			})
			.change(function(e) {
				var phash   = fm.cwd().hash,
					changed = e.data.changed || [],
					i       = changed.length,
					file;

				while (i--) {
					file = changed[i];

					if (file.name && file.name) {
						remove([file.hash]);
						if (file.phash == phash) {
							add([file]);
						}
					}
				}
				
			})
			.remove(function(e) {
				remove(e.data.removed || []);
			})
			.bind('dragstart', function() {
				fm.log('dragstart')
			})
			.bind('dragstop', function() {
				fm.log('dragstop')
				cwd.selectable('enable').droppable('enable');
				selectLock = false;
			})
			// disable cuted files
			.bind('lockfiles unlockfiles', function(e) {
				var event = e.type == 'lockfiles' ? evtDisable : evtEnable,
					files = e.data.files || [], 
					l = files.length;
				
				while (l--) {
					cwd.find('#'+files[l]).trigger(event);
				}
				trigger();
			})
			.bind('mkdir mkfile duplicate upload', function(e) {
				var phash = fm.cwd().hash, files;
				
				// if (!fm.selected().length) {
					$.each(e.data.added.concat(e.data.changed), function(i, file) { 
						if (file && file.phash == phash) {
							cwd.find('#'+file.hash).trigger(evtSelect);
						}
					});
					trigger();
				// }
			})
			.shortcut({
				pattern     :'ctrl+a', 
				description : 'Select all files',
				callback    : function() { 
					cwd.find('[id]:not(.'+clSelected+')').trigger(evtSelect); 
					trigger();
				}
			})
			.shortcut({
				pattern     : 'left right up down shift+left shift+right shift+up shift+down',
				description : 'Control selection by arrows and shift key',
				type        : $.browser.mozilla || $.browser.opera ? 'keypress' : 'keydown',
				callback    : function(e) { select(e.keyCode, e.shiftKey); }
			})
			.shortcut({
				pattern     : 'home',
				description : 'Select first file',
				callback    : function(e) { 
					unselectAll();
					cwd.find('[id]:first').trigger(evtSelect) ;
					trigger();
				}
			})
			.shortcut({
				pattern     : 'end',
				description : 'Select last file',
				callback    : function(e) { 
					unselectAll();
					cwd.find('[id]:last').trigger(evtSelect) ;
					trigger();
				}
			});
		
	});
	
	return this;
}