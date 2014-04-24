"use strict";

$.fn.elfindertabs = function(fm) {
    var wrapper = $(this).closest(".dialogelfinder");
    var tabsWrapper = $("<div class='elfinder-nav-tabs-wrapper nav-tabs-wrapper' />");
    var tabsHeader = $("<ul class='nav nav-tabs' />");
    var tabFmId = "fm-tab-fm-" + "a";
    var tabUrlId = "fm-tab-url-" + "a";
    var tabFm = $("<li><a href='#" + tabFmId + "' data-toggle='tab'>" + fm.i18n("tabsTabFm") + "</a></li>");
    tabFm.addClass("active");
    var tabUrl = $("<li><a href='#" + tabUrlId + "' data-toggle='tab'>" + fm.i18n("tabsTabUrl") + "</a></li>");
    tabsHeader.append(tabFm);
    tabsHeader.append(tabUrl);
    tabsWrapper.append(tabsHeader);
    
    var workzone = $(">.elfinder-workzone", wrapper);
    var tabsContent = $("<div class='elfinder-tab-content tab-content workzone-wrapper' />");
    var tabsFmContent = $("<div class='tab-pane' id='" + tabFmId + "'>");
    tabsFmContent.addClass("active");
    var tabsUrlContent = $("<div class='tab-pane' id='" + tabUrlId + "'>");
    var tabsUrlWorkzone = $("<div class='elfinder-workzone' />");
    var tabsUrlRow = $("<div class='form-row'><label>" + fm.i18n("tabsTabUrlLabel") + "</label><input type='text' name='url' /></div>");
    var tabsUrlInput = $("input[name=url]", tabsUrlRow).first();
    tabsUrlInput.keypress(function(e) {
        e.stopPropagation();
    }).keydown(function(e) {
        e.stopPropagation();
        e.keyCode == 13 && search();
        if (e.keyCode== 27) {
            e.preventDefault();
            abort();
        }
    });
    tabsUrlWorkzone.append(tabsUrlRow);
    tabsUrlContent.append(tabsUrlWorkzone);
    tabsContent.append(tabsFmContent);
    tabsContent.append(tabsUrlContent);
    
    // eventy spojene s prepinanim tabu a zmenou url
    var getfileButton = $(".elfinder-button-icon-getfile", wrapper);
    var tabsUrlButtonRefresh = function() {
        if (tabsUrlInput.val()) {
            getfileButton.removeClass("ui-state-disabled");
        } else {
            getfileButton.addClass("ui-state-disabled");
        }
    };
    tabsUrlInput.change(tabsUrlButtonRefresh);
    var toolbar = $(">.elfinder-toolbar", wrapper);
    var uploadButton = $(".elfinder-buttonset:first-child .button-type-button:first-child", toolbar);
    $(">a", tabFm).bind("shown.bs.tab", function() {
        toolbar.children().show();
        uploadButton.show();
        var cwd = fm.getUI('cwd');
        cwd.trigger('unselectall');
        fm.select();
    });
    $(">a", tabUrl).bind("shown.bs.tab", function() {
        toolbar.children(":not(:first-child)").hide();
        uploadButton.hide();
        tabsUrlButtonRefresh();
    });
    
    toolbar.before(tabsWrapper);
    toolbar.after(tabsContent);
    workzone.appendTo(tabsFmContent);

    // pri pouziti prikazu getfile a aktivni karte Url se posila url a ne info o vybranem souboru
    var getfilecmd = fm.command("getfile");
    getfilecmd.originalExec = getfilecmd.exec;
    getfilecmd.exec = function(hashes) {
        if (tabsUrlContent.hasClass("active")) {
            var opts = getfilecmd.options;
            var data = [{url: tabsUrlInput.val()}];
            var result = function(files) {
                return opts.onlyURL
                        ? opts.multiple ? $.map(files, function(f) {
                            return f.url;
                        }) : files[0].url
                        : opts.multiple ? files : files[0];
            };
            data = result(data);
            fm.trigger('getfile', {files: data});
            getfilecmd.callback(data, fm);

            if (opts.oncomplete == 'close') {
                fm.hide();
            } else if (opts.oncomplete == 'destroy') {
                fm.destroy();
            }
        } else {
            getfilecmd.originalExec(hashes);
        }
    };
    
    return this;
}
