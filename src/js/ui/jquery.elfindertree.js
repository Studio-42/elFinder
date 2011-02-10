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
			slideDown = $.browser.msie ? 'show'   : 'slideDown',
			
			tpl = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass"><span class="%arrow"/><span class="elfinder-nav-icon %icon"/>%perms %name</a>%childs</li>',
			
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
			
		})
		
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
						var $this = $(this),
							ul = $(this).next('ul');
						
						if (ul.children().length) {
							ul[slideToggle]().end().children('.elfinder-nav-collapsed').toggleClass('elfinder-nav-expanded');
						} else {
							$(this).prepend('<span class="elfinder-nav-spinner"/>').children('.elfinder-nav-collapsed').hide()
							// $(this).append('<span class="elfinder-nav-spinner"/>')
							var o = {
								error : function(xhr) { 
									fm.debug('ajaxerror', xhr); 
									$this.children('.elfinder-nav-spinner').remove();
									$this.children('.elfinder-nav-collapsed')
										.removeClass('elfinder-nav-collapsed')
										.addClass('elfinder-nav-empty')
										.show();
								},
								success : function(data) {
									fm.log(data)
									$this.children('.elfinder-nav-spinner').remove();
									$this.children('.elfinder-nav-collapsed').show();
									
									if (!data || !data.subdirs || !data.subdirs.length) {
										$this.children('.elfinder-nav-collapsed')
											.removeClass('elfinder-nav-collapsed')
											.addClass('elfinder-nav-empty');
									} else {
										build(data.subdirs);
											
									}
									$this.trigger('toggle');
								}
							};
							fm.ajax({ cmd : 'subdirs', dir : $(this).attr('id').substr(4) }, o, true);
						}
						
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
				}),
				build = function(dirs) {
					var i, el, p, o, html, pc;
					// fm.log(dirs)
					
					
					for (i = 0; i < dirs.length; i++) {
						o = dirs[i];
						pc = fm.ui.perms2class(o);
						el = tree.find('#nav-'+dirs[i].hash);
						if (el.length) {
							
						} else {
							
							html = tpl.replace('%id', o.hash)
								.replace('%pclass', pc)
								.replace('%arrow',  o.childs ? 'elfinder-nav-collapsed' : 'elfinder-nav-empty')
								.replace('%icon', !o.phash ? 'elfinder-nav-icon-home' : 'elfinder-nav-icon-folder')
								.replace('%perms',  pc ? '<span class="elfinder-perms"/>' : '')
								.replace('%name',   o.name)
								.replace('%childs', o.childs ? '<ul style="display:none"/>' : '');
							
							if (dirs[i].phash) {
								p = tree.find('#nav-'+dirs[i].phash).next('ul');
								// fm.log(p)
								p.append(html)
							} else {
								tree.append(html)
							}
							
						}
					}
					
				};
			
			// recreate tree if required and
			// set current dir visible and actve and show subdirs		
			fm.bind('cd', function(e) {
				var t = e.data.tree, dir;
				
				if (e.data.tree2) {
					tree.find('a').remove();
					tree.html('');
					build(e.data.tree2)
					dir = tree.find('[id="nav-'+fm.cwd.hash+'"]').click()
					return
				}
				
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
						.droppable({
							tolerance  : 'pointer',
							hoverClass : 'elfinder-dropable-active ui-state-hover',
							drop : function(e, ui) {
								ui.helper.hide();
								fm.copy(ui.helper.data('files'), ui.helper.data('src'), !(e.shiftKey || e.ctrlKey || e.metaKey));
								fm.paste(this.id.substr(4));
							}
						});
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