module.exports = EventDispatcher = ->
EventDispatcher:: =
	# constructor: EventDispatcher
	on: (event, fn)->
		@_listeners = {} unless @_listeners?
		listeners = @_listeners
		listeners[event] = []	unless listeners[event]?
		listeners[event].push fn unless listeners[event].includes(fn)

	off: (event, fn)->
		return unless @_listeners?
		listeners = @_listeners
		index = listeners[event].indexOf(fn)
		listeners[event].splice index, 1	if index isnt -1

	emit: (event, args)->
		return unless @_listeners?
		listeners = @_listeners
		listenerArray = listeners[event]
		if listenerArray?
			event.target = this
			listener.call this, event for listener in listenerArray
