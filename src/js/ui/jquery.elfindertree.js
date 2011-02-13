(function($) {
	
	$.fn.elfindertree = function(fm) {
		
		return this.each(function() {
			var newAPI    = false,
				subtree   = 'elfinder-nav-subtree',
				collapsed = 'elfinder-nav-collapsed',
				expanded  = 'elfinder-nav-expanded',
				empty     = 'elfinder-nav-empty',
				folder    = 'elfinder-nav-icon-folder',
				root      = 'elfinder-nav-tree-root',
				active    = 'ui-state-active',
				tpl       = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass"><span class="%arrow"/><span class="elfinder-nav-icon"/>%link %perms %name</a>%childs</li>',
				ul        = '<ul class="'+subtree+'">',
				item = function(o, isroot) {
					var pclass    = fm.ui.perms2class(o),
						perms     = pclass ? '<span class="elfinder-perms"/>' : '',
						hasChilds = newAPI ? o.childs : o.dirs && o.dirs.length,
						childs    = hasChilds ? newAPI ? ul + '</ul>' : build(o.dirs) : '' ,
						arrow     = hasChilds ? collapsed : empty;
					// @TODO add link icon
					fm.log(o.link)
					return o && o.name 
						? tpl.replace('%id',    o.hash)
							.replace('%pclass', pclass+(isroot ? root : ''))
							.replace('%arrow',  arrow)
							.replace('%perms',  perms)
							.replace('%link', o.link ? '<span class="elfinder-symlink"/>' : '')
							.replace('%name',   o.name)
							.replace('%childs', childs)
						: '';
				},
				build = function(dirs, root) {
					var html = '', i, e, d;
					
					if (newAPI) {
						for (i = 0; i < dirs.length; i++) {
							d = dirs[i];
							e = tree.find('#nav-'+d.hash);
							
							if (e.length) {
								if (d.phash && e.parents('.'+subtree).prev('[id]').attr('id') != 'nav-'+d.phash) {
									fm.log('move')
								}
							} else {
								(d.phash ? tree.find('#nav-'+d.phash).next('.'+subtree) : tree).append(item(d, !d.phash));
							}
						}
					} else {
						if (root) {
							tree.find('a').remove();
							tree.html(item(dirs, true));
						} else {
							for (i = 0; i < dirs.length; i++) {
								html += item(dirs[i], root);
							}
							return ul + html + '</ul>';
						}
					}
				},
				draggable = $.extend({}, fm.ui.draggable, {
						addClasses : true,
						appendTo   : fm.ui.cwd,
						helper     : function() {
							return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
								.data('files', [this.id.substr(4)])
								.data('src', $(this).parent('li').parent('ul').prev('a').attr('id').substr(4));
						}
					}),
				update = function() {
					tree.find('a')
						.not('.'+root+',.elfinder-na,.ui-draggable')
						.draggable(draggable)
						.end()
						.not('.ui-droppable,.elfinder-na,.elfinder-ro')
						.droppable({
							tolerance  : 'pointer',
							hoverClass : 'elfinder-droppable-active ui-state-hover',
							drop : function(e, ui) {
								ui.helper.hide();
								fm.copy(ui.helper.data('files'), ui.helper.data('src'), !(e.shiftKey || e.ctrlKey || e.metaKey));
								fm.paste(this.id.substr(4));
							}
						});
				},
				tree = $(this).addClass('elfinder-nav-tree')
					.delegate('a', 'hover', function(e) {
						$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
					})
					.delegate('a', 'click', function(e) {
						var dir = $(this),
							id  = this.id.substr(4);

						e.preventDefault();
						
						if (id == fm.cwd.hash) {
							// already current dir - toggle subdirs
							dir.trigger('toggle');
						} else if (dir.is('.elfinder-na,.elfinder-wo')) {
							// not readable dir
							fm.trigger('error', {error : 'Access denied'});
						} else {
							// change dir
							fm.cd(id);
						}
					})
					.delegate('a', 'toggle.elfinder', function() {
						var $this  = $(this),
							ul     = $this.next('.'+subtree),
							arrow = $this.children('.'+collapsed),
							spinner,
							o;
						
						if (ul.children().length) {
							ul.slideToggle();
							arrow.toggleClass(expanded);
						} else if (newAPI) {
							spinner = $('<span class="elfinder-spinner-mini"/>');
							$this.prepend(spinner);
							arrow.hide();
							
							fm.ajax({
									cmd    : 'tree', 
									target : $(this).attr('id').substr(4)
								}, {
									error : function(xhr) { 
										fm.debug('ajaxerror', xhr); 
										spinner.remove();
										arrow.removeClass(collapsed).addClass(empty).show();
									},
									success : function(data) {
										spinner.remove();
										arrow.show();

										if (!data || !data.tree || !data.tree.length) {
											arrow.removeClass(collapsed).addClass(empty);
										} else {
											build(data.tree);
											$this.trigger('toggle');
											if (!tree.find('.'+active).length) {
												tree.find('#nav-'+fm.cwd.hash).addClass(active);
											}
											update();
										}
									}
								}, true);
						}
						
					})
					.delegate('.'+collapsed, 'click', function(e) {
						// click on arrow - toggle subdirs
						e.stopPropagation();
						e.preventDefault();
						$(this).parent().trigger('toggle.elfinder');
					})
				;
				
			fm.one('cd', function() {
				newAPI = fm.isNewApi();
			})
			.bind('cd', function(e) {
				var dir;
				
				if (e.data.tree) {
					build(e.data.tree, true);
					update();
				}
				
				tree.find('.'+active).removeClass(active);
				dir = tree.find('#nav-'+e.data.cwd.hash).addClass(active);
				
				if (fm.options.navOpenRoot && dir.length) {
					// show active root subdirs if required
					if (dir.is('.'+root)) {
						dir.next('.'+subtree).show();
						dir.children('.'+collapsed).addClass(expanded);
					} else if (e.data.params) {
						dir.parentsUntil('.elfinder-nav-tree').last().children('.'+root).next('.'+subtree).show();
					}
				}
			});
			
		});
	}
})(jQuery);