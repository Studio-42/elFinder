(function($) {
	
	$.fn.elfindertree = function(fm) {
		
		return this.each(function() {
			var subtree   = 'elfinder-nav-subtree',
				collapsed = 'elfinder-nav-collapsed',
				expanded  = 'elfinder-nav-expanded',
				loaded    = 'elfinder-subtree-loaded',
				empty     = 'elfinder-nav-empty',
				folder    = 'elfinder-nav-icon-folder',
				root      = 'elfinder-nav-tree-root',
				active    = 'ui-state-active',
				tpl       = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass">%arrow<span class="elfinder-nav-icon"/>%link %perms %name</a>%childs</li>',
				ul        = '<ul class="'+subtree+'">',
				item = function(dir, isroot) {
					var pclass    = fm.ui.perms2class(dir),
						perms     = pclass ? '<span class="elfinder-perms"/>' : '',
						hasChilds = fm.newAPI ? dir.childs : dir.dirs && dir.dirs.length,
						childs    = fm.newAPI ? ul + '</ul>' : (dir.dirs && dir.dirs.length ? build(dir.dirs) : ''), 
						arrow     = hasChilds ? '<span class="elfinder-nav-collapsed"/>' : '';
					
					if (dir && dir.name) {
						return tpl.replace('%id',    dir.hash)
							.replace('%pclass', pclass+(isroot ? ' '+root : ''))
							.replace('%arrow',  arrow)
							.replace('%perms',  perms)
							.replace('%link',   dir.link ? '<span class="elfinder-symlink"/>' : '')
							.replace('%name',   dir.name)
							.replace('%childs', childs)
					}
					return '';
				},
				/**
				 * Append new dirs to tree
				 *
				 * @params  Array|Object  dirs
				 * @params  Boolean       create root node? required by old api
				 * @return void
				 */
				build = function(dirs, root, added) {
					var dir, node, parent, stree, arrow,
						html = [], i;

					if (fm.newAPI) {
						for (i = 0; i < dirs.length; i++) {
							dir    = dirs[i];
							node   = tree.find('#nav-'+dir.hash);
							// parent = dir.phash ? tree.find('#nav-'+dir.phash).next('.'+subtree) : tree;
							if (dir.phash) {
								parent = tree.find('#nav-'+dir.phash);
								stree = parent.next('.'+subtree)
							} else {
								parent = stree = tree
							}
							arrow = parent.children('.'+collapsed);
							if (parent.length && !node.length) {
								if (!added) {
									// create/update tree in "open"/"tree"/"parents" commands
									stree.append(item(dir, !dir.phash));
									arrow.addClass(loaded);
								} else if (!arrow.length || arrow.is('.'+loaded)) {
									// add new dir in "mkdir"/"copy" commands
									node = $(item(dir, !dir.phash));
									stree.children().children('[id]').each(function() {
										var $this = $(this);

										if (dir.name < fm.file($this.attr('id').substr(4)).name) {
											$this.parent().before(node);
											return false;
										}
									});
									if (!node.parents().length) {
										stree.prepend(node);
									}
									if (!arrow.length) {
										parent.prepend('<span class="'+collapsed+' '+loaded+'"/>')
									}
								}
							} 
						}
					} else {
						if (root) {
							tree.find('a').remove();
							tree.html(item(dirs, true));
						} else {
							for (i = 0; i < dirs.length; i++) {
								html.push(item(dirs[i], root));
							}
							return ul + html.join('') + '</ul>';
						}
					}
				},
				
				append = function(dirs, root, added) {
					if (root) {
						tree.empty();
					}
					build(dirs, root, added);
					if (tree.children().length) {
						sync();
						attachEvents();
						
					}
					
				},
				sync = function() {
					tree.find('.'+active).removeClass(active);
					dir = tree.find('#nav-'+fm.cwd().hash).addClass(active);

					if (dir.is('.'+root)) {
						if (fm.options.alwaysOpenRoot) {
							dir.next('.'+subtree).show();
							dir.children('.'+collapsed).addClass(expanded);
						}
					} else if (fm.options.syncTree) {
						if (dir.length) {
							dir.parentsUntil('.elfinder-nav-tree').filter('.'+subtree).show().prev('a').children('.'+collapsed).addClass(expanded);
						} else {
							fm.ajax({cmd : 'parents', target : fm.cwd().hash}, 'silent');
						}
					}
				},
				draggable = $.extend({}, fm.ui.draggable, {
						helper : function() {
							return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
								.data('files', [this.id.substr(4)])
								.data('src', $(this).parent('li').parent('ul').prev('a').attr('id').substr(4));
						}
					}),
				droppable = $.extend({}, fm.ui.droppable, {
					hoverClass : 'elfinder-droppable-active ui-state-hover'
				}),
				
				/**
				 * Attach droppable events
				 *
				 * @return void
				 */
				attachEvents = function() {
					tree.find('a')
						.not('.ui-droppable,.elfinder-na,.elfinder-ro')
						.droppable(droppable);
				},
				tree = $(this).addClass('elfinder-nav-tree')
					.delegate('a', 'hover', function(e) {
						var $this = $(this), 
							enter = e.type == 'mouseenter';
						
						$this.toggleClass('ui-state-hover', enter);
						if (enter && !$this.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo')) {
							$this.draggable(draggable);
						}
					})
					.delegate('a', 'click', function(e) {
						var dir = $(this),
							id  = this.id.substr(4);

						e.preventDefault();
						
						if (id == fm.cwd().hash) {
							// already current dir - toggle subdirs
							dir.children('.'+collapsed).click();
						} else if (dir.is('.elfinder-na,.elfinder-wo')) {
							// not readable dir
							fm.trigger('error', {error : [['The folder "$1" can’t be opened because you don’t have permission to see its contents.', $.trim(dir.text())]]});
						} else {
							// change dir
							fm.open(id);
						}
					})
					.delegate('.'+collapsed, 'click', function(e) {
						// click on arrow - toggle subdirs
						var $this = $(this),
							parent = $this.parent(),
							ul    = parent.next('.'+subtree),
							spinner, opts;
							
						e.stopPropagation();
						e.preventDefault();

						if ($this.is('.'+loaded)/*ul.children().length*/) {
							ul.slideToggle();
							$this.toggleClass(expanded);
						} else if (fm.newAPI) {
							spinner = $('<span class="elfinder-spinner-mini"/>');
							fm.ajax({
								data : {cmd : 'tree', target : parent.attr('id').substr(4)},
								beforeSend : function() {
									$this.before(spinner).hide();
								},
								complete : function() {
									spinner.remove();
									if (ul.children().length) {
										ul.slideToggle();
										$this.show().toggleClass(expanded);
									} else {
										$this.remove();
									}
								}
							}, 'silent');
						}
					})
				;
			
			// [re]create tree
			fm.bind('open', function(e) {
				if (e.data.tree) {
					// fm.log(e.data.tree)
					// can help on really big tree
					setTimeout(function() {

						append(e.data.tree, true);
						// attachEvents();
						// sync();
					}, 20);
				} else {
					sync();
				}
			})
			// update tree
			.bind('tree parents', function(e) {
				append(e.data.tree);
				// sync();
				// attachEvents();
			})
			// add new dirs in tree
			.bind('added', function(e) {
				append($.map(e.data.added, function(f) { return f.mime == 'directory' ? f : null}), false, true);
				
			})
			// remove dirs from tree
			.bind('removed', function(e) {
				var rm = e.data.removed,
					l = rm.length,
					node, parent, stree;
					
				while (l--) {
					if (rm[l].mime == 'directory') {
						node   = tree.find('#nav-'+rm[l].hash);
						parent = tree.find('#nav-'+rm[l].phash);
						
						if (node.length && parent.length) {
							node.parent().remove();
							stree = parent.next('.'+subtree);
							if (!stree.children().length) {
								stree.hide();
								parent.children('.'+collapsed).remove();
							}
						}
					}
				}
			})
			
			;
			
		});
	}
})(jQuery);