"use strict";
/**
 * @class  elFinder toast
 * 
 * This was created inspired by the toastr. Thanks to developers of toastr.
 * CodeSeven/toastr: http://johnpapa.net <https://github.com/CodeSeven/toastr>
 *
 * @author Naoki Sawada
 **/
$.fn.elfindertoast = function(opts, fm) {
	var defOpts = {
		mode: 'success',
		msg: '',
		showMethod: 'fadeIn', //fadeIn, slideDown, and show are built into jQuery
		showDuration: 300,
		showEasing: 'swing', //swing and linear are built into jQuery
		onShown: undefined,
		hideMethod: 'fadeOut',
		hideDuration: 1000,
		hideEasing: 'swing',
		onHidden: undefined,
		timeOut: 3000,
		extNode: undefined
	};
	return this.each(function() {
		var self = $(this);
		opts = $.extend({}, defOpts, opts || {});
		self.on('click', function(e) {
			e.stopPropagation();
			e.preventDefault();
			self.remove();
		}).hide().addClass('toast-' + opts.mode).append($('<div class="elfinder-toast-msg"/>').html(opts.msg));
		if (opts.extNode) {
			self.append(opts.extNode);
		}
		self[opts.showMethod]({
			duration: opts.showDuration,
			easing: opts.showEasing,
			complete: function() {
				opts.onShown && opts.onShown();
				if (opts.timeOut) {
					setTimeout(function() {
						self[opts.hideMethod]({
							duration: opts.hideDuration,
							easing: opts.hideEasing,
							complete: function() {
								opts.onHidden && opts.onHidden();
								self.remove();
							}
						});
					}, opts.timeOut);
				}
			}
		});
	});
};