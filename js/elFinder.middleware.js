/**
 * Created by kiril on 12/14/16.
 */
elFinder.prototype.middleware = function (fm) {
    var self         = this,
        opts         = fm.options.middleware;
    this.checkNested = function (obj, args) {
        if (typeof args === "string") {
            args = args.split('.');
        }

        for (var i = 0, len = args.length; i < len; i++) {
            if (!obj || !obj.hasOwnProperty(args[i])) {
                return false;
            }
            obj = obj[args[i]];
        }
        return true;
    };

    this._toConsumableArray = function (arr) {
        if (Array.isArray(arr)) {
            for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
                arr2[i] = arr[i];
            }
            return arr2;
        } else {
            return Array.from(arr);
        }
    };

    this.getCallbackChain = function (middlewareNames) {
        if (typeof middlewareNames === "string") {
            middlewareNames = middlewareNames.split('.');
        }

        if (this.checkNested(opts, middlewareNames)) {
            var middlewareList = opts;
            for (var i = 0, len = middlewareNames.length; i < len; i++) {
                middlewareList = middlewareList[middlewareNames[i]];
            }
            return middlewareList;
        }
        return false;
    };

    this.executeCallbacks = function (context, stack, params) {
        var index = 0;

        function next(err) {
            var action = stack[index++];
            if (!action) {
                return err?err:true;
            }
            try {
                if (err) {
                    return next(err);
                } else {
                    return action.apply(context, [next].concat(params));
                }
            } catch (e) {
                return next(e);
            }
        }
        return next();
    };

    this.propagate = function (context, type, params) {
        var callbackChain = this.getCallbackChain(type);
        if (callbackChain) {
            return this.executeCallbacks(context, callbackChain, params);
        }
    };
};
