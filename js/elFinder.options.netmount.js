/**
 * Default elFinder config of commandsOptions.netmount
 *
 * @type  Object
 */

elFinder.prototype._options.commandsOptions.netmount = {
	ftp: {
		name : 'FTP',
		inputs: {
			host     : $('<input type="text"/>'),
			port     : $('<input type="text" placeholder="21"/>'),
			path     : $('<input type="text" value="/"/>'),
			user     : $('<input type="text"/>'),
			pass     : $('<input type="password"/>'),
			encoding : $('<input type="text" placeholder="Optional"/>'),
			locale   : $('<input type="text" placeholder="Optional"/>')
		}
	},
	dropbox: {
		name : 'Dropbox.com',
		inputs: {
			host     : $('<span><span class="elfinder-info-spinner"/></span></span><input type="hidden"/>'),
			path     : $('<input type="text" value="/"/>'),
			user     : $('<input type="hidden"/>'),
			pass     : $('<input type="hidden"/>')
		},
		select: function(fm){
			var self = this;
			if (self.inputs.host.find('span').length) {
				fm.request({
					data : {cmd : 'netmount', protocol: 'dropbox', host: 'dropbox.com', user: 'init', pass: 'init', options: {url: fm.uploadURL, id: fm.id}},
					preventDefault : true
				}).done(function(data){
					self.inputs.host.find('span').removeClass("elfinder-info-spinner");
					self.inputs.host.find('span').html(data.body.replace(/\{msg:([^}]+)\}/g, function(whole,s1){return fm.i18n(s1,'Dropbox.com');}));
				}).fail(function(){});
			}					
		},
		done: function(fm, data){
			var self = this;
			if (data.mode == 'makebtn') {
				self.inputs.host.find('span').removeClass("elfinder-info-spinner");
				self.inputs.host.find('input').hover(function(){$(this).toggleClass("ui-state-hover");});
				self.inputs.host[1].value = "";
			} else {
				self.inputs.host.find('span').removeClass("elfinder-info-spinner");
				self.inputs.host.find('span').html("Dropbox.com");
				self.inputs.host[1].value = "dropbox";
				self.inputs.user.val("done");
				self.inputs.pass.val("done");
			}
		}
	},
	googledrive: {
		name : 'GoogleDrive',
		inputs: {
			offline  : $('<input type="checkbox"/>').on('change', function() {
				$(this).parents('table.elfinder-netmount-tb').find('select:first').trigger('change', 'reset');
			}),
			host     : $('<span><span class="elfinder-info-spinner"/></span><input type="hidden"/>'),
			path     : $('<input type="text" value="root"/>'),
			user     : $('<input type="hidden"/>'),
			pass     : $('<input type="hidden"/>')
		},
		select: function(fm, ev, data){
			var f = this.inputs, oline = f.offline, f0 = $(f.host[0]),
				data = data || null;
			if (! f0.data('inrequest')
					&& (f0.find('span.elfinder-info-spinner').length
						|| data === 'reset'
						|| (data === 'winfocus' && ! f0.siblings('span.elfinder-button-icon-reload').length))
						)
			{
				if (oline.parent().children().length === 1) {
					f.path.parent().prev().html(fm.i18n('folderId'));
					oline.attr('title', fm.i18n('offlineAccess'));
					oline.uniqueId().after($('<label/>').attr('for', oline.attr('id')).html(' '+fm.i18n('offlineAccess')));
				}
				f0.data('inrequest', true).empty().addClass('elfinder-info-spinner')
					.parent().find('span.elfinder-button-icon').remove();
				fm.request({
					data : {cmd : 'netmount', protocol: 'googledrive', host: 'google.com', user: 'init', options: {id: fm.id, offline: oline.prop('checked')? 1:0, pass: f.host[1].value}},
					preventDefault : true
				}).done(function(data){
					f0.removeClass("elfinder-info-spinner").html(data.body.replace(/\{msg:([^}]+)\}/g, function(whole,s1){return fm.i18n(s1,'Google.com');}));
				});
			} else {
				oline.parent().parent()[f.user.val()? 'hide':'show']();
			}
		},
		done: function(fm, data){
			var f = this.inputs, p = this.protocol, f0 = $(f.host[0]), f1 = $(f.host[1]);
			if (data.mode == 'makebtn') {
				f0.removeClass('elfinder-info-spinner');
				f.host.find('input').hover(function(){$(this).toggleClass('ui-state-hover');});
				f1.val('');
				f.path.val('root').next().remove();
				f.user.val('');
				f.pass.val('');
				f.offline.parent().parent().show();
			} else {
				f0.html('Google.com&nbsp;').removeClass('elfinder-info-spinner');
				if (data.reset) {
					p.trigger('change', 'reset');
					return;
				}
				f0.parent().append($('<span class="elfinder-button-icon elfinder-button-icon-reload" title="'+fm.i18n('reAuth')+'">')
					.on('click', function() {
						f1.val('reauth');
						p.trigger('change', 'reset');
					}));
				f1.val('googledrive');
				if (data.folders) {
					f.path.next().remove().end().after(
						$('<div/>').append(
							$('<select class="ui-corner-all" style="max-width:200px;">').append(
								$($.map(data.folders, function(n,i){return '<option value="'+i+'">'+fm.escape(n)+'</option>'}).join(''))
							).on('change', function(){f.path.val($(this).val());})
						)
					);
				}
				f.user.val('done');
				f.pass.val('done');
				f.offline.parent().parent().hide();
			}
			f0.removeData('inrequest');
		},
		fail: function(fm, err){
			this.protocol.trigger('change', 'reset');
			f0.removeData('inrequest');
		}
	}
};
