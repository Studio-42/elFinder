/**
 * @class elFinder ui
 * Display current folder path in statusbar.
 * Click on folder name in path - open folder
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfinderpath = function(fm, options) {
	"use strict";
	return this.each(function() {
		var query  = '',
			target = '',
			mimes  = [],
			place  = 'statusbar',
			clHover= fm.res('class', 'hover'),
			prefix = 'path' + (elFinder.prototype.uniqueid? elFinder.prototype.uniqueid : '') + '-',
			wzbase = $('<div class="ui-widget-header ui-helper-clearfix elfinder-workzone-path"></div>'),
			path   = $(this).addClass('elfinder-path').html('&nbsp;')
				.on('mousedown', 'span.elfinder-path-dir', function(e) {
					var hash = $(this).attr('id').substr(prefix.length);
					e.preventDefault();
					if (hash != fm.cwd().hash) {
						$(this).addClass(clHover);
						if (query) {
							fm.exec('search', query, { target: hash, mime: mimes.join(' ') });
						} else {
							fm.trigger('select', {selected : [hash]}).exec('open', hash);
						}
					}
				})
				.prependTo(fm.getUI('statusbar').show()),
			roots = $('<div class="elfinder-path-roots"></div>').on('click', function(e) {
				e.stopPropagation();
				e.preventDefault();
				
				var roots = $.map(fm.roots, function(h) { return fm.file(h); }),
				raw = [];

				$.each(roots, function(i, f) {
					if (! f.phash && fm.root(fm.cwd().hash, true) !== f.hash) {
						raw.push({
							label    : fm.escape(f.i18 || f.name),
							icon     : 'home',
							callback : function() { fm.exec('open', f.hash); },
							options  : {
								iconClass : f.csscls || '',
								iconImg   : f.icon   || ''
							}
						});
					}
				});
				fm.trigger('contextmenu', {
					raw: raw,
					x: e.pageX,
					y: e.pageY
				});
			}).append('<span class="elfinder-button-icon elfinder-button-icon-menu" ></span>').appendTo(wzbase),
			render = function(cwd) {
				var dirs = [],
					names = [];
				$.each(fm.parents(cwd), function(i, hash) {
					var c = (cwd === hash)? 'elfinder-path-dir elfinder-path-cwd' : 'elfinder-path-dir',
						f = fm.file(hash),
						name = fm.escape(f.i18 || f.name);
					names.push(name);
					dirs.push('<span id="'+prefix+hash+'" class="'+c+'" title="'+names.join(fm.option('separator'))+'">'+name+'</span>');
				});
				return dirs.join('<span class="elfinder-path-other">'+fm.option('separator')+'</span>');
			},
			toWorkzone = function() {
				var prev;
				path.children('span.elfinder-path-dir').attr('style', '');
				prev = fm.direction === 'ltr'? $('#'+prefix + fm.cwd().hash).prevAll('span.elfinder-path-dir:first') : $();
				path.scrollLeft(prev.length? prev.position().left : 0);
			},
			fit = function() {
				if (fm.UA.CSS.flex) {
					return;
				}
				var dirs = path.children('span.elfinder-path-dir'),
					cnt  = dirs.length,
					m, bg = 0, ids;
				
				if (place === 'workzone' || cnt < 2) {
					dirs.attr('style', '');
					return;
				}
				path.width(path.css('max-width'));
				dirs.css({maxWidth: (100/cnt)+'%', display: 'inline-block'});
				m = path.width() - 9;
				path.children('span.elfinder-path-other').each(function() {
					m -= $(this).width();
				});
				ids = [];
				dirs.each(function(i) {
					var dir = $(this),
						w   = dir.width();
					m -= w;
					if (w < this.scrollWidth) {
						ids.push(i);
					}
				});
				path.width('');
				if (ids.length) {
					if (m > 0) {
						m = m / ids.length;
						$.each(ids, function(i, k) {
							var d = $(dirs[k]);
							d.css('max-width', d.width() + m);
						});
					}
					dirs.last().attr('style', '');
				} else {
					dirs.attr('style', '');
				}
			},
			hasUiTree, hasUiStat;

		fm.one('init', function() {
			hasUiTree = fm.getUI('tree').length;
			hasUiStat = fm.getUI('stat').length;
			if (! hasUiTree && options.toWorkzoneWithoutNavbar) {
				wzbase.append(path).insertBefore(fm.getUI('workzone'));
				place = 'workzone';
				fm.bind('open', toWorkzone)
				.one('opendone', function() {
					fm.getUI().trigger('resize');
				});
			}
		})
		.bind('open searchend parents', function() {
			var dirs = [];

			query  = '';
			target = '';
			mimes  = [];
			
			path.html(render(fm.cwd().hash));
			if (Object.keys(fm.roots).length > 1) {
				path.css('margin', '');
				roots.show();
			} else {
				path.css('margin', 0);
				roots.hide();
			}
			!hasUiStat && fit();
		})
		.bind('searchstart', function(e) {
			if (e.data) {
				query  = e.data.query || '';
				target = e.data.target || '';
				mimes  = e.data.mimes || [];
			}
		})
		.bind('search', function(e) {
			var dirs = [],
				html = '';
			if (target) {
				html = render(target);
			} else {
				html = fm.i18n('btnAll');
			}
			path.html('<span class="elfinder-path-other">'+fm.i18n('searcresult') + ': </span>' + html);
			fit();
		})
		// on swipe to navbar show/hide
		.bind('navbarshow navbarhide', function() {
			var wz = fm.getUI('workzone');
			if (this.type === 'navbarshow') {
				fm.unbind('open', toWorkzone);
				path.prependTo(fm.getUI('statusbar'));
				wzbase.detach();
				place = 'statusbar';
			} else {
				wzbase.append(path).insertBefore(wz);
				place = 'workzone';
				toWorkzone();
				fm.bind('open', toWorkzone);
			}
			fm.trigger('uiresize');
		})
		.bind('resize uistatchange', fit);
	});
};
