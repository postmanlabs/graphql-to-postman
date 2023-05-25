const sdk = require('postman-collection'),
  graphql = require('graphql'),
  { generateQuery, resolveVariableType, getVarsToTypesStr } = require('./assets/gql-generator'),

  // Code related constants
  DEFAULT_NAME = 'Postman Collection (from GraphQL)',
  MAX_ALLOWED_DEPTH = 4,
  QUERY_TYPES = {
    QUERY: 'Query',
    MUTATION: 'Mutation',
    SUBSCRIPTION: 'Subscription'
  };

/** Returns valid GraphQLSchemaObject from input else returns false
 *
 * @param {String} data String of input data
 *
 */
function getGraphQLSchemaObject (data) {
  var gqlSchemaObj,
    introspectionObject;

  try {
    // Check if valid JSON object and generate SDL
    introspectionObject = util.asJson(data);
    // introspection query result has the following structure:
    // https://graphql.org/learn/introspection/
    // The user can directly provide this
    // {
    //   data: {
    //   // Or may provide this.
    //     __schema: {

    //     }
    //   }
    // }

    // Either way, the function `graphql.buildClientSchema`
    // only takes in the value of `data` from above.
    if (introspectionObject.data) {
      introspectionObject = introspectionObject.data;
    }
    gqlSchemaObj = graphql.buildClientSchema(introspectionObject);
  }
  catch (err) {
    try {
      // if not JSON, data must be SDL, check if it is a valid GraphQL SDL
      gqlSchemaObj = graphql.buildSchema(data);
    }
    catch (error) {
      return false;
    }
  }

  return gqlSchemaObj;
}

/**
 * Generate the query for the specified field
 *
 * @param gqlSchema Parsed GraphQL schema object
 * @param name Name of the corresponding element from which to generate query
 * @param type Type of corresponding element (One of Query, Mutation, Subscription)
 * @param options Options to be used
 */
function generateQueryAndVariables (gqlSchema, name, type, options) {
  const stackLimit = options.variableDepth || 5,
    includeDeprecatedFields = options.includeDeprecatedFields || false;

  let field,
    newType;

  // The name of the mutationType can be anything other than 'Mutation'
  // Handle for each type separately and use the new type to traverse through
  // the fields.
  if (type === 'Mutation') {
    field = gqlSchema._mutationType._fields[name];
    newType = gqlSchema._mutationType.name;
  }
  else if (type === 'Query') {
    field = gqlSchema._queryType._fields[name];
    newType = gqlSchema._queryType.name;
  }
  else if (type === 'Subscription') {
    field = gqlSchema._subscriptionType._fields[name];
    newType = gqlSchema._subscriptionType.name;
  }

  /* Only process non-deprecated queries/mutations: */
  if (includeDeprecatedFields || !field.isDeprecated) {
    const queryResult = generateQuery(gqlSchema, name, newType, options),
      varsToTypesStr = getVarsToTypesStr(queryResult.argumentsDict);

    /* Generate variables Object from argumentDict */
    var variables = {};
    Object.entries(queryResult.argumentsDict).map(([varName, arg]) => {
      variables[varName] = resolveVariableType(arg.type, gqlSchema, 0, stackLimit);
    });

    let query = queryResult.queryStr;
    // here the `type` is used to construct the actual queries
    // Here has to be one of query, mutation, or subscription.
    query = `${type.toLowerCase()} ${name}${varsToTypesStr ? ` (${varsToTypesStr}) ` : ' '}{\n${query}\n}`;

    return {
      query: query,
      variables: JSON.stringify(variables, null, 2)
    };
  }
}

/**
 * Generates Postman collection request for corresponding element
 *
 * @param {*} name Name of the corresponding element from which to generate query
 * @param {*} graphqlObj GraphQL object to be assigned as body for PM request body
 */
function generatePmRequest (name, graphqlObj) {
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

  return item;
}

module.exports = {
  convertV2: (data, options, callback) => {
    try {
      var gqlSchemaObj,
        collection = new sdk.Collection(),
        includeDeprecatedFields = options.includeDeprecatedFields || false,
        queryDir,
        mutationDir,
        subscriptionDir;

      collection.name = DEFAULT_NAME;

      gqlSchemaObj = getGraphQLSchemaObject(data);

      if (!gqlSchemaObj) {
        return callback(null, {
          result: false,
          reason: 'Invalid Data.'
        });
      }

      if (options.variableDepth > MAX_ALLOWED_DEPTH) {
        options.variableDepth = MAX_ALLOWED_DEPTH;
      }

      const queryNames = Object.keys(gqlSchemaObj.getQueryType()?.getFields() || {}),
        mutationNames = Object.keys(gqlSchemaObj.getMutationType()?.getFields() || {}),
        subscriptionNames = Object.keys(gqlSchemaObj.getSubscriptionType()?.getFields() || {});

      if (queryNames.length) {
        queryDir = new sdk.ItemGroup();
        queryDir.name = QUERY_TYPES.QUERY;
      }

      if (mutationNames.length) {
        mutationDir = new sdk.ItemGroup();
        mutationDir.name = QUERY_TYPES.MUTATION;
      }

      if (subscriptionNames.length) {
        subscriptionDir = new sdk.ItemGroup();
        subscriptionDir.name = QUERY_TYPES.SUBSCRIPTION;
      }

      queryNames.forEach((queryName) => {
        const gqlBodyObj = generateQueryAndVariables(gqlSchemaObj, queryName, QUERY_TYPES.QUERY, options);

        gqlBodyObj && (queryDir.items.add(generatePmRequest(queryName, gqlBodyObj)));
      });

      mutationNames.forEach((mutationName) => {
        const gqlBodyObj = generateQueryAndVariables(gqlSchemaObj, mutationName, QUERY_TYPES.MUTATION, options);

        gqlBodyObj && (mutationDir.items.add(generatePmRequest(mutationName, gqlBodyObj)));
      });

      subscriptionNames.forEach((subscriptionName) => {
        const gqlBodyObj = generateQueryAndVariables(gqlSchemaObj, subscriptionName, QUERY_TYPES.SUBSCRIPTION, options);

        gqlBodyObj && (subscriptionDir.items.add(generatePmRequest(subscriptionName, gqlBodyObj)));
      });

      queryDir && (collection.items.add(queryDir));
      mutationDir && (collection.items.add(mutationDir));
      subscriptionDir && (collection.items.add(subscriptionDir));

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
      console.log(e);
      if (e.message) {
        return callback(null, {
          result: false,
          reason: 'Could not generate collection. Error Message: ' + e.message
        });
      }
      return callback(e);
    }
  }
};
