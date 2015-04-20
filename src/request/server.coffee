Promise = require('../promise')
request = require 'request'

module.exports =
  get: (uri)->
    new Promise (resolve, reject)->
      request.get uri, (err, success, body)->
        if err?
          reject err
        else
          resolve body

  post: (uri, options)->
    if options.data
      options.body = options.data.toString()
      delete options.data
    if options.dataType
      options.headers =
       "Content-type": options.dataType
      delete options.dataType
    new Promise (resolve, reject)->
      request.post uri, options, (err, success, body)->
        if err?
          reject err
        else
          resolve body
