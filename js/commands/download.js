"use strict";
/**
 * @class elFinder command "download". 
 * Download selected files.
 * Only for new api
 *
 * @author Dmitry (dio) Levashov, dio@std42.ru
 **/
elFinder.prototype.commands.zipdl = function() {};
elFinder.prototype.commands.download = function() {
	var self   = this,
		fm     = this.fm,
		zipOn  = false,
		filter = function(hashes) {
			var mixed  = false,
				croot  = '',
				api21  = (fm.api > 2);
			
			if (fm.searchStatus.state > 1 && fm.searchStatus.target === '') {
				hashes = $.map(hashes, function(h) {
					return fm.isCommandEnabled('download', h)? h : null;
				});
				croot = fm.root(hashes[0]);
				$.each(hashes, function(i, h) {
					if (mixed = (croot !== fm.root(h))) {
						return false;
					}
				});
				zipOn = (api21 && !mixed && fm.command('zipdl') && fm.isCommandEnabled('zipdl', croot));
			} else {
				if (!fm.isCommandEnabled('download', hashes[0])) {
					return [];
				}
				zipOn = (api21 && fm.command('zipdl') && fm.isCommandEnabled('zipdl', hashes[0]));
			}
			
			return (!zipOn)?
					$.map(self.files(hashes), function(f) { return f.mime == 'directory' ? null : f; })
					: self.files(hashes);
		};
	
	this.linkedCmds = ['zipdl'];
	
	this.shortcuts = [{
		pattern     : 'shift+enter'
	}];
	
	this.getstate = function(sel) {
		var sel    = this.hashes(sel),
			cnt    = sel.length,
			maxReq = this.options.maxRequests || 10,
			czipdl = (fm.api > 2)? fm.command('zipdl') : null,
			mixed  = false,
			croot  = '';
		
		if (cnt > 0 && fm.searchStatus.state > 1 && fm.searchStatus.target === '') {
			croot = fm.root(sel[0]);
			$.each(sel, function(i, h) {
				if (mixed = (croot !== fm.root(h))) {
					return false;
				}
			});
		}
		
		return  (mixed || !czipdl || czipdl._disabled)?
				(!this._disabled && cnt && cnt <= maxReq && ((!fm.UA.IE && !fm.UA.Mobile) || cnt == 1) && cnt == filter(sel).length ? 0 : -1)
				: (!this._disabled && cnt ? 0 : -1);
	};
	
	fm.bind('contextmenu', function(e){
		var fm = self.fm,
			helper = null,
			targets, file, link,
			getExtra = function(file) {
				var link = file.url || fm.url(file.hash);
				return {
					icon: 'link',
					node: $('<a/>')
						.attr({href: link, target: '_blank', title: fm.i18n('link')})
						.text(file.name)
						.on('mousedown click touchstart touchmove touchend contextmenu', function(e){
							var cm = fm.getUI('contextmenu');
							e.stopPropagation();
							// 'mouseEvInternal' for Firefox's bug (maybe)
							cm.data('mouseEvInternal', true);
							setTimeout(function(){
								cm.data('mouseEvInternal', false);
							}, 500);
						})
						.on('dragstart', function(e) {
							var dt = e.dataTransfer || e.originalEvent.dataTransfer || null;
							helper = null;
							if (dt) {
								var icon  = function(f) {
										var mime = f.mime, i;
										i = '<div class="elfinder-cwd-icon '+fm.mime2class(mime)+' ui-corner-all"/>';
										if (f.tmb && f.tmb !== 1) {
											i = $(i).css('background', "url('"+fm.option('tmbUrl')+f.tmb+"') center center no-repeat").get(0).outerHTML;
										}
										return i;
									};
								dt.effectAllowed = 'copyLink';
								if (dt.setDragImage) {
									helper = $('<div class="elfinder-drag-helper html5-native">').append(icon(file)).appendTo($(document.body));
									dt.setDragImage(helper.get(0), 50, 47);
								}
								if (!fm.UA.IE) {
									dt.setData('elfinderfrom', window.location.href + file.phash);
									dt.setData('elfinderfrom:' + dt.getData('elfinderfrom'), '');
								}
							}
						})
						.on('dragend', function(e) {
							helper && helper.remove();
						})
				};
			};
		self.extra = null;
		if (e.data) {
			targets = e.data.targets || [];
			if (targets.length === 1 && (file = fm.file(targets[0])) && file.mime !== 'directory') {
				if (file.url != '1') {
					self.extra = getExtra(file);
				} else {
					// Get URL ondemand
					var node;
					self.extra = {
						icon: 'link',
						node: $('<a/>')
							.attr({href: '#', title: fm.i18n('getLink'), draggable: 'false'})
							.text(file.name)
							.on('click', function(e){
								var parent = node.parent();
								e.stopPropagation();
								e.preventDefault();
								parent.removeClass('ui-state-disabled').addClass('elfinder-button-icon-spinner');
								fm.request({
									data : {cmd : 'url', target : file.hash},
									preventDefault : true
								})
								.always(function(data) {
									parent.removeClass('elfinder-button-icon-spinner');
									if (data.url) {
										var rfile = fm.file(file.hash);
										rfile.url = data.url;
										node.replaceWith(getExtra(file).node);
									} else {
										parent.addClass('ui-state-disabled');
									}
								});

							})
					};
					node = self.extra.node;
					node.ready(function(){
						setTimeout(function(){
							node.parent().addClass('ui-state-disabled').css('pointer-events', 'auto');
						}, 10);
					});
				}
			}
		}
	});
	
	this.exec = function(hashes) {
		var hashes  = this.hashes(hashes),
			fm      = this.fm,
			base    = fm.options.url,
			files   = filter(hashes),
			dfrd    = $.Deferred(),
			iframes = '',
			cdata   = '',
			i, url;
			
		if (!files.length) {
			return dfrd.reject();
		}
		
		var link    = $('<a>').hide().appendTo($('body')),
			html5dl = (typeof link.get(0).download === 'string');
		
		if (zipOn && (files.length > 1 || files[0].mime === 'directory')) {
			dfrd = fm.request({
				data : {cmd : 'zipdl', targets : hashes},
				notify : {type : 'zipdl', cnt : 1, hideCnt : true, multi : true},
				cancel : true,
				preventDefault : true
			}).done(function(e) {
				var zipdl, dialog, btn = {}, dllink, form,
					uniq = 'dlw' + (+new Date());
				if (e.error) {
					fm.error(e.error);
					dfrd.reject();
				} else if (e.zipdl) {
					zipdl = e.zipdl;
					if (!html5dl && fm.UA.Mobile) {
						url = fm.options.url + (fm.options.url.indexOf('?') === -1 ? '?' : '&')
						+ 'cmd=zipdl&download=1';
						$.each([hashes[0], zipdl.file, zipdl.name, zipdl.mime], function(key, val) {
							url += '&targets%5B%5D='+encodeURIComponent(val);
						});
						$.each(fm.options.customData, function(key, val) {
							url += '&'+encodeURIComponent(key)+'='+encodeURIComponent(val);
						});
						url += '&'+encodeURIComponent(zipdl.name);
						dllink = $('<a/>')
							.attr('href', url)
							.attr('download', encodeURIComponent(zipdl.name))
							.attr('target', '_blank')
							.on('click', function() {
								fm.trigger('download', {files : files});
								dfrd.resolve(hashes);
								dialog.elfinderdialog('close');
							})
							.append('<span class="elfinder-button-icon elfinder-button-icon-download"></span>'+fm.escape(zipdl.name));
						btn[fm.i18n('btnCancel')] = function() {
							dialog.elfinderdialog('close');
						};
						dialog = fm.dialog(dllink, {
							title: fm.i18n('link'),
							buttons: btn,
							width: '200px'
						});
					} else {
						form = $('<form action="'+fm.options.url+'" method="post" target="'+uniq+'" style="display:none"/>')
						.append('<input type="hidden" name="cmd" value="zipdl"/>')
						.append('<input type="hidden" name="download" value="1"/>');
						$.each([hashes[0], zipdl.file, zipdl.name, zipdl.mime], function(key, val) {
							form.append('<input type="hidden" name="targets[]" value="'+fm.escape(val)+'"/>');
						});
						$.each(fm.options.customData, function(key, val) {
							form.append('<input type="hidden" name="'+key+'" value="'+fm.escape(val)+'"/>');
						});
						form.attr('target', uniq).appendTo('body');
						iframes = $('<iframe style="display:none" name="'+uniq+'">')
							.appendTo('body')
							.ready(function() {
								form.submit().remove();
								fm.trigger('download', {files : files});
								dfrd.resolve(hashes);
								setTimeout(function() {
									iframes.remove();
								}, fm.UA.Firefox? 20000 : 1000); // give mozilla 20 sec file to be saved
							});
					}
				}
			}).fail(function(error) {
				error && fm.error(error);
				dfrd.reject();
			}).always(function() {
				link.remove();
			});
			fm.trigger('download', {files : files});
			return dfrd;
		} else {
			for (i = 0; i < files.length; i++) {
				url = fm.openUrl(files[i].hash, true);
				if (html5dl) {
					link.attr('href', url)
					.attr('download', encodeURIComponent(files[i].name))
					.attr('target', '_blank')
					.get(0).click();
				} else {
					if (fm.UA.Mobile) {
						setTimeout(function(){
							if (! window.open(url)) {
								fm.error('errPopup');
							}
						}, 100);
					} else {
						iframes += '<iframe class="downloader" id="downloader-' + files[i].hash+'" style="display:none" src="'+url+'"/>';
					}
				}
			}
			link.remove();
			$(iframes)
				.appendTo('body')
				.ready(function() {
					setTimeout(function() {
						$(iframes).each(function() {
							$('#' + $(this).attr('id')).remove();
						});
					}, fm.UA.Firefox? (20000 + (10000 * i)) : 1000); // give mozilla 20 sec + 10 sec for each file to be saved
				});
			fm.trigger('download', {files : files});
			return dfrd.resolve(hashes);
		}
	};

};
