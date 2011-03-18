/**
 * Current working directory.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercwd = function(fm) {
	// @TODO on cut add disable class to files?
	return this.each(function() {
		// fm.log(fm.id)
		var 
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
				icon : '<div id="%hash" class="elfinder-cwd-file %permsclass %dirclass ui-corner-all"><div class="elfinder-cwd-file-wrapper ui-corner-all"><div class="elfinder-cwd-icon %mime ui-corner-all" unselectable="on"%style/>%marker</div><div class="elfinder-cwd-filename ui-corner-all" title="%name">%name</div></div>',
				row  : '<tr id="%hash" class="elfinder-file %permsclass %dirclass"><td><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon %mime"/>%marker<span class="elfinder-filename">%name</span></div></td><td>%perms</td><td>%date</td><td>%size</td><td>%kind</td></tr>'
			},
			
			/**
			 * Template placeholders replacement rules
			 *
			 * @type Object
			 **/
			replace = {
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
				},
				style : function(f) {
					return typeof(f.tmb) == 'string' ? ' style="background:url(\''+tmbUrl+f.tmb+'\') center center no-repeat"' : '';
				}
			},
			
			/**
			 * Return file html
			 *
			 * @param  Object  file info
			 * @return String
			 **/
			item = function(f) {
				return templates[fm.view == 'list' ? 'row' : 'icon'].replace(/%([a-z]+)/g, function(s, e) { return replace[e] ? replace[e](f) : f[e]; })
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
			select = function(dir, append) {
				var prev     = dir == 'left' || dir == 'up',
					sel = cwd.find('[id].ui-selected'),
					selector = prev ? 'first' : 'last',
					list     = fm.view == 'list',
					s, n, top, left;

				if (sel.length) {
					s = sel.filter(prev ? ':first' : ':last');

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
				
				if (n && n.length) {

					if (append) {
						// append new files to selected
						n = s.add(s[prev ? 'prevUntil' : 'nextUntil']('#'+n.attr('id'))).add(n);
					} else {
						// unselect selected files
						cwd.find('.ui-selected').trigger('unselect.elfinder')
					}
					// select file(s)
					n.trigger('select.elfinder');
					// set its visible
					scrollToView(n.filter(prev ? ':first' : ':last'));
					// update cache/view
					fm.trigger('updateselected');
				}
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
			 * Compare two files based on elFinder.sort
			 *
			 * @param Object  file
			 * @param Object  file
			 * @return Number
			 */
			compare = function(f1, f2) {
				var m1 = f1.mime,
					m2 = f2.mime,
					d1 = m1 == 'directory',
					d2 = m2 == 'directory',
					n1 = f1.name,
					n2 = f2.name,
					s1 = f1.size || 0,
					s2 = f2.size || 0;
				
				// dir first	
				if (fm.sort <= 3) {
					if (d1 && !d2) {
						return -1;
					}
					if (!d1 && d2) {
						return 1;
					}
				}
				// by mime
				if ((fm.sort == 2 ||fm. sort == 5) && m1 != m2) {
					return m1 > m2 ? 1 : -1;
				}
				// by size
				if ((fm.sort == 3 || fm.sort == 6) && s1 != s2) {
					return s1 > s2 ? 1 : -1;
				}
				
				return f1.name.localeCompare(f2.name);
			},
			
			/**
			 * Last rendered file 
			 * Required to start lazy load
			 *
			 * @type JQuery
			 **/
			last,
			
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
			indexof = function(hash) {
				var l = buffer.length;
				
				while (l--) {
					if (buffer[l].hash == hash) {
						return l;
					}
				}
				return -1;
			},
			
			/**
			 * Flag to aviod unnessesary paralell scroll event handlers cals
			 *
			 * @type  Boolean
			 */
			scrollLock = false,
			
			/**
			 * Flag to aviod cwd scrolled into prev position after page reload
			 *
			 * @type  Boolean
			 */
			scrollTop = false,

			/**
			 * Cwd scroll event handler.
			 * Lazy load - append to cwd not shown files
			 *
			 * @return void
			 */
			scroll = function() {
				var html = [],  
					tmbs = [],
					dirs = false, 
					files;
				
				if (buffer.length) {
					if (!scrollLock) {
						scrollLock = true;
						
						while ((!last || cwd.innerHeight() - last.position().top + fm.options.showThreshold > 0) 
							&& (files = buffer.splice(0, fm.options.showFiles)).length) {
							
							html = $.map(files, function(f) {
								if (f.hash && f.name) {
									if (f.mime == 'directory') {
										dirs = true;
									}
									if (f.tmb === 1) {
										tmbs.push(f.hash)
									}
									return item(f);
								}
								return null;
							});

							(fm.view == 'list' ? cwd.children('table').children('tbody') : cwd).append(html.join(''));
							
							last = cwd.find('[id]:last');
							scrollTop && cwd.scrollTop(0);
							
						}
						scrollLock = false;
						// if (dirs) {
						// 	setTimeout(function() {
						// 		cwd.find('.directory:not(.ui-droppable,.elfinder-na,.elfinder-ro)').droppable(droppable);
						// 	}, 20);
						// }
						// if (tmbs.length || fm.cwd().tmb) {
						// 	fm.ajax({cmd : 'tmb', current : fm.cwd().hash, files : tmbs}, 'silent');
						// } 
						
					}
				} else {
					cwd.unbind('scroll', scroll);
				}
			},
			
			/**
			 * Draggable options
			 *
			 * @type Array
			 **/
			draggable = $.extend({}, fm.draggable, {
				stop   : function(e) { 
					cwd.selectable('enable').droppable('enable');
					selectLock = false;
				},
				helper : function(e, ui) {
					var element  = this.id ? $(this) : $(this).parents('[id]:first'),
						helper   = $('<div class="elfinder-drag-helper"><span class="elfinder-drag-helper-icon-plus"/></div>'),
						selected = [],
						icon     = function(mime) { return '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>'; }, l;

					cwd.selectable('disable').droppable('disable').removeClass('ui-state-disabled');

					// select dragged file if no selected
					if (!element.is('.ui-selected')) {
						if (!(e.ctrlKey||e.metaKey||e.shiftKey)) {
							cwd.find('[id].ui-selected').trigger('unselect.elfinder');
						}
						element.trigger('select.elfinder');
						fm.trigger('updateselected');
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
				over       : function() { cwd.droppable('disable').removeClass('ui-state-disabled'); },
				// out        : function() { cwd.droppable('enable'); }
			}),
			
			/**
			 * Bind some shortcuts to keypress instead of keydown.
			 * Required to procces repeated key press in ff and opera.
			 *
			 * @type Boolean
			 */
			keypress = $.browser.mozilla || $.browser.opera,
			
			/**
			 * CWD node itself
			 *
			 * @type JQuery
			 **/
			cwd = $(this)
				.addClass('elfinder-cwd')
				.attr('unselectable', 'on')
				// fix ui.selectable bugs and add shift+click support 
				.delegate('[id]', 'click', function(e) {
					var p    = this.id ? $(this) : $(this).parents('[id]:first'), 
						prev = p.prevAll('.ui-selected:first'),
						next = p.nextAll('.ui-selected:first'),
						pl   = prev.length,
						nl   = next.length,
						sib;

					e.stopImmediatePropagation();

					if (e.shiftKey && (pl || nl)) {
						sib = pl ? p.prevUntil('#'+prev.attr('id')) : p.nextUntil('#'+next.attr('id'));
						sib.add(p).trigger('select.elfinder');
					} else if (e.ctrlKey || e.metaKey) {
						p.trigger((p.is('.ui-selected') ? 'unselect' : 'select') + '.elfinder');
					} else {
						cwd.find('[id].ui-selected').trigger('unselect.elfinder');
						p.trigger('select.elfinder');
					}

					fm.trigger('updateselected');
				})
				// call fm.open()
				.delegate('[id]', 'dblclick', function(e) {
					fm.open(this.id);
				})
				// attach draggable
				.delegate('[id]', 'mouseenter', function(e) {
					var target = fm.view == 'list' ? $(this) : $(this).find('.elfinder-cwd-icon,.elfinder-cwd-filename');
				
					!target.is('.ui-draggable') && target.draggable(draggable);
				})
				// add hover class to selected file
				.delegate('[id]', 'select.elfinder', function(e) {
					!selectLock && $(this).addClass('ui-selected').children().addClass('ui-state-hover');
				})
				// remove hover class from unselected file
				.delegate('[id]', 'unselect.elfinder', function(e) {
					!selectLock && $(this).removeClass('ui-selected').children().removeClass('ui-state-hover');
				})
				// make files selectable
				.selectable({
					filter     : '[id]',
					stop       : function(e) { fm.trigger('updateselected'); },
					selected   : function(e, ui) { $(ui.selected).trigger('select.elfinder');	},
					unselected : function(e, ui) { $(ui.unselected).trigger('unselect.elfinder'); }
				})
				// make cwd itself droppable for folders from nav panel
				.droppable($.extend({}, fm.droppable));
		

		fm
			
			.bind('updateselected', function(e) {
				var selected = [];
				e.stopPropagation();
				cwd.find('[id].ui-selected').each(function() {
					selected.push($(this).attr('id'));
				});
				fm.trigger('select', {selected : selected});
			})
			// update directory content
			.bind('open', function(e) {
				var list  = fm.view == 'list', 
					phash = e.data.cwd.hash; 
				
				tmbUrl = fm.param('tmbUrl')||'';
			
				cwd.empty()
					.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
					.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'));
			
				if (list) {
					cwd.html('<table><thead><tr><td class="ui-widget-header">'+fm.i18n('Name')+'</td><td class="ui-widget-header">'+fm.i18n('Permissions')+'</td><td class="ui-widget-header">'+fm.i18n('Modified')+'</td><td class="ui-widget-header">'+fm.i18n('Size')+'</td><td class="ui-widget-header">'+fm.i18n('Kind')+'</td></tr></thead><tbody/></table>');
				}

				buffer = fm.oldAPI
					? e.data.cdc
					: $.map(e.data.files, function(f) { return f.phash == phash ? f : null });
					
				buffer = buffer.sort(compare);
				scrollTop = true;
				cwd.bind('scroll', scroll).trigger('scroll');
				scrollTop = false;
			})
			// add thumbnails
			.bind('tmb', function(e) {
				if (fm.view != 'list' && e.data.current == fm.cwd().hash) {
					$.each(e.data.images, function(hash, url) {
						var node = cwd.find('#'+hash), ndx;

						if (node.length) {
							node.find('.elfinder-cwd-icon').css('background', "url('"+tmbUrl+url+"') center center no-repeat");
						} else {
							e.data.tmb = false;
						
							if ((ndx = indexof(hash)) != -1) {
								buffer[ndx].tmb = url;
							}
						}
					});
					// old api
					e.data.tmb && fm.ajax({cmd : 'tmb', current : fm.cwd().hash}, 'silent');
				}
			})
			// add new files
			.bind('added', function(e) {
				var phash   = fm.cwd().hash,
					l       = e.data.added.length, f,
					tmbs    = [],
					append  = function(f) {
						var node = item(f),
							i, first, curr;
					
						if ((first = cwd.find('[id]:first')).length) {
							curr = first;
							while (curr.length) {
								if (compare(f, fm.file(curr.attr('id'))) < 0) {
									return curr.before(node);
								}
								curr = curr.next('[id]');
							}
						} 
					
						if (buffer.length) {
							for (i = 0; i < buffer.length; i++) {
								if (compare(f, buffer[i]) < 0) {
									return buffer.splice(i, 0, f);
								}
							}
							return buffer.push(f);
						}
					
						(fm.view == 'list' ? cwd.find('tbody') : cwd).append(node);
					};
			
				while (l--) {
					f = e.data.added[l];
					if (f.phash == phash && !cwd.find('#'+f.hash).length) {
						append(f);
						f.tmb === 1 && tmbs.push(f.hash);
					}
				}
			
				tmbs.length && fm.ajax({cmd : 'tmb', current : fm.cwd().hash, files : tmbs}, 'silent');
			})
			// remove files
			.bind('removed', function(e) {
				var rm = e.data.removed,
					l = rm.length, n;

				while (l--) {
					if ((n = cwd.find('#'+rm[l])).length) {
						n.remove();
					} else if ((n = indexof(rm[l])) != -1) {
						buffer.splice(n, 1);
					}
				}
			})
			.bind('cut', function(e) {
				// disable draggable for selected
			})
			.bind('error', function(e) {
				// remove disabled class
			})
		return
		
		fm.shortcut({
			pattern     :'ctrl+a', 
			description : 'Select all files',
			callback    : function() { 
				cwd.find('[id]:not(.ui-selected)').trigger('select.elfinder'); 
				fm.trigger('updateselected'); 
			}
		})
		.shortcut({
			pattern     : 'arrowLeft',
			description : 'Select file on left or last file',
			keypress    : keypress,
			callback    : function() { select('left'); }
		})
		.shortcut({
			pattern     : 'arrowUp',
			description : 'Select file upside',
			keypress    : keypress,
			callback    : function() { select('up'); }
		})
		.shortcut({
			pattern     : 'arrowRight',
			description : 'Select file on right or last file',
			keypress    : keypress,
			callback    : function() { select('right'); }
		})
		.shortcut({
			pattern     : 'arrowDown',
			description : 'Select file downside',
			keypress    : keypress,
			callback    : function() { select('down'); }
		})
		.shortcut({
			pattern     : 'shift+arrowLeft',
			description : 'Append file on left to selected',
			keypress    : keypress,
			callback    : function() { select('left', true); }
		})
		.shortcut({
			pattern     : 'shift+arrowUp',
			description : 'Append upside file to selected',
			keypress    : keypress,
			callback    : function() { select('up', true); }
		})
		.shortcut({
			pattern     : 'shift+arrowRight',
			description : 'Append file on right to selected',
			keypress    : keypress,
			callback    : function() { select('right', true); }
		})
		.shortcut({
			pattern     : 'shift+arrowDown',
			description : 'Append downside file to selected',
			keypress    : keypress,
			callback    : function() { select('down', true); }
		})
		.shortcut({
			pattern     : 'ctrl+arrowUp',
			description : 'Go into parent folder',
			callback    : function() {
				var hash = fm.cwd().phash;
				hash && fm.open(hash);
			}
		})
		.shortcut({
			pattern     : 'ctrl+arrowDown',
			description : 'Open directory or files',
			callback    : function() {
				$.each(fm.selected(), function(i, hash) {
					fm.open(hash);
				});
			}
		})
		.shortcut({
			pattern     : 'enter',
			description : 'Open directory or files',
			callback    : function() {
				$.each(fm.selected(), function(i, hash) {
					fm.open(hash);
				});
			}
		})
		;
		
	});
	
}