var fs = require('fs');
module.exports = {
  asJson: function (spec) {
    try {
      return JSON.parse(spec);
    }
    catch (jsonException) {
      throw new SyntaxError(`Specification is not a valid JSON. ${jsonException}`);
    }
  },

  getDataFromFile: function (path) {
    return fs.readFileSync(path).toString();
  }
};
