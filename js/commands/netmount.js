"use strict";
/**
 * @class  elFinder command "netmount"
 * Mount network volume with user credentials.
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.netmount = function() {
	var self = this,
		content;

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
				var winFocus = function() {
						inputs.protocol.trigger('change', 'winfocus');
					},
					inputs = {
						protocol : $('<select/>')
						.on('click',function() {
							var $this = $(this);
							if ($this.data('keepFocus')) {
								$this.removeData('keepFocus');
							} else {
								$this.data('keepFocus', true);
							}
						})
						.on('change', function(e, data){
							var protocol = this.value;
							content.find('.elfinder-netmount-tr').hide();
							content.find('.elfinder-netmount-tr-'+protocol).show();
							dialogNode.children('.ui-dialog-buttonpane:first').find('button').show();
							if (typeof o[protocol].select == 'function') {
								o[protocol].select(fm, e, data);
							}
							setTimeout(function() {
								content.find('input:text.elfinder-tabstop:visible:first').focus();
							}, 20);
						})
						.addClass('ui-corner-all')
					},
					opts = {
						title          : fm.i18n('netMountDialogTitle'),
						resizable      : false,
						modal          : true,
						destroyOnClose : true,
						open           : function() {
							$(window).on('focus.'+fm.namespace, winFocus);
							inputs.protocol.change();
						},
						close          : function() { 
							//delete self.dialog; 
							dfrd.state() == 'pending' && dfrd.reject();
							$(window).off('focus.'+fm.namespace, winFocus);
						},
						buttons        : {}
					},
					doMount = function() {
						var protocol = inputs.protocol.val(),
							data = {cmd : 'netmount', protocol: protocol},
							cur = o[protocol];
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
							return fm.trigger('error', {error : 'errNetMountHostReq', opts : {modal: true}});
						}
	
						fm.request({data : data, notify : {type : 'netmount', cnt : 1, hideCnt : true}})
							.done(function(data) {
								var pdir;
								if (data.added && data.added.length) {
									if (data.added[0].phash) {
										if (pdir = fm.file(data.added[0].phash)) {
											if (! pdir.dirs) {
												pdir.dirs = 1;
												fm.change({ changed: [ pdir ] });
											}
										}
									}
									fm.one('netmountdone', function() {
										fm.exec('open', data.added[0].hash);
									});
								}
								dfrd.resolve();
							})
							.fail(function(error) {
								if (cur.fail && typeof cur.fail == 'function') {
									cur.fail(fm, error);
								}
								dfrd.reject(error);
							});
	
						self.dialog.elfinderdialog('close');
					},
					form = $('<form autocomplete="off"/>').on('keydown', 'input', function(e) {
						var comp = true,
							next;
						if (e.keyCode === $.ui.keyCode.ENTER) {
							$.each(form.find('input:visible:not(.elfinder-input-optional)'), function() {
								if ($(this).val() === '') {
									comp = false;
									next = $(this);
									return false;
								}
							});
							if (comp) {
								doMount();
							} else {
								next.focus();
							}
						}
					}),
					hidden  = $('<div/>'),
					dialog;

				content = $('<table class="elfinder-info-tb elfinder-netmount-tb"/>')
					.append($('<tr/>').append($('<td>'+fm.i18n('protocol')+'</td>')).append($('<td/>').append(inputs.protocol)));

				$.each(self.drivers, function(i, protocol) {
					if (o[protocol]) {
						inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(o[protocol].name || protocol)+'</option>');
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
						o[protocol].protocol = inputs.protocol;
					}
				});
				
				content.append(hidden);
				
				content.find('.elfinder-netmount-tr').hide();

				opts.buttons[fm.i18n('btnMount')] = doMount;

				opts.buttons[fm.i18n('btnCancel')] = function() {
					self.dialog.elfinderdialog('close');
				};
				
				content.find('select,input').addClass('elfinder-tabstop');
				
				dialog = fm.dialog(form.append(content), opts);
				dialogNode = dialog.closest('.ui-dialog');
				dialog.ready(function(){
					inputs.protocol.change();
					dialog.elfinderdialog('posInit');
				});
				return dialog;
			},
			dialogNode;
		
		if (!self.dialog) {
			self.dialog = create();
		} else {
			self.dialog.elfinderdialog('open');
		}

		return dfrd.promise();
	}

	self.fm.bind('netmount', function(e) {
		var d = e.data || null,
			o = self.options;
		if (d && d.protocol) {
			if (o[d.protocol] && typeof o[d.protocol].done == 'function') {
				o[d.protocol].done(self.fm, d);
				content.find('select,input').addClass('elfinder-tabstop');
				self.dialog.elfinderdialog('tabstopsInit');
			}
		}
	});

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
						var chDrive = (fm.root() == drive.hash),
							base = $('#'+fm.navHash2Id(drive.hash)).parent(),
							navTo = (base.next().length? base.next() : base.prev()).find('.elfinder-navbar-root');
						fm.request({
							data   : {cmd  : 'netmount', protocol : 'netunmount', host: drive.netkey, user : drive.hash, pass : 'dum'}, 
							notify : {type : 'netunmount', cnt : 1, hideCnt : true},
							preventFail : true
						})
						.fail(function(error) {
							dfrd.reject(error);
						})
						.done(function(data) {
							var open = fm.root();
							if (chDrive) {
								if (navTo.length) {
									open = fm.navId2Hash(navTo[0].id);
								} else {
									// fallback
									$.each(fm.files(), function(h, f) {
										if (f.mime == 'directory') {
											open = h;
											return null;
										}
									});
								}
								fm.exec('open', open);
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
