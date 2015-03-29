"use strict";
/**
 * @class elFinder places/favorites ui
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderplaces = function(fm, opts) {
	return this.each(function() {
		var dirs      = [],
			c         = 'class',
			navdir    = fm.res(c, 'navdir'),
			collapsed = fm.res(c, 'navcollapse'),
			expanded  = fm.res(c, 'navexpand'),
			hover     = fm.res(c, 'hover'),
			clroot    = fm.res(c, 'treeroot'),
			tpl       = fm.res('tpl', 'navdir'),
			ptpl      = fm.res('tpl', 'perms'),
			spinner   = $(fm.res('tpl', 'navspinner')),
			key       = 'places'+(opts.suffix? opts.suffix : ''),
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			id2hash   = function(id) { return id.substr(6);	},
			/**
			 * Convert places dir node into dir hash
			 *
			 * @param  String  directory id
			 * @return String
			 **/
			hash2id   = function(hash) { return 'place-'+hash; },
			
			/**
			 * Save current places state
			 *
			 * @return void
			 **/
			save      = function() { fm.storage(key, dirs.join(',')); },
			/**
			 * Return node for given dir object
			 *
			 * @param  Object  directory object
			 * @return jQuery
			 **/
			create    = function(dir) {
				return $(tpl.replace(/\{id\}/, hash2id(dir.hash))
						.replace(/\{name\}/, fm.escape(dir.name))
						.replace(/\{cssclass\}/, (fm.UA.Touch ? 'elfinder-touch ' : '')+fm.perms2class(dir))
						.replace(/\{permissions\}/, !dir.read || !dir.write ? ptpl : '')
						.replace(/\{symlink\}/, ''));
			},
			/**
			 * Add new node into places
			 *
			 * @param  Object  directory object
			 * @return void
			 **/
			add = function(dir) {
				if (!fm.files().hasOwnProperty(dir.hash)) {
					// update cache
					fm.trigger('tree', {tree: [dir]});
				}
				
				var node = create(dir);

				if (subtree.children().length) {
					$.each(subtree.children(), function() {
						var current =  $(this);
						
						if (dir.name.localeCompare(current.children('.'+navdir).text()) < 0) {
							return !node.insertBefore(current);
						}
					});
				} 
				
				dirs.push(dir.hash);
				!node.parent().length && subtree.append(node);
				root.addClass(collapsed);
				node.draggable({
					appendTo : 'body',
					revert   : false,
					helper   : function() {
						var dir = $(this);
							
						dir.children().removeClass('ui-state-hover');
						
						return $('<div class="elfinder-place-drag elfinder-'+fm.direction+'"/>')
								.append(dir.clone())
								.data('hash', id2hash(dir.children(':first').attr('id')));

					},
					start    : function() { $(this).hide(); },
					stop     : function(e, ui) {
						var top    = places.offset().top,
							left   = places.offset().left,
							width  = places.width(),
							height = places.height(),
							x      = e.clientX,
							y      = e.clientY;
						
						if (x > left && x < left+width && y > top && y < y+height) {
							$(this).show();
						} else {
							remove(ui.helper.data('hash'));
							save();
						}
					}
				});
			}, 
			/**
			 * Remove dir from places
			 *
			 * @param  String  directory id
			 * @return void
			 **/
			remove = function(hash) {
				var ndx = $.inArray(hash, dirs);

				if (ndx !== -1) {
					dirs.splice(ndx, 1);
					subtree.find('#'+hash2id(hash)).parent().remove();
					!subtree.children().length && root.removeClass(collapsed+' '+expanded);
				}
			},
			/**
			 * Remove all dir from places
			 *
			 * @return void
			 **/
			clear = function() {
				subtree.empty();
				root.removeClass(collapsed+' '+expanded);
			},
			/**
			 * Node - wrapper for places root
			 *
			 * @type jQuery
			 **/
			wrapper = create({
					hash  : 'root-'+fm.namespace, 
					name  : fm.i18n(opts.name, 'places'),
					read  : true,
					write : true
				}),
			/**
			 * Places root node
			 *
			 * @type jQuery
			 **/
			root = wrapper.children('.'+navdir)
				.addClass(clroot)
				.click(function() {
					if (root.is('.'+collapsed)) {
						places.toggleClass(expanded);
						subtree.slideToggle();
						fm.storage('placesState', places.is('.'+expanded)? 1 : 0);
					}
				}),
			/**
			 * Container for dirs
			 *
			 * @type jQuery
			 **/
			subtree = wrapper.children('.'+fm.res(c, 'navsubtree')),
			/**
			 * Main places container
			 *
			 * @type jQuery
			 **/
			places = $(this).addClass(fm.res(c, 'tree')+' elfinder-places ui-corner-all')
				.hide()
				.append(wrapper)
				.appendTo(fm.getUI('navbar'))
				.delegate('.'+navdir, 'mouseenter mouseleave', function(e) {
					$(this).toggleClass('ui-state-hover', (e.type == 'mouseenter'));
				})
				.delegate('.'+navdir, 'click', function(e) {
					var p = $(this);
					if (p.data('longtap')) {
						e.stopPropagation();
						return;
					}
					fm.exec('open', p.attr('id').substr(6));
				})
				.delegate('.'+navdir+':not(.'+clroot+')', 'contextmenu', function(e) {
					var hash = $(this).attr('id').substr(6);
					
					e.preventDefault();
					
					fm.trigger('contextmenu', {
						raw : [{
							label    : fm.i18n('rmFromPlaces'),
							icon     : 'rm',
							callback : function() { remove(hash); save(); }
						}],
						'x'       : e.clientX,
						'y'       : e.clientY
					})
					
				})
				.droppable({
					tolerance  : 'pointer',
					accept     : '.elfinder-cwd-file-wrapper,.elfinder-tree-dir,.elfinder-cwd-file',
					hoverClass : fm.res('class', 'adroppable'),
					drop       : function(e, ui) {
						var resolve = true;
						
						$.each(ui.helper.data('files'), function(i, hash) {
							var dir = fm.file(hash);
							
							if (dir && dir.mime == 'directory' && $.inArray(dir.hash, dirs) === -1) {
								add(dir);
							} else {
								resolve = false;
							}
						})
						save();
						resolve && ui.helper.hide();
					}
				})
				// for touch device
				.on('touchstart', '.'+navdir+':not(.'+clroot+')', function(e) {
					var hash = $(this).attr('id').substr(6),
					p = $(this)
					.addClass(hover)
					.data('longtap', null)
					.data('tmlongtap', setTimeout(function(){
						// long tap
						p.data('longtap', true);
						fm.trigger('contextmenu', {
							raw : [{
								label    : fm.i18n('rmFromPlaces'),
								icon     : 'rm',
								callback : function() { remove(hash); save(); }
							}],
							'x'       : e.originalEvent.touches[0].clientX,
							'y'       : e.originalEvent.touches[0].clientY
						});
					}, 500));
				})
				.on('touchmove touchend', '.'+navdir+':not(.'+clroot+')', function(e) {
					clearTimeout($(this).data('tmlongtap'));
					if (e.type == 'touchmove') {
						$(this).removeClass(hover);
					}
				});

		// "on regist" for command exec
		$(this).on('regist', function(e, files){
			$.each(files, function(i, dir) {
				if (dir && dir.mime == 'directory' && $.inArray(dir.hash, dirs) === -1) {
					add(dir);
				}
			});
			save();
		});
	

		// on fm load - show places and load files from backend
		fm.one('load', function() {
			if (fm.oldAPI) {
				return;
			}
			
			places.show().parent().show();

			dirs = $.map((fm.storage(key) || '').split(','), function(hash) { return hash || null;});
			
			if (dirs.length) {
				root.prepend(spinner);
				
				fm.request({
					data : {cmd : 'info', targets : dirs},
					preventDefault : true
				})
				.done(function(data) {
					dirs = [];
					$.each(data.files, function(i, file) {
						file.mime == 'directory' && add(file);
					});
					save();
					if (fm.storage('placesState') > 0) {
						root.click();
					}
				})
				.always(function() {
					spinner.remove();
				})
			}
			

			fm.remove(function(e) {
				$.each(e.data.removed, function(i, hash) {
					remove(hash);
				});
				save();
			})
			.change(function(e) {
				$.each(e.data.changed, function(i, file) {
					if ($.inArray(file.hash, dirs) !== -1) {
						remove(file.hash);
						file.mime == 'directory' && add(file);
					}
				});
				save();
			})
			.bind('sync', function() {
				if (dirs.length) {
					root.prepend(spinner);

					fm.request({
						data : {cmd : 'info', targets : dirs},
						preventDefault : true
					})
					.done(function(data) {
						$.each(data.files || [], function(i, file) {
							if ($.inArray(file.hash, dirs) === -1) {
								remove(file.hash);
							}
						});
						save();
					})
					.always(function() {
						spinner.remove();
					});
				}
			})
			
		})
		
	});
}