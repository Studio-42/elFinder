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
			port     : $('<input type="number" placeholder="21" class="elfinder-input-optional"/>'),
			path     : $('<input type="text" value="/"/>'),
			user     : $('<input type="text"/>'),
			pass     : $('<input type="password" autocomplete="new-password"/>'),
			encoding : $('<input type="text" placeholder="Optional" class="elfinder-input-optional"/>'),
			locale   : $('<input type="text" placeholder="Optional" class="elfinder-input-optional"/>')
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
	dropbox2: elFinder.prototype.makeNetmountOptionOauth('dropbox2', 'Dropbox', 'Dropbox', {noOffline : true, root : '/', pathI18n : 'path'}),
	googledrive: elFinder.prototype.makeNetmountOptionOauth('googledrive', 'Google Drive', 'Google'),
	onedrive: elFinder.prototype.makeNetmountOptionOauth('onedrive', 'One Drive', 'OneDrive'),
	box: elFinder.prototype.makeNetmountOptionOauth('box', 'Box', 'Box', {noOffline : true})
};
