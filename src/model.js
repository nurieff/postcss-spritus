var
  Spritesmith = require('spritesmith')
  , glob = require('glob')
  , gutil = require('gulp-util')
  , querystring = require('querystring')
  , fs = require('fs')
  ;

/**
 * @param {SpritusList} list
 * @param {String} str
 * @constructor
 */
function SpritusModel(list, str) {

  var config = {};
  if (str.indexOf('?') !== false) {
    str = str.replace(/\?(.+)$/ig, function (s) {
      config = querystring.parse(arguments[1]);
      return '';
    });
  }

  /**
   * @type {SpritusList}
   */
  this.list = list;

  /**
   * @type {String}
   * @private
   */
  this._str = str;

  /**
   * Full sprite or small
   * @type {boolean}
   * @private
   */
  this._isFull = false;
  this._used = [];
  this._path = str.indexOf('/') === 0 ? str : this.list.spritus.rootPath + str;

  /**
   * @type {Array<String>}
   */
  this._images = glob.sync(this._path);

  this._spriteImageKeys = [];
  this._spriteImages = {};
  this._spriteHeight = 0;
  this._spriteWidth = 0;

  var result = str.match(/\/([^\/]+)\/\*\.([a-z]{2,})$/i);
  this._name = 'name' in config ? config['name'] : result[1];
  this._ext = result[2];
  this._basename = this._name + '.' + this._ext;

  this._padding = 'padding' in config ? parseInt(config.padding) : this.list.spritus.config.padding;
  this._algorithm = 'algorithm' in config ? config.algorithm : this.list.spritus.config.algorithm;
}

SpritusModel.prototype.run = function (callback) {
  var images = [];
  if (this._isFull || this._used.length == 0) {
    images = this._images;
  } else {
    var u;
    var self = this;
    images = this._images.filter(function (item) {
      var r = false;
      for(var i = 0, l = self._used.length; i < l; ++i) {
        u = self._used[i];
        if (item.indexOf(u) !== -1) {
          r = true;
          break;
        }
      }
      return r;
    });

  }

  Spritesmith.run(
    {
      src: images,
      padding: this._padding,
      algorithm: this._algorithm,
    },
    this._spriteHandler.bind(this, callback)
  );
};

SpritusModel.prototype._spriteHandler = function (callback, err, result) {

  this._spriteImages = {};
  this._spriteImageKeys = [];
  this._spriteHeight = result.properties.height;
  this._spriteWidth = result.properties.width;

  var res;
  for (var path in result.coordinates) {
    if (!result.coordinates.hasOwnProperty(path)) continue;

    res = path.match(/\/([^\/\.]+)\.([a-z]{2,})$/i);
    this._spriteImages[res[1]] = result.coordinates[path];
    this._spriteImages[res[1] + '.' + res[2]] = result.coordinates[path];

    this._spriteImageKeys.push(res[1]);
  }

  var imgFile = new gutil.File({
    path: this._basename,
    contents: result.image
  });

  this.list.incrementComplete();
  callback.call(null,imgFile);
};


SpritusModel.prototype.isFull = function () {
  this._isFull = true;
};

SpritusModel.prototype.used = function (u) {
  if (this._used.indexOf(u) === -1) {
    this._used.push(u);
  }
};

SpritusModel.prototype.position = function (spriteName) {

  if (!(spriteName in this._spriteImages)) return '0 0';

  return (this._spriteImages[spriteName].x ? '-' + this._spriteImages[spriteName].x + 'px' : '0')
    + ' ' +
    (this._spriteImages[spriteName].y ? '-' + this._spriteImages[spriteName].y + 'px' : '0')
};

SpritusModel.prototype.url = function () {
  return 'url("' + this.list.spritus.config.imageDirCSS + this._basename + '")';
};

SpritusModel.prototype.height = function (spriteName) {

  if (!spriteName) {
    return this._spriteHeight + 'px';
  }

  return this._spriteImages[spriteName].height + 'px';
};

SpritusModel.prototype.width = function (spriteName) {

  if (!spriteName) {
    return this._spriteWidth + 'px';
  }

  return this._spriteImages[spriteName].width + 'px';
};

SpritusModel.prototype.size = function () {
  return this._spriteWidth + 'px ' + this._spriteHeight + 'px';
};

/**
 * @return {Object.<string, {width, height, position}>}
 */
SpritusModel.prototype.all = function () {

  var nodes = {}, k;
  for(var i = 0, l = this._spriteImageKeys.length; i < l; ++i) {
    k = this._spriteImageKeys[i];
    nodes[k] = {
      width: this.width(k),
      height: this.height(k),
      position: this.position(k)
    }
  }

  return nodes;
};

module.exports = SpritusModel;