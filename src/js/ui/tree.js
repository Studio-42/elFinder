(function($) {
	
$.fn.elfindertree = function(fm) {
	
	this.not('.elfinder-navbar-tree').each(function() {
		$(this).parent().find('.elfinder-navbar').append(this).show();
		
		var 
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = 'elfinder-navbar-tree-root',
			
			/**
			 * Subtree class name
			 *
			 * @type String
			 */
			subtree   = 'elfinder-navbar-subtree',
			
			/**
			 * Directory class name
			 *
			 * @type String
			 */
			navdir    = 'elfinder-navbar-dir',
			
			/**
			 * Collapsed arrow class name
			 *
			 * @type String
			 */
			collapsed = 'elfinder-navbar-collapsed',
			
			/**
			 * Expanded arrow class name
			 *
			 * @type String
			 */
			expanded  = 'elfinder-navbar-expanded',
			
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
			arrow = 'elfinder-navbar-arrow',
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = 'ui-state-active',
			
			/**
			 * Droppable dirs dropover class
			 *
			 * @type String
			 */
			dropover = 'elfinder-droppable-active',
			
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = 'ui-state-hover',
			
			/**
			 * Droppable options
			 *
			 * @type Object
			 */
			droppable = $.extend({}, fm.droppable, {hoverClass : hover+' '+dropover}),
			
			/**
			 * Directory html template
			 *
			 * @type String
			 */
			template = '<div class="elfinder-navbar-dir-wrapper"><span id="{id}" class="ui-corner-all '+navdir+' {cssclass}"><span class="'+arrow+'"/><span class="elfinder-nav-icon"/>{symlink}{permissions}{name}</span> <div class="elfinder-navbar-subtree"></div></div>',
			
			/**
			 * Html template replacement methods
			 *
			 * @type Object
			 */
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash) },
				cssclass    : function(dir) { return (dir.phash ? '' : root)+' '+fm.perms2class(dir)+' '+(dir.dirs ? collapsed : ''); },
				permissions : function(dir) { return !dir.read || !dir.write ? '<span class="elfinder-perms"/>' : ''; },
				symlink     : function(dir) { return dir.link ? '<span class="elfinder-symlink"/>' : ''; }
			},
			
			/**
			 * Return html for given dir
			 *
			 * @param  Object  directory
			 * @return String
			 */
			itemhtml = function(dir) {
				dir.name = fm.escape(dir.name);
				
				return template.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					return dir[key] || (replace[key] ? replace[key](dir) : '');
				});
			},
			
			/**
			 * Return only dirs from files list
			 *
			 * @param  Array  files list
			 * @return Array
			 */
			filter = function(files) {
				return $.map(files, function(f) { return f.mime == 'directory' ? f : null });
			},
			
			/**
			 * Find parent subtree for required directory
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findSubtree = function(hash) {
				return hash ? tree.find('#'+fm.navHash2Id(hash)).next('.'+subtree) : tree;
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
					if ((info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')))) 
					&& dir.name.localeCompare(info.name) < 0) {
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

					if (tree.find('#'+fm.navHash2Id(dir.hash)).length) {
						continue;
					}
					
					if ((parent = findSubtree(dir.phash)).length) {
						html = itemhtml(dir);
						if (dir.phash && (sibling = findSibling(parent, dir)).length) {
							sibling.before(html);
						} else {
							parent.append(html);
						}
					} else {
						orphans.push(dir);
					}
				}

				if (orphans.length && orphans.length < length) {
					return updateTree(orphans);
				} 

				updateDroppable();
			},
			
			/**
			 * Make writable and not root dirs droppable
			 *
			 * @return void
			 */
			updateDroppable = function() {
				tree.find('[id]:not(.ui-droppable,.elfinder-ro,.elfinder-na)').droppable(droppable);
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
					tree.find('#'+fm.navHash2Id(dir.phash)+sel)
						.filter(function() { return $(this).nextAll('.'+subtree+':first').children().length > 0 })
						.addClass(cls);
				})
			},
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass('elfinder-navbar-tree')
				// make dirs draggable and toggle hover class
				.delegate('.'+navdir, 'hover', function(e) {
					var link  = $(this), 
						enter = e.type == 'mouseenter';
					
					if (!link.is('.'+dropover)) {
						enter && !link.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo') && link.draggable(fm.draggable);
						link.toggleClass(hover, enter);
					}
				})
				// add/remove dropover css class
				.delegate('.'+navdir, 'dropover dropout drop', function(e) {
					$(this)[e.type == 'dropover' ? 'addClass' : 'removeClass'](dropover+' '+hover);
				})
				// open dir or open subfolders in tree
				.delegate('.'+navdir, 'click', function(e) {
					var link = $(this),
						hash = fm.navId2Hash(link.attr('id'));
				
					if (hash != fm.cwd().hash) {
						fm.exec('open', hash);
					} else if (link.is('.'+collapsed)) {
						link.children('.'+arrow).click();
					}
				})
				// toggle subfolders in tree
				.delegate('.'+navdir+'.'+collapsed+' .'+arrow, 'click', function(e) {
					var arrow = $(this),
						link  = arrow.parent('.'+navdir),
						stree = link.next('.'+subtree),
						spin;

					e.stopPropagation();

					if (link.is('.'+loaded)) {
						link.toggleClass(expanded);
						stree.slideToggle()
					} else {
						spin = $('<span class="elfinder-navbar-spinner"/>').insertBefore(arrow.hide());
						fm.ajax({cmd : 'tree', target : fm.navId2Hash(link.attr('id'))})
							.fail(function() { link.removeClass(collapsed); })
							.done(function(data) { 
								updateTree(filter(data.tree)); 
								
								if (stree.children().length) {
									link.addClass(expanded);
									stree.slideDown();
								} else {
									link.removeClass(collapsed);
								}
							})
							.always(function(data) {
								spin.remove();
								link.addClass(loaded);
								arrow.show();
							});
					}
				})
				
			;
		
		
		fm.open(function(e) {
			var data = e.data,
				init = data.init, 
				dirs = filter(data.files);

			if (init) {
				openRoot = fm.options.openRootOnLoad;
				tree.empty();
			}

			if (dirs.length) {
				updateTree(dirs);
				updateArrows(dirs, loaded);
			}
			
		})
	});
	
	return this;
}
	
})(jQuery);