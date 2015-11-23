Promise.prototype.finally = function(onFinished) {
  return this.then(onFinished, onFinished);
};
Promise.prototype.done = function(){
  return;
}
