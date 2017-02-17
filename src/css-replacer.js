/**
 * @param {SpritusList} SpritusList
 * @param {String} searchPrefix
 * @constructor
 */
function SpritusCssReplacer(SpritusList, searchPrefix) {

  if (!(this instanceof SpritusCssReplacer)) return new SpritusCssReplacer(SpritusList, searchPrefix);

  this._searchPrefix = searchPrefix;

  /**
   * @type {SpritusList}
   */
  this.SpritusList = SpritusList;
}

SpritusCssReplacer.prototype._reg = function (mod, dopArgs) {

  var r = [];
  r.push(this._searchPrefix);
  if (mod) {
    if (Array.isArray(mod)) {
      r.push("\\-(" + mod.join('|') + ')');
    } else {
      r.push("\\-" + mod);
    }
  }

  if (dopArgs) {
    r.push("\\(\\\"([^\\)\\\"]+)\\\"");
    r.push(",?\\s*?\\\"?([^\\)\\\"]*)\\\"?\\)");
  } else {
    r.push("\\(\\\"([^\\)\\\"]+)\\\"\\)");
  }

  return new RegExp(r.join(''), 'ig');
};

SpritusCssReplacer.prototype._regAsProperty = function (mod, dopArgs) {

  var r = [];
  if (Array.isArray(mod)) {
    r.push("(" + mod.join('|') + ')');
  } else {
    r.push(mod);
  }


  if (dopArgs) {
    r.push("\\(\\\"([^\\)\\\"]+)\\\"");
    r.push(",?\\s*?\\\"?([^\\)\\\"]*)\\\"?\\)");
  } else {
    r.push("\\(\\\"([^\\)\\\"]+)\\\"\\)");
  }

  return new RegExp(r.join(''), 'ig');
};

SpritusCssReplacer.prototype._common = function (v) {

  var allow = ['width', 'height', 'position'];
  var self = this;
  v = v.replace(this._reg(allow, true), function () {
    var propertiy = arguments[1];
    var str = arguments[2];
    var img = arguments[3];

    if (!self.SpritusList.get(str)) {
      if (['height', 'width'].indexOf(propertiy) !== -1) {
        return 'auto';
      }

      return '0px 0px';
    }

    if (!img) {
      if (propertiy === 'position') {
        return 'auto';
      }
    }

    return self.SpritusList.get(str)[propertiy](img);
  });

  return v;
};

SpritusCssReplacer.prototype._forParent = function (v) {
  var allow = ['url', 'size'];
  var self = this;
  v = v.replace(this._reg(allow), function () {
    var propertiy = arguments[1];
    var str = arguments[2];

    if (!self.SpritusList.get(str)) {
      if (propertiy === 'size') {
        return '';
      }

      return '';
    }

    return self.SpritusList.get(str)[propertiy]();
  });

  return v;
};

/**
 * @param v
 * @returns {Array.<{prop: String, value: String}>}
 */
SpritusCssReplacer.prototype.phw = function (v) {
  var str = null;
  var img = null;
  v.replace(this._regAsProperty('phw', true), function () {
    str = arguments[1];
    img = arguments[2];
  });

  if (!img || !this.SpritusList.get(str)) {
    return null;
  }

  return [
    {
      prop: 'background-position',
      value: this.SpritusList.get(str).position(img)
    },
    {
      prop: 'height',
      value: this.SpritusList.get(str).height(img)
    },
    {
      prop: 'width',
      value: this.SpritusList.get(str).width(img)
    },
  ];
};

SpritusCssReplacer.prototype.each = function (v) {
  var r = [];
  r.push('each');
  r.push("\\(\\\"([^\\)\\\"]+)\\\"\\)");

  var str = null;
  v.replace(new RegExp(r.join(''), 'gi'), function (v) {
    str = arguments[1];
  });

  if (!this.SpritusList.get(str)) {
    return null;
  }

  var nodes = this.SpritusList.get(str).all();
  var rules = [];

  for (var key in nodes) {
    if (!nodes.hasOwnProperty(key)) continue;

    rules.push({
      key: key,
      decls: [
        {
          prop: 'background-position',
          value: nodes[key].position
        },
        {
          prop: 'height',
          value: nodes[key].height
        },
        {
          prop: 'width',
          value: nodes[key].width
        },
      ]
    });
  }

  return rules;
};

/**
 * @returns {SpritusCssReplacer}
 */
SpritusCssReplacer.prototype.asValue = function (v) {
  v = this._forParent(v);
  v = this._common(v);

  return v;
};

module.exports = SpritusCssReplacer;