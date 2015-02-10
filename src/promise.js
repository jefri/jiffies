(function(target) {
	var undef;

	function defer(callback) {
		if (typeof setImmediate != 'undefined')
			setImmediate(callback);
		else if (typeof process != 'undefined' && process['nextTick'])
			process['nextTick'](callback);
		else
			setTimeout(callback, 0);
	}

	target[0][target[1]] = function pinkySwear(extend) {
		var state;			// undefined/null = pending, true = fulfilled, false = rejected
		var values = [];	// an array of values as arguments for the then() handlers
		var deferred = [];	// functions to call when set() is invoked

		var set = function(newState, newValues) {
			if (state == null && newState != null) {
				state = newState;
				if(Array.isArray(newValues)){
					values = newValues;
				} else {
					values = [newValues];
				}
				if (deferred.length){
					defer(function() {
						for (var i = 0; i < deferred.length; i++)
							deferred[i]();
					});
				}
			}
			return state;
		};

		set['then'] = function (onFulfilled, onRejected) {
			var promise2 = pinkySwear(extend);
			var callCallbacks = function() {
				try {
					var f = (state ? onFulfilled : onRejected);
					if (Function.isFunction(f)) {
						resolve(f.apply(undef, values || []));
					} else {
						promise2(state, values);
					}
				} catch (e) {
					promise2(false, [e]);
				}
			};
			if (state != null) {
				defer(callCallbacks);
			} else {
				deferred.push(callCallbacks);
			}
			return promise2;

			function resolve(x) {
				var then, cbCalled = 0;
				try {
					if (x && Function.isFunction(then = x['then'])) {
						if (x === promise2){
							throw new TypeError();
						}
						then['call'](x, pass, fail );

						function pass(){ if (!cbCalled++) resolve.apply(undef, arguments); }
						function fail(value){ if (!cbCalled++) promise2(false, [value]); }
					} else {
						promise2(true, arguments);
					}
				} catch(e) {
					if (!cbCalled++) {
						promise2(false, [e]);
					}
				}
			}
		};

		set['catch'] = function (onRejected){
			return set['then'](function(){}, onRejected);
		};

		set['finally'] = function(afterPromise){
			return set['catch'](function(){return null;})['then'](afterPromise);
		};

		set['done'] = function(afterPromise, onRejected){
			return null;
		};

		if(extend){
			set = extend(set);
		}
		return set;
	};
})(typeof module == 'undefined' ? [window, 'promise'] : [module, 'exports']);
