/**
 * @class  elFinder toast
 * 
 * This was created inspired by the toastr. Thanks to developers of toastr.
 * CodeSeven/toastr: http://johnpapa.net <https://github.com/CodeSeven/toastr>
 *
 * @author Naoki Sawada
 **/
$.fn.elfindertoast = function(opts, fm) {
	"use strict";
	var defOpts = Object.assign({
		mode: 'success', // or 'info', 'warning' and 'error'
		msg: '',
		showMethod: 'fadeIn', //fadeIn, slideDown, and show are built into jQuery
		showDuration: 300,
		showEasing: 'swing', //swing and linear are built into jQuery
		onShown: undefined,
		hideMethod: 'fadeOut',
		hideDuration: 1500,
		hideEasing: 'swing',
		onHidden: undefined,
		timeOut: 3000,
		extNode: undefined,
		button: undefined,
		width: undefined
	}, $.isPlainObject(fm.options.uiOptions.toast.defaults)? fm.options.uiOptions.toast.defaults : {});
	return this.each(function() {
		opts = Object.assign({}, defOpts, opts || {});
		
		var self = $(this),
			show = function(notm) {
				self.stop();
				fm.toFront(self);
				self[opts.showMethod]({
					duration: opts.showDuration,
					easing: opts.showEasing,
					complete: function() {
						opts.onShown && opts.onShown();
						if (!notm && opts.timeOut) {
							rmTm = setTimeout(rm, opts.timeOut);
						}
					}
				});
			},
			rm = function() {
				self[opts.hideMethod]({
					duration: opts.hideDuration,
					easing: opts.hideEasing,
					complete: function() {
						opts.onHidden && opts.onHidden();
						self.remove();
					}
				});
			},
			rmTm;
		
		self.on('click', function(e) {
			e.stopPropagation();
			e.preventDefault();
			rmTm && clearTimeout(rmTm);
			opts.onHidden && opts.onHidden();
			self.stop().remove();
		}).on('mouseenter mouseleave', function(e) {
			if (opts.timeOut) {
				rmTm && clearTimeout(rmTm);
				rmTm = null;
				if (e.type === 'mouseenter') {
					show(true);
				} else {
					rmTm = setTimeout(rm, opts.timeOut);
				}
			}
		}).hide().addClass('toast-' + opts.mode).append($('<div class="elfinder-toast-msg"/>').html(opts.msg.replace(/%([a-zA-Z0-9]+)%/g, function(m, m1) {
			return fm.i18n(m1);
		})));
		
		if (opts.extNode) {
			self.append(opts.extNode);
		}

		if (opts.button) {
			self.append(
				$('<button class="ui-button ui-widget ui-state-default ui-corner-all elfinder-tabstop"/>')
				.append($('<span class="ui-button-text"/>').text(fm.i18n(opts.button.text)))
				.on('mouseenter mouseleave', function(e) { 
					$(this).toggleClass('ui-state-hover', e.type == 'mouseenter');
				})
				.on('click', opts.button.click || function(){})
			);
		}

		if (opts.width) {
			self.css('max-width', opts.width);
		}
		
		show();
	});
};