jiffies = if window?
	window.jiffies
else
	require('../../src')


describe 'Lock', ->
	it 'prevents reentry', ->
		count = 0
		inc = jiffies.lock ->
			return if count > 4
			inc()
			count++
		inc()
		count.should.equal 1
