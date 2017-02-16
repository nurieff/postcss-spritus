var postcss = require('postcss');

module.exports = postcss.plugin('spritus', function spritus(options) {

  return function (css) {

    options = options || {};

    css.walkRules(function (rule) {
      console.log(rule.selector);
      rule.walkDecls(function (decl, i) {

        console.log(decl.prop);
        console.log(decl.value);
        console.log('.');

      });

      console.log('---');

    });

  }

});