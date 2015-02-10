// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
if (![].includes) {
	Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {'use strict';
		var O = Object(this);
		var len = parseInt(O.length) || 0;
		if (len === 0) {
			return false;
		}
		var n = parseInt(arguments[1]) || 0;
		var k;
		if (n >= 0) {
			k = n;
		} else {
			k = len + n;
			if (k < 0) {k = 0;}
		}
		var currentElement;
		while (k < len) {
			currentElement = O[k];
			if (searchElement === currentElement ||
				 (searchElement !== searchElement && currentElement !== currentElement)) {
				return true;
			}
			k++;
		}
		return false;
	};
}

if (!Object.assign) {
	Object.defineProperty(Object, 'assign', {
		enumerable: false,
		configurable: true,
		writable: true,
		value: function(target, firstSource) {
			'use strict';
			if (target === undefined || target === null) {
				throw new TypeError('Cannot convert first argument to object');
			}

			var to = Object(target);
			for (var i = 1; i < arguments.length; i++) {
				var nextSource = arguments[i];
				if (nextSource === undefined || nextSource === null) {
					continue;
				}

				var keysArray = Object.keys(Object(nextSource));
				for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
					var nextKey = keysArray[nextIndex];
					var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
					if (desc !== undefined && desc.enumerable) {
						to[nextKey] = nextSource[nextKey];
					}
				}
			}
			return to;
		}
	});
}

if (!Object.isString) {
	Object.isString = function(value){
		return typeof value == 'string';
	}
}

if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

if (!Function.isFunction) {
	Function.isFunction = function(obj) {
		return typeof obj === 'function';
	};
}

if (!Object.isObject) {
	Object.isObject =  function(obj) {
		return typeof obj == 'object' && obj !== null || false;
	}
}

