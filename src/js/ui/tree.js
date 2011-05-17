(function($) {

$.fn.elfindertree = function(fm) {

	this.not('.elfinder-nav-tree').each(function() {
		$(this).parent().find('.elfinder-nav').append(this).show();
		var 
			/**
			 * Subtree class name
			 *
			 * @type String
			 */
			subtree   = 'elfinder-nav-subtree',
			
			/**
			 * Collapsed arrow class name
			 *
			 * @type String
			 */
			collapsed = 'elfinder-nav-collapsed',
			
			/**
			 * Expanded arrow class name
			 *
			 * @type String
			 */
			expanded  = 'elfinder-nav-expanded',
			
			/**
			 * Class name to mark arrow for directory with already loaded children
			 *
			 * @type String
			 */
			loaded    = 'elfinder-subtree-loaded',
			
			/**
			 * Arraw class name
			 *
			 * @type String
			 */
			arrow = 'elfinder-nav-arrow',
			
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = 'elfinder-nav-tree-root',
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = 'ui-state-active',
			
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = 'ui-state-hover',
			
			// ro = 'elfinder-ro',
			// 
			// wo = 'elfinder-wo',
			// 
			// na = 'elfinder-na',
			
			/**
			 * Open current dir root on init
			 *
			 * @type Boolean
			 */
			openRoot = fm.options.openRootOnLoad,
			
			/**
			 * Draggable options
			 *
			 * @type Object
			 */
			draggable = $.extend({}, fm.draggable, {
					helper : function() {
						var link  = $(this),
							hash  = dirHash(link),
							phash = fm.file(hash).phash;
						
						return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
							.data('files', [hash])
							.data('src', phash);
					}
				}),
				
			/**
			 * Droppable options
			 *
			 * @type Object
			 */
			droppable = $.extend({}, fm.droppable, {
				hoverClass : 'elfinder-droppable-active ui-state-hover'
			}),
			
			/**
			 * Fetch dir hash from node's id attribute.
			 *
			 * @param  jQuery  dir node
			 * @return String
			 */
			dirHash = function(node) {
				return (''+node.attr('id')).substr(4);
			},
			
			/**
			 * Convert dir hash into id attribute.
			 *
			 * @param  String  dir hash
			 * @return String
			 */
			hash2id = function(hash) {
				return 'nav-'+hash;
			},
			
			
			templates = {
				wrap : '<li>{item}<ul class="elfinder-nav-subtree"/></li>',
				item : '<a href="#" id="{id}" class="ui-corner-all {cssclass}"><span class="elfinder-nav-arrow"/><span class="elfinder-nav-icon"/>{symlink}{permissions} {name}</a>' 
			},
			
			replace = {
				id          : function(dir, fm) { return hash2id(dir.hash) },
				cssclass    : function(dir, fm) { return (dir.phash ? '' : 'elfinder-nav-tree-root')+' '+fm.perms2class(dir)+' '+(dir.dirs ? 'elfinder-nav-collapsed' : ''); },
				permissions : function(dir, fm) { return !dir.read || !dir.write ? '<span class="elfinder-perms"/>' : ''; },
				symlink     : function(dir, fm) { return dir.link ? '<span class="elfinder-symlink"/>' : ''; }
			},
			
			itemhtml = function(dir, ignoreWrap) {
				var item;
				
				dir.name = fm.escape(dir.name);
				
				item = templates.item.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					if (dir[key]) {
						return dir[key];
					} else if (replace[key]) {
						return replace[key](dir, fm)
					}
					return '';
				});
				
				return ignoreWrap ? item : templates.wrap.replace(/\{item\}/, item);
			},
			
			filter = function(files) {
				return $.map(files, function(f) { return f.mime == 'directory' ? f : null });
			},
			
			
			/**
			 * Convert old api tree into plain array of dirs
			 *
			 * @param  Object  root dir
			 * @return Array
			 */
			normalizeTree = function(root) {
				var result   = [],
					traverse = function(dirs, phash) {
						var i, dir;
						
						for (i = 0; i < dirs.length; i++) {
							dir = dirs[i];
							
							result.push({
								mime  : 'directory',
								hash  : dir.hash,
								phash : phash,
								name  : dir.name,
								read  : dir.read,
								write : dir.write,
								dirs  : !!dir.dirs.length
							})
							dir.dirs.length && traverse(dir.dirs, dir.hash);
						}
					};

				traverse([root]);

				return result;
			},
			
			/**
			 * Find subtree for required directory
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findSubtree = function(hash) {
				return hash ? tree.find('#'+hash2id(hash)).next('.'+subtree) : tree;
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
					info = fm.file(dirHash(node.children('[id]')));
					if (info && dir.name.localeCompare(info.name) < 0) {
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
					i, dir, html, parent, sibling;
				// fm.time('tree')
				for (i = 0; i < length; i++) {
					dir = dirs[i];
					
					if (tree.find('#'+hash2id(dir.hash)).length) {
						continue;
					}
					
					if ((parent = findSubtree(dir.phash)).length) {
						html = itemhtml(dir);
						(sibling = findSibling(parent, dir)).length ? sibling.before(html) : parent.append(html);
					} else {
						orphans.push(dir);
					}
				}

				if (orphans.length && orphans.length < length) {
					return updateTree(orphans);
				} 

				updateDroppable();
				// fm.timeEnd('tree')

			},
			
			updateDroppable = function() {
				tree.find('[id]:not(.'+root+',.ui-droppable,.elfinder-ro,.elfinder-na)').droppable(droppable);
			},
			
			/**
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @return void
			 */
			sync = function() {
				var cwd     = fm.cwd().hash,
					current = tree.find('#'+hash2id(cwd)), 
					rootNode;
				
				// fm.log(cwd)
				
				if (openRoot) {
					rootNode = tree.find('#'+hash2id(fm.root()));
					rootNode.is('.'+loaded) && rootNode.addClass(expanded).next('.'+subtree).show();
					openRoot = false;
				}
				
				if (!current.is('.'+active)) {
					tree.find('[id].'+active).removeClass(active);
					current.addClass(active);
				}
				
				if (fm.options.syncTree) {
					if (current.length) {
						current.parentsUntil('.elfinder-nav-tree').filter('.'+subtree).show().prevAll('[id]:first').addClass(expanded);
					} else if (fm.newAPI) {
						fm.ajax({
							data : {cmd : 'parents', target : cwd},
							preventFail : true
						})
							.done(function(data) {
								updateTree(filter(data.tree));
								cwd == fm.cwd().hash && sync();
							});
					}
				}
			},
			
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass('elfinder-nav-tree')
				.delegate('a', 'mouseenter', function() {
					var link = $(this);
					link.addClass(hover);
					!link.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo') && link.draggable(draggable);
				})
				.delegate('a', 'mouseleave', function() {
					$(this).removeClass(hover);
					
				})
				.delegate('a', 'click', function(e) {
					var link = $(this),
						hash = dirHash(link);

					e.preventDefault();

					if (hash != fm.cwd().hash) {
						fm.exec('open', hash);
					} else if (link.is('.'+collapsed)) {
						link.find('.'+arrow).click();
					}
				})
				.delegate('a.'+collapsed+' .'+arrow, 'click', function(e) {
					var arrow = $(this),
						link  = arrow.parents('[id]:first'),
						stree = link.next('.'+subtree),
						spin;
					
					e.stopPropagation();
					e.preventDefault();

					if (link.is('.'+loaded)) {
						link.toggleClass(expanded);
						stree.slideToggle()
					} else {
						spin = $('<span class="elfinder-spinner-mini"/>').insertAfter(arrow);
						fm.ajax({cmd : 'tree', target : dirHash(link)})
							.fail(function() { link.removeClass(collapsed); })
							.done(function(data) { updateTree(filter(data.tree)); })
							.always(function(data) {
								spin.remove();
								link.addClass(loaded);
								if (stree.children().length) {
									link.addClass(collapsed+' '+expanded);
									stree.slideDown();
								} else {
									link.removeClass(collapsed);
								}
							});
					}
				});
		
		// bind events handlers
		fm
			// create/update tree
			.open(function(e) {
				var data = e.data,
					init = !tree.children().length, 
					dirs = filter(data.files);


				if (dirs.length) {

					// setTimeout(function() {
						updateTree(dirs);
					
						init && tree.find('[id].'+collapsed+':not(.'+loaded+')')
								.filter(function() { return $(this).nextAll('.'+subtree+':first').children().length > 0 })
								.addClass(loaded);
						sync();
					// }, 10);
				} else {
					sync();
				}
			})
			// add new dirs
			.add(function(e) {
				var dirs = filter(e.data.added || []);

				if (dirs.length) {
					updateTree(dirs);
					// add arrows to parent dirs
					$.each(dirs, function(dir) {
						tree.find('#'+hash2id(dir.phash)).not('.'+collapsed).addClass(collapsed);
					});
				}
			})
			// update changed dirs
			.change(function(e) {
				var dirs = filter(e.data.changed || []),
					l = dirs.length,
					dir, node, realParent, reqParent, realSibling, reqSibling, isExpanded, isLoaded;
				
				while (l--) {
					dir = dirs[l];
					if ((node = tree.find('#'+hash2id(dir.hash))).length) {
						if (dir.phash) {
							realParent  = node.parents('.'+subtree+':first');
							reqParent   = findSubtree(dir.phash);
							realSibling = node.parent().next()
							reqSibling  = findSibling(reqParent, dir)
							
							if (!reqParent.length) {
								continue;
							}
							
							if (reqParent[0] !== realParent[0] || realSibling.get(0) !== reqSibling.get(0)) {
								reqSibling.length ? reqSibling.before(node) : reqParent.append(node);
							}
						}
						
						isExpanded = node.is('.'+expanded);
						isLoaded   = node.is('.'+loaded);
						node.replaceWith(itemhtml(dir, true));
						
						if (dir.dirs 
						&& (isExpanded || isLoaded) 
						&& (node = tree.find('#'+hash2id(dir.hash))) 
						&& node.next('.'+subtree).children().length) {
							isExpanded && node.addClass(expanded);
							isLoaded && node.addClass(loaded);
						}
					}
				}

				sync();
				updateDroppable();
			})
			// remove dirs
			.remove(function(e) {
				var hashes = e.data.removed || [],
					l  = hashes.length,
					node, parent, stree;
				
				while (l--) {
					if ((node = tree.find('#'+hash2id(hashes[l]))).length) {
						parent = node.parents('.'+subtree).prev('[id]');
						stree  = parent.next('.'+subtree);
						node.parent().remove();
						if (!stree.children().length) {
							stree.hide();
							parent.removeClass(collapsed);
						}
					}
				}
			})
		
		
	});
	
	return this;
}


})(jQuery);