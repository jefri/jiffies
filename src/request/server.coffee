Promise = require('../promise')
request = require 'request'

module.exports =
	get: (uri)->
		promise = Promise()
		request.get uri, (err, success, body)->
			promise !err?, err or body
		promise

	post: (uri, options)->
		promise = Promise()
		if options.data
			options.body = options.data.toString()
			delete options.data
		if options.dataType
			options.headers =
				"Content-type": options.dataType
			delete options.dataType
		request.post uri, options, (err, success, body)->
			promise !err?, err or body
		promise
