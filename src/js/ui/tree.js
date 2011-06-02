(function($) {
	
$.fn.elfindertree2 = function(fm) {
	
	this.not('.elfinder-nav-tree').each(function() {
		$(this).parent().find('.elfinder-navbar').append(this).show();
		
		var 
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = 'elfinder-nav-tree-root',
			
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
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = 'ui-state-active',
			
			dropover = 'elfinder-droppable-active',
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = 'ui-state-hover',
			
			droppable = $.extend({}, fm.droppable, {hoverClass : hover+' '+dropover}),
			
			template = '<div><a href="#" id="{id}" class="ui-corner-all {cssclass}"><span class="elfinder-nav-arrow"/><span class="elfinder-nav-icon"/>{symlink}{permissions} {name}</a><div class="elfinder-nav-subtree"/></div>',
			
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash) },
				cssclass    : function(dir) { return (dir.phash ? '' : root)+' '+fm.perms2class(dir)+' '+(dir.dirs ? collapsed+' '+loaded : ''); },
				permissions : function(dir) { return !dir.read || !dir.write ? '<span class="elfinder-perms"/>' : ''; },
				symlink     : function(dir) { return dir.link ? '<span class="elfinder-symlink"/>' : ''; }
			},
			
			itemhtml = function(dir) {
				dir.name = fm.escape(dir.name);
				
				return template.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					return dir[key] || (replace[key] ? replace[key](dir) : '');
				});
			},
			
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
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass('elfinder-nav-tree')
				// make dirs draggable and toggle hover class
				.delegate('a', 'hover', function(e) {
					var link  = $(this), 
						enter = e.type == 'mouseenter';
					
					if (!link.is('.'+dropover)) {
						enter && !link.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo') && link.draggable(fm.draggable);
						link.toggleClass(hover, enter);
					}
				})
				// add/remove dropover css class
				.delegate('a', 'dropover ropout drop', function(e) {
					$(this)[e.type == 'dropover' ? 'addClass' : 'removeClass'](dropover+' '+hover);
				})
			;
		
		
		fm.open(function(e) {
			var data = e.data,
				init = data.init, 
				dirs = filter(data.files);
			fm.log(e.data)
			if (dirs.length) {
				updateTree(dirs)
			}
		})
	});
	
	return this;
}
	
})(jQuery);