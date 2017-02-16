var SpritusModel = require('./model');

/**
 * @param {Spritus} spritus
 * @constructor
 */
var SpritusList = function (spritus) {

  /**
   * @type {Spritus}
   */
  this.spritus = spritus;
  this.length = 0;
  this.amountComplete = 0;

  /**
   * @type {Object.<String,SpritusModel>}
   */
  this.list = {};
};

/**
 * @param str
 * @return {SpritusModel}
 */
SpritusList.prototype.push = function (str) {
  if (str in this.list) {
    return this.list[str];
  }

  this.length += 1;

  return this.list[str] = new SpritusModel(this, str);
};

/**
 * @param str
 * @return {SpritusModel|null}
 */
SpritusList.prototype.get = function (str) {
  if (str in this.list) {
    return this.list[str];
  }

  return null;
};

SpritusList.prototype.incrementComplete = function () {
  ++this.amountComplete;
};

SpritusList.prototype.isComplete = function () {
  return this.length == this.amountComplete;
};

SpritusList.prototype.each = function (cb) {
  for (var str in this.list) {
    if (!this.list.hasOwnProperty(str)) continue;

    cb.call(null, this.list[str]);
  }
};

SpritusList.prototype.run = function (cb) {
  this.each(function (_spritus) {
    _spritus.run(cb)
  });
};

module.exports = SpritusList;