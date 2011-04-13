
elFinder.prototype.commands.info = function() {
	var self = this;
	
	
	this._handlers = {
		// set folder(s) size in dialog
		size : function(e) {
			var cell = $('#'+e.data.id+' .elfinder-info-size'),
				size = parseInt(cell.find('.elfinder-info-fsize').text()) || 0;
			
			cell.text(self.fm.formatSize(e.data.size + size));
		}
	}
	
	// this._shortcuts = [{
	// 	pattern     : 'delete ctrl+backspace',
	// 	description : 'Delete',
	// 	callback    : function() { self.exec(); }
	// }];
	
	this._getstate = function() {
		return this._state.enabled;
	}
	
	this._exec = function() {
		var self       = this,
			fm         = this.fm,
			selected   = fm.selectedFiles(),
			length     = selected.length,
			html       = ['<table class="elfinder-info-tb">'],
			id         = 'elfinder-info-' + Math.random().toString().substr(2, 10),
			sizePlh    = fm.i18n('<span>Calculating</span> <span class="elfinder-spinner-mini"/>'),
			targets    = [],
			style      = '',
			title      = '',
			size       = 0, 
			foldersCnt = 0, 
			filesCnt   = 0,
			file;
			
		if (length <= 1) {
			file = length == 1 ? selected[0] : fm.cwd();

			if (file.tmb) {
				style = 'style="background:url(\''+((fm.isNewApi ? fm.param('tmbUrl') : '') + file.tmb)+'\') center center no-repeat"';
			}

			if (file.mime == 'directory' && !file.link) {
				title = 'Folder properies';
				size  = sizePlh;
				targets.push(file.hash);
			} else {
				title = file.link ? 'Alias properies' : 'File properies';
				size  = fm.formatSize(file.size);
			}
			
			html.unshift('<div class="ui-helper-clearfix elfinder-info-title"><span class="elfinder-cwd-icon '+fm.mime2class(file.mime)+' ui-corner-all" '+style+'/><strong>'+file.name+'</strong><span class="elfinder-info-kind">'+fm.i18n('Kind')+': '+(file.link ? fm.i18n('Alias') : fm.mime2kind(file.mime))+'</span></div>');
			html.push('<tr><td>'+fm.i18n('Size')+':</td><td class="elfinder-info-size">'+size+'</td></tr>');
			html.push('<tr><td>'+fm.i18n('Path')+':</td><td>'+fm.path(file)+'</td></tr>');
			if (file.linkTo) {
				html.push('<tr><td>'+fm.i18n('Alias for')+':</td><td>'+file.linkTo+'</td></tr>');
			}
			html.push('<tr><td>'+fm.i18n('Modified')+':</td><td>'+fm.formatDate(file.date)+'</td></tr>');
			html.push('<tr><td>'+fm.i18n('Permissions')+':</td><td>'+fm.formatPermissions(file)+'</td></tr>');
			if (file.dim) {
				html.push('<tr><td>'+fm.i18n('Dimensions')+':</td><td>'+file.dim+'</td></tr>');
			}
		} else {
			while (length--) {
				file = selected[length];
				if (file.mime == 'directory' && !file.link) {
					foldersCnt++;
					targets.push(file.hash);
				} else {
					filesCnt++;
					size += parseInt(file.size);
				}
			}
			title = 'Files properies';
			size  = foldersCnt ? sizePlh+'<span class="elfinder-info-fsize">'+size+'</span>' : fm.formatSize(size);
			html.push('<tr><td style="width:35%">'+fm.i18n('Folders')+':</td><td>'+foldersCnt+'</td></tr>');
			html.push('<tr><td>'+fm.i18n('Files')+':</td><td>'+filesCnt+'</td></tr>');
			html.push('<tr><td>'+fm.i18n('Size')+':</td><td class="elfinder-info-size">'+size+'</td></tr>');
		}
		
		html.push('</table>');
		
		if (fm.isNewApi && targets.length) {
			fm.ajax({
				cmd     : 'size',
				id      : id,
				targets : targets
			}, 'silent')
		}
		
		fm.dialog(html.join(''), {
			title     : fm.i18n(title),
			resizable : true,
			// expand dialog width to content width
			focus : function() {
				var w = $(this).find('table').outerWidth(), mw;

				if (w > $(this).width()) {
					mw = parseInt($(window).width()/2);
					$(this).dialog('option', 'width', w < mw ? w+12 : mw);
				}
			},
			buttons : {
				Ok : function() { $(this).dialog('close'); }
			}
		}).attr('id', id)
	}

}