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

function Spritus(css, config) {

  if (!(this instanceof Spritus)) return new Spritus(css, config);

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

  this.decls = [];

  /**
   * @type {Function}
   */
  this.endCallback = null;

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
    //console.log(rule.selector);
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

      //console.log(decl.prop);
      //console.log(decl.value);
      //console.log('--');

    });

    //console.log('----');

  });
};

Spritus.prototype.create = function () {
  this.SpritusList.run(this.runHandler.bind(this))
};

Spritus.prototype._saveFile = function (file, path, fromImagemin) {
  var filepath = path + file.path;

  fs.unlink(filepath, function (err) {
    if (err) {

    }
    fs.writeFileSync(filepath, file.contents);

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

  var decl;
  for(var i = 0, l = this.decls.length; i < l; ++i) {
    decl = this.decls[i];

    if (decl.prop === self.config.searchPrefix) {
      // TODO
    } else {
      // TODO
    }

  }

  this.strCSS = SpritusCssReplacer.makeCSS(this.strCSS, this.SpritusList, this.config.searchPrefix);

  var path = this.config.imageDirSave.indexOf('/') === 0 ? this.config.imageDirSave : this.rootPath + this.config.imageDirSave;
  var self = this;
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
};

module.exports = postcss.plugin('spritus', function(options) {

  return function(css) {

    Spritus(css, options || {})
      .find()
      .create();

  }

});