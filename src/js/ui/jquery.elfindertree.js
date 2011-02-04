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
			 * Active state class name
			 *
			 * @type String
			 **/
			aclass = 'ui-state-active',
			/**
			 * Hover state class name
			 *
			 * @type String
			 **/
			hclass = 'ui-state-hover',
			/**
			 * Folder class name for dir except root one
			 *
			 * @type String
			 **/
			fclass = 'elfinder-nav-icon-folder',
			/**
			 * Opened folder class name for dir except root one
			 *
			 * @type String
			 **/
			oclass = 'elfinder-nav-icon-folder-open',
			/**
			 * Colapsed arrow icon class name
			 *
			 * @type String
			 **/
			cclass = 'elfinder-nav-collapsed',
			/**
			 * Expanded arrow icon class name
			 *
			 * @type String
			 **/
			exclass = 'elfinder-nav-expanded',
			/**
			 * No arrow icon class name
			 *
			 * @type String
			 **/
			emclass = 'elfinder-nav-empty',
			/**
			 * Dir template
			 *
			 * @type String
			 **/
			tpl = '<li><a href="#" id="nav-%id" class="ui-corner-all %pclass"><span class="%arrow"/><span class="elfinder-nav-icon %icon"/>%perms %name</a>%childs</li>',
			/**
			 * Traverse through dirs tree and return html code
			 *
			 * @param  Object  tree
			 * @param  Boolean is this root dirs
			 * @return String
			 **/
			traverse = function(tree, root) {
				var html = root ? '' : '<ul style="display:none">',	
					end  = root ? '' : '</ul>',
					icon   = root ? 'elfinder-nav-icon-home' : 'elfinder-nav-icon-folder',
					i, o, pc;

				for (i=0; i < tree.length; i++) {
					o = tree[i];
					if (o.name && o.hash) {
						pc = fm.ui.perms2class(o);
						html += tpl.replace('%id', o.hash)
							.replace('%pclass', pc)
							.replace('%arrow',  o.dirs.length ? cclass : emclass)
							.replace('%icon', icon)
							.replace('%perms',  pc ? '<span class="elfinder-perms"/>' : '')
							.replace('%name',   o.name)
							.replace('%childs', o.dirs.length ? traverse(o.dirs) : '');
					}
				}
				return html + '</ul>';
			}
			;
		
		return this.each(function() {
			var tree = $(this).addClass('elfinder-tree')
					.delegate('a', 'hover', function(e) {
						$(this).toggleClass(hclass, e.type == 'mouseenter');
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
						$(this).next('ul')[slideToggle]().end().children('.'+cclass).toggleClass(exclass);
					})
					.delegate('.'+cclass, 'click', function(e) {
						// click on arrow - toggle subdirs
						e.stopPropagation();
						e.preventDefault();
						$(this).parent().trigger('toggle');
					});
			
			// set current dir visible and actve and show subdirs		
			fm.bind('cd', function(e) {
				var t = e.data.tree, dir, pc;
				
				if (e.data.error) {
					return
				}
				
				if (t) {
					// create tree
					tree.find('a').remove();
					tree.html(traverse([t], true))
						.find('a')
						.not(':has(.elfinder-nav-icon-home),.elfinder-na')
						// .draggable(fm.ui.draggable)
						.end()
						.not('.elfinder-na,.elfinder-ro')
						.droppable({
							tolerance : 'pointer',
							over : function(e, ui) {
								var f = $(this).addClass(hclass),
									a = f.children('.'+cclass);
								// show open folder icon
								f.children('.'+fclass).addClass(oclass);
								// show subdirs
								if (a.length && !a.hasClass(exclass)) {
									setTimeout(function() {
										a.parent().hasClass(hclass) && a.click();
									}, 1000);
								}	
							},
							out : function(e) {
								$(this).removeClass(hclass).children('.'+fclass).removeClass(oclass);
							},
							drop : function(e, ui) {
								$(this).removeClass(hclass).children(fclass).removeClass(oclass);
								ui.draggable.draggable('disable').removeClass('ui-state-disabled');
								ui.helper.hide();
								fm.copy(ui.helper.data('files')||[], ui.helper.data('src'), !(e.shiftKey || e.ctrlKey || e.metaKey)).paste(this.id.substr(4));	
							}
						})
					;
				}
				
				// find current dir
				// dir = tree.find('#nav-'+e.data.cwd.hash);
				dir = tree.find('[id="nav-'+e.data.cwd.hash+'"]')
				// fm.log(dir)
				// remove active state from prevoiusly active dir
				tree.find('.'+aclass)
					.removeClass(aclass)
					.children('.'+fclass)
					.removeClass(oclass);
				
				// show folder opened icon
				dir.children('.'+fclass).addClass(oclass);
				// set active and show all parents
				dir.addClass(aclass).parents('ul:hidden').prev('a').trigger('toggle');
				// show subdirs
				dir.next('ul').show();
				// show expanded arrow
				dir.children('.'+cclass).addClass(exclass);
			});
		});
	}
	
})(jQuery);