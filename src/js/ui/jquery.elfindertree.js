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
				arrow     = '<span class="elfinder-nav-collapsed"/>' 
				item = function(dir, isroot) {
					var pclass = fm.ui.perms2class(dir),
						childs = fm.newAPI ? dir.childs : dir.dirs && dir.dirs.length;
					
					if (dir && dir.name) {
						return tpl.replace('%id', dir.hash)
							.replace('%pclass', pclass + (isroot ? ' '+root : ''))
							.replace('%arrow',  childs ? arrow : '')
							.replace('%perms',  pclass ? '<span class="elfinder-perms"/>' : '')
							.replace('%link',   dir.link ? '<span class="elfinder-symlink"/>' : '')
							.replace('%name',   dir.name)
							.replace('%childs', fm.newAPI ? ul + '</ul>' : (childs ? create(dir.dirs) : ''))
					}
					return '';
				},
				/**
				 * Create tree content
				 * Only for old api
				 *
				 * @param  Object   directory
				 * @param  Boolean  is it root directory?
				 * @return void
				 */
				create = function(dirs, root) {
					var html= [], i;
					
					
					if (root) {
						tree.find('a').remove();
						tree.html(item(dirs, true));
					} else {
						for (i = 0; i < dirs.length; i++) {
							html.push(item(dirs[i], root));
						}
						return ul + html.join('') + '</ul>';
					}
				},
				
				/**
				 * Update tree content
				 * Only for new api
				 *
				 * @param  Array    directories list
				 * @param  Boolean  add class "elfinder-nav-loaded" to arrows?
				 * @return void
				 */
				update = function(dirs, addclass) {
					var i, dir,
						find = function(hash) {
							return tree.find('#nav-'+hash);
						},
						append = function(dir) {
							var node = find(dir.hash),
								parent, stree, arr, curr,
								parents = function(hash) {
									var ret = [], d;
									
									while (hash && (d = fm.file(hash))) {
										if (find(hash).length) {
											break;
										}
										ret.unshift(d);
										hash = d.phash;
									}
									return ret;
								};
								
							if (!node.length) {
								parent = find(dir.phash);
								
								if (!parent.length) {
									$.each(parents(dir.phash), function(i, dir) {
										append(dir);
									})
									if (!(parent = find(dir.phash)).length) {
										return;
									}
								}
								
								node  = $(item(dir))
								stree = parent.next('.'+subtree);
								arr   = parent.children('.'+collapsed);
								curr  = stree.children(':first');

								find: {
									do {
										if (curr.length && dir.name.localeCompare($.trim(curr.children('[id]:first').text())) < 0) {
											node.insertBefore(curr);
											break find;
										}
									}
									while (curr.length && (curr = curr.next()).length);

									stree.append(node);
								}

								if (!arr.length) {
									arr = $(arrow);
									parent.prepend(arr);
								}

								addclass && arr.addClass(loaded);
							}
						};
					
					
					$.each($.map(dirs, function(d, i) { return !d.phash ? d : null }), function(i, root) {
						if (!find(root.hash).length)
						tree.append(item(root, true));
					});
					
					for (i = 0; i < dirs.length; i++) {
						dirs[i].phash && append(dirs[i]);
					}
					
				},
				
				/**
				 * Mark current directory as active
				 * If current directory is not in tree - load it and its parents
				 *
				 * @return void
				 */
				sync = function() {
					var dir;
					
					tree.find('.'+active).removeClass(active);
					dir = tree.find('#nav-'+fm.cwd().hash).addClass(active);

					if (dir.is('.'+root) && fm.options.alwaysOpenRoot) {
						dir.next('.'+subtree).show();
						dir.children('.'+collapsed).addClass(expanded);
					} else if (fm.options.syncTree) {
						dir.length
							? dir.parentsUntil('.elfinder-nav-tree').filter('.'+subtree).show().prev('a').children('.'+collapsed).addClass(expanded)
							: fm.ajax({cmd : 'parents', target : fm.cwd().hash}, 'silent');
					}
				},
				
				/**
				 * Update tree content based on api version, sync dir and attach droppable event
				 *
				 * @param  jQuery.Event  event
				 * @return void
				 */
				proccess = function(e) {
					var src = fm.newAPI 
							? $.map(e.data.files || e.data.tree || [], function(f) { return f.mime == 'directory' ? f : null })
							: e.data.tree;
					
					setTimeout(function() {
						(fm.oldAPI || e.data.api) && tree.empty();
						fm.newAPI ? update(src, e.data.api) : create(src, true);
						sync();
						tree.find('a')
							.not('.ui-droppable,.elfinder-na,.elfinder-ro')
							.droppable(droppable);
					}, 20)		
					
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
			fm.bind('load', function(e) {
				if (fm.oldAPI) {
					arrow = '<span class="elfinder-nav-collapsed '+loaded+'"/>' ;
				}
			})
			.bind('open tree parents', proccess)
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