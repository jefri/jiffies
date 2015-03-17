var fetch = require('server.js');

fetch.get = function get(uri){
  return fecth(uri);
};

fetch.post = function post(uri, options){
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

module.exports = fetch;
