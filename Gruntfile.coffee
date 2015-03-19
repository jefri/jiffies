module.exports = (grunt) ->
	# butt - Browser Under Test Tools
	butt = []
	unless process.env.DEBUG
		if process.env.BAMBOO
			butt.push 'PhantomJS'
		else if process.env.TRAVIS
			butt.push 'Firefox'
		else
			butt.push 'Chrome'

	grunt.initConfig
		pkg: grunt.file.readJSON 'package.json'
		meta:
			banner:
				'// <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> \n
				<%= pkg.homepage ? "// " + pkg.homepage + "\n" : "" %>
				// Copyright (c) 2012 - <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;
				Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'

		clean:
			app:
				src: ["dist", "lib", "docs"]

		webpack:
			jefri:
				entry: './src/index.js'
				output:
					filename: './lib/<%= pkg.name %>.js'
				resolve:
					extensions: ['', ".js", ".coffee"]
					packageAlias: 'browser',
				module:
					loaders: [
						{ test: /\.coffee$/, loader: 'coffee-loader' }
					]

		uglify:
			dist:
				src: [
					"lib/<%= pkg.name %>.js"
				]
				dest: "lib/<%= pkg.name %>.min.js"

		mochaTest:
			options:
				# timeout: 1e6
				reporter: 'spec'
				require:
					"test/helpers.js"
			runtime:
				src: ["test/mocha/**/*.coffee"]

		karma:
			options:
				browsers: butt
				frameworks: [ 'mocha', 'sinon-chai' ]
				reporters: [ 'spec', 'junit', 'coverage' ]
				singleRun: true,
				logLevel: 'INFO'
				preprocessors:
					'test/**/*.coffee': [ 'coffee' ]
				junitReporter:
					outputFile: 'build/reports/karma.xml'
				coverageReporter:
					type: 'lcov'
					dir: 'build/reports/coverage/'
			client:
				options:
					files: [
						'lib/<%= pkg.name %>.js',
						'test/mocha/**/*.coffee'
					]
			min:
				options:
					files: [
						'lib/<%= pkg.name %>.min.js',
						'test/mocha/**/*.coffee'
					]

		release: {}

	# These plugins provide necessary tasks.
	grunt.loadNpmTasks "grunt-mocha-test"
	grunt.loadNpmTasks "grunt-webpack"
	grunt.loadNpmTasks "grunt-contrib-watch"
	grunt.loadNpmTasks "grunt-contrib-uglify"
	grunt.loadNpmTasks "grunt-contrib-clean"
	grunt.loadNpmTasks "grunt-karma"
	grunt.loadNpmTasks "grunt-release"

	grunt.registerTask "connect", (grunt)->
		mount = require('st')({ path: __dirname + '/test/context', url: '/' })
		require('http').createServer (req, res)->
			res.setHeader 'Access-Control-Allow-Origin', '*'
			res.setHeader 'Access-Control-Allow-Credentials', true
			res.setHeader 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'
			res.setHeader 'Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS'
			if (mount(req, res))
				return
			else
				res.end('this is not a static file')
		.listen(8000)

	grunt.registerTask "default", ["clean", "connect", "mochaTest", "webpack", "karma:client", "uglify", "karma:min"]
