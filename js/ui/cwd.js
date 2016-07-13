"use strict";
/**
 * elFinder current working directory ui.
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindercwd = function(fm, options) {
	
	this.not('.elfinder-cwd').each(function() {
		// fm.time('cwdLoad');
		
		var mobile = fm.UA.Mobile,
			list = fm.viewType == 'list',

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
			
			c = 'class',
			/**
			 * File css class
			 *
			 * @type String
			 **/
			clFile       = fm.res(c, 'cwdfile'),
			
			/**
			 * Selected css class
			 *
			 * @type String
			 **/
			fileSelector = '.'+clFile,
			
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
			clDisabled = fm.res(c, 'disabled'),
			
			/**
			 * Draggable css class
			 *
			 * @type String
			 **/
			clDraggable = fm.res(c, 'draggable'),
			
			/**
			 * Droppable css class
			 *
			 * @type String
			 **/
			clDroppable = fm.res(c, 'droppable'),
			
			/**
			 * Hover css class
			 *
			 * @type String
			 **/
			clHover     = fm.res(c, 'hover'), 

			/**
			 * Hover css class
			 *
			 * @type String
			 **/
			clDropActive = fm.res(c, 'adroppable'),

			/**
			 * Css class for temporary nodes (for mkdir/mkfile) commands
			 *
			 * @type String
			 **/
			clTmp = clFile+'-tmp',

			/**
			 * Number of thumbnails to load in one request (new api only)
			 *
			 * @type Number
			 **/
			tmbNum = fm.options.loadTmbs > 0 ? fm.options.loadTmbs : 5,
			
			/**
			 * Current search query.
			 *
			 * @type String
			 */
			query = '',

			/**
			 * Currect clipboard(cut) hashes as object key
			 * 
			 * @type Object
			 */
			clipCuts = {},

			/**
			 * Parents hashes of cwd
			 *
			 * @type Array
			 */
			cwdParents = [],
			
			/**
			 * cwd current hashes
			 * 
			 * @type Array
			 */
			cwdHashes = [],

			/**
			 * incsearch current hashes
			 * 
			 * @type Array
			 */
			incHashes = void 0,

			/**
			 * Custom columns name and order
			 *
			 * @type Array
			 */
			customCols = [],

			/**
			 * Custom columns builder
			 *
			 * @type Function
			 */
			customColsBuild = function() {
				var cols = '';
				for (var i = 0; i < customCols.length; i++) {
					cols += '<td class="elfinder-col-'+customCols[i]+'">{' + customCols[i] + '}</td>';
				}
				return cols;
			},

			/**
			 * Make template.row from customCols
			 *
			 * @type Function
			 */
			makeTemplateRow = function() {
				return '<tr id="{id}" class="'+clFile+' {permsclass} {dirclass}" title="{tooltip}"{css}><td class="elfinder-col-name"><div class="elfinder-cwd-file-wrapper"><span class="elfinder-cwd-icon {mime}"{style}/>{marker}<span class="elfinder-cwd-filename">{name}</span></div>'+selectCheckbox+'</td>'+customColsBuild()+'</tr>';
			},
			
			selectCheckbox = ($.map(options.showSelectCheckboxUA, function(t) {return (fm.UA[t] || t.match(/^all$/i))? true : null;}).length)? '<div class="elfinder-cwd-select"><input type="checkbox"></div>' : '',

			colResizing = false,
			
			colWidth = null,

			/**
			 * File templates
			 *
			 * @type Object
			 **/
			templates = {
				icon : '<div id="{id}" class="'+clFile+' {permsclass} {dirclass} ui-corner-all" title="{tooltip}"><div class="elfinder-cwd-file-wrapper ui-corner-all"><div class="elfinder-cwd-icon {mime} ui-corner-all" unselectable="on"{style}/>{marker}</div><div class="elfinder-cwd-filename" title="{nametitle}">{name}</div>'+selectCheckbox+'</div>',
				row  : '',
			},
			
			permsTpl = fm.res('tpl', 'perms'),
			
			lockTpl = fm.res('tpl', 'lock'),
			
			symlinkTpl = fm.res('tpl', 'symlink'),
			
			/**
			 * Template placeholders replacement rules
			 *
			 * @type Object
			 **/
			replacement = {
				id : function(f) {
					return fm.cwdHash2Id(f.hash);
				},
				name : function(f) {
					var name = fm.escape(f.name);
					!list && (name = name.replace(/([_.])/g, '&#8203;$1'));
					return name;
				},
				nametitle : function(f) {
					return fm.escape(f.name);
				},
				permsclass : function(f) {
					return fm.perms2class(f);
				},
				perm : function(f) {
					return fm.formatPermissions(f);
				},
				dirclass : function(f) {
					var cName = f.mime == 'directory' ? 'directory' : '';
					options.getClass && (cName += ' ' + options.getClass(f));
					return cName;
				},
				style : function(f) {
					return f.icon? 'style="background:url(\''+fm.escape(f.icon)+'\') 0 0 no-repeat;background-size:contain;"' : '';
				},
				mime : function(f) {
					return fm.mime2class(f.mime);
				},
				size : function(f) {
					return (f.mime === 'directory' && !f.size)? '-' : fm.formatSize(f.size);
				},
				date : function(f) {
					return fm.formatDate(f);
				},
				kind : function(f) {
					return fm.mime2kind(f);
				},
				mode : function(f) {
					return f.perm? fm.formatFileMode(f.perm) : '';
				},
				modestr : function(f) {
					return f.perm? fm.formatFileMode(f.perm, 'string') : '';
				},
				modeoct : function(f) {
					return f.perm? fm.formatFileMode(f.perm, 'octal') : '';
				},
				modeboth : function(f) {
					return f.perm? fm.formatFileMode(f.perm, 'both') : '';
				},
				marker : function(f) {
					return (f.alias || f.mime == 'symlink-broken' ? symlinkTpl : '')+(!f.read || !f.write ? permsTpl : '')+(f.locked ? lockTpl : '');
				},
				tooltip : function(f) {
					var title = fm.formatDate(f) + (f.size > 0 ? ' ('+fm.formatSize(f.size)+')' : ''),
						info  = '';
					if (query && f.path) {
						info = fm.escape(f.path.replace(/\/[^\/]*$/, ''));
					} else {
						info = f.tooltip? fm.escape(f.tooltip).replace(/\r/g, '&#13;') : '';
					}
					if (list) {
						info += (info? '&#13;' : '') + fm.escape(f.name);
					}
					return info? info + '&#13;' + title : title;
				}
			},
			
			/**
			 * Return file html
			 *
			 * @param  Object  file info
			 * @return String
			 **/
			itemhtml = function(f) {
				return templates[list ? 'row' : 'icon']
						.replace(/\{([a-z]+)\}/g, function(s, e) { 
							return replacement[e] ? replacement[e](f, fm) : (f[e] ? f[e] : ''); 
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
					selector = prev ? 'first:' : 'last',
					s, n, sib, top, left;

				function sibling(n, direction) {
					return n[direction+'All']('[id]:not(.'+clDisabled+'):not(.elfinder-cwd-parent):first');
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

							if (n.hasClass(clDisabled)) {
								n = sibling(n, 'next');
							}
						} else {
							do {
								n = n.next('[id]');
							} while (n.length && !(n.position().top > top && n.position().left >= left));
							
							if (n.hasClass(clDisabled)) {
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
					// !append && unselectAll();
				} else {
					// there are no selected file - select first/last one
					n = cwd.find('[id]:not(.'+clDisabled+'):not(.elfinder-cwd-parent):'+(prev ? 'last' : 'first'));
				}
				
				if (n && n.length && !n.hasClass('elfinder-cwd-parent')) {
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
			
			selectedFiles = [],
			
			selectFile = function(hash) {
				$('#'+fm.cwdHash2Id(hash)).trigger(evtSelect);
			},
			
			selectAll = function() {
				var phash = fm.cwd().hash;

				selectCheckbox && selectAllCheckbox.find('input').prop('checked', true);
				fm.lazy(function() {
					cwd.find('[id]:not(.'+clSelected+'):not(.elfinder-cwd-parent)').trigger(evtSelect);
					selectedFiles = (incHashes || cwdHashes).concat();
					trigger();
					selectCheckbox && selectAllCheckbox.data('pending', false);
					cwd.addClass('elfinder-cwd-allselected');
				});
			},
			
			/**
			 * Unselect all files
			 *
			 * @return void
			 */
			unselectAll = function() {
				selectCheckbox && selectAllCheckbox.find('input').prop('checked', false);
				if (selectedFiles.length) {
					selectLock = false;
					selectedFiles = [];
					cwd.find('[id].'+clSelected).trigger(evtUnselect);
					selectCheckbox && cwd.find('input:checkbox').prop('checked', false);
				} else {
					fm.select({selected: []});
				}
				trigger();
				selectCheckbox && selectAllCheckbox.data('pending', false);
				cwd.removeClass('elfinder-cwd-allselected');
			},
			
			/**
			 * Return selected files hashes list
			 *
			 * @return Array
			 */
			selected = function() {
				return selectedFiles;
			},
			
			/**
			 * Fire elfinder "select" event and pass selected files to it
			 *
			 * @return void
			 */
			trigger = function() {
				if (selectCheckbox) {
					var all = (selectedFiles.length === cwdHashes.length);
					selectAllCheckbox.find('input').prop('checked', all);
					cwd[all? 'addClass' : 'removeClass']('elfinder-cwd-allselected');
				}
				fm.trigger('select', {selected : selectedFiles});
			},
			
			/**
			 * Scroll file to set it visible
			 *
			 * @param DOMElement  file/dir node
			 * @return void
			 */
			scrollToView = function(o) {
				var ftop    = o.position().top,
					fheight = o.outerHeight(true),
					wtop    = wrapper.scrollTop(),
					wheight = wrapper.get(0).clientHeight,
					thheight = tableHeader? tableHeader.outerHeight(true) : 0;

				if (ftop + thheight + fheight > wtop + wheight) {
					wrapper.scrollTop(parseInt(ftop + thheight + fheight - wheight));
				} else if (ftop < wtop) {
					wrapper.scrollTop(ftop);
				}
				list && wrapper.scrollLeft(0);
			},
			
			/**
			 * Files we get from server but not show yet
			 *
			 * @type Array
			 **/
			buffer = [],
			
			/**
			 * Extra data of buffer
			 *
			 * @type Object
			 **/
			bufferExt = {},
			
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
			scrollEvent = 'elfscrstop',
			
			/**
			 * jQuery UI selectable option
			 * 
			 * @type Object
			 */
			selectableOption = {
				filter     : fileSelector,
				stop       : trigger,
				delay      : 250,
				selected   : function(e, ui) { $(ui.selected).trigger(evtSelect); },
				unselected : function(e, ui) { $(ui.unselected).trigger(evtUnselect); }
			},
			
			/**
			 * display parent folder with ".." name
			 * 
			 * @param  String  phash
			 * @return void
			 */
			oldSchool = function(phash) {
				var phash = fm.cwd().phash,
					pdir  = fm.file(phash) || null,
					set   = function(pdir) {
						if (pdir) {
							parent = $(itemhtml($.extend(true, {}, pdir, {name : '..', mime : 'directory'})))
								.addClass('elfinder-cwd-parent')
								.bind('mousedown click mouseup touchstart touchmove touchend dblclick mouseenter', function(e) {
									e.preventDefault();
									e.stopPropagation();
								})
								.dblclick(function() {
									fm.exec('open', fm.cwdId2Hash(this.id));
								}
							);
							(list ? cwd.find('tbody') : cwd).prepend(parent);
						}
					};
				if (pdir) {
					set(pdir);
				} else {
					if (fm.getUI('tree').hasClass('elfinder-tree')) {
						fm.one('parents', function() {
							set(fm.file(phash) || null);
						});
					} else {
						fm.request({
							data : {cmd : 'parents', target : fm.cwd().hash},
							preventFail : true
						})
						.done(function(data) {
							set(fm.file(phash) || null);
						});
					}
				}
			},
			
			/**
			 * Cwd scroll event handler.
			 * Lazy load - append to cwd not shown files
			 *
			 * @return void
			 */
			render = function() {
				var place = (list ? cwd.children('table').children('tbody') : cwd),
					chk,
					phash,
					proc  = false,
					go    = function(over){
						var over  = over || null,
							html  = [],
							dirs  = false,
							atmb  = {},
							stmb  = (fm.option('tmbUrl') === 'self'),
							files, locks, $place, selected;
						
						files = buffer.splice(0, fm.options.showFiles + (over || 0) / (bufferExt.hpi || 1));
						bufferExt.renderd += files.length;
						if (! buffer.length) {
							bottomMarker.hide();
							wrapper.off(scrollEvent, render);
						}
						
						locks = [];
						html = $.map(files, function(f) {
							if (f.hash && f.name) {
								if (f.mime == 'directory') {
									dirs = true;
								}
								if (f.tmb || (stmb && f.mime.indexOf('image/') === 0)) {
									atmb[f.hash] = f.tmb;
								}
								clipCuts[f.hash] && locks.push(f.hash);
								return itemhtml(f);
							}
							return null;
						});

						// html into created document fragment
						$place = $(document.createDocumentFragment()).append(html.join(''));
						
						// make directory droppable
						dirs && !mobile && makeDroppable($place);
						
						// check selected items
						selected = [];
						if (selectedFiles.length) {
							$place.find('[id]:not(.'+clSelected+'):not(.elfinder-cwd-parent)').each(function() {
								$.inArray(fm.cwdId2Hash(this.id), selectedFiles) !== -1 && selected.push($(this));
							});
						}
						
						// append to cwd
						place.append($place);
						
						// trigger select
						selected.length && $.each(selected, function(i, n) { n.trigger(evtSelect); });
						
						locks.length && fm.trigger('lockfiles', {files: locks});
						!bufferExt.hpi && bottomMarkerShow(place, files.length);
						
						if (list) {
							// show thead
							cwd.find('thead').show();
							// fixed table header
							fixTableHeader({fitWidth: ! colWidth});
						}
						
						if (Object.keys(atmb).length) {
							if (Object.keys(bufferExt.attachTmbs).length < 1) {
								wrapper.off(scrollEvent, attachThumbnails).on(scrollEvent, attachThumbnails);
								fm.unbind('resize', attachThumbnails).bind('resize', attachThumbnails);
							}
							$.extend(bufferExt.attachTmbs, atmb);
							attachThumbnails();
						}
					};
				
				if (! bufferExt.renderd) {
					// first time to go()
					proc = true;
					// scroll top on dir load to avoid scroll after page reload
					wrapper.scrollTop(0);
					phash = fm.cwd().phash;
					go();
					if (options.oldSchool && phash && !query) {
						oldSchool(phash);
					}
					if (list) {
						colWidth && setColwidth();
						fixTableHeader({fitWidth: true});
					}
					fm.trigger('cwdrender');
					proc = false;
				} else if (! proc) {
					// next go()
					if ((chk = (wrapper.height() + wrapper.scrollTop() + fm.options.showThreshold + bufferExt.row) - (bufferExt.renderd * bufferExt.hpi)) > 0) {
						proc = true;
						fm.lazy(function() {
							go(chk);
							proc = false;;
						});
					}
				}
			},
			
			// fixed table header jQuery object
			tableHeader = null,
			
			// To fixed table header colmun
			fixTableHeader = function(opts) {
				if (! options.listView.fixedHeader) {
					return;
				}
				var setPos = function() {
					var val, pos;
					
					if (fm.direction === 'ltr') {
						val = wrapper.scrollLeft() * -1;
						pos = 'left';
					} else {
						val = wrapper.scrollLeft();
						pos = 'right';
					}
					if (base.css(pos) !== val) {
						base.css(pos, val);
					}
				},
				opts = opts || {},
				cnt, base, table, thead, tbody, hheight, htr, btr, htd, btd, htw, btw, init;
				
				tbody = cwd.find('tbody');
				btr = tbody.children('tr:first');
				if (btr.length) {
					table = tbody.parent();
					if (! tableHeader) {
						init = true;
						tbody.addClass('elfinder-cwd-fixheader');
						thead = cwd.find('thead').attr('id', fm.namespace+'-cwd-thead');
						htr = thead.children('tr:first');
						hheight = htr.outerHeight(true);
						cwd.css('margin-top', hheight - parseInt(table.css('padding-top')));
						base = $('<div/>').addClass(cwd.attr('class')).append($('<table/>').append(thead));
						tableHeader = $('<div/>').addClass(wrapper.attr('class') + ' elfinder-cwd-fixheader')
							.removeClass('ui-droppable native-droppable')
							.css(wrapper.position())
							.css('height', hheight)
							.append(base);
						if (fm.direction === 'rtl') {
							tableHeader.css('right', (fm.getUI().width() - wrapper.width()) + 'px');
						}
						setPos();
						wrapper.after(tableHeader)
							.on('scroll.fixheader resize.fixheader', function(e) {
								setPos();
								if (e.type === 'resize') {
									e.stopPropagation();
									fixTableHeader();
								}
							});
					} else {
						thead = $('#'+fm.namespace+'-cwd-thead');
						htr = thead.children('tr:first');
					}
					
					if (init || opts.fitWidth || Math.abs(btr.outerWidth() - htr.outerWidth()) > 2) {
						cnt = customCols.length + 1;
						for (var i = 0; i < cnt; i++) {
							htd = htr.children('td:eq('+i+')');
							btd = btr.children('td:eq('+i+')');
							htw = htd.width();
							btw = btd.width();
							if (typeof htd.data('delta') === 'undefined') {
								htd.data('delta', (htd.outerWidth() - htw) - (btd.outerWidth() - btw));
							}
							btw -= htd.data('delta');
							if (htw === btw) {
								break;
							}
							htd.css('width', btw + 'px');
						}
					}
					
					tableHeader.data('widthTimer') && clearTimeout(tableHeader.data('widthTimer'));
					tableHeader.data('widthTimer', setTimeout(function() {
						if (tableHeader) {
							if (fm.direction === 'rtl') {
								tableHeader.css('right', (fm.getUI().width() - wrapper.width()) + 'px');
							}
							tableHeader.css(wrapper.position()).css('width', cwd.outerWidth() + 'px');
						}
					}, 10));
				}
			},
			
			// Set colmun width
			setColwidth = function() {
				if (list && colWidth) {
					var cl = 'elfinder-cwd-colwidth',
					first = cwd.find('tr[id]:first'),
					former;
					if (! first.hasClass(cl)) {
						former = cwd.find('tr.'+cl);
						former.removeClass(cl).find('td').css('width', '');
						first.addClass(cl);
						cwd.find('table:first').css('table-layout', 'fixed');
						$.each($.merge(['name'], customCols), function(i, k) {
							var w = colWidth[k] || first.find('td.elfinder-col-'+k).width();
							first.find('td.elfinder-col-'+k).width(w);
						});
					}
				}
			},
			
			/**
			 * Droppable options for cwd.
			 * Drop target is `wrapper`
			 * Do not add class on childs file over
			 *
			 * @type Object
			 */
			droppable = $.extend({}, fm.droppable, {
				over : function(e, ui) {
					var dst    = $(this),
						helper = ui.helper,
						ctr    = (e.shiftKey || e.ctrlKey || e.metaKey),
						hash, status, inParent;
					e.stopPropagation();
					helper.data('dropover', helper.data('dropover') + 1);
					dst.data('dropover', true);
					if (helper.data('namespace') !== fm.namespace || ! fm.insideWorkzone(e.pageX, e.pageY)) {
						dst.removeClass(clDropActive);
						helper.removeClass('elfinder-drag-helper-move elfinder-drag-helper-plus');
						return;
					}
					if (dst.hasClass(fm.res(c, 'cwdfile'))) {
						hash = fm.cwdId2Hash(dst.attr('id'));
						dst.data('dropover', hash);
					} else {
						hash = fm.cwd().hash;
						fm.cwd().write && dst.data('dropover', hash);
					}
					inParent = (fm.file(helper.data('files')[0]).phash === hash);
					if (dst.data('dropover') === hash) {
						$.each(helper.data('files'), function(i, h) {
							if (h === hash || (inParent && !ctr && !helper.hasClass('elfinder-drag-helper-plus'))) {
								dst.removeClass(clDropActive);
								return false; // break $.each
							}
						});
					} else {
						dst.removeClass(clDropActive);
					}
					if (helper.data('locked') || inParent) {
						status = 'elfinder-drag-helper-plus';
					} else {
						status = 'elfinder-drag-helper-move';
						if (ctr) {
							status += ' elfinder-drag-helper-plus';
						}
					}
					dst.hasClass(clDropActive) && helper.addClass(status);
					setTimeout(function(){ dst.hasClass(clDropActive) && helper.addClass(status); }, 20);
				},
				out : function(e, ui) {
					var helper = ui.helper;
					e.stopPropagation();
					helper.removeClass('elfinder-drag-helper-move elfinder-drag-helper-plus').data('dropover', Math.max(helper.data('dropover') - 1, 0));
					$(this).removeData('dropover')
					       .removeClass(clDropActive);
				},
				deactivate : function() {
					$(this).removeData('dropover')
					       .removeClass(clDropActive);
				},
				drop : function(e, ui) {
					unselectAll();
					fm.droppable.drop.call(this, e, ui);
				}
			}),
			
			/**
			 * Make directory droppable
			 *
			 * @return void
			 */
			makeDroppable = function(place) {
				var targets = (place || cwd).find('.directory:not(.'+clDroppable+',.elfinder-na,.elfinder-ro)');
				if (fm.isCommandEnabled('paste')) {
					targets.droppable(droppable);
				}
				if (fm.isCommandEnabled('upload')) {
					targets.addClass('native-droppable');
				}
			},
			
			/**
			 * Preload required thumbnails and on load add css to files.
			 * Return false if required file is not visible yet (in buffer) -
			 * required for old api to stop loading thumbnails.
			 *
			 * @param  Object  file hash -> thumbnail map
			 * @return void
			 */
			attachThumbnails = function(image) {
				var url  = fm.option('tmbUrl'),
					done = [],
					chk  = function(hash, tmb) {
						var node = $('#'+fm.cwdHash2Id(hash)),
							file;
	
						if (node.length) {
							if (fm.isInWindow(node, true)) {
								if (tmb != '1') {
									file = fm.file(hash);
									if (file.tmb == '1') {
										file.tmb = tmb;
									}
									(function(node, tmb) {
										$('<img/>')
											.on('load', function() { node.find('.elfinder-cwd-icon').addClass(tmb.className).css('background-image', "url('"+tmb.url+"')"); })
											.attr('src', tmb.url);
									})(node, fm.tmb(file));
								} else {
									bufferExt.getTmbs.push(hash);
								}
								done.push(hash);
							}
						}
					};

				if ($.isPlainObject(image) && Object.keys(image).length) {
					$.extend(bufferExt.attachTmbs, image);
					$.each(image, chk);
				} else {
					$.each(bufferExt.attachTmbs, chk);
				}
				
				$.each(done, function(i, h) {
					delete bufferExt.attachTmbs[h];
				});
				if (bufferExt.getTmbs.length) {
					loadThumbnails();
				}
				if (Object.keys(bufferExt.attachTmbs).length < 1) {
					wrapper.off(scrollEvent, attachThumbnails);
					fm.unbind('resize', attachThumbnails);
				}
			},
			
			/**
			 * Load thumbnails from backend.
			 *
			 * @param  Array|Boolean  files hashes list for new api | true for old api
			 * @return void
			 */
			loadThumbnails = function() {
				var tmbs = [];
				
				// do not parallel request
				if (bufferExt.gettingTmb) {
					return;
				}
				
				bufferExt.gettingTmb = true;
				
				if (fm.oldAPI) {
					fm.request({
						data : {cmd : 'tmb', current : fm.cwd().hash},
						preventFail : true
					})
					.done(function(data) {
						bufferExt.gettingTmb = false;
						if (data.images && Object.keys(data.images).length) {
							attachThumbnails(data.images);
						}
						if (data.tmb) {
							loadThumbnails();
						}
					})
					.fail(function() {
						bufferExt.gettingTmb = false;
					});
					return;
				} 

				tmbs = bufferExt.getTmbs.splice(0, tmbNum);
				if (tmbs.length) {
					if (fm.isInWindow($('#'+fm.cwdHash2Id(tmbs[0])), true) || fm.isInWindow($('#'+fm.cwdHash2Id(tmbs[tmbs.length-1])), true)) {
						fm.request({
							data : {cmd : 'tmb', targets : tmbs},
							preventFail : true
						})
						.done(function(data) {
							bufferExt.gettingTmb = false;
							if (data.images && Object.keys(data.images).length) {
								attachThumbnails(data.images);
							}
							if (bufferExt.getTmbs.length) {
								loadThumbnails();
							}
						})
						.fail(function() {
							bufferExt.gettingTmb = false;
						});
					} else {
						// out of window tmb get later
						$.each(tmbs, function(i, h) {
							bufferExt.attachTmbs[h] = '1';
						});
						bufferExt.gettingTmb = false;
						attachThumbnails();
					}
				}
			},
			
			/**
			 * Add new files to cwd/buffer
			 *
			 * @param  Array  new files
			 * @return void
			 */
			add = function(files) {
				var place    = list ? cwd.find('tbody') : cwd,
					l        = files.length, 
					atmb     = {},
					dirs     = false,
					findNode = function(file) {
						var pointer = cwd.find('[id]:first'), file2;

						while (pointer.length) {
							file2 = fm.file(fm.cwdId2Hash(pointer.attr('id')));
							if (!pointer.hasClass('elfinder-cwd-parent') && file2 && fm.compare(file, file2) < 0) {
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

				l && wz.removeClass('elfinder-cwd-wrapper-empty');
				
				while (l--) {
					file = files[l];
					hash = file.hash;
					
					if ($('#'+fm.cwdHash2Id(hash)).length) {
						continue;
					}
					
					if ((node = findNode(file)) && node.length) {
						node.before(itemhtml(file)); 
					} else if ((ndx = findIndex(file)) >= 0) {
						buffer.splice(ndx, 0, file);
					} else {
						place.append(itemhtml(file));
					}
					
					if ($('#'+fm.cwdHash2Id(hash)).length) {
						if (file.mime == 'directory') {
							dirs = true;
						} else if (file.tmb) {
							atmb[hash] = file.tmb;
						}
					}
				}

				// clear incsearch view
				if (incHashes) {
					incHashes = void 0;
					content();
				}

				setColwidth();
				bottomMarkerShow(place);
				if (Object.keys(atmb).length) {
					if (Object.keys(bufferExt.attachTmbs).length < 1) {
						wrapper.off(scrollEvent, attachThumbnails).on(scrollEvent, attachThumbnails);
						fm.unbind('resize', attachThumbnails).bind('resize', attachThumbnails);
					}
					$.extend(bufferExt.attachTmbs, atmb);
					attachThumbnails();
				}
				dirs && !mobile && makeDroppable();
			},
			
			/**
			 * Remove files from cwd/buffer
			 *
			 * @param  Array  files hashes
			 * @return void
			 */
			remove = function(files) {
				var l = files.length, hash, n, ndx;

				// removed cwd
				if (!fm.cwd().hash && fm.currentReqCmd !== 'open') {
					$.each(cwdParents.reverse(), function(i, h) {
						if (fm.files()[h]) {
							fm.one(fm.currentReqCmd, function(e, fm) {
								!fm.cwd().hash && fm.exec('open', h);
							});
							return false;
						}
					});
					return;
				}
				
				while (l--) {
					hash = files[l];
					if ((n = $('#'+fm.cwdHash2Id(hash))).length) {
						try {
							n.remove();
						} catch(e) {
							fm.debug('error', e);
						}
					} else if ((ndx = index(hash)) != -1) {
						buffer.splice(ndx, 1);
					}
				}
				
				setColwidth();
			},
			
			msg = {
				name : fm.i18n('name'),
				perm : fm.i18n('perms'),
				date : fm.i18n('modify'),
				size : fm.i18n('size'),
				kind : fm.i18n('kind'),
				modestr : fm.i18n('mode'),
				modeoct : fm.i18n('mode'),
				modeboth : fm.i18n('mode'),
			},
			
			customColsNameBuild = function() {
				var name = '',
				customColsName = '',
				names = $.extend({}, msg, options.listView.columnsCustomName);
				for (var i = 0; i < customCols.length; i++) {
					if (typeof names[customCols[i]] !== 'undefined') {
						name = names[customCols[i]];
					} else {
						name = fm.i18n(customCols[i]);
					}
					customColsName +='<td class="elfinder-cwd-view-th-'+customCols[i]+' sortable-item">'+name+'</td>';
				}
				return customColsName;
			},
			
			bottomMarkerShow = function(place, cnt) {
				var ph, col = 1;
				place = place || (list ? cwd.find('tbody') : cwd);

				if (buffer.length > 0) {
					place.css({height: 'auto'});
					ph = place.height();
					if (cnt) {
						if (! list) {
							col = Math.floor(place.width()/place.find('[id]:first').width());
							cnt = Math.ceil(cnt/col) * col;
						}
						bufferExt.hpi = ph / cnt;
						bufferExt.row = bufferExt.hpi * col;
					}
					bottomMarker.css({top: (bufferExt.hpi * buffer.length + ph) + 'px'}).show();
					if (wrapper.height() > ph) {
						// show more items
						wrapper.trigger(scrollEvent);
					}

				}
			},
			
			wrapperContextMenu = {
				contextmenu : function(e) {
					e.preventDefault();
					fm.trigger('contextmenu', {
						'type'    : 'cwd',
						'targets' : [fm.cwd().hash],
						'x'       : e.pageX,
						'y'       : e.pageY
					});
				},
				touchstart : function(e) {
					if (e.originalEvent.touches.length > 1) {
						return;
					}
					cwd.data('longtap', null);
					wrapper.data('touching', {x: e.originalEvent.touches[0].pageX, y: e.originalEvent.touches[0].pageY});
					if (e.target === this || e.target === cwd.get(0)) {
						cwd.data('tmlongtap', setTimeout(function(){
							//if (wrapper.data('touching')) {
								// long tap
								cwd.data('longtap', true);
								fm.trigger('contextmenu', {
									'type'    : 'cwd',
									'targets' : [fm.cwd().hash],
									'x'       : wrapper.data('touching').x,
									'y'       : wrapper.data('touching').y
								});
							//}
						}, 500));
					}
				},
				touchend : function(e) {
					if (e.type === 'touchmove') {
						if (! wrapper.data('touching') ||
								( Math.abs(wrapper.data('touching').x - e.originalEvent.touches[0].pageX)
								+ Math.abs(wrapper.data('touching').y - e.originalEvent.touches[0].pageY)) > 4) {
							wrapper.data('touching', null);
						}
					}
					clearTimeout(cwd.data('tmlongtap'));
				},
				click : function(e) {
					if (cwd.data('longtap')) {
						e.preventDefault();
						e.stopPropagation();
					}
				}
			},
			
			/**
			 * Update directory content
			 *
			 * @return void
			 */
			content = function() {
				var phash, emptyMethod, thtr;

				wz.append(selectAllCheckbox);
				
				try {
					// to avoid problem with draggable
					cwd.empty();
				} catch (e) {
					cwd.html('');
				}
				
				if (tableHeader) {
					wrapper.off('scroll.fixheader resize.fixheader');
					tableHeader.remove();
					tableHeader = null;
				}

				cwd.removeClass('elfinder-cwd-view-icons elfinder-cwd-view-list')
					.addClass('elfinder-cwd-view-'+(list ? 'list' :'icons'))
					.attr('style', '')
					.css('height', 'auto');
				bottomMarker.hide();

				wrapper[list ? 'addClass' : 'removeClass']('elfinder-cwd-wrapper-list')
					._padding = parseInt(wrapper.css('padding-top')) + parseInt(wrapper.css('padding-bottom'));
				if (fm.UA.iOS) {
					wrapper.removeClass('overflow-scrolling-touch').addClass('overflow-scrolling-touch');
				}

				if (list) {
					cwd.html('<table><thead/><tbody/></table>');
					thtr = $('<tr class="ui-state-default"><td class="elfinder-cwd-view-th-name">'+msg.name+'</td>'+customColsNameBuild()+'</tr>');
					cwd.find('thead').hide().append(
						thtr
						.on('contextmenu.'+fm.namespace, wrapperContextMenu.contextmenu)
						.on('touchstart.'+fm.namespace, 'td', wrapperContextMenu.touchstart)
						.on('touchmove.'+fm.namespace+' touchend.'+fm.namespace+' mouseup.'+fm.namespace, 'td', wrapperContextMenu.touchend)
						.on('click.'+fm.namespace,'td', wrapperContextMenu.click)
					).find('td:first').append(selectAllCheckbox);

					if ($.fn.sortable) {
						thtr.addClass('touch-punch touch-punch-keep-default')
							.sortable({
							axis: 'x',
							distance: 8,
							items: '> .sortable-item',
							start: function(e, ui) {
								$(ui.item[0]).data('dragging', true);
								ui.placeholder
									.width(ui.helper.removeClass('ui-state-hover').width())
									.removeClass('ui-state-active')
									.addClass('ui-state-hover')
									.css('visibility', 'visible');
							},
							update: function(e, ui){
								var target = $(ui.item[0]).attr('class').split(' ')[0].replace('elfinder-cwd-view-th-', ''),
									prev, done;
								customCols = $.map($(this).children(), function(n) {
									var name = $(n).attr('class').split(' ')[0].replace('elfinder-cwd-view-th-', '');
									if (! done) {
										if (target === name) {
											done = true;
										} else {
											prev = name;
										}
									}
									return (name === 'name')? null : name;
								});
								templates.row = makeTemplateRow();
								fm.storage('cwdCols', customCols);
								prev = '.elfinder-col-'+prev+':first';
								target = '.elfinder-col-'+target+':first';
								fm.lazy(function() {
									cwd.find('tbody tr').each(function() {
										var $this = $(this);
										$this.children(prev).after($this.children(target));
									});
								});
							},
							stop: function(e, ui) {
								setTimeout(function() {
									$(ui.item[0]).removeData('dragging');
								}, 100);
							}
						});
					}

					if ($.fn.resizable) {
						thtr.find('td').addClass('touch-punch').resizable({
							handles: fm.direction === 'ltr'? 'e' : 'w',
							start: function(e, ui) {
								var target = cwd.find('td.elfinder-col-'
									+ ui.element.attr('class').split(' ')[0].replace('elfinder-cwd-view-th-', '')
									+ ':first');
								
								ui.element
									.data('resizeTarget', target)
									.data('targetWidth', target.width());
								colResizing = true;
								if (cwd.find('table').css('table-layout') !== 'fixed') {
									cwd.find('tbody tr:first td').each(function() {
										$(this).width($(this).width());
									});
									cwd.find('table').css('table-layout', 'fixed');
								}
							},
							resize: function(e, ui) {
								ui.element.data('resizeTarget').width(ui.element.data('targetWidth') - (ui.originalSize.width - ui.size.width));
							},
							stop : function() {
								colResizing = false;
								fixTableHeader({fitWidth: true});
								colWidth = {};
								cwd.find('tbody tr:first td').each(function() {
									var name = $(this).attr('class').split(' ')[0].replace('elfinder-col-', '');
									colWidth[name] = $(this).width();
								});
								fm.storage('cwdColWidth', colWidth);
							}
						})
						.find('.ui-resizable-handle').addClass('ui-icon ui-icon-grip-dotted-vertical');
					}
				}

				fm.lazy(function() {
					buffer = $.map(incHashes || cwdHashes, function(hash) { return fm.file(hash) || null });
					
					buffer = fm.sortFiles(buffer);
					bufferExt = {
						renderd: 0,
						attachTmbs: {},
						getTmbs: []
					};
					
					wz[(buffer.length < 1) ? 'addClass' : 'removeClass']('elfinder-cwd-wrapper-empty');
					wrapper.off(scrollEvent, render).on(scrollEvent, render).trigger(scrollEvent);
					
					// set droppable
					if (!fm.cwd().write) {
						wrapper.removeClass('native-droppable')
						       .droppable('disable')
						       .removeClass('ui-state-disabled'); // for old jQueryUI see https://bugs.jqueryui.com/ticket/5974
					} else {
						wrapper[fm.isCommandEnabled('upload')? 'addClass' : 'removeClass']('native-droppable');
						wrapper.droppable('enable');
					}
				});
			},
			
			/**
			 * CWD node itself
			 *
			 * @type JQuery
			 **/
			cwd = $(this)
				.addClass('ui-helper-clearfix elfinder-cwd')
				.attr('unselectable', 'on')
				// fix ui.selectable bugs and add shift+click support 
				.on('click.'+fm.namespace, fileSelector, function(e) {
					var p    = this.id ? $(this) : $(this).parents('[id]:first'),
						tgt  = $(e.target),
						prev,
						next,
						pl,
						nl,
						sib;

					if (selectCheckbox && (tgt.is('input:checkbox') || tgt.hasClass('elfinder-cwd-select'))) {
						e.stopPropagation();
						e.preventDefault();
						if (! wrapper.data('touching')) {
							p.trigger(p.hasClass(clSelected) ? evtUnselect : evtSelect);
							trigger();
						}
						setTimeout(function() {
							tgt.prop('checked', p.hasClass(clSelected));
						}, 10);
						
						return false;
					}
					
					if (cwd.data('longtap')) {
						e.stopPropagation();
						return;
					}

					if (e.shiftKey) {
						prev = p.prevAll('.'+clSelected+':first');
						next = p.nextAll('.'+clSelected+':first');
						pl   = prev.length;
						nl   = next.length;
					}
					if (e.shiftKey && (pl || nl)) {
						sib = pl ? p.prevUntil('#'+prev.attr('id')) : p.nextUntil('#'+next.attr('id'));
						sib.add(p).trigger(evtSelect);
					} else if (e.ctrlKey || e.metaKey) {
						p.trigger(p.hasClass(clSelected) ? evtUnselect : evtSelect);
					} else {
						if (wrapper.data('touching') && p.hasClass(clSelected)) {
							wrapper.data('touching', null);
							fm.dblclick({file : fm.cwdId2Hash(this.id)});
							return;
						} else {
							unselectAll();
							p.trigger(evtSelect);
						}
					}

					trigger();
				})
				// call fm.open()
				.on('dblclick.'+fm.namespace, fileSelector, function(e) {
					fm.dblclick({file : fm.cwdId2Hash(this.id)});
				})
				// for touch device
				.on('touchstart.'+fm.namespace, fileSelector, function(e) {
					if (e.originalEvent.touches.length > 1) {
						return;
					}
					var p   = this.id ? $(this) : $(this).parents('[id]:first'),
						tgt = $(e.target),
						sel;
					
					wrapper.data('touching', {x: e.originalEvent.touches[0].pageX, y: e.originalEvent.touches[0].pageY});
					if (selectCheckbox && (tgt.is('input:checkbox') || tgt.hasClass('elfinder-cwd-select'))) {
						setTimeout(function() {
							if (wrapper.data('touching')) {
								p.trigger(p.hasClass(clSelected) ? evtUnselect : evtSelect);
								trigger();
							}
						}, 150);
						return;
					}

					if (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA') {
						return;
					}
					
					sel = p.prevAll('.'+clSelected+':first').length +
					      p.nextAll('.'+clSelected+':first').length;
					cwd.data('longtap', null);
					p.addClass(clHover)
					 .data('tmlongtap', setTimeout(function(){
						// long tap
						cwd.data('longtap', true);
						if (e.target.nodeName != 'TD' || fm.selected().length > 0) {
							p.trigger(evtSelect);
							trigger();
							fm.trigger('contextmenu', {
								'type'    : 'files',
								'targets' : fm.selected(),
								'x'       : e.originalEvent.touches[0].pageX,
								'y'       : e.originalEvent.touches[0].pageY
							});
						}
					}, 500));
				})
				.on('touchmove.'+fm.namespace+' touchend.'+fm.namespace, fileSelector, function(e) {
					if (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA' || $(e.target).hasClass('elfinder-cwd-select')) {
						return;
					}
					var p = this.id ? $(this) : $(this).parents('[id]:first');
					clearTimeout(p.data('tmlongtap'));
					if (e.type === 'touchmove') {
						wrapper.data('touching', null);
						p.removeClass(clHover);
					} else if (wrapper.data('touching') && !cwd.data('longtap') && p.hasClass(clSelected)) {
						e.preventDefault();
						wrapper.data('touching', null);
						fm.dblclick({file : fm.cwdId2Hash(this.id)});
					}
				})
				// attach draggable
				.on('mouseenter.'+fm.namespace, fileSelector, function(e) {
					var $this = $(this), helper = null,
						target = list ? $this : $this.children('div.elfinder-cwd-file-wrapper,div.elfinder-cwd-filename');

					if (!mobile && !$this.hasClass(clTmp) && !target.hasClass(clDraggable) && !target.hasClass(clDisabled)) {
						target.on('mousedown', function(e) {
							// shiftKey + drag start for HTML5 native drag function
							if (e.shiftKey && !fm.UA.IE && cwd.data('selectable')) {
								// destroy jQuery-ui selectable while trigger native drag
								cwd.selectable('destroy').data('selectable', false);
								setTimeout(function(){
									cwd.selectable(selectableOption).data('selectable', true);
								}, 10);
							}
							target.draggable('option', 'disabled', e.shiftKey);
							if (e.shiftKey) {
								target.attr('draggable', 'true');
							} else {
								target.attr('draggable', 'false')
								      .draggable('option', 'cursorAt', {left: 50 - parseInt($(e.currentTarget).css('margin-left')), top: 47});
							}
						})
						.on('dragstart', function(e) {
							var dt = e.dataTransfer || e.originalEvent.dataTransfer || null;
							helper = null;
							if (dt && !fm.UA.IE) {
								var p = this.id ? $(this) : $(this).parents('[id]:first'),
									elm   = $('<span>'),
									url   = '',
									durl  = null,
									murl  = null,
									files = [],
									icon  = function(f) {
										var mime = f.mime, i, tmb = fm.tmb(f);
										i = '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>';
										if (tmb) {
											i = $(i).addClass(tmb.className).css('background-image', "url('"+tmb.url+"')").get(0).outerHTML;
										}
										return i;
									}, l, geturl = [];
								p.trigger(evtSelect);
								trigger();
								$.each(selectedFiles, function(i, v){
									var file = fm.file(v),
										furl = file.url;
									if (file && file.mime !== 'directory') {
										if (!furl) {
											furl = fm.url(file.hash);
										} else if (furl == '1') {
											geturl.push(v);
											return true;
										}
										if (furl) {
											furl = fm.convAbsUrl(furl);
											files.push(v);
											$('<a>').attr('href', furl).text(furl).appendTo(elm);
											url += furl + "\n";
											if (!durl) {
												durl = file.mime + ':' + file.name + ':' + furl;
											}
											if (!murl) {
												murl = furl + "\n" + file.name;
											}
										}
									}
								});
								if (geturl.length) {
									$.each(geturl, function(i, v){
										var rfile = fm.file(v);
										rfile.url = '';
										fm.request({
											data : {cmd : 'url', target : v},
											notify : {type : 'url', cnt : 1},
											preventDefault : true
										})
										.always(function(data) {
											rfile.url = data.url? data.url : '1';
										});
									});
									return false;
								} else if (url) {
									if (dt.setDragImage) {
										helper = $('<div class="elfinder-drag-helper html5-native"></div>').append(icon(fm.file(files[0]))).appendTo($(document.body));
										if ((l = files.length) > 1) {
											helper.append(icon(fm.file(files[l-1])) + '<span class="elfinder-drag-num">'+l+'</span>');
										}
										dt.setDragImage(helper.get(0), 50, 47);
									}
									dt.effectAllowed = 'copyLink';
									dt.setData('DownloadURL', durl);
									dt.setData('text/x-moz-url', murl);
									dt.setData('text/uri-list', url);
									dt.setData('text/plain', url);
									dt.setData('text/html', elm.html());
									dt.setData('elfinderfrom', window.location.href + fm.cwd().hash);
									dt.setData('elfinderfrom:' + dt.getData('elfinderfrom'), '');
								} else {
									return false;
								}
							}
						})
						.on('dragend', function(e){
							unselectAll();
							helper && helper.remove();
						})
						.draggable(fm.draggable);
					}
				})
				// add hover class to selected file
				.on(evtSelect, fileSelector, function(e) {
					var $this = $(this),
						id    = fm.cwdId2Hash($this.attr('id'));
					
					if (!selectLock && !$this.hasClass(clDisabled)) {
						$this.addClass(clSelected).children().addClass(clHover).find('input:checkbox').prop('checked', true);;
						if ($.inArray(id, selectedFiles) === -1) {
							selectedFiles.push(id);
						}
					}
				})
				// remove hover class from unselected file
				.on(evtUnselect, fileSelector, function(e) {
					var $this = $(this), 
						id    = fm.cwdId2Hash($this.attr('id')),
						ndx;
					
					if (!selectLock) {
						$this.removeClass(clSelected).children().removeClass(clHover).find('input:checkbox').prop('checked', false);
						ndx = $.inArray(id, selectedFiles);
						if (ndx !== -1) {
							selectedFiles.splice(ndx, 1);
							if (cwd.hasClass('elfinder-cwd-allselected')) {
								selectCheckbox && selectAllCheckbox.children('input').prop('checked', false);
								cwd.removeClass('elfinder-cwd-allselected');
							}
						}
					}
					
				})
				// disable files wich removing or moving
				.on(evtDisable, fileSelector, function() {
					var $this  = $(this).removeClass(clHover+' '+clSelected).addClass(clDisabled), 
						child  = $this.children(),
						target = (list ? $this : child.find('div.elfinder-cwd-file-wrapper,div.elfinder-cwd-filename'));
					
					child.removeClass(clHover+' '+clSelected);
					
					$this.hasClass(clDroppable) && $this.droppable('disable');
					target.hasClass(clDraggable) && target.draggable('disable');
				})
				// if any files was not removed/moved - unlock its
				.on(evtEnable, fileSelector, function() {
					var $this  = $(this).removeClass(clDisabled), 
						target = list ? $this : $this.children('div.elfinder-cwd-file-wrapper,div.elfinder-cwd-filename');
					
					$this.hasClass(clDroppable) && $this.droppable('enable');	
					target.hasClass(clDraggable) && target.draggable('enable');
				})
				.on('scrolltoview', fileSelector, function() {
					scrollToView($(this));
				})
				.on('mouseenter.'+fm.namespace+' mouseleave.'+fm.namespace, fileSelector, function(e) {
					fm.trigger('hover', {hash : fm.cwdId2Hash($(this).attr('id')), type : e.type});
					$(this).toggleClass(clHover, (e.type == 'mouseenter'));
				})
				.on('contextmenu.'+fm.namespace, function(e) {
					var file = $(e.target).closest('.'+clFile);
					
					if (file.length && (e.target.nodeName != 'TD' || $.inArray(fm.cwdId2Hash(file.get(0).id), fm.selected()) > -1)) {
						e.stopPropagation();
						e.preventDefault();
						if (!file.hasClass(clDisabled) && !wrapper.data('touching')) {
							if (!file.hasClass(clSelected)) {
								unselectAll();
								file.trigger(evtSelect);
								trigger();
							}
							fm.trigger('contextmenu', {
								'type'    : 'files',
								'targets' : fm.selected(),
								'x'       : e.pageX,
								'y'       : e.pageY
							});

						}
						
					}
				})
				// unselect all on cwd click
				.on('click.'+fm.namespace, function(e) {
					if (e.target === this && ! cwd.data('longtap')) {
						!e.shiftKey && !e.ctrlKey && !e.metaKey && unselectAll();
					}
				})
				// prepend fake file/dir
				.on('create.'+fm.namespace, function(e, file) {
					var parent = list ? cwd.find('tbody') : cwd,
						p = parent.find('.elfinder-cwd-parent'),
						lock = file.move || false,
						file = $(itemhtml(file)).addClass(clTmp),
						selected = fm.selected();
						
					if (selected.length) {
						lock && fm.trigger('lockfiles', {files: selected});
					} else {
						unselectAll();
					}

					if (p.length) {
						p.after(file);
					} else {
						parent.prepend(file);
					}
					
					setColwidth();
					wrapper.scrollTop(0).scrollLeft(0);
				})
				// unselect all selected files
				.on('unselectall', unselectAll)
				.on('selectfile', function(e, id) {
					$('#'+fm.cwdHash2Id(id)).trigger(evtSelect);
					trigger();
				})
				.on('colwidth', function() {
					if (list) {
						cwd.find('table').css('table-layout', '')
							.find('td').css('width', '');
						fixTableHeader({fitWidth: true});
						fm.storage('cwdColWidth', colWidth = null);
					}
				}),
			wrapper = $('<div class="elfinder-cwd-wrapper"/>')
				// make cwd itself droppable for folders from nav panel
				.droppable($.extend({}, droppable, {autoDisable: false}))
				.on('contextmenu.'+fm.namespace, wrapperContextMenu.contextmenu)
				.on('touchstart.'+fm.namespace, wrapperContextMenu.touchstart)
				.on('touchmove.'+fm.namespace+' touchend.'+fm.namespace, wrapperContextMenu.touchend)
				.on('click.'+fm.namespace, wrapperContextMenu.click)
				.on('scroll.'+fm.namespace, function() {
					bufferExt.scrollTimer && clearTimeout(bufferExt.scrollTimer);
					bufferExt.scrollTimer = setTimeout(function() {
						wrapper.trigger(scrollEvent);
					}, 50);
				}),
			
			bottomMarker = $('<div>&nbsp;</div>')
				.css({position: 'absolute', width: '1px', height: '1px'})
				.hide(),
			
			selectAllCheckbox = selectCheckbox? $('<div class="elfinder-cwd-selectall"><input type="checkbox"/></div>')
				.attr('title', fm.i18n('selectall'))
				.on('touchstart mousedown click', function(e) {
					e.stopPropagation();
					e.preventDefault();
					if ($(this).data('pending') || e.type === 'click') {
						return false;
					}
					selectAllCheckbox.data('pending', true);
					if (cwd.hasClass('elfinder-cwd-allselected')) {
						selectAllCheckbox.find('input').prop('checked', false);
						setTimeout(function() {
							unselectAll();
						}, 10);
					} else {
						selectAll();
					}
				}) : $(),
			
			restm = null,
			resize = function(init) {
				var initHeight = function() {
					var h = 0;
					wrapper.siblings('div.elfinder-panel:visible').each(function() {
						h += $(this).outerHeight(true);
					});
					wrapper.height(wz.height() - h - wrapper._padding);
				};
				
				init && initHeight();
				
				restm && clearTimeout(restm);
				restm = setTimeout(function(){
					!init && initHeight();
					var wph, cwdoh;
					// fix cwd height if it less then wrapper
					cwd.css('height', 'auto');
					wph = wrapper[0].clientHeight - parseInt(wrapper.css('padding-top')) - parseInt(wrapper.css('padding-bottom')) - parseInt(cwd.css('margin-top')),
					cwdoh = cwd.outerHeight(true);
					if (cwdoh < wph) {
						cwd.height(wph);
					}
				}, 20);
				
				list && ! colResizing && fixTableHeader();
			},
			
			// elfinder node
			parent = $(this).parent().resize(resize),
			
			// workzone node 
			wz = parent.children('.elfinder-workzone').append(wrapper.append(this).append(bottomMarker))
			;

		// setup by options
		replacement = $.extend(replacement, options.replacement || {});
		
		try {
			colWidth = fm.storage('cwdColWidth')? fm.storage('cwdColWidth') : null;
		} catch(e) {
			colWidth = null;
		}
		
		// setup costomCols
		if (customCols = fm.storage('cwdCols')) {
			$.each(options.listView.columns, function(i, n) {
				if (customCols.indexOf(n) === -1) {
					customCols.push(n);
				}
			});
			customCols = $.map(customCols, function(n) {
				return (options.listView.columns.indexOf(n) !== -1)? n : null;
			});
		} else {
			customCols = options.listView.columns;
		}
		templates.row = makeTemplateRow();
		
		if (mobile) {
			// for iOS5 bug
			$('body').on('touchstart touchmove touchend', function(e){});
		} else {
			// make files selectable
			cwd
				.selectable(selectableOption)
				.data('selectable', true);
		}
		
		selectCheckbox && cwd.addClass('elfinder-has-checkbox');
		
		fm
			.one('init', function(){
				var style = document.createElement('style'),
				sheet;
				document.head.appendChild(style);
				sheet = style.sheet;
				sheet.insertRule('.elfinder-cwd-wrapper-empty .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder')+'" }', 0);
				sheet.insertRule('.elfinder-cwd-wrapper-empty .ui-droppable .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder'+(mobile? 'LTap' : 'Drop'))+'" }', 1);
				sheet.insertRule('.elfinder-cwd-wrapper-empty .ui-droppable-disabled .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder')+'" }', 2);
				sheet.insertRule('.elfinder-cwd-wrapper-empty.elfinder-search-result .elfinder-cwd:after{ content:"'+fm.i18n('emptySearch')+'" }', 3);
			})
			.bind('open add remove searchend', function() {
				var phash = fm.cwd().hash;
				cwdHashes = $.map(fm.files(), function(f) { return f.phash == phash ? f.hash : null ;});
			})
			.bind('open', function() {
				cwdParents = fm.parents(fm.cwd().hash);
				incHashes = void 0;
				unselectAll();
				content();
				resize();
			})
			.bind('search', function(e) {
				cwdHashes = $.map(e.data.files, function(f) { return f.hash; });
				incHashes = void 0;
				content();
				wz.addClass('elfinder-search-result');
				fm.autoSync('stop');
				resize();
			})
			.bind('searchend', function(e) {
				wz.removeClass('elfinder-search-result elfinder-cwd-wrapper-empty');
				if (query || incHashes) {
					query = '';
					if (incHashes) {
						fm.trigger('incsearchend', e.data);
					}
					if (!e.data || !e.data.noupdate) {
						query && unselectAll();
						content();
					}
				}
				fm.autoSync();
				resize();
			})
			.bind('searchstart', function(e) {
				unselectAll();
				query = e.data.query;
			})
			.bind('incsearchstart', function(e) {
				fm.lazy(function() {
					// incremental search
					var incquery = e.data.query || '';
					if (incquery) {
						var regex = new RegExp(incquery.replace(/([\\*\;\.\?\[\]\{\}\(\)\^\$\-\|])/g, '\\$1'), 'i');
						incHashes = $.map(cwdHashes, function(hash) {
							var file = fm.file(hash);
							return (file && file.name.match(regex))? file.hash : null;
						});
						fm.trigger('incsearch', { hashes: incHashes, query: incquery })
							.searchStatus.ininc = true;
						content();
						wz.addClass('elfinder-search-result');
						fm.autoSync('stop');
					} else {
						fm.trigger('incsearchend');
					}
					resize();
				});
			})
			.bind('incsearchend', function(e) {
				fm.searchStatus.ininc = false;
				incHashes = void 0;
				wz.removeClass('elfinder-search-result');
				if (!e.data || !e.data.noupdate) {
					content();
				}
				fm.autoSync();
			})
			.bind('sortchange', function() {
				var lastScrollLeft = wrapper.scrollLeft();
				
				content();
				fm.one('cwdrender', function() {
					wrapper.scrollLeft(lastScrollLeft);
					selectedFiles.length && trigger();
					resize();
				});
			})
			.bind('viewchange', function() {
				var l      = fm.storage('view') == 'list',
					allsel = cwd.hasClass('elfinder-cwd-allselected');
				
				if (l != list) {
					list = l;
					fm.viewType = list? 'list' : 'icons';
					content();

					if (allsel) {
						cwd.addClass('elfinder-cwd-allselected');
						selectAllCheckbox.find('input').prop('checked', true);
					}
					selectedFiles.length && trigger();
				}
				resize();
			})
			.bind('resize', function() {
				var place = list ? cwd.find('tbody') : cwd;
				resize(true);
				if (bufferExt.hpi) {
					bottomMarkerShow(place, place.find('[id]').length);
				}
				wz.data('rectangle', $.extend({}, {width: wz.width(), height: wz.height()}, wz.offset()));
			})
			.bind('changeclipboard', function(e) {
				clipCuts = {};
				if (e.data && e.data.clipboard && e.data.clipboard.length) {
					$.each(e.data.clipboard, function(i, f) {
						if (f.cut) {
							clipCuts[f.hash] = true;
						}
					});
				}
			})
			.bind('resMixinMake', function() {
				setColwidth();
			})
			.add(function(e) {
				var phash = fm.cwd().hash,
					files = query
						? $.map(e.data.added || [], function(f) { return f.name.indexOf(query) === -1 ? null : f ;})
						: $.map(e.data.added || [], function(f) { return f.phash == phash ? f : null; })
						;
				add(files);
				list && resize();
			})
			.change(function(e) {
				var phash = fm.cwd().hash,
					sel   = fm.selected(),
					files;

				if (query) {
					$.each(e.data.changed || [], function(i, file) {
						remove([file.hash]);
						if (file.name.indexOf(query) !== -1) {
							add([file]);
							$.inArray(file.hash, sel) !== -1 && selectFile(file.hash);
						}
					});
				} else {
					$.each($.map(e.data.changed || [], function(f) { return f.phash == phash ? f : null; }), function(i, file) {
						remove([file.hash]);
						add([file]);
						$.inArray(file.hash, sel) !== -1 && selectFile(file.hash);
					});
				}
				
				trigger();
			})
			.remove(function(e) {
				remove(e.data.removed || []);
				trigger();
				if (buffer.length < 1 && (list ? cwd.find('tbody') : cwd).children().length < 1) {
					wz.addClass('elfinder-cwd-wrapper-empty');
					selectCheckbox && selectAllCheckbox.find('input').prop('checked', false);
				}
			})
			// select dragged file if no selected, disable selectable
			.dragstart(function(e) {
				var target = $(e.data.target),
					oe     = e.data.originalEvent;

				wz.data('rectangle', $.extend({}, {width: wz.width(), height: wz.height()}, wz.offset()));
				if (target.hasClass(fileSelector.substr(1))) {
					
					if (!target.hasClass(clSelected)) {
						!(oe.ctrlKey || oe.metaKey || oe.shiftKey) && unselectAll();
						target.trigger(evtSelect);
						trigger();
					}
				}
				
				cwd.selectable('disable').removeClass(clDisabled);
				selectLock = true;
			})
			// enable selectable
			.dragstop(function() {
				cwd.selectable('enable');
				selectLock = false;
			})
			.bind('lockfiles unlockfiles selectfiles unselectfiles', function(e) {
				var events = {
						lockfiles     : evtDisable ,
						unlockfiles   : evtEnable ,
						selectfiles   : evtSelect,
						unselectfiles : evtUnselect },
					event  = events[e.type],
					files  = e.data.files || [],
					l      = files.length,
					helper = e.data.helper || $(),
					parents, ctr;

				if (l > 0) {
					parents = fm.parents(files[0]);
				}
				if (!helper.data('locked')) {
					while (l--) {
						$('#'+fm.cwdHash2Id(files[l])).trigger(event);
					}
					trigger();
				}
				if (wrapper.data('dropover') && parents.indexOf(wrapper.data('dropover')) !== -1) {
					ctr = e.type !== 'lockfiles';
					helper.toggleClass('elfinder-drag-helper-plus', ctr);
					wrapper.toggleClass(clDropActive, ctr);
				}
			})
			// select new files after some actions
			.bind('mkdir mkfile duplicate upload rename archive extract paste multiupload', function(e) {
				if (e.type == 'upload' && e.data._multiupload) return;
				var phash = fm.cwd().hash, files;
				
				unselectAll();

				$.each((e.data.added || []).concat(e.data.changed || []), function(i, file) { 
					file && file.phash == phash && selectFile(file.hash);
				});
				trigger();
			})
			.shortcut({
				pattern     :'ctrl+a', 
				description : 'selectall',
				callback    : selectAll
			})
			.shortcut({
				pattern     : 'left right up down shift+left shift+right shift+up shift+down',
				description : 'selectfiles',
				type        : 'keydown' , //fm.UA.Firefox || fm.UA.Opera ? 'keypress' : 'keydown',
				callback    : function(e) { select(e.keyCode, e.shiftKey); }
			})
			.shortcut({
				pattern     : 'home',
				description : 'selectffile',
				callback    : function(e) { 
					unselectAll();
					scrollToView(cwd.find('[id]:first').trigger(evtSelect));
					trigger();
				}
			})
			.shortcut({
				pattern     : 'end',
				description : 'selectlfile',
				callback    : function(e) { 
					unselectAll();
					scrollToView(cwd.find('[id]:last').trigger(evtSelect)) ;
					trigger();
				}
			});
		
	});
	
	// fm.timeEnd('cwdLoad')
	
	return this;
};
