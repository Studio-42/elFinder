
elFinder.prototype.commands.info = function() {
	
	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}</div><table class="elfinder-info-tb">{content}</table>',
		itemTitle  : '<strong>{name}</strong><span class="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		row        : '<tr><td>{label} : </td><td>{value}</td></tr>',
		spinner    : '<span>{text}</span> <span class="elfinder-spinner-mini"/>'
	}
	
	
	this.alwaysEnabled = true;
	
	this.shortcuts = [{
		pattern     : 'ctrl+i',
		description : 'Get info'
	}];
	
	this.getstate = function() {
		return this.fm.cwd().hash ? 0 : -1;
	}
	
	this._exec = function() {
		var self    = this,
			fm      = this.fm,
			tpl     = this.tpl,
			row     = tpl.row,
			files   = fm.selected().length ? fm.selectedFiles() : [fm.cwd()],
			cnt     = files.length,
			content = [],
			view    = tpl.main,
			l       = '{label}',
			v       = '{value}',
			dialog = fm.dialog('<div/>', {
				title    : fm.i18n('Info'),
				autoOpen : false,
				width    : 270,
				minWidth : 200,
				close    : function() { $(this).elfinderdialog('destroy'); }
			}),
			count = [],
			size,
			tmb,
			file,
			title;
			
		if (!cnt) {
			return $.Deferred().reject();
		}
			
		if (cnt == 1) {
			file  = files[0];
			view  = view.replace('{class}', fm.mime2class(file.mime));
			title = tpl.itemTitle.replace('{name}', file.name).replace('{kind}', fm.mime2kind(file));
			
			if (file.tmb) {
				tmb = fm.option('tmbUrl')+file.tmb;
			}
			
			if (!file.read) {
				size = fm.i18n('unknown');
			} else if (file.mime != 'directory' || fm.oldAPI) {
				size = fm.formatSize(file.size);
			} else {
				size = tpl.spinner.replace('{text}', fm.i18n('Calculating'));
				count.push(file.hash);
			}
			
			content.push(row.replace(l, fm.i18n('Size')).replace(v, size));
			file.linkTo && content.push(row.replace(l, fm.i18n('Alias for')).replace(v, file.linkTo));
			content.push(row.replace(l, fm.i18n('Path')).replace(v, fm.path(file.hash)));
			content.push(row.replace(l, 'URL').replace(v,  '<a href="'+fm.url(file.hash)+'" target="_blank">'+file.name+'</a>'));
			file.dim && content.push(row.replace(l, fm.i18n('Dimensions')).replace(v, file.dim));
			content.push(row.replace(l, fm.i18n('Modified')).replace(v, fm.formatDate(file.date)));
			content.push(row.replace(l, fm.i18n('Access')).replace(v, fm.formatPermissions(file)));
			content.push(row.replace(l, fm.i18n('Locked')).replace(v, fm.i18n(file.locked ? 'yes' : 'no')));

		} else {
			
		}
		
		view = view.replace('{title}', title).replace('{content}', content.join(''));
		
		dialog.append(view).elfinderdialog('open');

		// load thumbnail
		if (tmb) {
			$('<img src="'+tmb+'"/>').load(function() {
				dialog.find('.elfinder-cwd-icon').css('background', 'url("'+tmb+'") center center no-repeat');
				$(this).unbind('load');
			});
		}
		
		// send request to count total size
		if (count.length) {
			fm.ajax({
					data : {cmd : 'size', targets : count},
					preventDefault : true
				})
				.fail(function() {
					dialog.find('.elfinder-spinner-mini').parent().text(fm.i18n('unknown'));
				})
				.done(function(data) {
					var size = parseInt(data.size);
					dialog.find('.elfinder-spinner-mini').parent().text(size >= 0 ? fm.formatSize(size) : fm.i18n('unknown'));
				});
		}
		
	}
	
	this._exec_ = function() {
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
			targets = fm.newAPI
				? length >1 || files[0].mime == 'directory' 
					? $.map(files, function(f) { return f.mime == 'directory' && f.read && !f.link ? f.hash : null }) 
					: []
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
			title = tpl.title.replace('{name}', fm.i18n('Items')+': '+length).replace('{class}', 'elfinder-cwd-icon-group')
			dirs  = $.map(files, function(f) { return f.mime == 'directory' && !f.link ? 1 : null; }).length;
			dirs && kinds.push(fm.i18n('Folders')+': '+dirs);
			dirs < length && kinds.push(fm.i18n('Documents')+': '+(length-dirs));
			$.each(files, function(h, f) { size += parseInt(f.size); });

			content.push(tpl.row.replace('{label}', fm.i18n('Kind')).replace('{value}', kinds.join(', ')));
			content.push(tpl.row.replace('{label}', fm.i18n('Size')).replace('{value}', !targets.length ? fm.formatSize(size) : '<span>'+fm.i18n('Calculating')+'</span> <span class="elfinder-spinner-mini"/>'));
			content.push(tpl.row.replace('{label}', fm.i18n('Path')).replace('{value}', fm.cwd().path));
		}
		
		content = tpl.main.replace('{title}', title).replace('{content}', content.join('')).replace(/\{[a-z0-9]+\}/g, '');
		
		dialog = fm.dialog(content, {
			title     : fm.i18n('Info'),
			resizable : true,
			width     : 220,
			minWidth  : 230,
			focus     : function() {
				var $this = $(this),
					w = $this.find('table').outerWidth(), 
					max;

				// expand dialog width to content width
				if (w > $this.width()) {
					max = parseInt($(window).width()/2);
					w = w < max ? w+14 : max;
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
