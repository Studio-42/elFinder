/**
 * @class elFinder command "info". 
 * Display dialog with file properties.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
(elFinder.prototype.commands.info = function() {
	"use strict";
	var m   = 'msg',
		fm  = this.fm,
		spclass = 'elfinder-spinner',
		btnclass = 'elfinder-info-button',
		msg = {
			calc     : fm.i18n('calc'),
			size     : fm.i18n('size'),
			unknown  : fm.i18n('unknown'),
			path     : fm.i18n('path'),
			aliasfor : fm.i18n('aliasfor'),
			modify   : fm.i18n('modify'),
			perms    : fm.i18n('perms'),
			locked   : fm.i18n('locked'),
			dim      : fm.i18n('dim'),
			kind     : fm.i18n('kind'),
			files    : fm.i18n('files'),
			folders  : fm.i18n('folders'),
			roots    : fm.i18n('volumeRoots'),
			items    : fm.i18n('items'),
			yes      : fm.i18n('yes'),
			no       : fm.i18n('no'),
			link     : fm.i18n('link'),
			owner    : fm.i18n('owner'),
			group    : fm.i18n('group'),
			perm     : fm.i18n('perm'),
			getlink  : fm.i18n('getLink')
		},
		applyZWSP = function(str, remove) {
			if (remove) {
				return str.replace(/\u200B/g, '');
			} else {
				return str.replace(/(\/|\\)/g, "$1\u200B");
			}
		};
	
	this.items = ['size', 'aliasfor', 'path', 'link', 'dim', 'modify', 'perms', 'locked', 'owner', 'group', 'perm'];
	if (this.options.custom && Object.keys(this.options.custom).length) {
		$.each(this.options.custom, function(name, details) {
			details.label && this.items.push(details.label);
		});
	}

	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title {dirclass}"><span class="elfinder-cwd-icon {class} ui-corner-all"{style}/>{title}</div><table class="elfinder-info-tb">{content}</table>',
		itemTitle  : '<strong>{name}</strong><span class="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		row        : '<tr><td class="elfinder-info-label">{label} : </td><td class="{class}">{value}</td></tr>',
		spinner    : '<span>{text}</span> <span class="'+spclass+' '+spclass+'-{name}"/>'
	};
	
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+i'
	}];
	
	this.init = function() {
		$.each(msg, function(k, v) {
			msg[k] = fm.i18n(v);
		});
	};
	
	this.getstate = function() {
		return 0;
	};
	
	this.exec = function(hashes) {
		var files   = this.files(hashes);
		if (! files.length) {
			files   = this.files([ this.fm.cwd().hash ]);
		}
		var self    = this,
			fm      = this.fm,
			o       = this.options,
			tpl     = this.tpl,
			row     = tpl.row,
			cnt     = files.length,
			content = [],
			view    = tpl.main,
			l       = '{label}',
			v       = '{value}',
			reqs    = [],
			reqDfrd = null,
			opts    = {
				title : fm.i18n('selectionInfo'),
				width : 'auto',
				close : function() {
					$(this).elfinderdialog('destroy');
					if (reqDfrd && reqDfrd.state() === 'pending') {
						reqDfrd.reject();
					}
					$.grep(reqs, function(r) {
						r && r.state() === 'pending' && r.reject();
					});
				}
			},
			count = [],
			replSpinner = function(msg, name, className) {
				dialog.find('.'+spclass+'-'+name).parent().html(msg).addClass(className || '');
			},
			id = fm.namespace+'-info-'+$.map(files, function(f) { return f.hash; }).join('-'),
			dialog = fm.getUI().find('#'+id),
			customActions = [],
			style = '',
			hashClass = 'elfinder-font-mono elfinder-info-hash',
			size, tmb, file, title, dcnt, rdcnt, path, getHashAlgorisms, hideItems;
			
		if (!cnt) {
			return $.Deferred().reject();
		}
			
		if (dialog.length) {
			dialog.elfinderdialog('toTop');
			return $.Deferred().resolve();
		}
		
		hideItems = fm.storage('infohides') || fm.arrayFlip(o.hideItems, true);

		if (cnt === 1) {
			file = files[0];
			
			if (file.icon) {
				style = ' '+fm.getIconStyle(file);
			}
			
			view  = view.replace('{dirclass}', file.csscls? fm.escape(file.csscls) : '').replace('{class}', fm.mime2class(file.mime)).replace('{style}', style);
			title = tpl.itemTitle.replace('{name}', fm.escape(file.i18 || file.name)).replace('{kind}', '<span title="'+fm.escape(file.mime)+'">'+fm.mime2kind(file)+'</span>');

			tmb = fm.tmb(file);
			
			if (!file.read) {
				size = msg.unknown;
			} else if (file.mime != 'directory' || file.alias) {
				size = fm.formatSize(file.size);
			} else {
				size = tpl.spinner.replace('{text}', msg.calc).replace('{name}', 'size');
				count.push(file.hash);
			}
			
			!hideItems.size && content.push(row.replace(l, msg.size).replace(v, size));
			!hideItems.aleasfor && file.alias && content.push(row.replace(l, msg.aliasfor).replace(v, file.alias));
			if (!hideItems.path) {
				if (path = fm.path(file.hash, true)) {
					content.push(row.replace(l, msg.path).replace(v, applyZWSP(fm.escape(path))).replace('{class}', 'elfinder-info-path'));
				} else {
					content.push(row.replace(l, msg.path).replace(v, tpl.spinner.replace('{text}', msg.calc).replace('{name}', 'path')).replace('{class}', 'elfinder-info-path'));
					reqs.push(fm.path(file.hash, true, {notify: null})
					.fail(function() {
						replSpinner(msg.unknown, 'path');
					})
					.done(function(path) {
						replSpinner(applyZWSP(path), 'path');
					}));
				}
			}
			if (!hideItems.link && file.read) {
				var href,
				name_esc = fm.escape(file.name);
				if (file.url == '1') {
					content.push(row.replace(l, msg.link).replace(v, '<button class="'+btnclass+' '+spclass+'-url">'+msg.getlink+'</button>'));
				} else {
					if (file.url) {
						href = file.url;
					} else if (file.mime === 'directory') {
						if (o.nullUrlDirLinkSelf && file.url === null) {
							var loc = window.location;
							href = loc.pathname + loc.search + '#elf_' + file.hash;
						} else if (file.url !== '' && fm.option('url', (!fm.isRoot(file) && file.phash) || file.hash)) {
							href = fm.url(file.hash);
						}
					} else {
						href = fm.url(file.hash);
					}
					href && content.push(row.replace(l, msg.link).replace(v,  '<a href="'+href+'" target="_blank">'+name_esc+'</a>'));
				}
			}
			
			if (!hideItems.dim) {
				if (file.dim) { // old api
					content.push(row.replace(l, msg.dim).replace(v, file.dim));
				} else if (file.mime.indexOf('image') !== -1) {
					if (file.width && file.height) {
						content.push(row.replace(l, msg.dim).replace(v, file.width+'x'+file.height));
					} else {
						content.push(row.replace(l, msg.dim).replace(v, tpl.spinner.replace('{text}', msg.calc).replace('{name}', 'dim')));
						reqs.push(fm.request({
							data : {cmd : 'dim', target : file.hash},
							preventDefault : true
						})
						.fail(function() {
							replSpinner(msg.unknown, 'dim');
						})
						.done(function(data) {
							replSpinner(data.dim || msg.unknown, 'dim');
							if (data.dim) {
								var dim = data.dim.split('x');
								var rfile = fm.file(file.hash);
								rfile.width = dim[0];
								rfile.height = dim[1];
							}
						}));
					}
				}
			}
			
			!hideItems.modify && content.push(row.replace(l, msg.modify).replace(v, fm.formatDate(file)));
			!hideItems.perms && content.push(row.replace(l, msg.perms).replace(v, fm.formatPermissions(file)));
			!hideItems.locked && content.push(row.replace(l, msg.locked).replace(v, file.locked ? msg.yes : msg.no));
			!hideItems.owner && file.owner && content.push(row.replace(l, msg.owner).replace(v, file.owner));
			!hideItems.group && file.group && content.push(row.replace(l, msg.group).replace(v, file.group));
			!hideItems.perm && file.perm && content.push(row.replace(l, msg.perm).replace(v, fm.formatFileMode(file.perm)));
			
			// Get MD5 hash
			if (window.ArrayBuffer && (fm.options.cdns.sparkmd5 || fm.options.cdns.jssha) && file.mime !== 'directory' && file.size > 0 && (!o.showHashMaxsize || file.size <= o.showHashMaxsize)) {
				getHashAlgorisms = [];
				$.each(fm.storage('hashchekcer') || o.showHashAlgorisms, function(i, n) {
					if (!file[n]) {
					content.push(row.replace(l, fm.i18n(n)).replace(v, tpl.spinner.replace('{text}', msg.calc).replace('{name}', n)));
						getHashAlgorisms.push(n);
					} else {
						content.push(row.replace(l, fm.i18n(n)).replace(v, file[n]).replace('{class}', hashClass));
					}
				});

				reqs.push(
					fm.getContentsHashes(file.hash, getHashAlgorisms).progress(function(hashes) {
						$.each(getHashAlgorisms, function(i, n) {
							if (hashes[n]) {
								replSpinner(hashes[n], n, hashClass);
							}
						});
					}).always(function() {
						$.each(getHashAlgorisms, function(i, n) {
							replSpinner(msg.unknown, n);
						});
					})
				);
			}
			
			// Add custom info fields
			if (o.custom) {
				$.each(o.custom, function(name, details) {
					if (
					  !hideItems[details.label]
					    &&
					  (!details.mimes || $.grep(details.mimes, function(m){return (file.mime === m || file.mime.indexOf(m+'/') === 0)? true : false;}).length)
					    &&
					  (!details.hashRegex || file.hash.match(details.hashRegex))
					) {
						// Add to the content
						content.push(row.replace(l, fm.i18n(details.label)).replace(v , details.tpl.replace('{id}', id)));
						// Register the action
						if (details.action && (typeof details.action == 'function')) {
							customActions.push(details.action);
						}
					}
				});
			}
		} else {
			view  = view.replace('{class}', 'elfinder-cwd-icon-group');
			title = tpl.groupTitle.replace('{items}', msg.items).replace('{num}', cnt);
			dcnt  = $.grep(files, function(f) { return f.mime == 'directory' ? true : false ; }).length;
			if (!dcnt) {
				size = 0;
				$.each(files, function(h, f) { 
					var s = parseInt(f.size);
					
					if (s >= 0 && size >= 0) {
						size += s;
					} else {
						size = 'unknown';
					}
				});
				content.push(row.replace(l, msg.kind).replace(v, msg.files));
				!hideItems.size && content.push(row.replace(l, msg.size).replace(v, fm.formatSize(size)));
			} else {
				rdcnt = $.grep(files, function(f) { return f.mime === 'directory' && (! f.phash || f.isroot)? true : false ; }).length;
				dcnt -= rdcnt;
				content.push(row.replace(l, msg.kind).replace(v, (rdcnt === cnt || dcnt === cnt)? msg[rdcnt? 'roots' : 'folders'] : $.map({roots: rdcnt, folders: dcnt, files: cnt - rdcnt - dcnt}, function(c, t) { return c? msg[t]+' '+c : null; }).join(', ')));
				!hideItems.size && content.push(row.replace(l, msg.size).replace(v, tpl.spinner.replace('{text}', msg.calc).replace('{name}', 'size')));
				count = $.map(files, function(f) { return f.hash; });
				
			}
		}
		
		view = view.replace('{title}', title).replace('{content}', content.join('').replace(/{class}/g, ''));
		
		dialog = self.fmDialog(view, opts);
		dialog.attr('id', id).one('mousedown', '.elfinder-info-path', function() {
			$(this).html(applyZWSP($(this).html(), true));
		});

		if (fm.UA.Mobile && $.fn.tooltip) {
			dialog.children('.ui-dialog-content .elfinder-info-title').tooltip({
				classes: {
					'ui-tooltip': 'elfinder-ui-tooltip ui-widget-shadow'
				},
				tooltipClass: 'elfinder-ui-tooltip ui-widget-shadow',
				track: true
			});
		}

		if (file && file.url == '1') {
			dialog.on('click', '.'+spclass+'-url', function(){
				$(this).parent().html(tpl.spinner.replace('{text}', fm.i18n('ntfurl')).replace('{name}', 'url'));
				fm.request({
					data : {cmd : 'url', target : file.hash},
					preventDefault : true
				})
				.fail(function() {
					replSpinner(name_esc, 'url');
				})
				.done(function(data) {
					if (data.url) {
						replSpinner('<a href="'+data.url+'" target="_blank">'+name_esc+'</a>' || name_esc, 'url');
						var rfile = fm.file(file.hash);
						rfile.url = data.url;
					} else {
						replSpinner(name_esc, 'url');
					}
				});
			});
		}

		// load thumbnail
		if (tmb) {
			$('<img/>')
				.on('load', function() { dialog.find('.elfinder-cwd-icon').addClass(tmb.className).css('background-image', "url('"+tmb.url+"')"); })
				.attr('src', tmb.url);
		}
		
		// send request to count total size
		if (count.length) {
			reqDfrd = fm.getSize(count).done(function(data) {
				replSpinner(data.formated, 'size');
			}).fail(function() {
				replSpinner(msg.unknown, 'size');
			});
		}
		
		// call custom actions
		if (customActions.length) {
			$.each(customActions, function(i, action) {
				try {
					action(file, fm, dialog);
				} catch(e) {
					fm.debug('error', e);
				}
			});
		}
		
		return $.Deferred().resolve();
	};
	
}).prototype = { forceLoad : true }; // this is required command
