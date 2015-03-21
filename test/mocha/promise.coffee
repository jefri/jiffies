jiffies = if window?
  window.jiffies
else
  require('../../src')

Promise = jiffies.promise

describe "Promises/A+ Tests", ->
  describe 'Spec', ->
    return unless require?
    require("promises-aplus-tests").mocha
      resolved: (value)-> new Promise (s, j)-> s(value)
      rejected: (reason)-> new Promise (s, j)-> j(reason)
      deferred: -> Promise.defer()

  describe 'Promise Extensions', ->
    it 'catches the chain', (done)->
      failures = 0
      p = Promise.defer()
      p.promise
      .catch ->
        failures++
      .then ->
        failures.should.equal 1
        done()
      .catch (e)->
        done(e)

      p.reject('err')

    it 'has a finally', ->
      failures = 0
      p = Promise.defer()
      p.promise
      .catch ->
        failures++
      .then ->
        failures.should.equal 1
      .finally (e)->
        done(e)

      p.reject('err')

    it 'has a done', ->
      failures = 0
      p = Promise.defer()
      p.promise
      .catch ->
        failures++
      .then ->
        failures.should.equal 1
        done()
      .done()

      p.reject('err')
