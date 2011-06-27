"use strict";
/**
 * @class elFinder command "info". 
 * Display dialog with file properties.
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.info = function() {
	var title = 'Get info';
	
	this.tpl = {
		main       : '<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon {class} ui-corner-all"/>{title}</div><table class="elfinder-info-tb">{content}</table>',
		itemTitle  : '<strong>{name}</strong><span class="elfinder-info-kind">{kind}</span>',
		groupTitle : '<strong>{items}: {num}</strong>',
		row        : '<tr><td>{label} : </td><td>{value}</td></tr>',
		spinner    : '<span>{text}</span> <span class="elfinder-spinner-mini"/>'
	}
	
	this.title = title;
	this.alwaysEnabled = true;
	this.updateOnSelect = false;
	this.shortcuts = [{
		pattern     : 'ctrl+i',
		description : title
	}];
	
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
			dialog = fm.dialog('<div/>', {
				title    : fm.i18n('Info'),
				autoOpen : false,
				// width    : 270,
				// test in ie >_<
				width : 'auto',
				minWidth : 200,
				close    : function() { $(this).elfinderdialog('destroy'); }
			}),
			count = [],
			size, tmb, file, title, dcnt;
			
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
			view  = view.replace('{class}', 'elfinder-cwd-icon-group');
			title = tpl.groupTitle.replace('{items}', fm.i18n('Items')).replace('{num}', cnt);
			dcnt  = $.map(files, function(f) { return f.mime == 'directory' ? 1 : null }).length;
			if (!dcnt) {
				size = 0;
				$.each(files, function(h, f) { size += f.size;});
				content.push(row.replace(l, fm.i18n('Kind')).replace(v, fm.i18n('Files')));
				content.push(row.replace(l, fm.i18n('Size')).replace(v, fm.formatSize(size)));
			} else {
				content.push(row.replace(l, fm.i18n('Kind')).replace(v, dcnt == cnt ? fm.i18n('Folders') : fm.i18n('Folders')+' '+dcnt+', '+fm.i18n('Files')+' '+(cnt-dcnt)))
				content.push(row.replace(l, fm.i18n('Size')).replace(v, tpl.spinner.replace('{text}', fm.i18n('Calculating'))));
				count = $.map(files, function(f) { return f.hash });
			}
		}
		
		view = view.replace('{title}', title).replace('{content}', content.join(''));
		
		dialog.append(view).elfinderdialog('open');

		// load thumbnail
		if (tmb) {
			$('<img/>')
				.load(function() { dialog.find('.elfinder-cwd-icon').css('background', 'url("'+tmb+'") center center no-repeat'); })
				.attr('src', tmb);
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
	
}
