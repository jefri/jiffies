module.exports = function(config) {
  config.set({
    browsers: ['Chrome'],
    frameworks: [ 'mocha', 'chai' ],
    files: [
      'test/tests.js'
    ],
    reporters: ['spec'],
    singleRun: true,
    logLevel: 'INFO'
  });
}
