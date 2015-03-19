var _promise = require('pinkyswear');

module.exports = function(){
  return _promise(function extend(set){
    set['catch'] = function Catch(onRejected){
      return set['then'](null, onRejected);
    };

    set['finally'] = function Finally(onFinished){
      set['then'](onFinished, onFinished);
    };

    return set;
  })
};
