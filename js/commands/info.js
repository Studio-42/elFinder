"use strict";
/**
 * @class elFinder command "info". 
 * Display dialog with file properties.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.info = function() {
	var m   = 'msg',
		fm  = this.fm,
		msg = {
			calc     : fm.res(m, 'calc'),
			size     : fm.res(m, 'size'),
			unknown  : fm.res(m, 'unknown'),
			path     : fm.res(m, 'path'),
			aliasfor : fm.res(m, 'aliasfor'),
			modify   : fm.res(m, 'modify'),
			perms    : fm.res(m, 'perms'),
			locked   : fm.res(m, 'locked'),
			dim      : fm.res(m, 'dim'),
			kind     : fm.res(m, 'kind'),
			files    : fm.res(m, 'files'),
			folders  : fm.res(m, 'folders'),
			items    : fm.res(m, 'items'),
			yes      : fm.res(m, 'yes'),
			no       : fm.res(m, 'no'),
			link     : fm.res(m, 'link')
		};
	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}</div><table class="elfinder-info-tb">{content}</table>',
		itemTitle  : '<strong>{name}</strong><span class="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		row        : '<tr><td>{label} : </td><td>{value}</td></tr>',
		spinner    : '<span>{text}</span> <span class="elfinder-spinner-mini"/>'
	}
	
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+i'
	}];
	
	this.init = function() {
		$.each(msg, function(k, v) {
			msg[k] = fm.i18n(v);
		});
	}
	
	this.getstate = function() {
		return 0;
	}
	
	this.exec = function(hashes) {
		var self    = this,
			fm      = this.fm,
			tpl     = this.tpl,
			row     = tpl.row,
			files   = this.files(hashes),
			cnt     = files.length,
			content = [],
			view    = tpl.main,
			l       = '{label}',
			v       = '{value}',
			opts    = {
				title    : this.title,
				// autoOpen : false,
				// width    : 270,
				// test in ie >_<
				width : 'auto',
				close : function() { $(this).elfinderdialog('destroy'); }
			},
			count = [],
			dialog, size, tmb, file, title, dcnt;
			
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
				size = msg.unknown;
			} else if (file.mime != 'directory' || file.alias) {
				size = fm.formatSize(file.size);
			} else {
				size = tpl.spinner.replace('{text}', msg.calc);
				count.push(file.hash);
			}
			
			content.push(row.replace(l, msg.size).replace(v, size));
			file.alias && content.push(row.replace(l, msg.aliasfor).replace(v, file.alias));
			content.push(row.replace(l, msg.path).replace(v, fm.escape(fm.path(file.hash))));
			file.read && content.push(row.replace(l, msg.link).replace(v,  '<a href="'+fm.url(file.hash)+'" target="_blank">'+file.name+'</a>'));
			file.dim && content.push(row.replace(l, msg.dim).replace(v, file.dim));
			content.push(row.replace(l, msg.modify).replace(v, fm.formatDate(file.date)));
			content.push(row.replace(l, msg.perms).replace(v, fm.formatPermissions(file)));
			content.push(row.replace(l, msg.locked).replace(v, file.locked ? msg.yes : msg.no));
		} else {
			view  = view.replace('{class}', 'elfinder-cwd-icon-group');
			title = tpl.groupTitle.replace('{items}', msg.items).replace('{num}', cnt);
			dcnt  = $.map(files, function(f) { return f.mime == 'directory' ? 1 : null }).length;
			if (!dcnt) {
				size = 0;
				$.each(files, function(h, f) { size += f.size;});
				content.push(row.replace(l, msg.kind).replace(v, msg.files));
				content.push(row.replace(l, msg.size).replace(v, fm.formatSize(size)));
			} else {
				content.push(row.replace(l, msg.kind).replace(v, dcnt == cnt ? msg.folders : msg.folders+' '+dcnt+', '+msg.files+' '+(cnt-dcnt)))
				content.push(row.replace(l, msg.size).replace(v, tpl.spinner.replace('{text}', msg.calc)));
				count = $.map(files, function(f) { return f.hash });
			}
		}
		
		view = view.replace('{title}', title).replace('{content}', content.join(''));
		
		dialog = fm.dialog(view, opts)
		
		// load thumbnail
		if (tmb) {
			$('<img/>')
				.load(function() { dialog.find('.elfinder-cwd-icon').css('background', 'url("'+tmb+'") center center no-repeat'); })
				.attr('src', tmb);
		}
		
		// send request to count total size
		if (count.length) {
			fm.request({
					data : {cmd : 'size', targets : count},
					preventDefault : true
				})
				.fail(function() {
					dialog.find('.elfinder-spinner-mini').parent().text(msg.unknown);
				})
				.done(function(data) {
					var size = parseInt(data.size);
					dialog.find('.elfinder-spinner-mini').parent().text(size >= 0 ? fm.formatSize(size) : msg.unknown);
				});
		}
		
	}
	
}
