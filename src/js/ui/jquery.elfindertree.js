(function($) {
	
	$.fn.elfindertree = function(fm) {
		var
			/**
			 * slideToggle method name
			 *
			 * @type String
			 **/
			 slideToggle = $.browser.msie ? 'toggle' : 'slideToggle',
			/**
			 * slideDown method name
			 *
			 * @type String
			 **/
			slideDown = $.browser.msie ? 'show'   : 'slideDown'

			/**
			 * Traverse through dirs tree and return html code
			 *
			 * @param  Object  tree
			 * @param  Boolean is this root dirs
			 * @return String
			 **/
			traverse = function(tree, root) {
				var tpl = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass"><span class="%arrow"/><span class="elfinder-nav-icon %icon"/>%perms %name</a>%childs</li>',
					html = root ? '' : '<ul style="display:none">',	
					end  = root ? '' : '</ul>',
					icon   = root ? 'elfinder-nav-icon-home' : 'elfinder-nav-icon-folder',
					i, o, pc;

				for (i=0; i < tree.length; i++) {
					o = tree[i];
					if (o.name && o.hash) {
						pc = fm.ui.perms2class(o);
						html += tpl.replace('%id', o.hash)
							.replace('%pclass', pc)
							.replace('%arrow',  o.dirs.length ? 'elfinder-nav-collapsed' : 'elfinder-nav-empty')
							.replace('%icon', icon)
							.replace('%perms',  pc ? '<span class="elfinder-perms"/>' : '')
							.replace('%name',   o.name)
							.replace('%childs', o.dirs && o.dirs.length ? traverse(o.dirs) : '');
					}
				}
				return html + '</ul>';
			};
		
		return this.each(function() {
			var tree = $(this).addClass('elfinder-tree')
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
					.delegate('a', 'toggle', function() {
						$(this).next('ul')[slideToggle]().end().children('.elfinder-nav-collapsed').toggleClass('elfinder-nav-expanded');
					})
					.delegate('.elfinder-nav-collapsed', 'click', function(e) {
						// click on arrow - toggle subdirs
						e.stopPropagation();
						e.preventDefault();
						$(this).parent().trigger('toggle');
					}),
				draggable = $.extend({}, fm.ui.draggable, {
					appendTo : fm.ui.cwd,
					helper : function() {
						return $('<div class="elfinder-drag-helper"><div class="elfinder-cwd-icon elfinder-cwd-icon-directory ui-corner-all"/></div>')
							.data('files', [this.id.substr(4)])
							.data('src', $(this).parent('li').parent('ul').prev('a').attr('id').substr(4));
					}
				});
			
			// recreate tree if required and
			// set current dir visible and actve and show subdirs		
			fm.bind('cd', function(e) {
				var t = e.data.tree, dir;
				
				if (t) {
					// required to avoid drag/drop conflict
					tree.find('a').remove();
					// create tree
					tree.html(traverse([t], true))
						.find('a')
						.not(':has(.elfinder-nav-icon-home),.elfinder-na')
						.draggable(draggable)
						.end()
						.not('.elfinder-na,.elfinder-ro')
						.droppable(fm.ui.droppable);
				}
				
				// find current dir
				dir = tree.find('[id="nav-'+fm.cwd.hash+'"]')

				// remove active state from prevoiusly active dir
				tree.find('.ui-state-active')
					.removeClass('ui-state-active')
					.children('.elfinder-nav-icon-folder')
					.removeClass('elfinder-nav-icon-folder-open');
				
				// show open folder icon
				dir.children('.elfinder-nav-icon-folder').addClass('elfinder-nav-icon-folder-open');
				// set active and show all parents
				dir.addClass('ui-state-active').parents('ul:hidden').prev('a').trigger('toggle');
				// show subdirs
				dir.next('ul').show();
				// show expanded arrow
				dir.children('.elfinder-nav-collapsed').addClass('elfinder-nav-expanded');
			});
		});
	}
	
})(jQuery);