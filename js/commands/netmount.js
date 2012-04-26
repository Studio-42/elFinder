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
							!dfrd.isResolved() && !dfrd.isRejected() && dfrd.reject();
						},
						buttons        : {}
					},
					content = $('<table class="elfinder-info-tb elfinder-netmount-tb"/>');

				content.append($('<tr/>').append($('<td>'+fm.i18n('protocol')+'</td>')).append($('<td/>').append(inputs.protocol)));

				$.each(self.drivers, function(i, protocol) {
					inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(protocol)+'</option>');
					$.each(o[protocol].inputs, function(name, input) {
						input.addClass('ui-corner-all elfinder-netmount-inputs-'+protocol);
						input.attr('name', name);
						content.append($('<tr/>').addClass('elfinder-netmount-tr elfinder-netmount-tr-'+protocol).append($('<td>'+fm.i18n(name)+'</td>')).append($('<td/>').append(input)));
					});
				});
				
				content.find('.elfinder-netmount-tr').hide();
				inputs.protocol.change();

				opts.buttons[fm.i18n('btnMount')] = function() {
					var protocol = inputs.protocol.val();
					var data = {cmd : 'netmount', protocol: protocol};
					$.each(content.find('input.elfinder-netmount-inputs-'+protocol), function(name, input) {
						var val = $.trim(input.value || input.val());

						if (val) {
							data[input.name] = val;
						}
					});

					if (!data.host) {
						return self.fm.trigger('error', {error : 'errNetMountHostReq'});
					}

					self.fm.request({data : data, notify : {type : 'netmount', cnt : 1}})
						.done(function() { dfrd.resolve(); })
						.fail(function(error) { dfrd.reject(error); });

					self.dialog.elfinderdialog('close');	
				};

				opts.buttons[fm.i18n('btnCancel')] = function() {
					self.dialog.elfinderdialog('close');
				};
				
				return fm.dialog(content, opts);
			}
			;

		if (!self.dialog) {
			self.dialog = create();
		}

		return dfrd.promise();
	}

}