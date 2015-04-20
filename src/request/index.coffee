request = require('./server') # Will be aliased to browser by Webpack

module.exports = (uri)->
  # Consistently handle "" for requests
  if uri is ""
    Promise()(yes)
  else
    request.get(uri)

module.exports.get = request.get
module.exports.post = request.post
