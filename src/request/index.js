var _fetch = require('server.js');

module.exports = function fetch(uri, options){
  console.log('Fetching ' + uri);
  return _fetch(uri, options).then(function(response){
    console.log(response.status);
    var data = response.body.json();
    console.log(data);
    return data;
  });
};

module.exports.get = function get(uri){
  return fetch(uri).then(response);
};

module.exports.post = function post(uri, options){
  options.method = 'POST';
  if(options.data){
    options.body = options.data.toString();
    delete options.data;
  }
  if(options.dataType){
    options.headers = options.headers || {};
    options.headers["Content-Type"] = options.dataType;
  }
  return fetch(uri, options);
};
