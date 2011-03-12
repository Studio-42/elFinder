(function($) {
	
	$.fn.elfindertree = function(fm) {
		
		return this.each(function() {
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
				 * Directory html template
				 *
				 * @type String
				 */
				tpl       = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass">%arrow<span class="elfinder-nav-icon"/>%link %perms %name</a>%childs</li>',
				
				/**
				 * Subtree html
				 *
				 * @type String
				 */
				ul        = '<ul class="'+subtree+'">',
				
				/**
				 * Arrow html
				 *
				 * @type String
				 */
				arrow     = '<span class="elfinder-nav-collapsed"/>' 
				
				/**
				 * Return html for directory to insert in tree
				 *
				 * @param  Object   directory
				 * @param  Boolean  is it root directory?
				 * @return String
				 */
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
				create = function(dirs, isroot) {
					var html= [], i;
					
					
					if (isroot) {
						tree.find('a').remove();
						tree.html(item(dirs, true));
					} else {
						for (i = 0; i < dirs.length; i++) {
							html.push(item(dirs[i]));
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
					var d = false;
					
					if (fm.newAPI) {
						e.data.api && tree.empty();
						update($.map(e.data.files || e.data.tree || e.data.added || [], function(f) { return f.mime == 'directory' ? f : null }), e.data.api);
						d = true;
					} else if (e.data.tree) {
						create(e.data.tree, true);
						d = true;
					}
					sync();
					d && tree.find('a').not('.ui-droppable,.elfinder-na,.elfinder-ro').droppable(droppable);
				},
				
				/**
				 * Draggable options
				 *
				 * @type Object
				 */
				draggable = $.extend({}, fm.ui.draggable, {
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
				droppable = $.extend({}, fm.ui.droppable, {
					hoverClass : 'elfinder-droppable-active ui-state-hover'
				}),
				
				/**
				 * Navigation tree
				 *
				 * @type JQuery
				 */
				tree = $(this).addClass('elfinder-nav-tree')
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

						if ($this.is('.'+loaded)) {
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
					});
			
			// bind events
			fm.bind('load', function(e) {
				if (fm.oldAPI) {
					arrow = '<span class="elfinder-nav-collapsed '+loaded+'"/>' ;
				} else {
					tree.delegate('a', 'hover', function(e) {
						var $this = $(this), 
							enter = e.type == 'mouseenter';
						
						$this.toggleClass('ui-state-hover', enter);
						if (enter && !$this.is('.'+root+',.ui-draggable,.elfinder-na,.elfinder-wo')) {
							$this.draggable(draggable);
						}
					});
				}
			})
				// update tree
				.bind('open', function(e) {
					setTimeout(function() { proccess(e) }, 20)
				})
				.bind('tree parents added', proccess)
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
})(jQuery);