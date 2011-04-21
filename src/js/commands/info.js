
elFinder.prototype.commands.info = function() {
	var self = this;
	
	this._shortcuts = [{
		pattern     : 'ctrl+i',
		description : 'Delete',
		callback    : function() { self.exec(); }
	}];
	
	this._getstate = function() {
		return this._state.enabled;
	}
	
	this._exec = function() {
		var self    = this,
			fm      = this.fm,
			tpl     = this.options.tpl,
			renders = this.options.renders,
			title   = '',
			content = [],
			size    = 0,
			kinds   = [],
			files   = fm.selected().length ? fm.selectedFiles() : [fm.cwd()],
			length  = files.length,
			targets = fm.isNewApi
				? length >1 || files[0].mime == 'directory' ? $.map(files, function(f) { return f.mime == 'directory' && f.read && !f.link ? f.hash : null }) : []
				: [],
			updatesize = function(size) {
				dialog.find('.elfinder-spinner-mini').parents('td:first').text(typeof(size) == 'number' ? fm.formatSize(size) : fm.i18n('unknown'));
			},
			dialog,	dirs;
		
		if (length == 1) {
			$.each(renders, function(name, r) {
				var html;
				if (name == 'title') {
					title = r(files[0], tpl.title, fm);
				} else {
					html = r(files[0], tpl.row, fm);
					html && content.push(html);
				}
			});
		} else {
			title = tpl.title.replace('{name}', fm.i18n('Items')+': '+length)
			dirs  = $.map(files, function(f) { return f.mime == 'directory' && !f.link ? 1 : null; }).length;
			dirs && kinds.push(fm.i18n('Folders')+': '+dirs);
			dirs < length && kinds.push(fm.i18n('Documents')+': '+(length-dirs));
			$.each(files, function(h, f) { size += f.size });
			
			content.push(tpl.row.replace('{label}', fm.i18n('Kind')).replace('{value}', kinds.join(', ')));
			content.push(tpl.row.replace('{label}', fm.i18n('Size')).replace('{value}', !targets.length ? fm.formatSize(size) : '<span>'+fm.i18n('Calculating')+'</span> <span class="elfinder-spinner-mini"/>'));
			content.push(tpl.row.replace('{label}', fm.i18n('Path')).replace('{value}', fm.cwd().path));
			
		}
		
		content = tpl.main.replace('{title}', title).replace('{content}', content.join('')).replace(/\{[a-z0-9]+\}/g, '');
		
		dialog = fm.dialog(content, {
			title     : fm.i18n('Info'),
			resizable : true,
			width     : 220,
			minWidth  : 220,
			focus     : function() {
				var $this = $(this),
					w = $this.find('table').outerWidth(), 
					max;

				// expand dialog width to content width
				if (w > $this.width()) {
					max = parseInt($(window).width()/2);
					w = w < max ? w+12 : max;
					$this.dialog('option', 'width', w).dialog('option', 'minWidth', w);
				}
				$this.dialog('option', 'focus', null);
			}
		});
		
		targets.length && fm.ajax({
			data    : {cmd : 'size', targets : targets},
			error   : function() { updatesize() },
			success : function(data) { updatesize(data && data.size >= 0 ? parseInt(size + data.size) : '' ); }
		}, 'silent');
		
	}
	
}

elFinder.prototype.commands.info.prototype.options = {
	tpl : {
		main  : '{title}<table class="elfinder-info-tb">{content}</table>',
		title : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all" style="{style}"/><strong>{name}</strong><span class="elfinder-info-kind">{kind}</span></div>',
		row   : '<tr><td>{label} : </td><td>{value}</td></tr>'
	},
	renders : {
		title  : function(f, tpl, fm) {
			return tpl
				.replace('{class}', fm.mime2class(f.mime))
				.replace('{style}', f.tmb ? 'background:url(\''+((fm.isNewApi ? fm.cwd().tmbUrl : '') + f.tmb)+'\') center center no-repeat' : '')
				.replace('{name}', f.name)
				.replace('{kind}', fm.mime2kind(f))
		},
		kind : function(f, tpl, fm) {
			return tpl.replace('{label}', fm.i18n('Kind')).replace('{value}',fm.mime2kind(f)); 
		},
		size   : function(f, tpl, fm) {
			var size = fm.formatSize(f.size);
			
			if (fm.isNewApi && f.mime == 'directory' && !f.link) {
				size = f.read ? '<span>'+fm.i18n('Calculating')+'</span> <span class="elfinder-spinner-mini"/>' : fm.i18n('unknown');
			}
			
			return tpl.replace('{label}', fm.i18n('Size')).replace('{value}', size);
		},
		path   : function(f, tpl, fm) {
			return tpl.replace('{label}', fm.i18n('Path')).replace('{value}', fm.path(f))
		},
		url : function(f, tpl, fm) {
			var url = f.mime != 'directory' ? fm.url(f) : '';

			return url ? tpl.replace('{label}', fm.i18n('Link')).replace('{value}', '<a href="'+url+'" target="_blank">'+f.name+'</a>') : ''
		},
		linkTo : function(f, tpl, fm) {
			return f.link
				? tpl.replace('{label}', fm.i18n('Alias for')).replace('{value}', f.linkTo)
				: '';
		},
		date   : function(f, tpl, fm) {
			return tpl.replace('{label}', fm.i18n('Modified')).replace('{value}', fm.formatDate(f.date))
		},
		dim    : function(f, tpl, fm) {
			return f.dim 
				? tpl.replace('{label}', fm.i18n('Dimensions')).replace('{value}', f.dim)
				: '';
		},
		perms : function(f, tpl, fm) {
			return tpl.replace('{label}', fm.i18n('Access')).replace('{value}', fm.formatPermissions(f));
		},

		locked : function(f, tpl, fm) {
			return tpl.replace('{label}', fm.i18n('Locked')).replace('{value}', fm.i18n(f.locked ? 'yes' : 'no'));
		}
	}
}
