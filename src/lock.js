module.exports = function( fn ) {
	return function(){
		var ret, ex;
		if(!fn.__locked){
			fn.__locked = true;
			try {
				ret = fn.apply(this, arguments);
			} catch (e){
				ex = e;
			}
		}
		fn.__locked = false;
		if(ex){
			throw ex;
		} else {
			return ret;
		}
	};
};
