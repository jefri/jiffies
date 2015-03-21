Promise = require('../promise')

ajax = (options)->
  # Nice clean way to get an xhr
  XHR = window.ActiveXObject or XMLHttpRequest
  xhr = new XHR 'Microsoft.XMLHTTP'

  # Probably a GET requst, unless there is data or something else is specified.
  xhr.open (options.type or if options.data then 'POST' else 'GET'), options.url, true

  # Most likely sending text/plain
  if 'overrideMimeType' in xhr
     xhr.overrideMimeType options.dataType or 'text/plain'

  promise = new Promise (resolve, reject)->
    # Handle state changes.
    xhr.onreadystatechange = ->
       if xhr.readyState is 4
          if ((_ref = xhr.status) is 0 or _ref is 200)
            # Resolve on success.
            resolution = xhr.responseText
            if options.dataType is "application/json"
              resolution = JSON.parse resolution
            resolve resolution
          else
            # Reject on failure.
            reject new Error "Could not load " + options.url
          return

  # We'll need to set headers to send the data.
  if options.data
     xhr.setRequestHeader "Content-type", options.dataType or "application/x-www-form-urlencoded"

  # Execute the request.
  xhr.send options.data or null

  # No need to return the entire XHR request.
  promise

module.exports =
  # get(url[, options])
  # Shorthand for a GET request.
  get: (url, options)->
     options = options or {}
     options.url = url
     options.type = 'GET'
     options.data = null
     ajax options

  # post(url[, options])
  # Shorthand for a POST request.
  post: (url, options)->
     options = options or {}
     options.url = url
     options.type = 'POST'
     ajax options
