(function($) {
	
	$.fn.elfindertree = function(fm) {
		
		return this.each(function() {
			var subtree   = 'elfinder-nav-subtree',
				collapsed = 'elfinder-nav-collapsed',
				expanded  = 'elfinder-nav-expanded',
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
				build = function(dirs, root) {
					var dir, node, parent,
						html = [], i;
					
					if (fm.newAPI) {
						for (i = 0; i < dirs.length; i++) {
							dir    = dirs[i];
							node   = tree.find('#nav-'+dir.hash);
							
							if (!node.length) {
								(dir.phash ? tree.find('#nav-'+dir.phash).next('.'+subtree) : tree).append(item(dir, !dir.phash));
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
				append = function(dirs) {
					build(dirs, true);
					
					tree.find('.'+active).removeClass(active);
					dir = tree.find('#nav-'+fm.cwd().hash).addClass(active);

					if (fm.options.navOpenRoot && dir.length) {
						// show active root subdirs if required
						if (dir.is('.'+root)) {
							dir.next('.'+subtree).show();
							dir.children('.'+collapsed).addClass(expanded);
						} else if (e.data.params) {
							dir.parentsUntil('.elfinder-nav-tree').last().children('.'+root).next('.'+subtree).show();
						}
					}
					attachEvents();
				},
				draggable = $.extend({}, fm.ui.draggable, {
						addClasses : true,
						appendTo   : fm.ui.cwd,
						helper     : function() {
							// @TODO save permissions
							return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
								.data('files', [this.id.substr(4)])
								.data('src', $(this).parent('li').parent('ul').prev('a').attr('id').substr(4));
						}
					}),
				droppable = $.extend({}, fm.ui.droppable, {
					hoverClass : 'elfinder-droppable-active ui-state-hover'
				}),
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

						if (ul.children().length) {
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
				
			fm.bind('open', function(e) {
				if (e.data.tree) {
					tree.empty();
					// can help on really big tree
					setTimeout(function() {
						append(e.data.tree);
					}, 20);
				}
			})
			.bind('tree', function(e) {
				append(e.data.tree)
			})
			.bind('mkdir', function(e) {
				var dir = e.data.dir && e.data.dir.hash && e.data.dir.name ? e.data.dir : null,
					html, parent, nodes, arrow;
				
				if (dir) {
					html = item(dir);
					parent = tree.find('#nav-'+dir.phash);
					nodes = parent.next('ul').children();
					
					if (nodes.length) {
						
					} else if (parent.length) {
						if ((arrow = parent.children('.'+collapsed)).length == 0) {
							parent.prepend('<span class="elfinder-nav-collapsed"/>');
						}
					}
					
				}
					
			})
			.bind('rm', function(e) {
				var rm = e.data.removed || [],
					l = rm.length,
					element, parent, ul;
					
				while (l--) {
					element = tree.find('#nav-'+rm[l].hash);
					parent  = tree.find('#nav-'+rm[l].phash);
					ul = parent.next('.'+subtree);
					
					if (element.length) {
						element.parent().remove();
					}

					if (!ul.children().length) {
						parent.children('.'+collapsed).remove();
					}
				}
			})
			;
			
		});
	}
})(jQuery);