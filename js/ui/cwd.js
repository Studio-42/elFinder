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
			fileSelector = '.'+clFile + (options.oldSchool? ':not(.elfinder-cwd-parent)' : ''),
			
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
			 * Current clicked element id of first time for dblclick
			 * 
			 * @type String
			 */
			curClickId = '',

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
				row  : ''
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
					var name = fm.escape(f.i18 || f.name);
					!list && (name = name.replace(/([_.])/g, '&#8203;$1'));
					return name;
				},
				nametitle : function(f) {
					return fm.escape(f.i18 || f.name);
				},
				permsclass : function(f) {
					return fm.perms2class(f);
				},
				perm : function(f) {
					return fm.formatPermissions(f);
				},
				dirclass : function(f) {
					var cName = f.mime == 'directory' ? 'directory' : '';
					f.isroot && (cName += ' isroot');
					f.csscls && (cName += ' ' + fm.escape(f.csscls));
					options.getClass && (cName += ' ' + options.getClass(f));
					return cName;
				},
				style : function(f) {
					return f.icon? fm.getIconStyle(f) : '';
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
						info += (info? '&#13;' : '') + fm.escape(f.i18 || f.name);
					}
					return info? info + '&#13;' + title : title;
				}
			},
			
			/**
			 * Type badge CSS added flag
			 * 
			 * @type Object
			 */
			addedBadges = {},
			
			/**
			 * Type badge style sheet element
			 * 
			 * @type Object
			 */
			addBadgeStyleSheet,
			
			/**
			 * Add type badge CSS into 'head'
			 * 
			 * @type Fundtion
			 */
			addBadgeStyle = function(mime, name) {
				var sel, ext, type;
				if (mime && ! addedBadges[mime]) {
					if (typeof addBadgeStyleSheet === 'undefined') {
						if ($('#elfinderAddBadgeStyle'+fm.namespace).length) {
							$('#elfinderAddBadgeStyle'+fm.namespace).remove();
						}
						addBadgeStyleSheet = $('<style id="addBadgeStyle'+fm.namespace+'"/>').insertBefore($('head').children(':first')).get(0).sheet || null;
					}
					if (addBadgeStyleSheet) {
						mime = mime.toLowerCase();
						type = mime.split('/');
						ext = fm.escape(fm.mimeTypes[mime] || (name.replace(/.bac?k$/i, '').match(/\.([^.]+)$/) || ['',''])[1]);
						if (ext) {
							sel = '.elfinder-cwd-icon-' + type[0].replace(/(\.|\+)/g, '-');
							if (typeof type[1] !== 'undefined') {
								sel += '.elfinder-cwd-icon-' + type[1].replace(/(\.|\+)/g, '-');
							}
							try {
								addBadgeStyleSheet.insertRule(sel + ':before{content:"' + ext.toLowerCase() + '"}', 0);
							} catch(e) {}
						}
						addedBadges[mime] = true;
					}
				}
			},
			
			/**
			 * Return file html
			 *
			 * @param  Object  file info
			 * @return String
			 **/
			itemhtml = function(f) {
				f.mime && f.mime !== 'directory' && !addedBadges[f.mime] && addBadgeStyle(f.mime, f.name);
				return templates[list ? 'row' : 'icon']
						.replace(/\{([a-z0-9_]+)\}/g, function(s, e) { 
							return replacement[e] ? replacement[e](f, fm) : (f[e] ? f[e] : ''); 
						});
			},
			
			/**
			 * jQueery node that will be selected next
			 * 
			 * @type Object jQuery node
			 */
			selectedNext = $(),
			
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
					if (selectedNext.length) {
						n = prev? selectedNext.prev() : selectedNext;
					} else {
						// there are no selected file - select first/last one
						n = cwd.find('[id]:not(.'+clDisabled+'):not(.elfinder-cwd-parent):'+(prev ? 'last' : 'first'));
					}
				}
				
				if (n && n.length && !n.hasClass('elfinder-cwd-parent')) {
					if (s && append) {
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
			
			selectedFiles = {},
			
			selectFile = function(hash) {
				$('#'+fm.cwdHash2Id(hash)).trigger(evtSelect);
			},
			
			allSelected = false,
			
			selectAll = function() {
				var phash = fm.cwd().hash;

				selectCheckbox && selectAllCheckbox.find('input').prop('checked', true);
				fm.lazy(function() {
					var files;
					cwd.find('[id]:not(.'+clSelected+'):not(.elfinder-cwd-parent)').trigger(evtSelect);
					if (fm.maxTargets && (incHashes || cwdHashes).length > fm.maxTargets) {
						files = $.map(incHashes || cwdHashes, function(hash) { return fm.file(hash) || null });
						files = fm.sortFiles(files).slice(0, fm.maxTargets);
						selectedFiles = {};
						$.each(files, function(i, v) {
							selectedFiles[v.hash] = true;
						});
						fm.toast({mode: 'warning', msg: fm.i18n(['errMaxTargets', fm.maxTargets])});
					} else {
						selectedFiles = fm.arrayFlip(incHashes || cwdHashes, true);
					}
					trigger();
					selectCheckbox && selectAllCheckbox.data('pending', false);
				}, 0, {repaint: true});
			},
			
			/**
			 * Unselect all files
			 *
			 * @return void
			 */
			unselectAll = function() {
				selectCheckbox && selectAllCheckbox.find('input').prop('checked', false);
				if (Object.keys(selectedFiles).length) {
					selectLock = false;
					selectedFiles = {};
					cwd.find('[id].'+clSelected).trigger(evtUnselect);
					selectCheckbox && cwd.find('input:checkbox').prop('checked', false);
				}
				trigger();
				selectCheckbox && selectAllCheckbox.data('pending', false);
				cwd.removeClass('elfinder-cwd-allselected');
			},
			
			selectInvert = function() {
				var invHashes = {};
				if (allSelected) {
					unselectAll();
				} else if (! Object.keys(selectedFiles).length) {
					selectAll();
				} else {
					$.each((incHashes || cwdHashes), function(i, h) {
						var itemNode = $('#'+fm.cwdHash2Id(h));
						if (! selectedFiles[h]) {
							invHashes[h] = true;
							itemNode.length && itemNode.trigger(evtSelect);
						} else {
							itemNode.length && itemNode.trigger(evtUnselect);
						}
					});
					selectedFiles = invHashes;
					trigger();
				}
			},
			
			/**
			 * Return selected files hashes list
			 *
			 * @return Array
			 */
			selected = function() {
				return Object.keys(selectedFiles);
			},
			
			/**
			 * Last selected node id
			 * 
			 * @type String|Void
			 */
			lastSelect = void 0,
			
			/**
			 * Fire elfinder "select" event and pass selected files to it
			 *
			 * @return void
			 */
			trigger = function() {
				var selected = Object.keys(selectedFiles),
					opts = { selected : selected };
				
				allSelected = selected.length && (selected.length === (incHashes || cwdHashes).length) && (!fm.maxTargets || selected.length <= fm.maxTargets);
				if (selectCheckbox) {
					selectAllCheckbox.find('input').prop('checked', allSelected);
					cwd[allSelected? 'addClass' : 'removeClass']('elfinder-cwd-allselected');
				}
				if (allSelected) {
					opts.selectall = true;
				} else if (! selected.length) {
					opts.unselectall = true;
				}
				fm.trigger('select', opts);
			},
			
			/**
			 * Scroll file to set it visible
			 *
			 * @param DOMElement  file/dir node
			 * @return void
			 */
			scrollToView = function(o, blink) {
				if (! o.length) {
					return;
				}
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
				!!blink && fm.resources.blink(o, 'lookme');
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
			 * Scroll start event name
			 *
			 * @type String
			 **/
			scrollStartEvent = 'elfscrstart',
			
			/**
			 * Scroll stop event name
			 *
			 * @type String
			 **/
			scrollEvent = 'elfscrstop',
			
			scrolling = false,
			
			/**
			 * jQuery UI selectable option
			 * 
			 * @type Object
			 */
			selectableOption = {
				disabled   : true,
				filter     : '[id]:first',
				stop       : trigger,
				delay      : 250,
				appendTo   : 'body',
				autoRefresh: false,
				selected   : function(e, ui) { $(ui.selected).trigger(evtSelect); },
				unselected : function(e, ui) { $(ui.unselected).trigger(evtUnselect); }
			},
			
			/**
			 * hashes of items displayed in current view
			 * 
			 * @type Object  ItemHash => DomId
			 */
			inViewHashes = {},
			
			/**
			 * Processing when the current view is changed (On open, search, scroll, resize etc.)
			 * 
			 * @return void
			 */
			wrapperRepaint = function(init) {
				var selectable = cwd.data('selectable'),
					rec = (function() {
						var wos = wrapper.offset(),
							w = $(window),
							l = wos.left - w.scrollLeft() + (fm.direction === 'ltr'? 30 : wrapper.width() - 30),
							t = wos.top - w.scrollTop() + 10 + (list? bufferExt.itemH || 24 : 0);
						return {left: Math.max(0, Math.round(l)), top: Math.max(0, Math.round(t))};
					})(),
					tgt = $(document.elementFromPoint(rec.left , rec.top)),
					ids = {},
					tmbs = {},
					cnt = bufferExt.hpi? Math.ceil((wz.data('rectangle').height / bufferExt.hpi) * 1.5) : showFiles,
					chk = function() {
						var id = tgt.attr('id'),
							hash, file;
						if (id) {
							bufferExt.getTmbs = [];
							hash = fm.cwdId2Hash(id);
							inViewHashes[hash] = id;
							// for tmbs
							if (bufferExt.attachTmbs[hash]) {
								tmbs[hash] = bufferExt.attachTmbs[hash];
							}
							// for selectable
							selectable && (ids[id] = true);
						}
						// next node
						tgt = tgt.next();
					},
					done = function() {
						var idsArr;
						if (cwd.data('selectable')) {
							Object.assign(ids, selectedFiles);
							idsArr = Object.keys(ids);
							if (idsArr.length) {
								selectableOption.filter = '#'+idsArr.join(', #');
								cwd.selectable('enable').selectable('option', {filter : selectableOption.filter}).selectable('refresh');
							}
						}
						if (Object.keys(tmbs).length) {
							bufferExt.getTmbs = [];
							attachThumbnails(tmbs);
						}
					},
					arr;
				
				inViewHashes = {};
				selectable && cwd.selectable('option', 'disabled');
				
				if (tgt.length) {
					if (! tgt.hasClass(clFile)) {
						tgt = tgt.closest(fileSelector);
					}
					if (tgt.attr('id')) {
						if (init) {
							for (var i = 0; i < cnt; i++) {
								chk();
								if (! tgt.length) {
									break;
								}
							}
							done();
						} else {
							bufferExt.repaintJob && bufferExt.repaintJob._abort();
							arr = new Array(cnt);
							bufferExt.repaintJob = fm.asyncJob(function() {
								chk();
								if (! tgt.length) {
									bufferExt.repaintJob && bufferExt.repaintJob._abort(true);
								}
							}, arr).done(done);
						}
					}
				}
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
							parent = $(itemhtml($.extend(true, {}, pdir, {name : '..', i18 : '..', mime : 'directory'})))
								.addClass('elfinder-cwd-parent')
								.on('dblclick', function() {
									var hash = fm.cwdId2Hash(this.id);
									fm.trigger('select', {selected : [hash]}).exec('open', hash);
								}
							);
							(list ? parent.children('td:first') : parent).children('.elfinder-cwd-select').remove();
							(list ? cwd.find('tbody') : cwd).prepend(parent);
						}
					};
				if (pdir) {
					set(pdir);
				} else {
					if (fm.getUI('tree').length) {
						fm.one('parents', function() {
							set(fm.file(phash) || null);
							wrapper.trigger(scrollEvent);
						});
					} else {
						fm.request({
							data : {cmd : 'parents', target : fm.cwd().hash},
							preventFail : true
						})
						.done(function(data) {
							set(fm.file(phash) || null);
							wrapper.trigger(scrollEvent);
						});
					}
				}
			},
			
			showFiles = fm.options.showFiles,
			
			/**
			 * Cwd scroll event handler.
			 * Lazy load - append to cwd not shown files
			 *
			 * @return void
			 */
			render = function() {
				if (bufferExt.rendering || (bufferExt.renderd && ! buffer.length)) {
					return;
				}
				var place = (list ? cwd.children('table').children('tbody') : cwd),
					phash,
					chk,
					// created document fragment for jQuery >= 1.12, 2.2, 3.0
					// see Studio-42/elFinder#1544 @ github
					docFlag = $.htmlPrefilter? true : false,
					tempDom = docFlag? $(document.createDocumentFragment()) : $('<div/>'),
					go      = function(over){
						var over  = over || null,
							html  = [],
							dirs  = false,
							atmb  = {},
							stmb  = (fm.option('tmbUrl') === 'self'),
							init  = bufferExt.renderd? false : true,
							files, locks, selected, init;
						
						files = buffer.splice(0, showFiles + (over || 0) / (bufferExt.hpi || 1));
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

						// html into temp node
						tempDom.empty().append(html.join(''));
						
						// make directory droppable
						dirs && !mobile && makeDroppable(tempDom);
						
						// check selected items
						selected = [];
						if (Object.keys(selectedFiles).length) {
							tempDom.find('[id]:not(.'+clSelected+'):not(.elfinder-cwd-parent)').each(function() {
								selectedFiles[fm.cwdId2Hash(this.id)] && selected.push($(this));
							});
						}
						
						// append to cwd
						place.append(docFlag? tempDom : tempDom.children());
						
						// trigger select
						if (selected.length) {
							$.each(selected, function(i, n) { n.trigger(evtSelect); });
							trigger();
						}
						
						locks.length && fm.trigger('lockfiles', {files: locks});
						!bufferExt.hpi && bottomMarkerShow(place, files.length);
						
						if (list) {
							// show thead
							cwd.find('thead').show();
							// fixed table header
							fixTableHeader({fitWidth: ! colWidth});
						}
						
						if (Object.keys(atmb).length) {
							Object.assign(bufferExt.attachTmbs, atmb);
						}
						
						if (init) {
							if (! mobile && ! cwd.data('selectable')) {
								// make files selectable
								cwd.selectable(selectableOption).data('selectable', true);
							}
							wrapperRepaint(true);
						}
						
						! scrolling && wrapper.trigger(scrollEvent);
					};
				
				if (! bufferExt.renderd) {
					// first time to go()
					bufferExt.rendering = true;
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
					bufferExt.itemH = (list? place.find('tr:first') : place.find('[id]:first')).outerHeight(true);
					fm.trigger('cwdrender');
					bufferExt.rendering = false;
				}
				if (! bufferExt.rendering && buffer.length) {
					// next go()
					if ((chk = (wrapper.height() + wrapper.scrollTop() + fm.options.showThreshold + bufferExt.row) - (bufferExt.renderd * bufferExt.hpi)) > 0) {
						bufferExt.rendering = true;
						fm.lazy(function() {
							go(chk);
							bufferExt.rendering = false;
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
					var val;
					val = (fm.direction === 'ltr')? wrapper.scrollLeft() * -1 : table.outerWidth(true) - wrapper.width() - wrapper.scrollLeft();
					if (base.css('left') !== val) {
						base.css('left', val);
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
							.css({ height: hheight, width: cwd.outerWidth() })
							.append(base);
						if (fm.direction === 'rtl') {
							tableHeader.css('left', (wrapper.data('width') - wrapper.width()) + 'px');
						}
						setPos();
						wrapper.after(tableHeader)
							.on('scroll.fixheader resize.fixheader', function(e) {
								setPos();
								if (e.type === 'resize') {
									e.stopPropagation();
									tableHeader.css(wrapper.position());
									wrapper.data('width', wrapper.css('overflow', 'hidden').width());
									wrapper.css('overflow', 'auto');
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
							if (! init && ! opts.fitWidth && htw === btw) {
								break;
							}
							htd.css('width', btw + 'px');
						}
					}
					
					tableHeader.data('widthTimer') && clearTimeout(tableHeader.data('widthTimer'));
					tableHeader.data('widthTimer', setTimeout(function() {
						if (tableHeader) {
							tableHeader.css('width', cwd.outerWidth() + 'px');
							if (fm.direction === 'rtl') {
								tableHeader.css('left', (wrapper.data('width') - wrapper.width()) + 'px');
							}
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
			droppable = Object.assign({}, fm.droppable, {
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
				place = place? place : (list ? cwd.find('tbody') : cwd);
				var targets = place.children('.directory:not(.'+clDroppable+',.elfinder-na,.elfinder-ro)');

				if (fm.isCommandEnabled('paste')) {
					targets.droppable(droppable);
				}
				if (fm.isCommandEnabled('upload')) {
					targets.addClass('native-droppable');
				}
				
				place.children('.isroot').each(function(i, n) {
					var $n   = $(n),
						hash = fm.cwdId2Hash(n.id);
					
					if (fm.isCommandEnabled('paste', hash)) {
						if (! $n.hasClass(clDroppable+',elfinder-na,elfinder-ro')) {
							$n.droppable(droppable);
						}
					} else {
						if ($n.hasClass(clDroppable)) {
							$n.droppable('destroy');
						}
					}
					if (fm.isCommandEnabled('upload', hash)) {
						if (! $n.hasClass('native-droppable,elfinder-na,elfinder-ro')) {
							$n.addClass('native-droppable');
						}
					} else {
						if ($n.hasClass('native-droppable')) {
							$n.removeClass('native-droppable');
						}
					}
				});
			},
			
			/**
			 * Preload required thumbnails and on load add css to files.
			 * Return false if required file is not visible yet (in buffer) -
			 * required for old api to stop loading thumbnails.
			 *
			 * @param  Object  file hash -> thumbnail map
			 * @param  Bool    reload
			 * @return void
			 */
			attachThumbnails = function(tmbs, reload) {
				var attach = function(node, tmb) {
						$('<img/>')
							.on('load', function() {
								node.find('.elfinder-cwd-icon').addClass(tmb.className).css('background-image', "url('"+tmb.url+"')");
							})
							.attr('src', tmb.url);
					},
					chk  = function(hash, tmb) {
						var node = $('#'+fm.cwdHash2Id(hash)),
							file, tmbObj, reloads = [];
	
						if (node.length) {
							if (tmb != '1') {
								file = fm.file(hash);
								if (file.tmb !== tmb) {
									file.tmb = tmb;
								}
								tmbObj = fm.tmb(file);
								if (reload) {
									node.find('.elfinder-cwd-icon').addClass(tmbObj.className).css('background-image', "url('"+tmbObj.url+"')");
								} else {
									attach(node, tmbObj);
								}
								delete bufferExt.attachTmbs[hash];
							} else {
								if (reload) {
									loadThumbnails([hash]);
								} else if (! bufferExt.tmbLoading[hash]) {
									bufferExt.getTmbs.push(hash);
								}
							}
						}
					};

				if ($.isPlainObject(tmbs) && Object.keys(tmbs).length) {
					Object.assign(bufferExt.attachTmbs, tmbs);
					$.each(tmbs, chk);
					if (! reload && bufferExt.getTmbs.length && ! Object.keys(bufferExt.tmbLoading).length) {
						loadThumbnails();
					}
				}
			},
			
			/**
			 * Load thumbnails from backend.
			 *
			 * @param  Array|void reloads  hashes list for reload thumbnail items
			 * @return void
			 */
			loadThumbnails = function(reloads) {
				var tmbs = [],
					reload = false;
				
				if (fm.oldAPI) {
					fm.request({
						data : {cmd : 'tmb', current : fm.cwd().hash},
						preventFail : true
					})
					.done(function(data) {
						if (data.images && Object.keys(data.images).length) {
							attachThumbnails(data.images);
						}
						if (data.tmb) {
							loadThumbnails();
						}
					});
					return;
				} 

				if (reloads) {
					reload = true;
					tmbs = reloads.splice(0, tmbNum);
				} else {
					tmbs = bufferExt.getTmbs.splice(0, tmbNum);
				}
				if (tmbs.length) {
					if (reload || inViewHashes[tmbs[0]] || inViewHashes[tmbs[tmbs.length-1]]) {
						$.each(tmbs, function(i, h) {
							bufferExt.tmbLoading[h] = true;
						});
						fm.request({
							data : {cmd : 'tmb', targets : tmbs},
							preventFail : true
						})
						.done(function(data) {
							var errs = [],
								resLen;
							if (data.images) {
								if (resLen = Object.keys(data.images).length) {
									if (resLen < tmbs.length) {
										$.each(tmbs, function(i, h) {
											if (! data.images[h]) {
												errs.push(h);
											}
										});
									}
									attachThumbnails(data.images, reload);
								} else {
									errs = tmbs;
								}
								// unset error items from bufferExt.attachTmbs
								if (errs.length) {
									$.each(errs, function(i, h) {
										delete bufferExt.attachTmbs[h];
									});
								}
							}
							if (reload) {
								if (reloads.length) {
									loadThumbnails(reloads);
								}
							}
						})
						.always(function() {
							bufferExt.tmbLoading = {};
							if (! reload && bufferExt.getTmbs.length) {
								loadThumbnails();
							}
						});
					}
				}
			},
			
			/**
			 * Add new files to cwd/buffer
			 *
			 * @param  Array  new files
			 * @return void
			 */
			add = function(files, mode) {
				var place    = list ? cwd.find('tbody') : cwd,
					l        = files.length, 
					atmb     = {},
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
					// created document fragment for jQuery >= 1.12, 2.2, 3.0
					// see Studio-42/elFinder#1544 @ github
					docFlag = $.htmlPrefilter? true : false,
					tempDom = docFlag? $(document.createDocumentFragment()) : $('<div/>'),
					file, hash, node, nodes, ndx;

				if (l > showFiles) {
					// re-render for performance tune
					content();
					selectedFiles = fm.arrayFlip($.map(files, function(f) { return f.hash; }), true);
					trigger();
				} else {
					// add the item immediately
					l && wz.removeClass('elfinder-cwd-wrapper-empty');
					
					while (l--) {
						file = files[l];
						hash = file.hash;
						
						if ($('#'+fm.cwdHash2Id(hash)).length) {
							continue;
						}
						
						if ((node = findNode(file)) && ! node.length) {
							node = null;
						}
						if (! node && (ndx = findIndex(file)) >= 0) {
							buffer.splice(ndx, 0, file);
						} else {
							tempDom.empty().append(itemhtml(file));
							(file.mime === 'directory') && !mobile && makeDroppable(tempDom);
							nodes = docFlag? tempDom : tempDom.children();
							if (node) {
								node.before(nodes);
							} else {
								place.append(nodes);
							}
						}
						
						if ($('#'+fm.cwdHash2Id(hash)).length) {
							if (file.tmb) {
								atmb[hash] = file.tmb;
							}
						}
					}
	
					if (list) {
						setColwidth();
						fixTableHeader({fitWidth: ! colWidth});
					}
					bottomMarkerShow(place);
					if (Object.keys(atmb).length) {
						Object.assign(bufferExt.attachTmbs, atmb);
					}
				}
			},
			
			/**
			 * Remove files from cwd/buffer
			 *
			 * @param  Array  files hashes
			 * @return void
			 */
			remove = function(files) {
				var l = files.length,
					inSearch = fm.searchStatus.state > 1,
					curCmd = fm.getCommand(fm.currentReqCmd) || {},
					hash, n, ndx, allItems;

				// removed cwd
				if (!fm.cwd().hash && !curCmd.noChangeDirOnRemovedCwd) {
					allItems = fm.files();
					$.each(cwdParents.reverse(), function(i, h) {
						if (allItems[h]) {
							fm.one(fm.currentReqCmd + 'done', function() {
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
							--bufferExt.renderd;
						} catch(e) {
							fm.debug('error', e);
						}
					} else if ((ndx = index(hash)) !== -1) {
						buffer.splice(ndx, 1);
					}
					selectedFiles[hash] && delete selectedFiles[hash]
					if (inSearch) {
						if ((ndx = $.inArray(hash, cwdHashes)) !== -1) {
							cwdHashes.splice(ndx, 1);
						}
					}
				}
				
				inSearch && fm.trigger('cwdhasheschange', cwdHashes);
				
				if (list) {
					setColwidth();
					fixTableHeader({fitWidth: ! colWidth});
				}
			},
			
			msg = {
				name : fm.i18n('name'),
				perm : fm.i18n('perms'),
				date : fm.i18n('modify'),
				size : fm.i18n('size'),
				kind : fm.i18n('kind'),
				modestr : fm.i18n('mode'),
				modeoct : fm.i18n('mode'),
				modeboth : fm.i18n('mode')
			},
			
			customColsNameBuild = function() {
				var name = '',
				customColsName = '',
				names = Object.assign({}, msg, options.listView.columnsCustomName);
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
							// long tap
							cwd.data('longtap', true);
							fm.trigger('contextmenu', {
								'type'    : 'cwd',
								'targets' : [fm.cwd().hash],
								'x'       : wrapper.data('touching').x,
								'y'       : wrapper.data('touching').y
							});
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

				wz.append(selectAllCheckbox).removeClass('elfinder-cwd-wrapper-empty elfinder-search-result elfinder-incsearch-result elfinder-letsearch-result');
				if (fm.searchStatus.state > 1 || fm.searchStatus.ininc) {
					wz.addClass('elfinder-search-result' + (fm.searchStatus.ininc? ' elfinder-'+(query.substr(0,1) === '/' ? 'let':'inc')+'search-result' : ''));
				}
				
				// abort attachThumbJob
				bufferExt.attachThumbJob && bufferExt.attachThumbJob._abort();
				
				// destroy selectable for GC
				cwd.data('selectable') && cwd.selectable('disable').selectable('destroy').removeData('selectable');
				
				// notify cwd init
				fm.trigger('cwdinit');
				
				selectedNext = $();
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

				fm.lazy(function() {
					buffer = $.map(incHashes || cwdHashes, function(hash) { return fm.file(hash) || null });
					
					buffer = fm.sortFiles(buffer);
					bufferExt = {
						renderd: 0,
						attachTmbs: {},
						getTmbs: [],
						tmbLoading: {},
						lazyOpts: { tm : 0 }
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
						wrapper.droppable(fm.isCommandEnabled('paste')? 'enable' : 'disable');
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

					if (!curClickId) {
						curClickId = p.attr('id');
						setTimeout(function() {
							curClickId = '';
						}, 500);
					}
					
					if (e.shiftKey) {
						prev = p.prevAll(lastSelect || '.'+clSelected+':first');
						next = p.nextAll(lastSelect || '.'+clSelected+':first');
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
					if (curClickId) {
						var hash = fm.cwdId2Hash(curClickId);
						e.stopPropagation();
						if (this.id !== curClickId) {
							$(this).trigger(evtUnselect);
							$('#'+curClickId).trigger(evtSelect);
							trigger();
						}
						fm.dblclick({file : hash});
					}
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
					if (scrolling) { return; }
					var $this = $(this), helper = null,
						target = list ? $this : $this.children('div.elfinder-cwd-file-wrapper,div.elfinder-cwd-filename');

					if (!mobile && !$this.data('dragRegisted') && !$this.hasClass(clTmp) && !target.hasClass(clDraggable) && !target.hasClass(clDisabled)) {
						$this.data('dragRegisted', true);
						if (!fm.isCommandEnabled('copy', fm.searchStatus.state > 1? fm.cwdId2Hash($this.attr('id')) : void 0)) {
							return;
						}
						target.on('mousedown', function(e) {
							// shiftKey or altKey + drag start for HTML5 native drag function
							// Note: can no use shiftKey with the Google Chrome 
							var metaKey = e.shiftKey || e.altKey;
							if (metaKey && !fm.UA.IE && cwd.data('selectable')) {
								// destroy jQuery-ui selectable while trigger native drag
								cwd.selectable('disable').selectable('destroy').removeData('selectable');
								setTimeout(function(){
									cwd.selectable(selectableOption).selectable('option', {disabled: false}).selectable('refresh').data('selectable', true);
								}, 10);
							}
							target.draggable('option', 'disabled', metaKey).removeClass('ui-state-disabled');
							if (metaKey) {
								target.attr('draggable', 'true');
							} else {
								target.removeAttr('draggable')
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
										i = '<div class="elfinder-cwd-icon elfinder-cwd-icon-drag '+fm.mime2class(mime)+' ui-corner-all"/>';
										if (tmb) {
											i = $(i).addClass(tmb.className).css('background-image', "url('"+tmb.url+"')").get(0).outerHTML;
										}
										return i;
									}, l, geturl = [];
								p.trigger(evtSelect);
								trigger();
								$.each(selectedFiles, function(v){
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
						lastSelect = '#'+ this.id;
						$this.addClass(clSelected).children().addClass(clHover).find('input:checkbox').prop('checked', true);
						if (! selectedFiles[id]) {
							selectedFiles[id] = true;
						}
						// will be selected next
						selectedNext = cwd.find('[id].'+clSelected+':last').next();
					}
				})
				// remove hover class from unselected file
				.on(evtUnselect, fileSelector, function(e) {
					var $this = $(this), 
						id    = fm.cwdId2Hash($this.attr('id'));
					
					if (!selectLock) {
						$this.removeClass(clSelected).children().removeClass(clHover).find('input:checkbox').prop('checked', false);
						if (cwd.hasClass('elfinder-cwd-allselected')) {
							selectCheckbox && selectAllCheckbox.children('input').prop('checked', false);
							cwd.removeClass('elfinder-cwd-allselected');
						}
						selectedFiles[id] && delete selectedFiles[id];
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
				.on('scrolltoview', fileSelector, function(e, data) {
					scrollToView($(this), (data && typeof data.blink !== 'undefined')? data.blink : true);
				})
				.on('mouseenter.'+fm.namespace+' mouseleave.'+fm.namespace, fileSelector, function(e) {
					var enter = (e.type === 'mouseenter');
					if (enter && scrolling) { return; }
					fm.trigger('hover', {hash : fm.cwdId2Hash($(this).attr('id')), type : e.type});
					$(this).toggleClass(clHover, (e.type == 'mouseenter'));
				})
				.on('contextmenu.'+fm.namespace, function(e) {
					var file = $(e.target).closest(fileSelector);
					
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
				.droppable(Object.assign({}, droppable, {autoDisable: false}))
				.on('contextmenu.'+fm.namespace, wrapperContextMenu.contextmenu)
				.on('touchstart.'+fm.namespace, wrapperContextMenu.touchstart)
				.on('touchmove.'+fm.namespace+' touchend.'+fm.namespace, wrapperContextMenu.touchend)
				.on('click.'+fm.namespace, wrapperContextMenu.click)
				.on('scroll.'+fm.namespace, function() {
					if (! scrolling) {
						cwd.data('selectable') && cwd.selectable('disable');
						wrapper.trigger(scrollStartEvent);
					}
					scrolling = true;
					bufferExt.scrtm && clearTimeout(bufferExt.scrtm);
					if (bufferExt.scrtm && Math.abs((bufferExt.scrolltop || 0) - (bufferExt.scrolltop = (this.scrollTop || $(this).scrollTop()))) < 5) {
						bufferExt.scrtm = 0;
						wrapper.trigger(scrollEvent);
					}
					bufferExt.scrtm = setTimeout(function() {
						bufferExt.scrtm = 0;
						wrapper.trigger(scrollEvent);
					}, 20);
				})
				.on(scrollEvent, function() {
					scrolling = false;
					wrapperRepaint();
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
				}, 10);
				
				list && ! colResizing && (init? wrapper.trigger('resize.fixheader') : fixTableHeader());
				
				wrapperRepaint();
			},
			
			// elfinder node
			parent = $(this).parent().resize(resize),
			
			// workzone node 
			wz = parent.children('.elfinder-workzone').append(wrapper.append(this).append(bottomMarker)),
			
			// has UI tree
			hasUiTree,
			
			winScrTm;

		// setup by options
		replacement = Object.assign(replacement, options.replacement || {});
		
		try {
			colWidth = fm.storage('cwdColWidth')? fm.storage('cwdColWidth') : null;
		} catch(e) {
			colWidth = null;
		}
		
		// setup costomCols
		if (customCols = fm.storage('cwdCols')) {
			customCols = $.map(customCols, function(n) {
				return (options.listView.columns.indexOf(n) !== -1)? n : null;
			});
			if (options.listView.columns.length > customCols.length) {
				$.each(options.listView.columns, function(i, n) {
					if (customCols.indexOf(n) === -1) {
						customCols.push(n);
					}
				});
			}
		} else {
			customCols = options.listView.columns;
		}
		templates.row = makeTemplateRow();
		
		if (mobile) {
			// for iOS5 bug
			$('body').on('touchstart touchmove touchend', function(e){});
		}
		
		selectCheckbox && cwd.addClass('elfinder-has-checkbox');
		
		$(window).on('scroll.'+fm.namespace, function() {
			winScrTm && clearTimeout(winScrTm);
			winScrTm = setTimeout(function() {
				wrapper.trigger(scrollEvent);
			}, 50);
		});
		
		$(document).on('keydown.'+fm.namespace, function(e) {
			if (e.keyCode == $.ui.keyCode.ESCAPE) {
				if (! fm.getUI().find('.ui-widget:visible').length) {
					unselectAll();
				}
			}
		});
		
		fm
			.one('init', function(){
				var style = document.createElement('style'),
				sheet, node, base, resizeTm, i = 0;
				if (document.head) {
					document.head.appendChild(style);
					sheet = style.sheet;
					sheet.insertRule('.elfinder-cwd-wrapper-empty .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder')+'" }', i++);
					sheet.insertRule('.elfinder-cwd-wrapper-empty .ui-droppable .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder'+(mobile? 'LTap' : 'Drop'))+'" }', i++);
					sheet.insertRule('.elfinder-cwd-wrapper-empty .ui-droppable-disabled .elfinder-cwd:after{ content:"'+fm.i18n('emptyFolder')+'" }', i++);
					sheet.insertRule('.elfinder-cwd-wrapper-empty.elfinder-search-result .elfinder-cwd:after{ content:"'+fm.i18n('emptySearch')+'" }', i++);
					sheet.insertRule('.elfinder-cwd-wrapper-empty.elfinder-search-result.elfinder-incsearch-result .elfinder-cwd:after{ content:"'+fm.i18n('emptyIncSearch')+'" }', i++);
					sheet.insertRule('.elfinder-cwd-wrapper-empty.elfinder-search-result.elfinder-letsearch-result .elfinder-cwd:after{ content:"'+fm.i18n('emptyLetSearch')+'" }', i++);
				}
				if (! mobile) {
					fm.one('open', function() {
						sheet && fm.zIndex && sheet.insertRule('.ui-selectable-helper{z-index:'+fm.zIndex+';}', i++);
					});
					base = $('<div style="position:absolute"/>');
					node = fm.getUI();
					node.on('resize', function(e, data) {
						var offset;
						e.preventDefault();
						e.stopPropagation();
						if (data && data.fullscreen) {
							offset = node.offset();
							if (data.fullscreen === 'on') {
								base.css({top:offset.top * -1 , left:offset.left * -1 }).appendTo(node);
								selectableOption.appendTo = base;
							} else {
								base.detach();
								selectableOption.appendTo = 'body';
							}
							cwd.data('selectable') && cwd.selectable('option', {appendTo : selectableOption.appendTo});
						}
					});
				}
				hasUiTree = fm.getUI('tree').length;
			})
			.bind('enable', function() {
				resize();
			})
			.bind('request.open', function() {
				bufferExt.getTmbs = [];
			})
			.bind('open add remove searchend', function() {
				var phash = fm.cwd().hash,
					type = this.type;
				if (type === 'open' || type === 'searchend' || fm.searchStatus.state < 2) {
					cwdHashes = $.map(fm.files(phash), function(f) { return f.hash; });
					fm.trigger('cwdhasheschange', cwdHashes);
				}
				if (type === 'open') {
					var inTrash = function() {
							var isIn = false;
							$.each(cwdParents, function(i, h) {
								if (fm.trashes[h]) {
									isIn = true;
									return false;
								}
							});
							return isIn;
						},
						phash = fm.cwd().phash,
						req = phash?
							(! fm.file(phash)?
								(! hasUiTree?
									fm.request({
										data: {
											cmd    : 'parents',
											target : fm.cwd().hash
										},
										preventFail : true
									}) : (function() {
										var dfd = $.Deferred();
										fm.one('parents', function() {
											dfd.resolve();
										});
										return dfd;
									})()
								) : null
							) : null;
					$.when(req).done(function() {
						cwdParents = fm.parents(fm.cwd().hash);
						wrapper[inTrash()? 'addClass':'removeClass']('elfinder-cwd-wrapper-trash');
					});
					incHashes = void 0;
					unselectAll();
					content();
					resize();
				}
			})
			.bind('search', function(e) {
				cwdHashes = $.map(e.data.files, function(f) { return f.hash; });
				fm.trigger('cwdhasheschange', cwdHashes);
				incHashes = void 0;
				fm.searchStatus.ininc = false;
				content();
				fm.autoSync('stop');
				resize();
			})
			.bind('searchend', function(e) {
				if (query || incHashes) {
					query = '';
					if (incHashes) {
						fm.trigger('incsearchend', e.data);
					} else {
						if (!e.data || !e.data.noupdate) {
							content();
						}
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
				selectedFiles = {};
				fm.lazy(function() {
					// incremental search
					var regex, q, fst = '';
					q = query = e.data.query || '';
					if (q) {
						if (q.substr(0,1) === '/') {
							q = q.substr(1);
							fst = '^';
						}
						regex = new RegExp(fst + q.replace(/([\\*\;\.\?\[\]\{\}\(\)\^\$\-\|])/g, '\\$1'), 'i');
						incHashes = $.map(cwdHashes, function(hash) {
							var file = fm.file(hash);
							return (file && (file.name.match(regex) || (file.i18 && file.i18.match(regex))))? file.hash : null;
						});
						fm.trigger('incsearch', { hashes: incHashes, query: q })
							.searchStatus.ininc = true;
						content();
						fm.autoSync('stop');
					} else {
						fm.trigger('incsearchend');
					}
					resize();
				});
			})
			.bind('incsearchend', function(e) {
				query = '';
				fm.searchStatus.ininc = false;
				incHashes = void 0;
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
					Object.keys(selectedFiles).length && trigger();
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
					Object.keys(selectedFiles).length && trigger();
				}
				resize();
			})
			.bind('wzresize', function() {
				var place = list ? cwd.find('tbody') : cwd,
					cwdOffset;
				resize(true);
				if (bufferExt.hpi) {
					bottomMarkerShow(place, place.find('[id]').length);
				}
				
				cwdOffset = cwd.offset();
				wz.data('rectangle', Object.assign(
					{
						width: wz.width(),
						height: wz.height(),
						cwdEdge: (fm.direction === 'ltr')? cwdOffset.left : cwdOffset.left + cwd.width()
					},
					wz.offset())
				);
				
				bufferExt.itemH = (list? place.find('tr:first') : place.find('[id]:first')).outerHeight(true);
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
			.bind('tmbreload', function(e) {
				var imgs = {},
					files = (e.data && e.data.files)? e.data.files : null;
				
				$.each(files, function(i, f) {
					if (f.tmb && f.tmb != '1') {
						imgs[f.hash] = f.tmb;
					}
				});
				if (Object.keys(imgs).length) {
					attachThumbnails(imgs, true);
				}
			})
			.add(function(e) {
				var regex = query? new RegExp(query.replace(/([\\*\;\.\?\[\]\{\}\(\)\^\$\-\|])/g, '\\$1'), 'i') : null,
					mime  = fm.searchStatus.mime,
					inSearch = fm.searchStatus.state > 1,
					phash = inSearch && fm.searchStatus.target? fm.searchStatus.target : fm.cwd().hash,
					curPath = fm.path(phash),
					inTarget = function(f) {
						var res, parents, path;
						res = (f.phash === phash);
						if (!res && inSearch) {
							path = f.path || fm.path(f.hash);
							res = (curPath && path.indexOf(curPath) === 0);
							if (! res && fm.searchStatus.mixed) {
								res = $.map(fm.searchStatus.mixed, function(vid) { return f.hash.indexOf(vid) === 0? true : null; }).length? true : false;
							}
						}
						if (res && inSearch) {
							if (mime) {
								res = (f.mime.indexOf(mime) === 0);
							} else {
								res = (f.name.match(regex) || (f.i18 && f.i18.match(regex)))? true : false;
							}
						}
						return res;
					},
					files = $.map(e.data.added || [], function(f) { return inTarget(f)? f : null ;});
				add(files);
				if (fm.searchStatus.state === 2) {
					$.each(files, function(i, f) {
						if ($.inArray(f.hash, cwdHashes) === -1) {
							cwdHashes.push(f.hash);
						}
					});
					fm.trigger('cwdhasheschange', cwdHashes);
				}
				list && resize();
				wrapper.trigger(scrollEvent);
			})
			.change(function(e) {
				var phash = fm.cwd().hash,
					sel   = fm.selected(),
					files, added;

				if (query) {
					$.each(e.data.changed || [], function(i, file) {
						remove([file.hash]);
						if (file.name.indexOf(query) !== -1) {
							add([file], 'change');
							$.inArray(file.hash, sel) !== -1 && selectFile(file.hash);
							added = true;
						}
					});
				} else {
					$.each($.map(e.data.changed || [], function(f) { return f.phash == phash ? f : null; }), function(i, file) {
						remove([file.hash]);
						add([file], 'change');
						$.inArray(file.hash, sel) !== -1 && selectFile(file.hash);
						added = true;
					});
				}
				
				if (added) {
					fm.trigger('cwdhasheschange', cwdHashes);
					list && resize();
					wrapper.trigger(scrollEvent);
				}
				
				trigger();
			})
			.remove(function(e) {
				var place = list ? cwd.find('tbody') : cwd;
				remove(e.data.removed || []);
				trigger();
				if (buffer.length < 1 && place.children(fileSelector).length < 1) {
					wz.addClass('elfinder-cwd-wrapper-empty');
					selectCheckbox && selectAllCheckbox.find('input').prop('checked', false);
					bottomMarker.hide();
					wrapper.off(scrollEvent, render);
					resize();
				} else {
					bottomMarkerShow(place);
					wrapper.trigger(scrollEvent);
				}
			})
			// select dragged file if no selected, disable selectable
			.dragstart(function(e) {
				var target = $(e.data.target),
					oe     = e.data.originalEvent;

				if (target.hasClass(clFile)) {
					
					if (!target.hasClass(clSelected)) {
						!(oe.ctrlKey || oe.metaKey || oe.shiftKey) && unselectAll();
						target.trigger(evtSelect);
						trigger();
					}
				}
				
				cwd.removeClass(clDisabled).data('selectable') && cwd.selectable('disable');
				selectLock = true;
			})
			// enable selectable
			.dragstop(function() {
				cwd.data('selectable') && cwd.selectable('enable');
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
					parents, ctr, add;

				if (l > 0) {
					parents = fm.parents(files[0]);
				}
				if (event === evtSelect || event === evtUnselect) {
					add  = (event === evtSelect),
					$.each(files, function(i, hash) {
						var all = cwd.hasClass('elfinder-cwd-allselected');
						if (! selectedFiles[hash]) {
							add && (selectedFiles[hash] = true);
						} else {
							if (all) {
								selectCheckbox && selectAllCheckbox.children('input').prop('checked', false);
								cwd.removeClass('elfinder-cwd-allselected');
								all = false;
							}
							! add && delete selectedFiles[hash];
						}
					});
				}
				if (!helper.data('locked')) {
					while (l--) {
						try {
							$('#'+fm.cwdHash2Id(files[l])).trigger(event);
						} catch(e) {}
					}
					! e.data.inselect && trigger();
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
				pattern     :'ctrl+shift+i', 
				description : 'selectinvert',
				callback    : selectInvert
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
			})
			.shortcut({
				pattern     : 'page_up',
				description : 'pageTurning',
				callback    : function(e) {
					if (bufferExt.itemH) {
						wrapper.scrollTop(
							Math.round(
								wrapper.scrollTop()
								- (Math.floor((wrapper.height() + (list? bufferExt.itemH * -1 : 16)) / bufferExt.itemH)) * bufferExt.itemH
							)
						);
					}
				}
			}).shortcut({
				pattern     : 'page_down',
				description : 'pageTurning',
				callback    : function(e) { 
					if (bufferExt.itemH) {
						wrapper.scrollTop(
							Math.round(
								wrapper.scrollTop()
								+ (Math.floor((wrapper.height() + (list? bufferExt.itemH * -1 : 16)) / bufferExt.itemH)) * bufferExt.itemH
							)
						);
					}
				}
			});
		
	});
	
	// fm.timeEnd('cwdLoad')
	
	return this;
};
