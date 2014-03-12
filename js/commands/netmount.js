"use strict"
/**
 * @class  elFinder command "netmount"
 * Mount network volume with user credentials.
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.netmount = function() {
	var self = this;

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.drivers = [];
	
	this.handlers = {
		load : function() {
			this.drivers = this.fm.netDrivers;
		}
	}

	this.getstate = function() {
		return this.drivers.length ? 0 : -1;
	}
	
	this.exec = function() {
		var fm = self.fm,
			dfrd = $.Deferred(),
			o = self.options,
			create = function() {
				var inputs = {
						protocol : $('<select/>').change(function(){
							var protocol = this.value;
							content.find('.elfinder-netmount-tr').hide();
							content.find('.elfinder-netmount-tr-'+protocol).show();
							if (typeof o[protocol].select == 'function') {
								o[protocol].select(fm);
							}
						})
					},
					opts = {
						title          : fm.i18n('netMountDialogTitle'),
						resizable      : false,
						modal          : true,
						destroyOnClose : true,
						close          : function() { 
							delete self.dialog; 
							dfrd.state() == 'pending' && dfrd.reject();
						},
						buttons        : {}
					},
					content = $('<table class="elfinder-info-tb elfinder-netmount-tb"/>'),
					hidden  = $('<div/>');

				content.append($('<tr/>').append($('<td>'+fm.i18n('protocol')+'</td>')).append($('<td/>').append(inputs.protocol)));

				$.each(self.drivers, function(i, protocol) {
					inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(protocol)+'</option>');
					$.each(o[protocol].inputs, function(name, input) {
						input.attr('name', name);
						if (input.attr('type') != 'hidden') {
							input.addClass('ui-corner-all elfinder-netmount-inputs-'+protocol);
							content.append($('<tr/>').addClass('elfinder-netmount-tr elfinder-netmount-tr-'+protocol).append($('<td>'+fm.i18n(name)+'</td>')).append($('<td/>').append(input)));
						} else {
							input.addClass('elfinder-netmount-inputs-'+protocol);
							hidden.append(input);
						}
					});
				});
				
				content.append(hidden);
				
				content.find('.elfinder-netmount-tr').hide();

				opts.buttons[fm.i18n('btnMount')] = function() {
					var protocol = inputs.protocol.val();
					var data = {cmd : 'netmount', protocol: protocol};
					$.each(content.find('input.elfinder-netmount-inputs-'+protocol), function(name, input) {
						var val;
						if (typeof input.val == 'function') {
							val = $.trim(input.val());
						} else {
							val = $.trim(input.value);
						}
						if (val) {
							data[input.name] = val;
						}
					});

					if (!data.host) {
						return self.fm.trigger('error', {error : 'errNetMountHostReq'});
					}

					self.fm.request({data : data, notify : {type : 'netmount', cnt : 1, hideCnt : true}})
						.done(function() { dfrd.resolve(); })
						.fail(function(error) { dfrd.reject(error); });

					self.dialog.elfinderdialog('close');	
				};

				opts.buttons[fm.i18n('btnCancel')] = function() {
					self.dialog.elfinderdialog('close');
				};
				
				return fm.dialog(content, opts).ready(function(){inputs.protocol.change();});
			}
			;
		
		fm.bind('netmount', function(e) {
			var d = e.data || null;
			if (d && d.protocol) {
				if (o[d.protocol] && typeof o[d.protocol].done == 'function') {
					o[d.protocol].done(fm, d);
				}
			}
		});

		if (!self.dialog) {
			self.dialog = create();
		}

		return dfrd.promise();
	}

}

elFinder.prototype.commands.netunmount = function() {
	var self = this;

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.drivers = [];
	
	this.handlers = {
		load : function() {
			this.drivers = this.fm.netDrivers;
		}
	};

	this.getstate = function(sel) {
		var fm = this.fm;
		return !!sel && this.drivers.length && !this._disabled && fm.file(sel[0]).netkey ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var self   = this,
			fm     = this.fm,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			drive  = fm.file(hashes[0]);

		if (this._disabled) {
			return dfrd.reject();
		}

		if (dfrd.state() == 'pending') {
			fm.confirm({
				title  : self.title,
				text   : fm.i18n('confirmUnmount', drive.name),
				accept : {
					label    : 'btnUnmount',
					callback : function() {  
						fm.request({
							data   : {cmd  : 'netmount', protocol : 'netunmount', host: drive.netkey, user : drive.hash, pass : 'dum'}, 
							notify : {type : 'netunmount', cnt : 1, hideCnt : true},
							preventFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							var chDrive = (fm.root() == drive.hash);
							data.removed = [ drive.hash ];
							fm.remove(data);
							if (chDrive) {
								var files = fm.files();
								for (var i in files) {
									if (fm.file(i).mime == 'directory') {
										fm.exec('open', i);
										break;
									}
								}
							}
							dfrd.resolve();
						});
					}
				},
				cancel : {
					label    : 'btnCancel',
					callback : function() { dfrd.reject(); }
				}
			});
		}
			
		return dfrd;
	};

};
