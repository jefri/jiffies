/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	//require('./polyfill');
	var lock_1 = __webpack_require__(1);
	exports.lock = lock_1.lock;
	// export { promise } from './promise';
	// export { request } from './request';
	var UUID_1 = __webpack_require__(2);
	exports.UUID = UUID_1.UUID;
	//# sourceMappingURL=index.js.map

/***/ },
/* 1 */
/***/ function(module, exports) {

	//const __locked: Symbol = Symbol('__locked');
	var __locked = '__locked';
	function lock(fn) {
	    return function () {
	        var args = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            args[_i - 0] = arguments[_i];
	        }
	        var ret = null;
	        var ex = null;
	        if (fn[__locked] !== true) {
	            fn[__locked] = true;
	            try {
	                ret = fn.apply(this, args);
	            }
	            catch (e) {
	                ex = e;
	            }
	        }
	        fn[__locked] = false;
	        if (ex !== null) {
	            throw ex;
	        }
	        else {
	            return ret;
	        }
	    };
	}
	exports.lock = lock;
	//# sourceMappingURL=lock.js.map

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var index_1 = __webpack_require__(3);
	exports.UUID = {
	    rvalid: /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i,
	    v4: function () {
	        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
	            var r = index_1.randomByte() & 0x0f;
	            return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
	        });
	    }
	};
	//# sourceMappingURL=UUID.js.map

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var server_1 = __webpack_require__(4);
	function randomByte() {
	    var array = server_1.getUint8Array(1);
	    return [].slice.call(array)[0];
	}
	exports.randomByte = randomByte;
	//# sourceMappingURL=index.js.map

/***/ },
/* 4 */
/***/ function(module, exports) {

	function getUint8Array(size) {
	    var array = new Uint8Array(size);
	    window.crypto.getRandomValues(array);
	    return array;
	}
	exports.getUint8Array = getUint8Array;
	;
	//# sourceMappingURL=browser.js.map

/***/ }
/******/ ]);