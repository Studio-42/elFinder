"use strict";
/**
 * @class  elFinder folders tree
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertree = function(fm, opts) {
	var treeclass = fm.res('class', 'tree');
	
	this.not('.'+treeclass).each(function() {

		var c = 'class', mobile = fm.UA.Mobile,
			
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = fm.res(c, 'treeroot'),

			/**
			 * Open root dir if not opened yet
			 *
			 * @type Boolean
			 */
			openRoot  = opts.openRootOnLoad,

			/**
			 * Open current work dir if not opened yet
			 *
			 * @type Boolean
			 */
			openCwd   = opts.openCwdOnOpen,

			
			/**
			 * Auto loading current directory parents and do expand their node
			 *
			 * @type Boolean
			 */
			syncTree  = openCwd || opts.syncTree,
			
			/**
			 * Subtree class name
			 *
			 * @type String
			 */
			subtree   = fm.res(c, 'navsubtree'),
			
			/**
			 * Directory class name
			 *
			 * @type String
			 */
			navdir    = fm.res(c, 'treedir'),
			
			/**
			 * Directory CSS selector
			 *
			 * @type String
			 */
			selNavdir = 'span.' + navdir,
			
			/**
			 * Collapsed arrow class name
			 *
			 * @type String
			 */
			collapsed = fm.res(c, 'navcollapse'),
			
			/**
			 * Expanded arrow class name
			 *
			 * @type String
			 */
			expanded  = fm.res(c, 'navexpand'),
			
			/**
			 * Class name to mark arrow for directory with already loaded children
			 *
			 * @type String
			 */
			loaded    = 'elfinder-subtree-loaded',
			
			/**
			 * Class name to mark need subdirs request
			 *
			 * @type String
			 */
			chksubdir = 'elfinder-subtree-chksubdir',
			
			/**
			 * Arraw class name
			 *
			 * @type String
			 */
			arrow = fm.res(c, 'navarrow'),
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = fm.res(c, 'active'),
			
			/**
			 * Droppable dirs dropover class
			 *
			 * @type String
			 */
			dropover = fm.res(c, 'adroppable'),
			
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = fm.res(c, 'hover'),
			
			/**
			 * Disabled dir class name
			 *
			 * @type String
			 */
			disabled = fm.res(c, 'disabled'),
			
			/**
			 * Draggable dir class name
			 *
			 * @type String
			 */
			draggable = fm.res(c, 'draggable'),
			
			/**
			 * Droppable dir  class name
			 *
			 * @type String
			 */
			droppable = fm.res(c, 'droppable'),
			
			/**
			 * root wrapper class
			 * 
			 * @type String
			 */
			wrapperRoot = 'elfinder-navbar-wrapper-root',

			/**
			 * Un-disabled cmd `paste` volume's root wrapper class
			 * 
			 * @type String
			 */
			pastable = 'elfinder-navbar-wrapper-pastable',
			
			/**
			 * Un-disabled cmd `upload` volume's root wrapper class
			 * 
			 * @type String
			 */
			uploadable = 'elfinder-navbar-wrapper-uploadable',
			
			/**
			 * Is position x inside Navbar
			 * 
			 * @param x Numbar
			 * 
			 * @return
			 */
			insideNavbar = function(x) {
				var left = navbar.offset().left;
					
				return left <= x && x <= left + navbar.width();
			},
			
			/**
			 * To call subdirs elements queue
			 * 
			 * @type Object
			 */
			subdirsQue = {},
			
			/**
			 * To exec subdirs elements ids
			 * 
			 */
			subdirsExecQue = [],
			
			/**
			 * Request subdirs to backend
			 * 
			 * @param id String
			 * 
			 * @return Deferred
			 */
			subdirs = function(ids) {
				var targets = [];
				$.each(ids, function(i, id) {
					subdirsQue[id] && targets.push(fm.navId2Hash(id));
					delete subdirsQue[id];
				});
				if (targets.length) {
					return fm.request({
						data: {
							cmd: 'subdirs',
							targets: targets,
							preventDefault : true
						}
					}).done(function(res) {
						if (res && res.subdirs) {
							$.each(res.subdirs, function(hash, subdirs) {
								var elm = $('#'+fm.navHash2Id(hash));
								elm.removeClass(chksubdir);
								elm[subdirs? 'addClass' : 'removeClass'](collapsed);
							});
						}
					});
				}
			},
			
			subdirsJobRes = null,
			
			/**
			 * To check target element is in window of subdirs
			 * 
			 * @return void
			 */
			checkSubdirs = function() {
				var ids = Object.keys(subdirsQue);
				if (ids.length) {
					subdirsJobRes && subdirsJobRes._abort();
					execSubdirsTm && clearTimeout(execSubdirsTm);
					subdirsExecQue = [];
					subdirsJobRes = fm.asyncJob(function(id) {
						return fm.isInWindow($('#'+id))? id : null;
					}, ids, { numPerOnce: 200 })
					.done(function(arr) {
						if (arr.length) {
							subdirsExecQue = arr;
							execSubdirs();
						}
					});
				}
			},
			
			subdirsPending = 0,
			execSubdirsTm,
			
			/**
			 * Exec subdirs as batch request
			 * 
			 * @return void
			 */
			execSubdirs = function() {
				var cnt = opts.subdirsMaxConn - subdirsPending,
					i, ids;
				execSubdirsTm && clearTimeout(execSubdirsTm);
				if (subdirsExecQue.length) {
					if (cnt > 0) {
						for (i = 0; i < cnt; i++) {
							if (subdirsExecQue.length) {
								subdirsPending++;
								subdirs(subdirsExecQue.splice(0, opts.subdirsAtOnce)).always(function() {
									subdirsPending--;
									execSubdirs();
								});
							}
						}
					} else {
						execSubdirsTm = setTimeout(function() {
							subdirsExecQue.length && execSubdirs();
						}, 50);
					}
				}
			},
			
			drop = fm.droppable.drop,
			
			/**
			 * Droppable options
			 *
			 * @type Object
			 */
			droppableopts = $.extend(true, {}, fm.droppable, {
				// show subfolders on dropover
				over : function(e, ui) {
					var dst    = $(this),
						helper = ui.helper,
						cl     = hover+' '+dropover,
						hash, status;
					e.stopPropagation();
					helper.data('dropover', helper.data('dropover') + 1);
					dst.data('dropover', true);
					if (ui.helper.data('namespace') !== fm.namespace || ! insideNavbar(e.clientX) || ! fm.insideWorkzone(e.pageX, e.pageY)) {
						dst.removeClass(cl);
						helper.removeClass('elfinder-drag-helper-move elfinder-drag-helper-plus');
						return;
					}
					dst.addClass(hover);
					if (dst.is('.'+collapsed+':not(.'+expanded+')')) {
						dst.data('expandTimer', setTimeout(function() {
							dst.is('.'+collapsed+'.'+hover) && dst.children('.'+arrow).click();
						}, 500));
					}
					if (dst.is('.elfinder-ro,.elfinder-na')) {
						dst.removeClass(dropover);
						helper.removeClass('elfinder-drag-helper-move elfinder-drag-helper-plus');
						return;
					}
					hash = fm.navId2Hash(dst.attr('id'));
					dst.data('dropover', hash);
					$.each(ui.helper.data('files'), function(i, h) {
						if (h === hash || (fm.file(h).phash === hash && !ui.helper.hasClass('elfinder-drag-helper-plus'))) {
							dst.removeClass(cl);
							return false; // break $.each
						}
					});
					if (helper.data('locked')) {
						status = 'elfinder-drag-helper-plus';
					} else {
						status = 'elfinder-drag-helper-move';
						if (e.shiftKey || e.ctrlKey || e.metaKey) {
							status += ' elfinder-drag-helper-plus';
						}
					}
					dst.hasClass(dropover) && helper.addClass(status);
					setTimeout(function(){ dst.hasClass(dropover) && helper.addClass(status); }, 20);
				},
				out : function(e, ui) {
					var dst    = $(this),
						helper = ui.helper;
					e.stopPropagation();
					helper.removeClass('elfinder-drag-helper-move elfinder-drag-helper-plus').data('dropover', Math.max(helper.data('dropover') - 1, 0));
					dst.data('expandTimer') && clearTimeout(dst.data('expandTimer'));
					dst.removeData('dropover')
					   .removeClass(hover+' '+dropover);
				},
				deactivate : function() {
					$(this).removeData('dropover')
					       .removeClass(hover+' '+dropover);
				},
				drop : function(e, ui) {
					insideNavbar(e.clientX) && drop.call(this, e, ui);
				}
			}),
			
			spinner = $(fm.res('tpl', 'navspinner')),
			
			/**
			 * Directory html template
			 *
			 * @type String
			 */
			tpl = fm.res('tpl', 'navdir'),
			
			/**
			 * Permissions marker html template
			 *
			 * @type String
			 */
			ptpl = fm.res('tpl', 'perms'),
			
			/**
			 * Lock marker html template
			 *
			 * @type String
			 */
			ltpl = fm.res('tpl', 'lock'),
			
			/**
			 * Symlink marker html template
			 *
			 * @type String
			 */
			stpl = fm.res('tpl', 'symlink'),
			
			/**
			 * Directory hashes that has more pages
			 * 
			 * @type Object
			 */
			hasMoreDirs = {},
			
			/**
			 * Html template replacement methods
			 *
			 * @type Object
			 */
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash); },
				name        : function(dir) { return fm.escape(dir.i18 || dir.name) },
				cssclass    : function(dir) {
					var cname = (dir.phash && ! dir.isroot ? '' : root)+' '+navdir+' '+fm.perms2class(dir);
					dir.dirs && !dir.link && (cname += ' ' + collapsed) && dir.dirs == -1 && (cname += ' ' + chksubdir);
					opts.getClass && (cname += ' ' + opts.getClass(dir));
					dir.csscls && (cname += ' ' + fm.escape(dir.csscls));
					return cname;
				},
				root        : function(dir) {
					var cls = '';
					if (!dir.phash || dir.isroot) {
						cls += ' '+wrapperRoot;
						if (!dir.disabled || dir.disabled.length < 1) {
							cls += ' '+pastable+' '+uploadable;
						} else {
							if ($.inArray('paste', dir.disabled) === -1) {
								cls += ' '+pastable;
							}
							if ($.inArray('upload', dir.disabled) === -1) {
								cls += ' '+uploadable;
							}
						}
						return cls;
					} else {
						return '';
					}
				},
				permissions : function(dir) { return !dir.read || !dir.write ? ptpl : ''; },
				symlink     : function(dir) { return dir.alias ? stpl : ''; },
				style       : function(dir) { return dir.icon ? fm.getIconStyle(dir) : ''; }
			},
			
			/**
			 * Return html for given dir
			 *
			 * @param  Object  directory
			 * @return String
			 */
			itemhtml = function(dir) {
				return tpl.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					var res = replace[key] ? replace[key](dir) : (dir[key] || '');
					if (key === 'id' && dir.dirs == -1) {
						subdirsQue[res] = res;
					}
					return res;
				});
			},
			
			/**
			 * Return only dirs from files list
			 *
			 * @param  Array  files list
			 * @return Array
			 */
			filter = function(files) {
				return $.map(files||[], function(f) { return f.mime == 'directory' ? f : null });
			},
			
			/**
			 * Find parent subtree for required directory
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findSubtree = function(hash) {
				return hash ? $('#'+fm.navHash2Id(hash)).next('.'+subtree) : tree;
			},
			
			/**
			 * Find directory (wrapper) in required node
			 * before which we can insert new directory
			 *
			 * @param  jQuery  parent directory
			 * @param  Object  new directory
			 * @return jQuery
			 */
			findSibling = function(subtree, dir) {
				var node = subtree.children(':first'),
					info;

				while (node.length) {
					info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')));
					
					if ((info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')))) 
					&& compare(dir, info) < 0) {
						return node;
					}
					node = node.next();
				}
				return subtree.children('button.elfinder-navbar-pager-next');
			},
			
			/**
			 * Add new dirs in tree
			 *
			 * @param  Array  dirs list
			 * @return void
			 */
			updateTree = function(dirs) {
				var length  = dirs.length,
					orphans = [],
					i = length,
					tgts = $(),
					done = {},
					cwd = fm.cwd(),
					append = function(parent, dirs, start, direction) {
						var hashes = {},
							curStart = 0,
							max = fm.newAPI? Math.min(10000, Math.max(10, opts.subTreeMax)) : 10000,
							setHashes = function() {
								hashes = {};
								$.each(dirs, function(i, d) {
									hashes[d.hash] = i;
								});
							},
							change = function(mode) {
								if (mode === 'prepare') {
									$.each(dirs, function(i, d) {
										d.node && parent.append(d.node.hide());
									});
								} else if (mode === 'done') {
									$.each(dirs, function(i, d) {
										d.node && d.node.detach().show();
									});
								}
							},
							update = function(e, data) {
								var i, changed;
								e.stopPropagation();
								
								if (data.select) {
									render(getStart(data.select));
									return;
								}
								
								if (data.change) {
									change(data.change);
									return;
								}
								
								if (data.removed && data.removed.length) {
									dirs = $.map(dirs, function(d) {
										if (data.removed.indexOf(d.hash) === -1) {
											return d;
										} else {
											changed = true;
											return null;
										}
									});
								}
								
								if (data.added && data.added.length) {
									dirs = dirs.concat($.map(data.added, function(d) {
										if (hashes[d.hash] === void(0)) {
											changed = true;
											return d;
										} else {
											return null;
										}
									}));
								}
								if (changed) {
									dirs.sort(compare);
									setHashes();
									render(curStart);
								}
							},
							getStart = function(target) {
								if (hashes[target] !== void(0)) {
									return Math.floor(hashes[target] / max) * max;
								}
								return void(0);
							},
							target = fm.navId2Hash(parent.prev('[id]').attr('id')),
							render = function(start, direction) {
								var html = [],
									nodes = {},
									total, page, s, parts, prev, next, prevBtn, nextBtn;
								delete hasMoreDirs[target];
								curStart = start;
								parent.off('update.'+fm.namespace, update);
								if (dirs.length > max) {
									parent.on('update.'+fm.namespace, update);
									if (start === void(0)) {
										s = 0;
										setHashes();
										start = getStart(cwd.hash);
										if (start === void(0)) {
											start = 0;
										}
									}
									parts = dirs.slice(start, start + max);
									hasMoreDirs[target] = parent;
									prev = start? Math.max(-1, start - max) : -1;
									next = (start + max >= dirs.length)? 0 : start + max;
									total = Math.ceil(dirs.length/max);
									page = Math.ceil(start/max);
								}
								$.each(parts || dirs, function(i, d) {
									html.push(itemhtml(d));
									if (d.node) {
										nodes[d.hash] = d.node;
									}
								});
								if (prev > -1) {
									prevBtn = $('<button class="elfinder-navbar-pager elfinder-navbar-pager-prev"/>')
										.text(fm.i18n('btnPrevious', page, total))
										.button({
											icons: {
												primary: "ui-icon-caret-1-n"
											}
										})
										.on('click', function(e) {
											e.preventDefault();
											e.stopPropagation();
											render(prev, 'up');
										});
								} else {
									prevBtn = $();
								}
								if (next) {
									nextBtn = $('<button class="elfinder-navbar-pager elfinder-navbar-pager-next"/>')
										.text(fm.i18n('btnNext', page + 2, total))
										.button({
											icons: {
												primary: "ui-icon-caret-1-s"
											}
										})
										.on('click', function(e) {
											e.preventDefault();
											e.stopPropagation();
											render(next, 'down');
										});
								} else {
									nextBtn = $();
								}
								detach();
								parent.empty()[parts? 'addClass' : 'removeClass']('elfinder-navbar-hasmore').append(prevBtn, html.join(''), nextBtn);
								$.each(nodes, function(h, n) {
									$('#'+fm.navHash2Id(h)).parent().replaceWith(n);
								});
								if (direction) {
									autoScroll(fm.navHash2Id(parts[direction === 'up'? parts.length - 1 : 0].hash));
								}
								! mobile && fm.lazy(function() { updateDroppable(null, parent); });
							},
							detach = function() {
								$.each(parent.children('.elfinder-navbar-wrapper'), function(i, n) {
									var n = $(n),
										ch = n.children('[id]:first'),
										h, c;
									if (ch.hasClass(loaded)) {
										h = fm.navId2Hash(ch.attr('id'));
										if (h && (c = hashes[h]) !== void(0)) {
											dirs[c].node = n.detach();
										}
									}
								});
							};
						
						render();
					},
					dir, html, parent, sibling, init, atonce = {}, updates = [], base, node,
					firstVol = true; // check for netmount volume
				
				while (i--) {
					dir = dirs[i];

					if (done[dir.hash] || $('#'+fm.navHash2Id(dir.hash)).length) {
						continue;
					}
					done[dir.hash] = true;
					
					if ((parent = findSubtree(dir.phash)).length) {
						if (dir.phash && ((init = !parent.children().length) || parent.hasClass('elfinder-navbar-hasmore') || (sibling = findSibling(parent, dir)).length)) {
							if (init) {
								if (!atonce[dir.phash]) {
									atonce[dir.phash] = [];
								}
								atonce[dir.phash].push(dir);
							} else {
								if (sibling) {
									node = itemhtml(dir);
									sibling.before(node);
									! mobile && (tgts = tgts.add(node));
								} else {
									updates.push(dir);
								}
							}
						} else {
							node = itemhtml(dir);
							parent[firstVol || dir.phash ? 'append' : 'prepend'](node);
							firstVol = false;
							if (!dir.phash || dir.isroot) {
								base = $('#'+fm.navHash2Id(dir.hash)).parent();
							}
							! mobile && updateDroppable(null, base);
						}
					} else {
						orphans.push(dir);
					}
				}

				// When init, html append at once
				if (Object.keys(atonce).length){
					$.each(atonce, function(p, dirs){
						var parent = findSubtree(p),
						    html   = [];
						dirs.sort(compare);
						append(parent, dirs);
					});
				}
				
				if (updates.length) {
					parent.trigger('update.' + fm.namespace, { added : updates });
				}
				
				if (orphans.length && orphans.length < length) {
					updateTree(orphans);
					return;
				} 
				
				! mobile && tgts.length && fm.lazy(function() { updateDroppable(tgts); });
				
			},
			
			/**
			 * sort function by dir.name
			 * 
			 */
			compare = function(dir1, dir2) {
				if (! fm.sortAlsoTreeview) {
					return fm.sortRules.name(dir1, dir2);
				} else {
					var asc   = fm.sortOrder == 'asc',
						type  = fm.sortType,
						rules = fm.sortRules,
						res;
					
					res = asc? rules[fm.sortType](dir1, dir2) : rules[fm.sortType](dir2, dir1);
					
					return type !== 'name' && res === 0
						? res = asc ? rules.name(dir1, dir2) : rules.name(dir2, dir1)
						: res;
				}
			},

			/**
			 * Auto scroll to cwd
			 *
			 * @return void
			 */
			autoScroll = function(target) {
				var self = $(this),
					dfrd = $.Deferred(),
					current, parent, top, treeH, bottom, tgtTop;
				self.data('autoScrTm') && clearTimeout(self.data('autoScrTm'));
				self.data('autoScrTm', setTimeout(function() {
					current = $('#'+(target || fm.navHash2Id(fm.cwd().hash)));
					
					if (current.length) {
						// expand parents directory
						(openCwd? current : current.parent()).parents('.elfinder-navbar-wrapper').children('.'+loaded).addClass(expanded).next('.'+subtree).show();
						
						parent = tree.parent().stop(false, true);
						top = parent.offset().top;
						treeH = parent.height();
						bottom = top + treeH - current.outerHeight();
						tgtTop = current.offset().top;
						
						if (tgtTop < top || tgtTop > bottom) {
							parent.animate({
								scrollTop : parent.scrollTop() + tgtTop - top - treeH / 3
							}, {
								duration : 'fast',
								complete : function() {	dfrd.resolve(); }
							});
						} else {
							dfrd.resolve();
						}
					} else {
						dfrd.reject();
					}
				}, 100));
				return dfrd;
			},
			/**
			 * Get hashes array of items of the bottom of the leaf root back from the target
			 * 
			 * @param Object elFinder item(directory) object
			 * @return Array hashes
			 */
			getEnds = function(dir) {
				var cur = dir || fm.cwd(),
					res = [ cur.hash ],
					phash, root, dir;
				
				root = fm.root(cur.hash);
				dir = fm.file(root);
				while (phash = dir.phash) {
					res.unshift(phash);
					root = fm.root(phash);
					dir = fm.file(root);
					if ($('#'+fm.navHash2Id(dir.hash)).hasClass(loaded)) {
						break;
					}
				}
				
				return res;
			},
			
			/**
			 * Select pages back in order to display the target
			 * 
			 * @param Object elFinder item(directory) object
			 * @return Object jQuery node object of target node
			 */
			selectPages = function(cur) {
				var cur = cur || fm.cwd(),
					curHash = cur.hash,
					node = $('#'+fm.navHash2Id(curHash));
			
				if (!node.length) {
					while(cur && cur.phash) {
						if (hasMoreDirs[cur.phash] && !$('#'+fm.navHash2Id(cur.hash)).length) {
							hasMoreDirs[cur.phash].trigger('update.'+fm.namespace, { select : cur.hash });
						}
						cur = fm.file(cur.phash);
					}
					node = $('#'+fm.navHash2Id(curHash));
				}
				
				return node;
			},
			
			/**
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @param Array directory objects of cwd
			 * @param Boolean do auto scroll
			 * @return Object jQuery Deferred
			 */
			sync = function(cwdDirs, autoScr) {
				var cwd     = fm.cwd(),
					cwdhash = cwd.hash,
					autoScr = autoScr === void(0)? syncTree : autoScr,
					loadParents = function(dir) {
						var dfd  = $.Deferred(),
							reqs = [],
							ends = getEnds(dir),
							makeReq = function(cmd, h, until) {
								var data = {
										cmd    : cmd,
										target : h
									};
								if (until) {
									data.until = until;
								}
								return fm.request({
									data : data,
									preventFail : true
								});
							},
							baseHash, baseId;
						
						reqs = $.map(ends, function(h) {
							var d = fm.file(h),
								isRoot = d? fm.isRoot(d) : false,
								node = $('#'+fm.navHash2Id(h)),
								getPhash = function(h, depth) {
									var d, ph,
										depth = depth || 1;
									ph = (d = fm.file(h))? d.phash : false;
									if (ph && depth > 1) {
										return getPhash(ph, --depth);
									}
									return ph;
								},
								until,
								closest = (function() {
									var phash = getPhash(h);
									until = phash;
									while (phash) {
										if ($('#'+fm.navHash2Id(phash)).hasClass(loaded)) {
											break;
										}
										until = phash;
										phash = getPhash(phash);
									}
									if (!phash) {
										until = void(0);
										phash = fm.root(h);
									}
									return phash;
								})(),
								cmd;
							
							if (!node.hasClass(loaded) && (isRoot || !d || !$('#'+fm.navHash2Id(d.phash)).hasClass(loaded))) {
								if (isRoot || closest === getPhash(h) || closest === getPhash(h, 2)) {
									until = void(0);
									cmd = 'tree';
									if (!isRoot) {
										h = getPhash(h);
									}
								} else {
									cmd = 'parents';
								}
								if (!baseHash) {
									baseHash = (cmd === 'tree')? h : closest;
								}
								return makeReq(cmd, h, until);
							}
							return null;
						});
						
						if (reqs.length) {
							selectPages(fm.file(baseHash));
							baseId = fm.navHash2Id(baseHash);
							autoScr && autoScroll(baseId);
							baseNode = $('#'+baseId);
							spinner = $(fm.res('tpl', 'navspinner')).insertBefore(baseNode.children('.'+arrow));
							baseNode.removeClass(collapsed);
							
							$.when.apply($, reqs)
							.done(function() {
								var res = {},data, treeDirs, dirs, argLen, i;
								argLen = arguments.length;
								if (argLen > 0) {
									for (i = 0; i < argLen; i++) {
										data = arguments[i].tree || [];
										res[ends[i]] = Object.assign([], filter(data));
									}
								}
								dfd.resolve(res);
							})
							.fail(function() {
								dfd.reject();
							});
							
							return dfd;
						} else {
							return dfd.resolve();
						}
					},
					done= function(res, dfrd) {
						var open = function() {
								if (openRoot && baseNode) {
									findSubtree(baseNode.hash).show().prev(selNavdir).addClass(expanded);
									openRoot = false;
								}
								if (autoScr) {
									autoScroll().done(checkSubdirs);
								} else {
									checkSubdirs();
								}
							},
							current;
						
						if (res) {
							$.each(res, function(endHash, dirs) {
								dirs && updateTree(dirs);
								selectPages(fm.file(endHash));
								dirs && updateArrows(dirs, loaded);
							});
						}
						
						if (cwdDirs) {
							(fm.api < 2.1) && cwdDirs.push(cwd);
							updateTree(cwdDirs);
						}
						
						// set current node
						current = selectPages();
						
						if (!current.hasClass(active)) {
							tree.find(selNavdir+'.'+active).removeClass(active);
							current.addClass(active);
						}
						
						// mark as loaded to cwd parents
						current.parents('.elfinder-navbar-wrapper').children('.'+navdir).addClass(loaded);
						
						if (res) {
							fm.lazy(open).done(function() {
								dfrd.resolve();
							});
						} else {
							open();
							dfrd.resolve();
						}
					},
					rmSpinner = function(fail) {
						if (baseNode) {
							spinner.remove();
							baseNode.addClass(collapsed + (fail? '' : (' ' + loaded)));
						}
					},
					dfrd = $.Deferred(),
					baseNode, spinner;
				
				if (!$('#'+fm.navHash2Id(cwdhash)).length) {
					loadParents()
					.done(function(res) {
						done(res, dfrd);
						rmSpinner();
					})
					.fail(function() { 
						rmSpinner(true);
						dfrd.reject();
					});
				} else {
					done(void(0), dfrd);
				}
					
				return dfrd;
			},
			
			/**
			 * Make writable and not root dirs droppable
			 *
			 * @return void
			 */
			updateDroppable = function(target, node) {
				var limit = 100,
					next;
				
				if (!target) {
					if (!node || node.closest('div.'+wrapperRoot).hasClass(uploadable)) {
						(node || tree.find('div.'+uploadable)).find(selNavdir+':not(.elfinder-ro,.elfinder-na)').addClass('native-droppable');
					}
					if (!node || node.closest('div.'+wrapperRoot).hasClass(pastable)) {
						target = (node || tree.find('div.'+pastable)).find(selNavdir+':not(.'+droppable+')');
					} else {
						target = $();
					}
					if (node) {
						// check leaf roots
						node.children('div.'+wrapperRoot).each(function() {
							updateDroppable(null, $(this));
						});
					}
				}
				
				// make droppable on async
				if (target.length) {
					fm.asyncJob(function(elm) {
						$(elm).droppable(droppableopts);
					}, $.makeArray(target), {
						interval : 20,
						numPerOnce : 100
					});
				}
			},
			
			/**
			 * Check required folders for subfolders and update arrow classes
			 *
			 * @param  Array  folders to check
			 * @param  String css class 
			 * @return void
			 */
			updateArrows = function(dirs, cls) {
				var sel = cls == loaded
						? '.'+collapsed+':not(.'+loaded+')'
						: ':not(.'+collapsed+')';
				
				$.each(dirs, function(i, dir) {
					$('#'+fm.navHash2Id(dir.phash)+sel)
						.filter(function() { return $.map($(this).next('.'+subtree).children(), function(n) {
							return ($(n).children().hasClass(root))? null : n;
						}).length > 0 })
						.addClass(cls);
				})
			},
			
			
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass(treeclass)
				// make dirs draggable and toggle hover class
				.on('mouseenter mouseleave', selNavdir, function(e) {
					var enter = (e.type === 'mouseenter');
					if (enter && scrolling) { return; }
					var link  = $(this); 
					
					if (!link.hasClass(dropover+' '+disabled)) {
						if (!mobile && enter && !link.data('dragRegisted') && !link.hasClass(root+' '+draggable+' elfinder-na elfinder-wo')) {
							link.data('dragRegisted', true);
							if (fm.isCommandEnabled('copy', fm.navId2Hash(link.attr('id')))) {
								link.draggable(fm.draggable);
							}
						}
						link.toggleClass(hover, enter);
					}
				})
				// native drag enter
				.on('dragenter', selNavdir, function(e) {
					if (e.originalEvent.dataTransfer) {
						var dst = $(this);
						dst.addClass(hover);
						if (dst.is('.'+collapsed+':not(.'+expanded+')')) {
							dst.data('expandTimer', setTimeout(function() {
								dst.is('.'+collapsed+'.'+hover) && dst.children('.'+arrow).click();
							}, 500));
						}
					}
				})
				// native drag leave
				.on('dragleave', selNavdir, function(e) {
					if (e.originalEvent.dataTransfer) {
						var dst = $(this);
						dst.data('expandTimer') && clearTimeout(dst.data('expandTimer'));
						dst.removeClass(hover);
					}
				})
				// open dir or open subfolders in tree
				.on('click', selNavdir, function(e) {
					var link = $(this),
						hash = fm.navId2Hash(link.attr('id')),
						file = fm.file(hash);
					
						if (link.data('longtap')) {
							e.stopPropagation();
						return;
					}
					
					if (hash != fm.cwd().hash && !link.hasClass(disabled)) {
						fm.exec('open', hash).done(function() {
							fm.select({selected: [hash], origin: 'tree'});
						});
					} else {
						if (link.hasClass(collapsed)) {
							link.children('.'+arrow).click();
						}
						fm.select({selected: [hash], origin: 'tree'});
					}
				})
				// for touch device
				.on('touchstart', selNavdir, function(e) {
					if (e.originalEvent.touches.length > 1) {
						return;
					}
					var evt = e.originalEvent,
					p = $(this)
					.addClass(hover)
					.data('longtap', null)
					.data('tmlongtap', setTimeout(function(e){
						// long tap
						p.data('longtap', true);
						fm.trigger('contextmenu', {
							'type'    : 'navbar',
							'targets' : [fm.navId2Hash(p.attr('id'))],
							'x'       : evt.touches[0].pageX,
							'y'       : evt.touches[0].pageY
						});
					}, 500));
				})
				.on('touchmove touchend', selNavdir, function(e) {
					clearTimeout($(this).data('tmlongtap'));
					if (e.type == 'touchmove') {
						$(this).removeClass(hover);
					}
				})
				// toggle subfolders in tree
				.on('click', selNavdir+'.'+collapsed+' .'+arrow, function(e) {
					var arrow = $(this),
						link  = arrow.parent(selNavdir),
						stree = link.next('.'+subtree),
						dfrd  = $.Deferred(),
						slideTH = 30, cnt;

					e.stopPropagation();

					if (link.hasClass(loaded)) {
						link.toggleClass(expanded);
						fm.lazy(function() {
							cnt = link.hasClass(expanded)? stree.children().length + stree.find('div.elfinder-navbar-subtree[style*=block]').children().length : stree.find('div:visible').length;
							if (cnt > slideTH) {
								stree.toggle();
								fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
								checkSubdirs();
							} else {
								stree.stop(true, true).slideToggle('normal', function(){
									fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
									checkSubdirs();
								});
							}
						}).always(function() {
							dfrd.resolve();
						});
					} else {
						spinner.insertBefore(arrow);
						link.removeClass(collapsed);

						fm.request({cmd : 'tree', target : fm.navId2Hash(link.attr('id'))})
							.done(function(data) { 
								updateTree(Object.assign([], filter(data.tree))); 
								
								if (stree.children().length) {
									link.addClass(collapsed+' '+expanded);
									if (stree.children().length > slideTH) {
										stree.show();
										fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
										checkSubdirs();
									} else {
										stree.stop(true, true).slideDown('normal', function(){
											fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
											checkSubdirs();
										});
									}
								} 
							})
							.always(function(data) {
								spinner.remove();
								link.addClass(loaded);
								fm.one('treedone', function() {
									dfrd.resolve();
								});
							});
					}
					arrow.data('dfrd', dfrd);
				})
				.on('contextmenu', selNavdir, function(e) {
					var self = $(this);
					e.preventDefault();

					fm.trigger('contextmenu', {
						'type'    : 'navbar',
						'targets' : [fm.navId2Hash($(this).attr('id'))],
						'x'       : e.pageX,
						'y'       : e.pageY
					});
					
					self.addClass('ui-state-hover');
					
					fm.getUI('contextmenu').children().on('mouseenter', function() {
						self.addClass('ui-state-hover');
					});
					
					fm.bind('closecontextmenu', function() {
						self.removeClass('ui-state-hover');
					});
				})
				.on('scrolltoview', selNavdir, function() {
					var self = $(this);
					autoScroll(self.attr('id')).done(function() {
						fm.resources.blink(self, 'lookme');
					});
				})
				// prepend fake dir
				.on('create.'+fm.namespace, function(e, item) {
					var pdir = findSubtree(item.phash),
						lock = item.move || false,
						dir  = $(itemhtml(item)).addClass('elfinder-navbar-wrapper-tmp'),
						selected = fm.selected();
						
					lock && selected.length && fm.trigger('lockfiles', {files: selected});
					pdir.prepend(dir);
				}),
			scrolling = false,
			navbarScrTm,
			// move tree into navbar
			navbar = fm.getUI('navbar').append(tree).show().on('scroll', function() {
				scrolling = true;
				navbarScrTm && clearTimeout(navbarScrTm);
				navbarScrTm = setTimeout(function() {
					scrolling = false;
					checkSubdirs();
				}, 50);
			}),
			
			prevSortTreeview = fm.sortAlsoTreeview;
			
		fm.open(function(e) {
			var data = e.data,
				dirs = filter(data.files),
				contextmenu = fm.getUI('contextmenu');

			data.init && tree.empty();

			if (fm.UA.iOS) {
				navbar.removeClass('overflow-scrolling-touch').addClass('overflow-scrolling-touch');
			}

			if (dirs.length) {
				fm.lazy(function() {
					if (!contextmenu.data('cmdMaps')) {
						contextmenu.data('cmdMaps', {});
					}
					updateTree(dirs);
					updateArrows(dirs, loaded);
					sync(dirs);
				});
			} else {
				sync();
			}
		})
		// add new dirs
		.add(function(e) {
			var dirs = filter(e.data.added);

			if (dirs.length) {
				updateTree(dirs);
				updateArrows(dirs, collapsed);
			}
		})
		// update changed dirs
		.change(function(e) {
			var dirs = filter(e.data.changed),
				length = dirs.length,
				l    = length,
				tgts = $(),
				changed = {},
				dir, phash, node, tmp, realParent, reqParent, realSibling, reqSibling, isExpanded, isLoaded, parent, subdirs;
			
			$.each(hasMoreDirs, function(h, node) {
				node.trigger('update.'+fm.namespace, { change: 'prepare' });
			});
			
			while (l--) {
				dir = dirs[l];
				phash = dir.phash;
				if ((node = $('#'+fm.navHash2Id(dir.hash))).length) {
					parent = node.parent();
					if (phash) {
						realParent  = node.closest('.'+subtree);
						reqParent   = findSubtree(phash);
						realSibling = node.parent().next();
						reqSibling  = findSibling(reqParent, dir);
						
						if (!reqParent.length) {
							continue;
						}
						
						if (reqParent[0] !== realParent[0] || realSibling.get(0) !== reqSibling.get(0)) {
							reqSibling.length ? reqSibling.before(parent) : reqParent.append(parent);
						}
					}
					isExpanded = node.hasClass(expanded);
					isLoaded   = node.hasClass(loaded);
					tmp        = $(itemhtml(dir));
					node.replaceWith(tmp.children(selNavdir));
					! mobile && updateDroppable(null, parent);
					
					if (dir.dirs
					&& (isExpanded || isLoaded) 
					&& (node = $('#'+fm.navHash2Id(dir.hash))) 
					&& node.next('.'+subtree).children().length) {
						isExpanded && node.addClass(expanded);
						isLoaded && node.addClass(loaded);
					}
					
					subdirs |= dir.dirs == -1;
				}
			}
			
			// to check subdirs
			if (subdirs) {
				checkSubdirs();
			}
			
			$.each(hasMoreDirs, function(h, node) {
				node.trigger('update.'+fm.namespace, { change: 'done' });
			});
			
			sync(void(0), false);
		})
		// remove dirs
		.remove(function(e) {
			var dirs = e.data.removed,
				l    = dirs.length,
				node, stree, removed;
			
			$.each(hasMoreDirs, function(h, node) {
				node.trigger('update.'+fm.namespace, { removed : dirs });
				node.trigger('update.'+fm.namespace, { change: 'prepare' });
			});

			while (l--) {
				if ((node = $('#'+fm.navHash2Id(dirs[l]))).length) {
					removed = true;
					stree = node.closest('.'+subtree);
					node.parent().detach();
					if (!stree.children().length) {
						stree.hide().prev(selNavdir).removeClass(collapsed+' '+expanded+' '+loaded);
					}
				}
			}
			
			removed && fm.getUI('navbar').children('.ui-resizable-handle').trigger('resize');
			
			$.each(hasMoreDirs, function(h, node) {
				node.trigger('update.'+fm.namespace, { change: 'done' });
			});
		})
		// lock/unlock dirs while moving
		.bind('lockfiles unlockfiles', function(e) {
			var lock = e.type == 'lockfiles',
				helperLocked = e.data.helper? e.data.helper.data('locked') : false,
				act  = (lock && !helperLocked) ? 'disable' : 'enable',
				dirs = $.map(e.data.files||[], function(h) {  
					var dir = fm.file(h);
					return dir && dir.mime == 'directory' ? h : null;
				});
				
			$.each(dirs, function(i, hash) {
				var dir = $('#'+fm.navHash2Id(hash));
				
				if (dir.length && !helperLocked) {
					dir.hasClass(draggable) && dir.draggable(act);
					dir.hasClass(droppable) && dir.droppable(act);
					dir[lock ? 'addClass' : 'removeClass'](disabled);
				}
			});
		})
		.bind('sortchange', function() {
			if (fm.sortAlsoTreeview || prevSortTreeview !== fm.sortAlsoTreeview) {
				var dirs,
					ends = [],
					endsMap = {},
					endsVid = {},
					topVid = '',
					single = false,
					current;
				
				fm.lazy(function() {
					dirs = filter(fm.files());
					prevSortTreeview = fm.sortAlsoTreeview;
					
					tree.empty();
					
					// append volume roots at first
					updateTree($.map(fm.roots, function(h) {
						var dir = fm.file(h);
						return dir && fm.isRoot(dir)? dir : null;
					}));
					
					if (!Object.keys(hasMoreDirs).length) {
						updateTree(dirs);
						current = selectPages();
						updateArrows(dirs, loaded);
					} else {
						ends = getEnds();
						if (ends.length > 1) {
							$.each(ends, function(i, end) {
								var vid = fm.file(fm.root(end)).volumeid; 
								if (i === 0) {
									topVid = vid;
								}
								endsVid[vid] = end;
								endsMap[end] = [];
							});
							$.each(dirs, function(i, d) {
								if (!d.volumeid) {
									single = true;
									return false;
								}
								endsMap[endsVid[d.volumeid] || endsVid[topVid]].push(d);
							});
						} else {
							single = true;
						}
						if (single) {
							$.each(ends, function(i, endHash) {
								updateTree(dirs);
								current = selectPages(fm.file(endHash));
								updateArrows(dirs, loaded);
							});
						} else {
							$.each(endsMap, function(endHash, dirs) {
								updateTree(dirs);
								current = selectPages(fm.file(endHash));
								updateArrows(dirs, loaded);
							});
						}
					}
					
					sync();
				}, 100);
			}
		});

	});
	
	return this;
};
