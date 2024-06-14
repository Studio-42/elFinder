/**
 * @class  elFinder command "extract"
 * Extract files from archive
 *
 * @author Dmitry (dio) Levashov
 **/
elFinder.prototype.commands.extract = function() {
	"use strict";
	var self    = this,
		fm      = self.fm,
		mimes   = [],
		filter  = function(files) {
			var fres = true;
			return $.grep(files, function(file) { 
				fres = fres && file.read && $.inArray(file.mime, mimes) !== -1 ? true : false;
				return fres;
			});
		};
	
	this.variants = [];
	this.disableOnSearch = true;
	
	// Update mimes list on open/reload
	fm.bind('open reload', function() {
		mimes = fm.option('archivers')['extract'] || [];
		if (fm.api > 2) {
			self.variants = [[{makedir: true}, fm.i18n('cmdmkdir')], [{}, fm.i18n('btnCwd')]];
		} else {
			self.variants = [[{}, fm.i18n('btnCwd')]];
		}
		self.change();
	});
	
	this.getstate = function(select) {
		var sel = this.files(select),
			cnt = sel.length,
			cwdHash, cwdChk;
		if (!cnt || filter(sel).length != cnt) {
			return -1;
		} else if (fm.searchStatus.state > 0) {
			cwdHash = this.fm.cwd().hash;
			$.each(sel, function(i, file) {
				cwdChk = (file.phash === cwdHash);
				return cwdChk;
			});
			return cwdChk? 0 : -1;
		} else {
			return this.fm.cwd().write? 0 : -1;
		}
	};
	
	this.exec = function(hashes, opts) {
		var files    = this.files(hashes),
			dfrd     = $.Deferred(),
			cnt      = files.length,
			makedir  = opts && opts.makedir ? 1 : 0,
			i, error,
			decision,

			overwriteAll = false,
			omitAll = false,
			mkdirAll = 0,
			siblings = fm.files(files[0].phash),

			names = [],
			map = {};

		$.each(siblings, function(id, file) {
			map[file.name] = file;
			names.push(file.name);
		});
		
		var decide = function(decision) {
			switch (decision) {
				case 'overwrite_all' :
					overwriteAll = true;
					break;
				case 'omit_all':
					omitAll = true;
					break;
			}
		};

		var unpack = function(file) {
			if (!(file.read && fm.file(file.phash).write)) {
				error = ['errExtract', file.name, 'errPerm'];
				fm.error(error);
				dfrd.reject(error);
			} else if ($.inArray(file.mime, mimes) === -1) {
				error = ['errExtract', file.name, 'errNoArchive'];
				fm.error(error);
				dfrd.reject(error);
			} else {
				fm.request({
					data:{cmd:'extract', target:file.hash, makedir:makedir},
					notify:{type:'extract', cnt:1},
					syncOnFail:true,
					navigate:{
						toast : makedir? {
							incwd    : {msg: fm.i18n(['complete', fm.i18n('cmdextract')]), action: {cmd: 'open', msg: 'cmdopen'}},
							inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmdextract')]), action: {cmd: 'open', msg: 'cmdopen'}}
						} : {
							inbuffer : {msg: fm.i18n(['complete', fm.i18n('cmdextract')])}
						}
					}
				})
				.fail(function (error) {
					if (dfrd.state() != 'rejected') {
						dfrd.reject(error);
					}
				})
				.done(function () {
				});
			}
		};
		
		var confirm = function(files, index) {
			var file = files[index],
			name = fm.splitFileExtention(file.name)[0],
			existed = ($.inArray(name, names) >= 0),
			next = function(){
				if((index+1) < cnt) {
					confirm(files, index+1);
				} else {
					dfrd.resolve();
				}
			};
			if (!makedir && existed && map[name].mime != 'directory') {
				fm.confirm(
					{
						title : fm.i18n('ntfextract'),
						text  : ['errExists', name, 'confirmRepl'],
						accept:{
							label : 'btnYes',
							callback:function (all) {
								decision = all ? 'overwrite_all' : 'overwrite';
								decide(decision);
								if(!overwriteAll && !omitAll) {
									if('overwrite' == decision) {
										unpack(file);
									}
									if((index+1) < cnt) {
										confirm(files, index+1);
									} else {
										dfrd.resolve();
									}
								} else if(overwriteAll) {
									for (i = index; i < cnt; i++) {
										unpack(files[i]);
									}
									dfrd.resolve();
								}
							}
						},
						reject : {
							label : 'btnNo',
							callback:function (all) {
								decision = all ? 'omit_all' : 'omit';
								decide(decision);
								if(!overwriteAll && !omitAll && (index+1) < cnt) {
									confirm(files, index+1);
								} else if (omitAll) {
									dfrd.resolve();
								}
							}
						},
						cancel : {
							label : 'btnCancel',
							callback:function () {
								dfrd.resolve();
							}
						},
						all : ((index+1) < cnt)
					}
				);
			} else if (!makedir) {
				if (mkdirAll == 0) {
					fm.confirm({
						title : fm.i18n('cmdextract'),
						text  : [fm.i18n('cmdextract')+' "'+file.name+'"', 'confirmRepl'],
						accept:{
							label : 'btnYes',
							callback:function (all) {
								all && (mkdirAll = 1);
								unpack(file);
								next();
							}
						},
						reject : {
							label : 'btnNo',
							callback:function (all) {
								all && (mkdirAll = -1);
								next();
							}
						},
						cancel : {
							label : 'btnCancel',
							callback:function () {
								dfrd.resolve();
							}
						},
						all : ((index+1) < cnt)
					});
				} else {
					(mkdirAll > 0) && unpack(file);
					next();
				}
			} else {
				unpack(file);
				next();
			}
		};
		
		if (!(this.enabled() && cnt && mimes.length)) {
			return dfrd.reject();
		}
		
		if(cnt > 0) {
			confirm(files, 0);
		}

		return dfrd;
	};

};
