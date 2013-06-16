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
			create = function() {
				var inputs = {
						protocol : $('<select/>'),
						host     : $('<input type="text"/>'),
						port     : $('<input type="text"/>'),
						path     : $('<input type="text" value="/"/>'),
						user     : $('<input type="text"/>'),
						pass     : $('<input type="password"/>')
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
					content = $('<table class="elfinder-info-tb elfinder-netmount-tb"/>');

				$.each(self.drivers, function(i, protocol) {
					inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(protocol)+'</option>');
				});


				$.each(inputs, function(name, input) {
					name != 'protocol' && input.addClass('ui-corner-all');
					content.append($('<tr/>').append($('<td>'+fm.i18n(name)+'</td>')).append($('<td/>').append(input)));
				});

				opts.buttons[fm.i18n('btnMount')] = function() {
					var data = {cmd : 'netmount'};

					$.each(inputs, function(name, input) {
						var val = $.trim(input.val());

						if (val) {
							data[name] = val;
						}
					});

					if (!data.host) {
						return self.fm.trigger('error', {error : 'errNetMountHostReq'});
					}

					self.fm.request({data : data, notify : {type : 'netmount', cnt : 1}})
						.done(function() { dfrd.resolve(); })
						.fail(function(error) { dfrd.reject(error); });

					self.dialog.elfinderdialog('close');	
				}

				opts.buttons[fm.i18n('btnCancel')] = function() {
					self.dialog.elfinderdialog('close');
				}

				return fm.dialog(content, opts);
			}
			;

		if (!self.dialog) {
			self.dialog = create()
		}

		return dfrd.promise();
	}

}