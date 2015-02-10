jiffies = window.jiffies

describe 'UUID', ->
	it 'generates random UUIDs', ->
		jiffies.UUID.v4().should.match jiffies.UUID.rvalid
	it 'is generating UUIDs with random numbers', ->
		jiffies.UUID.v4().should.not.equal('00000000-0000-4000-8000-000000000000')