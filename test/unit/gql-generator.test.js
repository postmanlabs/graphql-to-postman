const schemaToQuery = require('../../lib/assets/gql-generator').schemaToQuery,
  fs = require('fs'),
  path = require('path'),
  graphql = require('graphql'),
  validSchemaSDL = fs.readFileSync(path.join(__dirname, './fixtures/validSchemaSDL.graphql')).toString(),
  expect = require('chai').expect;

describe('gql-generator tests', function () {
  it('should not throw type error for non defined elements in GQL schema', function (done) {
    const data = validSchemaSDL,
      gqlSchemaObj = graphql.buildSchema(data);

    // Set specific property as null to test behaviour for non defined nodes.
    gqlSchemaObj._typeMap.PatchSize = undefined;

    try {
      schemaToQuery(gqlSchemaObj, { depth: 5 });
    }
    catch (e) {
      expect(e).to.be.undefined;
    }

    done();
  });

  it('should not throw type error for some of elements that are defined non-object in GQL schema', function (done) {
    const data = validSchemaSDL,
      gqlSchemaObj = graphql.buildSchema(data);

    // Set specific property as null to test behaviour for non defined nodes.
    gqlSchemaObj._mutationType._fields = undefined;

    try {
      schemaToQuery(gqlSchemaObj);
    }
    catch (e) {
      expect(e).to.be.undefined;
    }

    done();
  });
});
