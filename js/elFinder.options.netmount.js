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
			FTPS     : $('<input type="checkbox" value="1" title="File Transfer Protocol over SSL/TLS"/>'),
			encoding : $('<input type="text" placeholder="Optional" class="elfinder-input-optional"/>'),
			locale   : $('<input type="text" placeholder="Optional" class="elfinder-input-optional"/>')
		}
	},
	dropbox2: elFinder.prototype.makeNetmountOptionOauth('dropbox2', 'Dropbox', 'Dropbox', {noOffline : true, root : '/', pathI18n : 'path'}),
	googledrive: elFinder.prototype.makeNetmountOptionOauth('googledrive', 'Google Drive', 'Google'),
	onedrive: elFinder.prototype.makeNetmountOptionOauth('onedrive', 'One Drive', 'OneDrive'),
	box: elFinder.prototype.makeNetmountOptionOauth('box', 'Box', 'Box', {noOffline : true})
};
