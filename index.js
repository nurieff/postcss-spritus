var postcss = require('postcss');

var
  SpritusList = require('./src/list')
  , SpritusCssReplacer = require('./src/css-replacer')
  , imagemin = require('imagemin')
  , mkdirp = require('mkdirp')
  , fs = require('fs')
  , prettyBytes = require('pretty-bytes')
  , imageminPngquant = require('imagemin-pngquant')
  ;

/**
 * @param {Object} css
 * @param {Object} config
 * @param {{resolve: function, reject: function}} p
 * @returns {Spritus}
 * @constructor
 */
function Spritus(css, config, p) {

  if (!(this instanceof Spritus)) return new Spritus(css, config, p);

  this.config = {
    padding: 2,
    algorithm: 'top-down', // left-right,diagonal,alt-diagonal,binary-tree
    searchPrefix: 'spritus',
    withImagemin: true,
    withImageminPlugins: null,
    imageDirCSS: '../images/',
    imageDirSave: 'public/images/'
  };

  this.css = css;

  this.resolve = p.resolve;
  this.reject = p.reject;

  this.decls = [];

  /**
   * @type {Array}
   */
  this.imgFiles = [];

  /**
   * @type {SpritusList}
   */
  this.SpritusList = null;

  this.rootPath = process.cwd() + '/';

  if (config) {
    for (var key in config) {
      if (!config.hasOwnProperty(key)) continue;

      if (key in this.config) {
        this.config[key] = config[key];
      }
    }
  }
}

Spritus.prototype.find = function () {
  this.SpritusList = new SpritusList(this);
  var self = this;

  this.css.walkRules(function (rule) {
    rule.walkDecls(function (decl, i) {

      if (decl.prop === self.config.searchPrefix) {
        decl.value.replace(new RegExp("[^\\(]+\\(\\\"([^\\\"]+)\\\"", 'ig'), function (str) {
          self.SpritusList.push(arguments[1]);
          self.decls.push(decl);
          return str;
        });
      } else {
        decl.value.replace(new RegExp(self.config.searchPrefix + "\\-[^\\(]+\\(\\\"([^\\\"]+)\\\"", 'ig'), function (str) {
          self.SpritusList.push(arguments[1]);
          self.decls.push(decl);
          return str;
        });
      }

    });
  });

  return this;
};

Spritus.prototype.create = function () {
  this.SpritusList.run(this.runHandler.bind(this))
};

Spritus.prototype._saveFile = function (file, path, fromImagemin) {
  var filepath = path + file.path;

  fs.unlink(filepath, function (err) {
    if (err) {

    }
    fs.writeFile(filepath, file.contents);

    if (!fromImagemin) {
      console.log('spritus[save file]: ' + path + file.path);
    }
  });
};

Spritus.prototype._saveImagemin = function (file, path) {

  var self = this;

  imagemin.buffer(file.contents, {
    plugins: this.config.withImageminPlugins ? this.config.withImageminPlugins : [
      imageminPngquant({
        quality: '60-70',
        speed: 1
      })
    ]
  })
    .then(function (data) {

      var originalSize = file.contents.length;
      var optimizedSize = data.length;
      var saved = originalSize - optimizedSize;
      var percent = (originalSize > 0 ? (saved / originalSize) * 100 : 0).toFixed(1).replace(/\.0$/, '');
      var msg = saved > 0 ? '- saved ' + prettyBytes(saved) + ' (' + percent + '%)' : ' -';
      console.log('spritus[imagemin]: ' + path + file.path + ' ' + msg);

      file.contents = data;

      self._saveFile(file, path, true);
    })
    .catch(function (err) {
      console.log('imagemin: ' + file.path + ' Error');
      console.log(err);
    });
};

Spritus.prototype.runHandler = function (imgFile) {

  this.imgFiles.push(imgFile);

  if (!this.SpritusList.isComplete()) return;

  var replacer = new SpritusCssReplacer(this.SpritusList, this.config.searchPrefix);

  var self = this;
  var decl;
  for (var i = 0, l = this.decls.length; i < l; ++i) {
    decl = this.decls[i];

    if (decl.prop === self.config.searchPrefix) {
      if (decl.value.indexOf('phw') !== -1) {
        var props = replacer.phw(decl.value);

        if (props) {
          props.forEach(function (item) {
            decl.parent.append(item);
          });
        }
        decl.parent.removeChild(decl);

      } else if(decl.value.indexOf('each') !== -1) {
        var newRules = replacer.each(decl.value);

        var root = decl.parent.root();

        if (newRules) {
          newRules.forEach(function (item) {
            var r = postcss.rule({selector: decl.parent.selector + '-' + item.key});
            r.source = decl.parent.source;
            item.decls.forEach(function (d) {
              r.append(d);
            });

            decl.parent.walkDecls(function (decl) {
              if (decl.prop !== self.config.searchPrefix) {
                r.append(decl.clone());
              }
            });

            root.insertBefore(decl.parent, r);
          })
        }

        root.removeChild(decl.parent);
      }
    } else {
      decl.value = replacer.asValue(decl.value);
    }

  }

  var path = this.config.imageDirSave.indexOf('/') === 0 ? this.config.imageDirSave : this.rootPath + this.config.imageDirSave;

  mkdirp(path, function (err) {
    if (err) {
      console.log(err);
      return;
    }

    var i, l;
    if (!self.config.withImagemin) {
      for (i = 0, l = self.imgFiles.length; i < l; ++i) {
        self._saveFile(self.imgFiles[i], path);
      }
    } else {
      for (i = 0, l = self.imgFiles.length; i < l; ++i) {
        self._saveImagemin(self.imgFiles[i], path);
      }
    }

  });

  this.resolve();
};

module.exports = postcss.plugin('postcss-spritus', function (options) {

  return function (css) {

    return new Promise(function (resolve, reject) {
      Spritus(css, options || {}, {resolve:resolve, reject: reject})
        .find()
        .create();
    });
  }

});