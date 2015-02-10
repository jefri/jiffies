jiffies = require('../../src/index')
describe 'event', ->
	it 'provides an event mixin', ->
		passes = false
		Foo = ->
		Object.assign Foo::, jiffies.Event::
		foo = new Foo
		foo.on 'bar', -> passes = true
		foo.emit 'bar'
		passes.should.equal true
