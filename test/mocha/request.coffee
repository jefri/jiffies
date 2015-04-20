jiffies = if window?
	window.jiffies
else
	require('../../src')

describe 'request as fetch wrapper', ->
  it 'loads the request library', ->
    should.exist(jiffies.request)

  it 'requests JSON data', (done)->
    jiffies.request.get('http://localhost:8000/context.json')
    .then (results)->
      results = JSON.parse(results)
      results.should.have.property('entities')
      done()
