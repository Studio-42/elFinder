$.fn.elfindercwd = function(fm) {
	
	return this.each(function() {
		var cwd = $(this).addClass('elfinder-cwd')
			.delegate('[id]', 'mouseenter', function(e) {
				var target = fm.view == 'list' 
					? $(this) 
					: $(this).find('.elfinder-cwd-icon,.elfinder-cwd-filename');
				
				if (!target.is('.ui-draggable')) {
					target.draggable(draggable);
				}
				
			})
			.delegate('[id]', 'select.elfinder', function(e) {
				var id = $(this).addClass('ui-selected').children().addClass('ui-state-hover').end().attr('id');
			
				if ($.inArray(id, fm.selected) === -1) {
					fm.selected.push(id);
				}
			})
			.delegate('[id]', 'unselect.elfinder', function(e) {
				var id = $(this).removeClass('ui-selected').children().removeClass('ui-state-hover').end().attr('id'),
					ndx = $.inArray(id, fm.selected);
			
				if (ndx !== -1) {
					fm.selected.splice(ndx, 1)
				}
			})
			.delegate('[id]', 'dblclick', function(e) {
				fm.open(this.id);
			})
			.selectable({
				filter     : '[id]',
				start      : function() { fm.trigger('focus'); },
				stop       : function() { fm.trigger('select'); },
				selected   : function(e, ui) { $(ui.selected).trigger('select.elfinder');	},
				unselected : function(e, ui) { $(ui.unselected).trigger('unselect.elfinder'); }
			})
			.droppable({
				accept : 'a[id]',
				drop   : function(e, ui) {
					var src = ui.helper.data('src');

					if (src != fm.cwd.hash && fm.cwd.write) {
						ui.helper.hide();
						fm.copy(ui.helper.data('files'), src, !(e.shiftKey || e.ctrlKey || e.metaKey));
						fm.paste(fm.cwd.hash, true);
					} 
				}
			}),
			draggable = $.extend({}, fm.ui.draggable, {
				addClasses : true,
				appendTo : cwd,
				helper : function(e, ui) {
					var p = this.id ? $(this) : $(this).parents('[id]:first'),
						h = $('<div class="elfinder-drag-helper"/>'),
						icon = '<div class="elfinder-cwd-icon %class ui-corner-all"/>',
						f, l;
					
					// select dragged file if no selected
					if (!p.is('.ui-selected')) {
						p.trigger('select.elfinder');
					}
						
					f = fm.get(cwd.find('.ui-selected:first').attr('id'));
					l = fm.get(cwd.find('.ui-selected:last').attr('id'));
					// append icons [and number of files]	
					h.append(icon.replace('%class', fm.ui.mime2class(f.mime)))
						.data('files', fm.selected)
						.data('src', fm.cwd.hash);
					if (f !== l) {
						h.append(icon.replace('%class', fm.ui.mime2class(l.mime)) + '<span class="elfinder-drag-num">'+fm.selected.length+'</span>');
					}
			
					return h;
				}
			}),
			droppable = {
				tolerance : 'pointer',
				hoverClass : 'elfinder-dropable-active',
				over : function() { cwd.droppable('disable').removeClass('ui-state-disabled'); },
				out  : function() { cwd.droppable('enable'); },
				drop : function(e, ui) {
					ui.helper.hide();
					fm.copy(ui.helper.data('files'), ui.helper.data('src'), !(e.shiftKey || e.ctrlKey || e.metaKey));
					fm.paste(this.id, true);
					cwd.droppable('enable');
				}
			},
			// @todo - in one line
			tpl = {
				icons : {
					container : '%content',
					file : '<div id="%hash" class="elfinder-cwd-file %permsclass %dirclass ui-corner-all">'
							+'<div class="elfinder-cwd-file-wrapper ui-corner-all">'
							+'<div class="elfinder-cwd-icon %mime ui-corner-all"/>%marker'
							+'</div>'
							+'<div class="elfinder-cwd-filename ui-corner-all">%name</div>'
							+'</div>'
				},
				list : {
					container : '<table><thead><tr><td class="ui-widget-header">'+fm.i18n('Name')+'</td><td class="ui-widget-header">'+fm.i18n('Permissions')+'</td><td class="ui-widget-header">'+fm.i18n('Modified')+'</td><td class="ui-widget-header">'+fm.i18n('Size')+'</td><td class="ui-widget-header">'+fm.i18n('Kind')+'</td></tr></thead><tbody>%content</tbody></table>',
					file : '<tr id="%hash" class="elfinder-file %permsclass %dirclass %oddclass">'
							+'<td><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon %mime"/>%marker<span class="elfinder-filename">%name</span></div></td>'
							+'<td>%perms</td>'
							+'<td>%date</td>'
							+'<td>%size</td>'
							+'<td>%kind</td>'
							+'</tr>'
				}
			},
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
				oddclass : function(f, i) {
					return i%2 ? 'elfinder-odd-row' : '';
				}
			},
			
			/**
			 * Bind some shortcuts to keypress instead of keydown
			 * Required for procces repeated key in ff and opera 
			 *
			 * @type Boolean
			 */
			keypress = $.browser.mozilla || $.browser.opera,
			/**
			 * Move selection to prev/next file
			 *
			 * @param String  move direction
			 8 @param Boolean append to current selection
			 * @return void
			 * @rise select			
			 */
			select = function(dir, append) {
				var 
					prev = dir == 'left' || dir == 'up',
					selector = prev ? 'first' : 'last',
					list = fm.view == 'list',
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
					fm.trigger('select');
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
			 * Add thumbnails to required files
			 * Support to type of argument
			 * 1: {hash : url, ...} - old api
			 * 2: [{hash : hashValue, tmb : url}, ...] - new api
			 *
			 * @param  Array|Object
			 * @return void
			 */
			setThumbnails = function(tmb) {
				$.each(tmb, function(i, v) {
					var t = typeof(i), hash, url;
					
					if (t == 'string') {
						// old api
						hash = i;
						url = v;
					} else if (t == 'number'){
						hash = v.hash;
						url = v.tmb;
					}
					if (hash && url) {
						cwd.find('#'+hash).children(':first').children('.elfinder-cwd-icon').css('background', "url('"+url+"') center center no-repeat");
					}
				});
			},
			attachEvents = function() {
				cwd.find('.directory:not(.elfinder-na,.elfinder-ro)').droppable(droppable);
				
				// add suport for shift|meta + click select
				cwd.find(fm.view == 'list' ? '[id]' : '.elfinder-cwd-icon,.elfinder-cwd-filename')
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

						fm.trigger('focus').trigger('select');
					});
			}
			;
		

		fm.bind('open', function(e) {
			var list     = fm.view == 'list',
				template = tpl[fm.view] || tpl.icons,
				html     = [],
				loadTmb  = !!e.data.tmb, // old api
				setTmb   = [],
				interval, i, f;

			// create html code
			for (i = 0; i < e.data.cdc.length; i++) {
				f = e.data.cdc[i];
				if (f && f.name && f.hash) {
					html.push(template.file.replace(/%([a-z]+)/g, function(s, e) { return replace[e] ? replace[e](f, i) : f[e] }));
					if (f.tmb) {
						if (f.tmb === true) {
							loadTmb = true;
						} else {
							setTmb.push({hash : f.hash, tmb : f.tmb});
						}
					}
				}
			}

			// set new content
			cwd.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
				.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'))
				.html(template.container.replace('%content', html.join('')));
			
			setTimeout(attachEvents, 25);	

			// load new thumnails from backend
			loadTmb && !list && fm.ajax({cmd : 'tmb', current : fm.cwd.hash}, 'silent');

			// set thumbnails
			if(setTmb.length) {
				interval = setInterval(function() {
					setTmb.length ? setThumbnails(setTmb.splice(0, 24)) : clearInterval(interval);
				}, $.browser.mozilla ? 75 : 20);
			}
		})
		.bind('tmb', function(e) {
			if (e.data.current == fm.cwd.hash && fm.view == 'icons') {
				e.data.tmb && fm.ajax({cmd : 'tmb', current : fm.cwd.hash}, 'silent');
				setThumbnails(e.data.images);
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