var UUID = {};
module.exports = UUID;

UUID.rvalid = /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i;

var random = require('./random/server.js');

UUID.v4 = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = random(1)&0x0f, v = c === 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
};
