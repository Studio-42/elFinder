"use strict";
elFinder.prototype.commands.urlupload = function() {
    var hover = this.fm.res('class', 'hover');

    this.disableOnSearch = true;
    this.updateOnSelect = false;

    // Shortcut opens dialog
    this.shortcuts = [];

    /**
     * Return command state
     *
     * @return Number
     **/
    this.getstate = function() {
        return !this._disabled && this.fm.cwd().write ? 0 : -1;
    }

    this.exec = function(data) {
        var fm = this.fm,
                upload = function(data) {
                    dialog.elfinderdialog('close');
                    data = {files: [data]};
                    fm.upload(data)
                        .fail(function(error) {
                            dfrd.reject(error);
                        })
                        .done(function(data) {
                            dfrd.resolve(data);
                        });
                },
                dfrd, dialog, input, button, dropbox;

        if (this.disabled()) {
            return $.Deferred().reject();
        }

        if (data && (data.input || data.files)) {
            return fm.upload(data);
        }

        dfrd = $.Deferred();

        input = $('<input type="text"/>');
        button = $('<div class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only"><span class="ui-button-text">' + fm.i18n('btnUpload') + '</span></div>')
            .append(input)
            .hover(function() {
                button.toggleClass(hover)
            })
            .click(function() {
                if (!button.hasClass("disabled")) {
                    upload(input.val());
                }
            });
        dialog = $('<div class="elfinder-urlupload-dialog-wrapper"/>')
            .append(input).append(button);
        var inputChange = function() {
            if (input.val() == "") {
                button.addClass("disabled");
            } else {
                button.removeClass("disabled");
            }
        };
        input.change(inputChange);
        inputChange();

        fm.dialog(dialog, {
            title: this.title,
            modal: true,
            resizable: false,
            destroyOnClose: true
        });

        return dfrd;
    }

    this.buttonType = "button";
}
