var _promise = require('pinkyswear');

module.exports = function(){
  return _promise(function extend(set){
    set['catch'] = function Catch(onRejected){
      return set['then'](null, onRejected);
    };

    set['done'] = function Done(onSuccess, onRejected){
      set['then'](onSuccess, onRejected);
    };

    return set;
  })
};
