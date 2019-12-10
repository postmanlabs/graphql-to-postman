var path = '../../',
  expect = require('chai').expect,
  package = require(path),
  packageJson = require(path + '/package.json');

/* global describe, it */
describe(packageJson.name, function () {
  it('should contain all com_postman_plugin attributes', function (done) {
    expect(packageJson.com_postman_plugin).to.have.property('plugin_type');
    expect(packageJson.com_postman_plugin).to.have.property('name');
    expect(packageJson.com_postman_plugin).to.have.property('source_format');
    expect(packageJson.com_postman_plugin).to.have.property('source_format_name');
    done();
  });

  it('should expose the required functions', function (done) {
    expect(typeof package.validate).to.equal('function');
    expect(typeof package.convert).to.equal('function');
    done();
  });
});
