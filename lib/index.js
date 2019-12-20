var schemaToQuery = require('./assets/gql-generator').schemaToQuery,
  converter,
  util = require('./util'),
  sdk = require('postman-collection'),
  _ = require('lodash'),
  graphql = require('graphql');

/** Generate SDL from Introspection Object
 *
 * @param {Object} introspectionQuery
 */
function introspectionQueryToSdl (introspectionQuery) {
  const graphqlSchemaObj = graphql.buildClientSchema(introspectionQuery);

  return graphql.printSchema(graphqlSchemaObj);
}

/**
   * This function overrides options. If option is not present than default value from getOptions() will be used.
   * It also checks if availableOptions are present then option should be one of them, otherwise default will be used.
   * And checks for type of option if it does not match then default is used.
   *
   * @param {Array} options - Array of option objects
   * @returns {Object} overridden options
   */
function overrideOptions (options) {
  var optionsToOverride = converter.getOptions();

  _.forEach(optionsToOverride, (option) => {
    if (!_.has(options, option.id)) {
      options[option.id] = option.default;
    }
    else if (option.availableOptions) {
      if (!_.includes(option.availableOptions, options[option.id])) {
        options[option.id] = option.default;
      }
    }
    else if (typeof options[option.id] !== option.type) {
      if (!typeof parseInt(options[option.id]) === option.type) {
        options[option.id] = option.default;
      }
    }
  });

  return options;
}

/** Returns valid SDL from input else returns false
 *
 * @param {String} data String of input data
 * @param {Boolean} validated is the data validated or not
 *
 */
function getGraphQLSDL (data, validated) {
  var graphqlSdl,
    introspectionObject;

  try {
    // Check if valid JSON object and generate SDL
    introspectionObject = util.asJson(data);
    graphqlSdl = introspectionQueryToSdl(introspectionObject);
  }
  catch (err) {
    try {
      if (validated) {
        return data;
      }
      // if not JSON, data must be SDL, check if it is a valid GraphQL SDL
      graphqlSdl = graphql.buildSchema(data);
    }
    catch (error) {
      return false;
    }
  }

  return graphqlSdl;
}

converter = {
  /** Validate function for validating schema is graphql or not.
   *
   * @param input
   * @param input.type Type of input 'file' / 'string'
   * @param input.data Input data to be validated
   */
  validate: function (input) {
    var graphqlSdl,
      data;
    if (input.type === 'file') {
      try {
        data = util.getDataFromFile(input.data);
      }
      catch (error) {
        return {
          result: false
        };
      }
    }
    else if (input.type === 'string') {
      data = input.data;
    }
    else {
      return { result: false };
    }

    // Try generting SDL from the data / validate SDL.
    graphqlSdl = getGraphQLSDL(data, false);

    return graphqlSdl ? { result: true } : { result: false };
  },

  /**
   * Used in order to get additional options for importing of GraphQL
   *
   * @module getOptions
   *
   * @returns {Array} Options specific to generation of postman collection from RAML 1.0 schema
   */
  getOptions: function () {
    return [
      {
        name: 'Include Deprecated Fields',
        id: 'includeDeprecatedFields',
        type: 'boolean',
        default: false,
        description: 'If set true, will include deprecated fields in the queries generated.'
      },
      {
        name: 'Depth of Query generated',
        id: 'depth',
        type: 'number',
        default: 1,
        description: 'Determines the depth to which the query should be generated.'
      }
    ];
  },

  /** Converts GraphQL schema into a Postman Collection.
   *
   * @param {Object} input Input
   * @param {String} input.type Type of input 'file' / 'string'
   * @param {String} input.data Input data
   * @param {Object} options Options for configuration
   * @param {Function} callback Callback
   */
  convert: function (input, options, callback) {
    var graphqlSdl,
      data,
      collection = new sdk.Collection(),
      queryCollection;

    // default options for unselected options.
    options = overrideOptions(options);

    collection.name = 'Postman Collection (from GraphQL)';

    if (input.type === 'file') {
      try {
        data = util.getDataFromFile(input.data);
      }
      catch (e) {
        return callback(null, {
          result: false,
          reason: e.message
        });
      }
    }
    else if (input.type === 'string') {
      data = input.data;
    }
    else {
      return callback(null, {
        result: false,
        reason: 'Input type not supported.'
      });
    }

    // Assuming data is valid
    graphqlSdl = getGraphQLSDL(data, true);

    try {
      if (graphqlSdl) {
        queryCollection = schemaToQuery(graphqlSdl, options.depth, options.includeDeprecatedFields);
      }
      else {
        return callback(null, {
          result: false,
          reason: 'Invalid Data.'
        });
      }

      _.forEach(queryCollection, (value, key) => {
        var folder = new sdk.ItemGroup();
        folder.name = key;
        _.forEach(value, (graphqlObj, name) => {
          var request = {},
            item = {};

          item.name = name;
          request.url = '{{url}}';
          request.method = 'POST';
          request.body = {
            mode: 'graphql',
            graphql: graphqlObj
          };
          item.request = request;
          folder.items.add(item);
        });
        collection.items.add(folder);
      });

      collection.variables.add(new sdk.Variable({
        id: 'url',
        value: '',
        description: 'URL for the request.'
      }));

      return callback(null, {
        result: true,
        output: [{
          type: 'collection',
          data: collection.toJSON()
        }]
      });
    }
    catch (e) {
      if (e.message) {
        return callback(null, {
          result: false,
          reason: 'Could not generate collection. Error Message:' + e.message
        });
      }
      return callback(e);
    }
  }
};

module.exports = converter;
