require('./polyfill');

module.exports = {
	Event: require('./event'),
	lock: require('./lock'),
	promise: require('./promise'),
	request: require('./request/server'),
	UUID: require('./UUID')
};

if(typeof window == 'object' && window !== null){
	window.jiffies = module.exports;
}
