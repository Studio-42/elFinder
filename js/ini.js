function elfinder_require(script) {
	$.ajax({
		url : '/assets/core/elfinder/js/' + script,
		dataType : "script",
		async : false, // <-- This is the key
		success : function() {
			// all good...
		},
		error : function() {
			throw new Error("Could not load script " + script);
		}
	});
}

elfinder_require('elFinder.js');
elfinder_require('elFinder.version.js');
elfinder_require('jquery.elfinder.js');
elfinder_require('elFinder.resources.js');
elfinder_require('elFinder.options.js');
elfinder_require('elFinder.history.js');
elfinder_require('elFinder.command.js');

elfinder_require('ui/overlay.js');
elfinder_require('ui/workzone.js');
elfinder_require('ui/navbar.js');
elfinder_require('ui/dialog.js');
elfinder_require('ui/tree.js');
elfinder_require('ui/cwd.js');
elfinder_require('ui/toolbar.js');
elfinder_require('ui/button.js');
elfinder_require('ui/uploadButton.js');
elfinder_require('ui/viewbutton.js');
elfinder_require('ui/searchbutton.js');
elfinder_require('ui/sortbutton.js');
elfinder_require('ui/panel.js');
elfinder_require('ui/contextmenu.js');
elfinder_require('ui/path.js');
elfinder_require('ui/stat.js');
elfinder_require('ui/places.js');

elfinder_require('commands/back.js');
elfinder_require('commands/forward.js');
elfinder_require('commands/reload.js');
elfinder_require('commands/up.js');
elfinder_require('commands/home.js');
elfinder_require('commands/copy.js');
elfinder_require('commands/cut.js');
elfinder_require('commands/paste.js');
elfinder_require('commands/open.js');
elfinder_require('commands/rm.js');
elfinder_require('commands/info.js');
elfinder_require('commands/duplicate.js');
elfinder_require('commands/rename.js');
elfinder_require('commands/help.js');
elfinder_require('commands/getfile.js');
elfinder_require('commands/mkdir.js');
elfinder_require('commands/mkfile.js');
elfinder_require('commands/upload.js');
elfinder_require('commands/download.js');
elfinder_require('commands/edit.js');
elfinder_require('commands/quicklook.js');
elfinder_require('commands/quicklook.plugins.js');
elfinder_require('commands/extract.js');
elfinder_require('commands/archive.js');
elfinder_require('commands/search.js');
elfinder_require('commands/view.js');
elfinder_require('commands/resize.js');
elfinder_require('commands/sort.js');
elfinder_require('commands/netmount.js');

elfinder_require('i18n/elfinder.ar.js');
elfinder_require('i18n/elfinder.bg.js');
elfinder_require('i18n/elfinder.ca.js');
elfinder_require('i18n/elfinder.cs.js');
elfinder_require('i18n/elfinder.de.js');
elfinder_require('i18n/elfinder.el.js');
elfinder_require('i18n/elfinder.en.js');
elfinder_require('i18n/elfinder.es.js');
elfinder_require('i18n/elfinder.fa.js');
elfinder_require('i18n/elfinder.fr.js');
elfinder_require('i18n/elfinder.hu.js');
elfinder_require('i18n/elfinder.it.js');
elfinder_require('i18n/elfinder.jp.js');
elfinder_require('i18n/elfinder.ko.js');
elfinder_require('i18n/elfinder.nl.js');
elfinder_require('i18n/elfinder.no.js');
elfinder_require('i18n/elfinder.pl.js');
elfinder_require('i18n/elfinder.pt_BR.js');
elfinder_require('i18n/elfinder.ru.js');
elfinder_require('i18n/elfinder.sl.js');
elfinder_require('i18n/elfinder.sv.js');
elfinder_require('i18n/elfinder.tr.js');
elfinder_require('i18n/elfinder.zh_CN.js');
elfinder_require('i18n/elfinder.zh_TW.js');
elfinder_require('i18n/elfinder.vi.js');

elfinder_require('jquery.dialogelfinder.js');

elfinder_require('proxy/elFinderSupportVer1.js');
elfinder_require('extensions/jplayer/elfinder.quicklook.jplayer.js');