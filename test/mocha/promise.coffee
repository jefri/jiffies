jiffies = if window?
	window.jiffies
else
	require('../../src')

promise = jiffies.promise

describe "Promises/A+ Tests", ->
  describe.skip 'Spec', ->
    return unless require?
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

  describe 'Promise Extensions', ->
    it 'stops the chain on done', ->
      p = promise()
      (->p.done().then()).should.throw(Error)

    it 'catches the chain', (done)->
      p = promise()
      failures = 0
      p
      .catch ->
        failures++
      .then ->
        failures.should.equal 1
        done()
      .catch (e)->
        done(e)

      p(false, ['Err'])
