
$.fn.elfindercwd = function(fm) {
	// @TODO on cut add disable class to files?
	return this.each(function() {
		var /**
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
			 * Number of not shown thumbnails
			 *
			 * @type Number
			 **/
			tmbcnt = 0,
			/**
			 * Distance in px from item to cwd low edge to start lazy load   
			 *
			 * @type Number
			 **/
			theshold = fm.options.loadThreshold,
			/**
			 * Bind some shortcuts to keypress instead of keydown
			 * Required to procces repeated key in ff and opera 
			 *
			 * @type Boolean
			 */
			keypress = $.browser.mozilla || $.browser.opera,
			/**
			 * Draggable options
			 *
			 * @type Array
			 **/
			draggable = $.extend({}, fm.ui.draggable, {
				addClasses : true,
				appendTo   : this,
				helper     : function(e, ui) {
					var p = this.id ? $(this) : $(this).parents('[id]:first'),
						h = $('<div class="elfinder-drag-helper"/>'),
						icon = '<div class="elfinder-cwd-icon %class ui-corner-all"/>',
						first, last, files = [];
					
					// select dragged file if no selected
					if (!p.is('.ui-selected')) {
						if (!(e.ctrlKey||e.metaKey||e.shiftKey)) {
							cwd.find('[id].ui-selected').trigger('unselect.elfinder');
						}
						p.trigger('select.elfinder');
					}
						
					first = fm.get(cwd.find('.ui-selected:first').attr('id'));
					last  = fm.get(cwd.find('.ui-selected:last').attr('id'));
					// append icons [and number of files]	
					h.append(icon.replace('%class', fm.ui.mime2class(first.mime)))
						.data('files', fm.selected)
						.data('src', fm.cwd.hash);
					if (first !== last) {
						h.append(icon.replace('%class', fm.ui.mime2class(last.mime)) + '<span class="elfinder-drag-num">'+fm.selected.length+'</span>');
					}
			
					return h;
				}
			}),
			/**
			 * Droppable options
			 *
			 * @type Array
			 **/
			droppable = $.extend({}, fm.ui.droppable, {
				hoverClass : 'elfinder-dropable-active',
				over       : function() { cwd.droppable('disable').removeClass('ui-state-disabled'); },
				out        : function() { cwd.droppable('enable'); }
			}),
			/**
			 * File templates
			 *
			 * @type Object
			 **/
			templates = {
				icon : '<div id="%hash" class="elfinder-cwd-file %permsclass %dirclass ui-corner-all"><div class="elfinder-cwd-file-wrapper ui-corner-all"><div class="elfinder-cwd-icon %mime ui-corner-all"%tmb/>%marker</div><div class="elfinder-cwd-filename ui-corner-all">%name</div></div>',
				row  : '<tr id="%hash" class="elfinder-file %permsclass %dirclass"><td><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon %mime"/>%marker<span class="elfinder-filename">%name</span></div></td><td>%perms</td><td>%date</td><td>%size</td><td>%kind</td></tr>'
			},
			/**
			 * Template placeholders replacement rules
			 *
			 * @type Object
			 **/
			replace = {
				permsclass : function(f) {
					return fm.ui.perms2class(f);
				},
				perms : function(f) {
					return fm.ui.formatPermissions(f);
				},
				dirclass : function(f) {
					return f.mime == 'directory' ? 'directory' : '';
				},
				mime : function(f) {
					return fm.ui.mime2class(f.mime);
				},
				size : function(f) {
					return fm.ui.formatSize(f.size);
				},
				date : function(f) {
					return fm.ui.formatDate(f.date);
				},
				kind : function(f) {
					return fm.ui.mime2kind(f.mime);
				},
				marker : function(f) {
					return (f.link || f.mime == 'symlink-broken' ? '<span class="elfinder-symlink"/>' : '')+(!f.read || !f.write ? '<span class="elfinder-perms"/>' : '');
				},
				tmb : function(f) {
					return f.tmb ? ' _tmb="'+f.tmb+'"' : '';
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
			 * Append files to cwd
			 *
			 * @param  Array  files info
			 * @param  Boolean  scroll to top?
			 * @return void
			 **/
			append = function(files, scroll) {
				var html = [], ids = [],
					f, i;
					
				fm.time('render')
				for (i = 0; i < files.length; i++) {
					f = files[i];
					if (f.hash && f.name) {
						html.push(item(f));
						ids.push(f.hash)
					}
				}
				
				(fm.view == 'list' ? cwd.children('table').children('tbody') : cwd).append(html.join(''));
					
				last = cwd.find('[id]:last')
				tmbcnt = cwd.find('[_tmb]').length;
				
				fm.cwd.tmb && fm.ajax({cmd : 'tmb', current : fm.cwd.hash}, 'silent');
				
				// on page reload browser remeber scroll position, 
				// so  scroll top to avoid loading too many files
				scroll && cwd.scrollTop(0);
				// call to show thumbnails
				cwd.trigger('scroll');
				
				setTimeout(function() { bind(ids); }, 10);
				
				fm.timeEnd('render')
					
			},
			/**
			 * Attach event handlersto required files
			 *
			 * @param  Array  files ids
			 * @return void
			 **/
			bind = function(ids) {
				var selector = '#'+ids.join(',#'),
					elements = cwd.find(selector);

				elements.filter('.directory:not(.elfinder-na,.elfinder-ro)').droppable(droppable);
				// suport shift|meta + click select
				(fm.view == 'list' ? elements : elements.find('.elfinder-cwd-icon,.elfinder-cwd-filename'))
					.click(function(e) {
						var p = this.id ? $(this) : $(this).parents('[id]:first'), 
							m = $.browser.mozilla, 
							prev, next, id, s, f;

						if (e.shiftKey) {
							prev = p.prevAll('.ui-selected:first');
							next = p.nextAll('.ui-selected:first');
							if (next.length && !prev.length) {
								f = 'nextUntil';
								id = next.attr('id')
							} else {
								id = prev.attr('id');
								f = 'prevUntil'
							}
							p[f]('#'+id).add(p).trigger('select.elfinder');
						} else if (e.ctrlKey || e.metaKey) {
							p.trigger((p.is('.ui-selected') ? 'unselect' : 'select') + '.elfinder');
						} else {
							cwd.find('[id].ui-selected').trigger('unselect.elfinder');
							p.trigger('select.elfinder')
						}

						fm.trigger('select', {selected : fm.selected});
					});
			},
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
					selector = prev ? 'first' : 'last',
					list     = fm.view == 'list',
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
					fm.trigger('select', {selected : fm.selected});
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
			 * CWD node itself
			 *
			 * @type JQuery
			 **/
			cwd = $(this).addClass('elfinder-cwd')
			.bind('scroll', function(e) {
				var height;
				
				if (last && last.length) {
					height = cwd.innerHeight();
					// lazy load - display not shown files
					if (buffer.length && height - last.position().top + theshold > 0) {
						append(buffer.splice(0, fm.options.loadFiles));
					}
					
					// display not shown thumbnails
					if (tmbcnt > 0) {
						cwd.find('[_tmb]')
							.filter(function() {
								return height - $(this).parents('[id]:first').position().top + theshold > 0;
							}).each(function() {
								var $this = $(this);
								$this.css('background', "url('"+$this.attr('_tmb')+"') center center no-repeat").removeAttr('_tmb');
								tmbcnt--;
								// as I see in top this take effect
								delete fm.cdc[$this.parents('[id]:first').attr('id')].tmb;
							});
					}
				}
			})
			.delegate('[id]', 'mouseenter', function(e) {
				var target = fm.view == 'list' 
					? $(this) 
					: $(this).find('.elfinder-cwd-icon,.elfinder-cwd-filename');
				// set file draggable
				!target.is('.ui-draggable') && target.draggable(draggable);
			})
			.delegate('[id]', 'select.elfinder', function(e) {
				var id = $(this).addClass('ui-selected').children().addClass('ui-state-hover').end().attr('id');
			
				$.inArray(id, fm.selected) === -1 && fm.selected.push(id);
			})
			.delegate('[id]', 'unselect.elfinder', function(e) {
				var id = $(this).removeClass('ui-selected').children().removeClass('ui-state-hover').end().attr('id'),
					ndx = $.inArray(id, fm.selected);
			
				ndx !== -1 && fm.selected.splice(ndx, 1);
			})
			.delegate('[id]', 'dblclick', function(e) {
				fm.open(this.id);
			})
			.selectable({
				filter     : '[id]',
				stop       : function() { fm.lock() && fm.trigger('focus'); fm.trigger('select', {selected : fm.selected}); },
				selected   : function(e, ui) { $(ui.selected).trigger('select.elfinder');	},
				unselected : function(e, ui) { $(ui.unselected).trigger('unselect.elfinder'); }
			})
			.droppable($.extend({}, fm.ui.droppable, {accept : 'a[id]'}));
		

		fm.bind('open', function(e) {
			var list = fm.view == 'list';

			cwd.empty()
				.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
				.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'));
			
			if (list) {
				cwd.html('<table><thead><tr><td class="ui-widget-header">'+fm.i18n('Name')+'</td><td class="ui-widget-header">'+fm.i18n('Permissions')+'</td><td class="ui-widget-header">'+fm.i18n('Modified')+'</td><td class="ui-widget-header">'+fm.i18n('Size')+'</td><td class="ui-widget-header">'+fm.i18n('Kind')+'</td></tr></thead><tbody/></table>');
			}
			if ($.isArray(e.data.cdc)) {
				buffer = e.data.cdc.slice(0);
				append(buffer.splice(0, fm.options.showFiles), true);
			}
			
		})
		.bind('tmb', function(e) {
			var find = function(hash) {
				for (var i = 0; i < buffer.length; i++) {
					if (hash == buffer[i].hash) {
						return buffer[i];
					}
				}
			};
			
			if (e.data.current == fm.cwd.hash && fm.view == 'icons') {
				

				$.each(e.data.images, function(hash, url) {
					var element;
					
					if ((element = cwd.find('#'+hash+' .elfinder-cwd-icon')).length) {
						element.attr('_tmb', url);
						tmbcnt++;
					} else {
						if ((element = find(hash))) {
							element.tmb = url;
						}
						e.data.tmb = false;
					} 
				});
				e.data.tmb && fm.ajax({cmd : 'tmb', current : fm.cwd.hash}, 'silent');
				cwd.trigger('scroll');
			}
		})
		.shortcut({
			pattern     :'ctrl+a', 
			description : 'Select all files',
			callback    : function() { 
				cwd.find('[id]:not(.ui-selected)').trigger('select.elfinder'); 
				fm.trigger('select'); 
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
		;
		
	});
	
}