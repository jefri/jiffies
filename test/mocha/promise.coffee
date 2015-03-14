promise = require('../../').promise

describe "Promises/A+ Tests", ->
  require("promises-aplus-tests").mocha
    resolved: (value)->
      p = promise()
      p true, [value]
      return p
    rejected: (reason)->
       p = promise()
       p false, [reason]
       return p
    deferred: ->
      p = promise()

      promise: p,
      resolve: (value)->
        p(true, [value])
      reject: (reason)->
        p false, [reason]
