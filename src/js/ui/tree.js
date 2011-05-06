(function($) {

$.fn.elfindertree = function(fm, opts) {

	return this.each(function() {

		var 
			opts = opts || {},
			template = opts.template || $.fn.elfindertree.defaults.template,
			
			replace = $.extend({}, $.fn.elfindertree.defaults.replace, opts.replace),
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
			
			arrow = 'elfinder-nav-arrow',
			
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			// root      = 'elfinder-nav-tree-root',
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = 'ui-state-active',
			
			/**
			 * Open current dir root on init
			 *
			 * @type Boolean
			 */
			openRoot = fm.options.openRootOnLoad,
			
			/**
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @return void
			 */
			sync = function() {
				var current = tree.find('#nav-'+fm.cwd().hash);
				
				if (openRoot) {
					tree.find('#nav-'+fm.root()).addClass(expanded).nextAll('.'+subtree).show();
					openRoot = false;
				}
				
				tree.find('[id].'+active).removeClass(active);
				current.addClass(active);
				
				if (fm.options.syncTree) {
					current.length
						? current.parentsUntil('.elfinder-nav-tree').filter('.'+subtree).show().prevAll('[id]:first').addClass(expanded)
						: fm.ajax({cmd : 'parents', target : fm.cwd().hash}, 'silent');
				}
			},
			
			/**
			 * Draggable options
			 *
			 * @type Object
			 */
			draggable = $.extend({}, fm.draggable, {
					helper : function() {
						return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
							.data('files', [this.id.substr(4)])
							.data('src', $(this).parent('li').parent('ul').prev('a').attr('id').substr(4));
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
			
			id = function(dir) {
				return ''+dir.attr('id').substr(4);
			},
			
			normalizeTree = function(tree) {
			
				return [];
			},
			
			/**
			 * Find directory in tree by hash
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findDir = function(hash) {
				return hash ? tree.find('#nav-'+hash).nextAll('.'+subtree+':first') : tree
			},
			
			/**
			 * Find directory in required node
			 * before which we can insert new directory
			 *
			 * @param  jQuery  parent directory
			 * @param  Object  new directory
			 * @return jQuery
			 */
			findChild = function(parent, dir) {
				var node = parent.children(':first'),
					info;

				while (node.length) {
					info = fm.file((''+node.children('[id]:first').attr('id')).substr(4));
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

				
				for (i = 0; i < length; i++) {
					dir = dirs[i];
					
					if (!dir.hash || !dir.name || dir.mime != 'directory' || tree.find('#nav-'+dir.hash).length) {
						continue;
					}
					
					if ((parent = findDir(dir.phash)).length) {

						html = template.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
							if (dir[key]) {
								return dir[key];
							} else if (replace[key]) {
								return replace[key](dir, fm)
							}
							return '';
						});
						
						(sibling = findChild(parent, dir)).length ? sibling.before(html) : parent.append(html);
					} else {
						orphans.push(dir);
					}
				}

				if (orphans.length && orphans.length < length) {
					return updateTree(orphans);
				} 

				tree.find('[id].'+collapsed+':not(.'+loaded+')')
					.filter(function() { return $(this).nextAll('.'+subtree+':first').children().length > 0 })
					.addClass(loaded);

				sync();
			},
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass('elfinder-nav-tree')
				.delegate('a', 'mouseenter', function() {
					$(this).addClass('ui-state-hover')
				})
				.delegate('a', 'mouseleave', function() {
					$(this).removeClass('ui-state-hover')
					
				})
				// .delegate('a', 'hover', function(e) {
				// 	var $this = $(this), 
				// 		enter = e.type == 'mouseenter';
				// 	
				// 	$this.toggleClass('ui-state-hover', enter);
				// 	if (enter && !$this.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo')) {
				// 		$this.draggable(draggable);
				// 	}
				// })
				.delegate('a', 'click', function(e) {
					var link = $(this),
						hash = id(link);

					e.preventDefault();
					
					if (hash != fm.cwd().hash) {
						fm.openDir(hash)
					} else if (link.is('.'+collapsed)) {
						link.find('.'+arrow).click()
					}
				})
				.delegate('a.'+collapsed+' .'+arrow, 'click', function(e) {
					var arrow = $(this),
						link  = arrow.parents('[id]:first'),
						stree = link.nextAll('.'+subtree),
						spin;
					
					e.stopPropagation();
					e.preventDefault();

					if (link.is('.'+loaded)) {
						link.toggleClass(expanded);
						stree.slideToggle()
					} else {
						spin = $('<span class="elfinder-spinner-mini"/>').insertAfter(arrow);
						fm.ajax({cmd : 'tree', target : id(link)}, 'silent')
							.always(function() {
								spin.remove();
								link.addClass(loaded)
								if (stree.children().length) {
									link.addClass(collapsed+' '+expanded);
									stree.slideDown();
								} 
							});
					}
				});
		
		
		// bind events
		fm
			// update tree
			.bind('open', function(e) {
				updateTree(fm.newAPI ? e.data.files : normalizeTree(e.data.tree))
				// fm.log('open')
				// proccess(e)
				// setTimeout(function() { proccess(e) }, 20)
			})
			.bind('tree', function(e) {
				fm.log(e.data)
				updateTree(e.data.tree)
			})
			// .bind('tree parents added', proccess)
			// remove dirs from tree
			.bind('removed', function(e) {
				var rm = e.data.removed,
					l = rm.length,
					node, parent, stree;
				
				while (l--) {
					if ((node = tree.find('#nav-'+rm[l])).length) {
						parent = node.parents('ul:first').prev();
						node.parent().remove();
						stree = parent.next('.'+subtree);
						if (!stree.children().length) {
							stree.hide();
							parent.children('.'+collapsed).remove();
						}
					}
				}
			});
		
	});
}

$.fn.elfindertree.defaults = {
	template : '<li><a href="#" id="nav-{hash}" class="ui-corner-all {cssclass}"><span class="elfinder-nav-arrow"/><span class="elfinder-nav-icon"/>{symlink}{permissions} {name}</a><ul class="elfinder-nav-subtree"/></li>',
	replace : {
		cssclass    : function(dir, fm) { return (dir.phash ? '' : 'elfinder-nav-tree-root')+' '+fm.perms2class(dir)+' '+(dir.dirs ? 'elfinder-nav-collapsed' : ''); },
		permissions : function(dir, fm) { return !dir.read || !dir.write ? '<span class="elfinder-perms"/>' : ''; },
		symlink     : function(dir, fm) { return dir.link ? '<span class="elfinder-symlink"/>' : ''; }
	}
}

})(jQuery);