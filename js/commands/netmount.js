"use strict"

elFinder.prototype.commands.netmount = function() {
	var self = this;

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.netDrivers = [];
	
	this.handlers = {
		load : function() {
			this.netDrivers = this.fm.netDrivers;
		}
	}

	this.inputs = {
		protocol : $('<select/>'),
		host     : $('<input type="text"/>'),
		port     : $('<input type="text"/>'),
		path     : $('<input type="text"/>'),
		user     : $('<input type="text"/>'),
		pass     : $('<input type="password"/>'),
	}

	this.getstate = function() {
		return this.netDrivers.length ? 0 : -1;
	}
	

	this._dialog = function() {
		var fm   = self.fm,
			opts = {
				title     : fm.i18n('netMountDialogTitle'),
				resizable : false,
				modal     : true,
				buttons   : {}
			},
			content = $('<table class="elfinder-info-tb elfinder-netmount-tb"/>')
			;

		opts.buttons[fm.i18n('btnMount')] = $.proxy(self._onsubmit, self);

		opts.buttons[fm.i18n('btnCancel')] = function() {
			self.dialog.elfinderdialog('close');
		}

		$.each(self.netDrivers, function(i, protocol) {
			self.inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(protocol)+'</option>');
		});


		$.each(self.inputs, function(name, input) {
			name != 'protocol' && input.addClass('ui-corner-all');
			content.append($('<tr/>').append($('<td>'+fm.i18n(name)+'</td>')).append($('<td/>').append(input)));
		});

		self.dialog = fm.dialog(content, opts);

	}

	this._onsubmit = function() {
		var data = {};

		$.each(self.inputs, function(name, input) {
			var val = input.val();

			if (val) {
				data[name] = val;
			}
		});

		if (!data.host) {
			self.fm.trigger('error', {error : 'errNetMountHostReq'});
		}

	}

	this.exec = function() {
		
		if (!self.dialog) {
			self._dialog();
			self.dfrd = $.Deferred();
		} else if (self.dialog.is(':hidden')) {
			$.each(self.inputs, function(i, input) {
				input.val('');
			})
		}

		self.dialog.elfinderdialog('open')

		return self.dfrd.promise();
	}
	

}