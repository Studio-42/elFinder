"use strict";

/**
 * @class  elFinder command "undo"
 * Undo previous commands
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.undo = function() {
	var self = this,
		fm = this.fm,
		setTitle = function(undo) {
			if (undo) {
				self.title = fm.i18n('cmdundo') + ' ' + fm.i18n('cmd'+undo.cmd);
				self.state = 0;
			} else {
				self.title = fm.i18n('cmdundo');
				self.state = -1;
			}
			self.change();
		},
		cmds = [];
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.shortcuts      = [{
		pattern     : 'ctrl+z'
	}];
	this.syncTitleOnChange = true;
	
	this.getstate = function() {
		return this.state;
	};
	
	this.setUndo = function(undo, redo) {
		var _undo = {};
		if (undo) {
			if ($.isPlainObject(undo) && undo.cmd && undo.callback) {
				Object.assign(_undo, undo);
				if (redo) {
					delete redo.undo;
					_undo.redo = redo;
				} else {
					fm.getCommand('redo').setRedo(null);
				}
				cmds.push(_undo);
				setTitle(_undo);
			}
		}
	};
	
	this.exec = function() {
		var redo = fm.getCommand('redo'),
			dfd = $.Deferred(),
			undo, res, _redo = {};
		if (cmds.length) {
			undo = cmds.pop();
			if (undo.redo) {
				Object.assign(_redo, undo.redo);
				delete undo.redo;
			} else {
				_redo = null;
			} 
			dfd.done(function() {
				if (_redo) {
					redo.setRedo(_redo, undo);
				}
			});
			
			setTitle(cmds.length? cmds[cmds.length-1] : void(0));
			
			res = undo.callback();
			
			if (res && res.done) {
				res.done(function() {
					dfd.resolve();
				}).fail(function() {
					dfd.reject();
				});
			} else {
				dfd.resolve();
			}
			if (cmds.length) {
				this.update(0, cmds[cmds.length - 1].name);
			} else {
				this.update(-1, '');
			}
		} else {
			dfd.reject();
		}
		return dfd;
	};
	
	fm.bind('exec', function(e) {
		var data = e.data || {};
		if (data.opts && data.opts._userAction) {
			if (data.dfrd && data.dfrd.done) {
				data.dfrd.done(function(res) {
					if (res && res.undo && res.redo) {
						res.undo.redo = res.redo;
						self.setUndo(res.undo);
					}
				});
			}
		}
	});
};

/**
 * @class  elFinder command "redo"
 * Redo previous commands
 *
 * @author Naoki Sawada
 **/
elFinder.prototype.commands.redo = function() {
	var self = this,
		fm   = this.fm,
		setTitle = function(redo) {
			if (redo && redo.callback) {
				self.title = fm.i18n('cmdredo') + ' ' + fm.i18n('cmd'+redo.cmd);
				self.state = 0;
			} else {
				self.title = fm.i18n('cmdredo');
				self.state = -1;
			}
			self.change();
		},
		cmds = [];
	
	this.alwaysEnabled  = true;
	this.updateOnSelect = false;
	this.shortcuts      = [{
		pattern     : 'shift+ctrl+z ctrl+y'
	}];
	this.syncTitleOnChange = true;
	
	this.getstate = function() {
		return this.state;
	};
	
	this.setRedo = function(redo, undo) {
		if (redo === null) {
			cmds = [];
			setTitle();
		} else {
			if (redo && redo.cmd && redo.callback) {
				if (undo) {
					redo.undo = undo;
				}
				cmds.push(redo);
				setTitle(redo);
			}
		}
	}
	
	this.exec = function() {
		var undo = fm.getCommand('undo'),
			dfd = $.Deferred(),
			redo, res, _undo = {}, _redo = {};
		if (cmds.length) {
			redo = cmds.pop();
			if (redo.undo) {
				Object.assign(_undo, redo.undo);
				Object.assign(_redo, redo);
				delete _redo.undo;
				dfd.done(function() {
					undo.setUndo(_undo, _redo);
				});
			}
			
			setTitle(cmds.length? cmds[cmds.length-1] : void(0));
			
			res = redo.callback();
			
			if (res && res.done) {
				res.done(function() {
					dfd.resolve();
				}).fail(function() {
					dfd.reject();
				});
			} else {
				dfd.resolve();
			}
			return dfd;
		} else {
			return dfd.reject();
		}
	};
};

