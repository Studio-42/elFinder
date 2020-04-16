/**
 * @class  elFinder command "netmount"
 * Mount network volume with user credentials.
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.netmount = function() {
	"use strict";
	var self = this,
		hasMenus = false,
		content;

	this.alwaysEnabled  = true;
	this.updateOnSelect = false;

	this.drivers = [];
	
	this.handlers = {
		load : function() {
			var fm = self.fm;
			if (fm.cookieEnabled) {
				fm.one('open', function() {
					self.drivers = fm.netDrivers;
					if (self.drivers.length) {
						$.each(self.drivers, function() {
							var d = self.options[this];
							if (d) {
								hasMenus = true;
								if (d.integrateInfo) {
									fm.trigger('helpIntegration', Object.assign({cmd: 'netmount'}, d.integrateInfo));
								}
							}
						});
					}
				});
			}
		}
	};

	this.getstate = function() {
		return hasMenus ? 0 : -1;
	};
	
	this.exec = function() {
		var fm = self.fm,
			dfrd = $.Deferred(),
			o = self.options,
			create = function() {
				var winFocus = function() {
						inputs.protocol.trigger('change', 'winfocus');
					},
					inputs = {
						protocol : $('<select></select>')
						.on('change', function(e, data){
							var protocol = this.value;
							content.find('.elfinder-netmount-tr').hide();
							content.find('.elfinder-netmount-tr-'+protocol).show();
							dialogNode && dialogNode.children('.ui-dialog-buttonpane:first').find('button').show();
							if (typeof o[protocol].select == 'function') {
								o[protocol].select(fm, e, data);
							}
						})
						.addClass('ui-corner-all')
					},
					opts = {
						title          : fm.i18n('netMountDialogTitle'),
						resizable      : true,
						modal          : true,
						destroyOnClose : false,
						open           : function() {
							$(window).on('focus.'+fm.namespace, winFocus);
							inputs.protocol.trigger('change');
						},
						close          : function() { 
							dfrd.state() == 'pending' && dfrd.reject();
							$(window).off('focus.'+fm.namespace, winFocus);
						},
						buttons        : {}
					},
					doMount = function() {
						var protocol = inputs.protocol.val(),
							data = {cmd : 'netmount', protocol: protocol},
							cur = o[protocol],
							mnt2res;
						$.each(content.find('input.elfinder-netmount-inputs-'+protocol), function(name, input) {
							var val, elm;
							elm = $(input);
							if (elm.is(':radio,:checkbox')) {
								if (elm.is(':checked')) {
									val = $.trim(elm.val());
								}
							} else {
								val = $.trim(elm.val());
							}
							if (val) {
								data[input.name] = val;
							}
						});

						if (!data.host) {
							return fm.trigger('error', {error : 'errNetMountHostReq', opts : {modal: true}});
						}

						if (data.mnt2res) {
							mnt2res = true;
						}

						fm.request({data : data, notify : {type : 'netmount', cnt : 1, hideCnt : true}})
							.done(function(data) {
								var pdir;
								if (data.added && data.added.length) {
									mnt2res && inputs.protocol.trigger('change', 'reset');
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
									cur.fail(fm, fm.parseError(error));
								}
								dfrd.reject(error);
							});
	
						self.dialog.elfinderdialog('close');
					},
					form = $('<form autocomplete="off"></form>').on('keydown', 'input', function(e) {
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
								next.trigger('focus');
							}
						}
					}),
					hidden  = $('<div></div>'),
					dialog;

				content = $('<table class="elfinder-info-tb elfinder-netmount-tb"></table>')
					.append($('<tr></tr>').append($('<td>'+fm.i18n('protocol')+'</td>')).append($('<td></td>').append(inputs.protocol)));

				$.each(self.drivers, function(i, protocol) {
					if (o[protocol]) {
						inputs.protocol.append('<option value="'+protocol+'">'+fm.i18n(o[protocol].name || protocol)+'</option>');
						$.each(o[protocol].inputs, function(name, input) {
							input.attr('name', name);
							if (input.attr('type') != 'hidden') {
								input.addClass('ui-corner-all elfinder-netmount-inputs-'+protocol);
								content.append($('<tr></tr>').addClass('elfinder-netmount-tr elfinder-netmount-tr-'+protocol).append($('<td>'+fm.i18n(name)+'</td>')).append($('<td></td>').append(input)));
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
				content.find('.elfinder-netmount-tr-' + self.drivers[0]).show();

				opts.buttons[fm.i18n('btnMount')] = doMount;

				opts.buttons[fm.i18n('btnCancel')] = function() {
					self.dialog.elfinderdialog('close');
				};
				
				content.find('select,input').addClass('elfinder-tabstop');
				
				dialog = self.fmDialog(form.append(content), opts).ready(function() {
					inputs.protocol.trigger('change');
					dialog.elfinderdialog('posInit');
				});
				dialogNode = dialog.closest('.ui-dialog');
				return dialog;
			},
			dialogNode;
		
		if (!self.dialog) {
			self.dialog = create();
		} else {
			self.dialog.elfinderdialog('open');
		}

		return dfrd.promise();
	};

	self.fm.bind('netmount', function(e) {
		var d = e.data || null,
			o = self.options,
			done = function() {
				if (o[d.protocol] && typeof o[d.protocol].done == 'function') {
					o[d.protocol].done(self.fm, d);
					content.find('select,input').addClass('elfinder-tabstop');
					self.dialog.elfinderdialog('tabstopsInit');
				}
			};
		if (d && d.protocol) {
			if (d.mode && d.mode === 'redirect') {
				// To support of third-party cookie blocking (ITP) on CORS
				// On iOS and iPadOS 13.4 and Safari 13.1 on macOS, the session cannot be continued when redirecting OAuth in CORS mode
				self.fm.request({
					data : {cmd : 'netmount', protocol : d.protocol, host: d.host, user : 'init', pass : 'return', options: d.options}, 
					preventDefault : true
				}).done(function(data) {
					d = JSON.parse(data.body);
					done();
				});
			} else {
				done();
			}
		}
	});

};

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
		var fm = this.fm,
			file;
		return !!sel && this.drivers.length && !this._disabled && (file = fm.file(sel[0])) && file.netkey ? 0 : -1;
	};
	
	this.exec = function(hashes) {
		var self   = this,
			fm     = this.fm,
			dfrd   = $.Deferred()
				.fail(function(error) {
					error && fm.error(error);
				}),
			drive  = fm.file(hashes[0]),
			childrenRoots = function(hash) {
				var roots = [],
					work;
				if (fm.leafRoots) {
					work = [];
					$.each(fm.leafRoots, function(phash, hashes) {
						var parents = fm.parents(phash),
							idx, deep;
						if ((idx = $.inArray(hash, parents)) !== -1) {
							idx = parents.length - idx;
							$.each(hashes, function(i, h) {
								work.push({i: idx, hash: h});
							});
						}
					});
					if (work.length) {
						work.sort(function(a, b) { return a.i < b.i; });
						$.each(work, function(i, o) {
							roots.push(o.hash);
						});
					}
				}
				return roots;
			};

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
						var target =  drive.hash,
							roots = childrenRoots(target),
							requests = [],
							removed = [],
							doUmount = function() {
								$.when(requests).done(function() {
									fm.request({
										data   : {cmd  : 'netmount', protocol : 'netunmount', host: drive.netkey, user : target, pass : 'dum'}, 
										notify : {type : 'netunmount', cnt : 1, hideCnt : true},
										preventFail : true
									})
									.fail(function(error) {
										dfrd.reject(error);
									})
									.done(function(data) {
										drive.volumeid && delete fm.volumeExpires[drive.volumeid];
										dfrd.resolve();
									});
								}).fail(function(error) {
									if (removed.length) {
										fm.remove({ removed: removed });
									}
									dfrd.reject(error);
								});
							};
						
						if (roots.length) {
							fm.confirm({
								title : self.title,
								text  : (function() {
									var msgs = ['unmountChildren'];
									$.each(roots, function(i, hash) {
										msgs.push([fm.file(hash).name]);
									});
									return msgs;
								})(),
								accept : {
									label : 'btnUnmount',
									callback : function() {
										$.each(roots, function(i, hash) {
											var d = fm.file(hash);
											if (d.netkey) {
												requests.push(fm.request({
													data   : {cmd  : 'netmount', protocol : 'netunmount', host: d.netkey, user : d.hash, pass : 'dum'}, 
													notify : {type : 'netunmount', cnt : 1, hideCnt : true},
													preventDefault : true
												}).done(function(data) {
													if (data.removed) {
														d.volumeid && delete fm.volumeExpires[d.volumeid];
														removed = removed.concat(data.removed);
													}
												}));
											}
										});
										doUmount();
									}
								},
								cancel : {
									label : 'btnCancel',
									callback : function() {
										dfrd.reject();
									}
								}
							});
						} else {
							requests = null;
							doUmount();
						}
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
