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
			 * Html template replacement methods
			 *
			 * @type Object
			 */
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash) },
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
				dir.name = fm.escape(dir.i18 || dir.name);
				
				return tpl.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					var res = dir[key] || (replace[key] ? replace[key](dir) : '');
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
				return $('');
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
					dir, html, parent, sibling, init, atonce = {}, base, node;

				var firstVol = true; // check for netmount volume
				while (i--) {
					dir = dirs[i];

					if (done[dir.hash] || $('#'+fm.navHash2Id(dir.hash)).length) {
						continue;
					}
					done[dir.hash] = true;
					
					if ((parent = findSubtree(dir.phash)).length) {
						if (dir.phash && ((init = !parent.children().length) || (sibling = findSibling(parent, dir)).length)) {
							if (init) {
								if (!atonce[dir.phash]) {
									atonce[dir.phash] = [];
								}
								atonce[dir.phash].push(dir);
							} else {
								node = itemhtml(dir);
								sibling.before(node);
								! mobile && (tgts = tgts.add(node));
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
						$.each(dirs, function(i, d){
							html.push(itemhtml(d));
						});
						parent.append(html.join(''));
						! mobile && fm.lazy(function() { updateDroppable(null, parent); });
					});
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
					dfrd = $.Deferred();
				self.data('autoScrTm') && clearTimeout(self.data('autoScrTm'));
				self.data('autoScrTm', setTimeout(function() {
					var current = $('#'+(target || fm.navHash2Id(fm.cwd().hash)));
					
					if (current.length) {
						var parent = tree.parent().stop(false, true),
						top = parent.offset().top,
						treeH = parent.height(),
						bottom = top + treeH - current.outerHeight(),
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
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @param {Boolean} do not expand cwd
			 * @return void
			 */
			sync = function(noCwd, dirs, init, open) {
				var cwd     = fm.cwd(),
					cwdhash = cwd.hash,
					current = $('#'+fm.navHash2Id(cwdhash)), 
					noCwd   = noCwd || false,
					dirs    = dirs || [],
					open    = open || inOpen,
					reqCmd  = 'parents',
					reqs    = [],
					getCmd  = function(target) {
						var pnode = fm.file(target);
						return (pnode && (pnode.isroot || ! pnode.phash))? 'tree' : 'parents';
					},
					reqPush = function(cmd, target) {
						var link, spinner;
						if (! registed[cmd + target]) {
							if (cmd === 'tree' && target !== cwdhash) {
								link = $('#'+fm.navHash2Id(target));
								if (link.length) {
									spinner = $(fm.res('tpl', 'navspinner')).insertBefore(link.children('.'+arrow));
									link.removeClass(collapsed);
								}
							}
							registed[cmd + target] = true;
							reqs.push(fm.request({
								data : {
									cmd    : cmd,
									target : target
								},
								preventFail : true
							}).done(function() {
								$('#'+fm.navHash2Id(cmd === 'tree'? target : fm.root(target))).addClass(loaded);
							}).always(function() {
								if (spinner) {
									spinner.remove();
									link.addClass(collapsed+' '+expanded).next('.'+subtree).show();
									checkSubdirs();
								}
							}));
						}
					},
					setReqs = function(target) {
						var proot = fm.root(target),
							phash, cmd, reqTarget;
						
						while (proot) {
							if (proot && (proot = fm.file(proot)) && (phash = proot.phash) && phash.indexOf(proot.volumeid) !== 0) {
								cmd = getCmd(phash);
								if (cmd === 'parents') {
									reqPush('tree', phash);
								}
								reqPush(cmd, phash);
								proot = fm.root(phash);
							} else {
								proot = null;
							}
						}
					},
					registed = {},
					rootNode, dir, link, sub, subs, subsLen, cnt;
				
				if (openRoot) {
					rootNode = $('#'+fm.navHash2Id(fm.root()));
					rootNode.hasClass(loaded) && rootNode.addClass(expanded).next('.'+subtree).show();
					openRoot = false;
				}
				
				if (!current.hasClass(active)) {
					tree.find(selNavdir+'.'+active).removeClass(active);
					current.addClass(active);
				}

				if (opts.syncTree || !current.length) {
					if (current.length && (noCwd || ! init || ! cwd.isroot)) {
						if (!noCwd || init) {
							current.addClass(loaded);
							sub = current.next('.'+subtree);
							if (openCwd && sub.children().length) {
								current.addClass(collapsed+' '+expanded);
								sub.slideDown('normal', checkSubdirs);
							}
						}
						if (open || !noCwd) {
							subs = current.parentsUntil('.'+root).filter('.'+subtree);
							subsLen = subs.length;
							cnt = 1;
							subs.show().prev(selNavdir).addClass(expanded, function(){
								if (!noCwd && subsLen == cnt++) {
									autoScroll().done(checkSubdirs);
								} else {
									checkSubdirs();
								}
							});
							!subsLen && !noCwd && autoScroll();
						}
						return;
					}
					if (fm.newAPI) {
						dir = fm.file(cwdhash);
						if (dir && dir.phash && ! dir.isroot) {
							link = $('#'+fm.navHash2Id(dir.phash));
							if (link.length && link.hasClass(loaded)) {
								fm.lazy(function() {
									updateTree([dir]);
									sync(noCwd, [], false, open);
								});
								return;
							}
						}
						if (! noCwd) {
							if (cwd.isroot && cwd.phash) {
								if (getCmd(cwd.phash) === 'tree') {
									reqCmd = 'tree';
								} else {
									reqCmd = 'parents';
								}
								setReqs(cwdhash);
								cwdhash = cwd.phash;
							} else {
								if (cwd.phash) {
									setReqs(cwd.phash);
								} else {
									reqCmd = null;
								}
							}
						}

						reqCmd && reqPush(reqCmd, cwdhash);

						link  = cwd.root? $('#'+fm.navHash2Id(cwd.root)) : null;
						if (link) {
							spinner.insertBefore(link.children('.'+arrow));
							link.removeClass(collapsed);
						}
						$.when.apply($, reqs)
						.done(function(data) {
							var treeDirs, argLen, i;
							if (! data) {
								data = { tree : [] };
							}
							if (fm.api < 2.1) {
								data.tree.push(cwd);
							}
							argLen = arguments.length;
							if (argLen > 1) {
								for(i = 1; i < argLen; i++) {
									if (arguments[i].tree && arguments[i].tree.length) {
										data.tree.push.apply(data.tree, arguments[i].tree);
									}
								}
							}
							
							treeDirs = filter(data.tree);
							if (cwd.isroot && cwd.hash === cwdhash && ! treeDirs.length) {
								// root's phash was not found
								delete cwd.isroot;
								delete cwd.phash;
							}
							dirs = JSON.parse(JSON.stringify($.merge(dirs, treeDirs)));
							updateTree(dirs);
							updateArrows(dirs, loaded);
							
							// leaf root sync
							if (!noCwd && cwd.isroot && $('#'+fm.navHash2Id(cwd.hash).length)) {
								sync(true, [], init, open);
							}
							
							cwdhash == cwd.hash && fm.visible() && sync(noCwd, [], false, open);
						})
						.always(function() {
							if (link) {
								spinner.remove();
								link.addClass(collapsed+' '+loaded);
							}
						});
					}
					
				}
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
				
						
				//tree.find('.'+subtree+':has(*)').prev(':not(.'+collapsed+')').addClass(collapsed)

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
								updateTree(JSON.parse(JSON.stringify(filter(data.tree)))); 
								
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
								sync(true);
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
			
			prevSortTreeview = fm.sortAlsoTreeview,
			
			// is in open event procedure
			inOpen = false;

		fm.open(function(e) {
			var data = e.data,
				dirs = filter(data.files),
				contextmenu = fm.getUI('contextmenu');

			data.init && tree.empty();

			if (fm.UA.iOS) {
				navbar.removeClass('overflow-scrolling-touch').addClass('overflow-scrolling-touch');
			}

			inOpen = true;
			if (dirs.length) {
				fm.lazy(function() {
					if (!contextmenu.data('cmdMaps')) {
						contextmenu.data('cmdMaps', {});
					}
					updateTree(dirs);
					updateArrows(dirs, loaded);
					// support volume driver option `uiCmdMap`
					$.each(dirs, function(k, v){
						if (v.volumeid) {
							if (v.uiCmdMap && Object.keys(v.uiCmdMap).length && !contextmenu.data('cmdMaps')[v.volumeid]) {
								contextmenu.data('cmdMaps')[v.volumeid] = v.uiCmdMap;
							}
						}
					});
					sync(false, dirs, data.init);
					inOpen = false;
				});
			} else {
				sync(false, dirs, data.init);
				inOpen = false;
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
				dir, node, tmp, realParent, reqParent, realSibling, reqSibling, isExpanded, isLoaded, parent, subdirs;
			
			while (l--) {
				dir = dirs[l];
				if ((node = $('#'+fm.navHash2Id(dir.hash))).length) {
					parent = node.parent();
					if (dir.phash) {
						realParent  = node.closest('.'+subtree);
						reqParent   = findSubtree(dir.phash);
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
			
			// fm.cwd() became empty object when cwd removed
			fm.cwd().hash && sync(true);
		})
		// remove dirs
		.remove(function(e) {
			var dirs = e.data.removed,
				l    = dirs.length,
				node, stree;
			
			while (l--) {
				if ((node = $('#'+fm.navHash2Id(dirs[l]))).length) {
					stree = node.closest('.'+subtree);
					node.parent().detach();
					if (!stree.children().length) {
						stree.hide().prev(selNavdir).removeClass(collapsed+' '+expanded+' '+loaded);
					}
				}
			}
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
				var dirs = filter(fm.files());
				
				prevSortTreeview = fm.sortAlsoTreeview;
				
				tree.empty();
				updateTree(dirs);
				sync();
			}
		});

	});
	
	return this;
};
