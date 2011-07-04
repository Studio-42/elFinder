var isPlainObject = function(obj) {
	var key;
	
	if (typeof(obj) != 'object') {
		return false;
	}
	
	if (obj.constructor 
	&& !hasOwnProperty.call(obj, "constructor") 
	&& !hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
		return false;
	}
	
	for (key in obj) { }
	
	return key === void(0) || hasOwnProperty.call(obj, key);
},



isFunction = function(obj) {
	return typeof(obj) == 'function';
};


extend = function() {
	var result = arguments[0], value, name, clone, srcIsArray;
	
	if (typeof(result) != 'object' && !isFunction(result)) {
		result = {};
	}
	
	for (i = 1; i < arguments.length; i++) {
		if ((value = arguments[i]) != null) {
			for (name in value) {
				src = value[name];
				dst = result[name];
				
				if (src === dst) {
					continue;
				}
				
				if (src && dst && (isPlainObject(src) || (srcIsArray = Array.isArray(src)))) {
					if (srcIsArray) {
						srcIsArray = false;
						clone = dst && Array.isArray(dst) ? dst : [];
					} else {
						clone = dst && isPlainObject(dst) ? dst : {}
					}
					result[name] = extend(clone , src);
				} else if (src !== void(0)) {
					result[name] = src;
				}
			}
		}
	}
	return result;
}

exports.isPlainObject = isPlainObject;
exports.isFunction = isFunction;
exports.extend = extend;