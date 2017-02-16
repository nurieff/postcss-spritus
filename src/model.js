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

  Spritesmith.run(
    {
      src: this._images,
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
  callback(imgFile);
};

SpritusModel.prototype.position = function (spriteName) {

  if (!(spriteName in this._spriteImages)) return '0px 0px';

  return this._spriteImages[spriteName].x + 'px ' + this._spriteImages[spriteName].y + 'px';
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