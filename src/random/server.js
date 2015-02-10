var crypto = require('crypto');
module.exports = function(size){
	// sync
	try {
		var buf = crypto.randomBytes(size);
		var array = new Uint8Array(buf);
		return [].slice.call(array)[0];
	} catch (ex) {
		// handle error
		// most likely, entropy sources are drained
	}
};
