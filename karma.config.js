module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    frameworks: [ 'mocha', 'chai' ],
    files: [
      'build/tests.js'
    ],
    reporters: ['spec'],
    singleRun: true,
    logLevel: 'INFO'
  });
}
