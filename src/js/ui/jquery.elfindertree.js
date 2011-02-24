(function($) {
	
	$.fn.elfindertree = function(fm) {
		
		return this.each(function() {
			var newAPI    = false,
				ids = [],
				subtree   = 'elfinder-nav-subtree',
				collapsed = 'elfinder-nav-collapsed',
				expanded  = 'elfinder-nav-expanded',
				empty     = 'elfinder-nav-empty',
				folder    = 'elfinder-nav-icon-folder',
				root      = 'elfinder-nav-tree-root',
				active    = 'ui-state-active',
				tpl       = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass">%arrow<span class="elfinder-nav-icon"/>%link %perms %name</a>%childs</li>',
				ul        = '<ul class="'+subtree+'">',
				item = function(o, isroot) {
					var pclass    = fm.ui.perms2class(o),
						perms     = pclass ? '<span class="elfinder-perms"/>' : '',
						hasChilds = newAPI ? o.childs : o.dirs && o.dirs.length,
						childs    = hasChilds ? newAPI ? ul + '</ul>' : build(o.dirs) : '' ,
						arrow     = hasChilds ? '<span class="elfinder-nav-collapsed"/>' : '';
					
					return o && o.name 
						? tpl.replace('%id',    o.hash)
							.replace('%pclass', pclass+(isroot ? ' '+root : ''))
							.replace('%arrow',  arrow)
							.replace('%perms',  perms)
							.replace('%link',   o.link ? '<span class="elfinder-symlink"/>' : '')
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
						
						if (id == fm.cwd.hash) {
							// already current dir - toggle subdirs
							dir.trigger('toggle.elfinder');
						} else if (dir.is('.elfinder-na,.elfinder-wo')) {
							// not readable dir
							fm.trigger('error', {error : [['The folder "$1" can’t be opened because you don’t have permission to see its contents.', $.trim(dir.text())]]});
						} else {
							// change dir
							fm.open(id);
						}
					})
					.delegate('a', 'toggle.elfinder', function() {
						var $this  = $(this),
							ul     = $this.next('.'+subtree),
							arrow  = $this.children('.'+collapsed),
							spinner,
							opts;
						
						if (ul.children().length) {
							ul.slideToggle();
							arrow.toggleClass(expanded);
						} else if (newAPI && arrow.length) {
							spinner = $('<span class="elfinder-spinner-mini"/>');
							opts = {
								data : {cmd : 'tree', target : $(this).attr('id').substr(4)},
								beforeSend : function() {
									$this.prepend(spinner);
									arrow.hide();
								},
								complete : function() {
									spinner.remove();
									if (!ul.children().length) {
										arrow.remove();
									} else {
										arrow.show().addClass(expanded);
										ul.slideToggle();
									}
								}
							}
							
							fm.ajax(opts, 'silent');
						}
						
					})
					.delegate('.'+collapsed, 'click', function(e) {
						// click on arrow - toggle subdirs
						e.stopPropagation();
						e.preventDefault();
						$(this).parent().trigger('toggle.elfinder');
					})
				;
				
			fm.bind('load', function(e) {
				newAPI = fm.isNewApi();
			})
			.bind('open', function(e) {
				var dir;
				// fm.time('tree')
				if (e.data.tree) {
					tree.empty();
					build(e.data.tree, true);
					setTimeout(attachEvents, 25);
				}
				// fm.timeEnd('tree')
				
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
			})
			.bind('tree', function(e) {
				build(e.data.tree);
				setTimeout(attachEvents, 25);
			});
			
		});
	}
})(jQuery);