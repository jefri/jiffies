var Promise = require('promise-polyfill');
Promise.prototype.finally = function(onFinished){
  return this.then(onFinished, onFinished);
};
Promise.prototype.done = function(){
  return;
}
Promise.defer = function(){
  var resolve, reject, promise = new Promise(function(s, j){
    resolve = s;
    reject = j;
  });

  return {
    promise: promise,
    resolve: resolve,
    reject: reject
  };
}

module.exports = Promise;
