module.exports = function(config) {
  config.set({
    browsers : [ 'Chrome' ],
    frameworks : [ 'mocha', 'commonjs' ],
    preprocessors : {'**/*.js' : [ 'commonjs' ]},
    files : [ 'dist/spec.karma.js' ],
    reporters : [ 'spec' ],
    singleRun : true,
    logLevel : 'INFO'
  });
}
