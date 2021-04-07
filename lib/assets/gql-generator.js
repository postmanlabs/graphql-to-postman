// Forked from https://github.com/timqian/gql-generator.

var graphql = require('graphql'),

  /**
   * Generate variables string
   *
   * @param dict dictionary of arguments
   */
  getArgsToVarsStr = (dict) => {
    return Object.entries(dict)
      .map(([varName, arg]) => { return `${arg.name}: $${varName}`; })
      .join(', ');
  },

  /**
   * Sanitizes type i.e. Removes '!' and '[]'
   *
   * @param {object} type GraphQL type
   */
  getTypeFromTypeObject = (type) => {
    const scalarTypes = ['String', 'ID', 'Boolean'];
    type = type.toString();

    if (scalarTypes.includes(type)) {
      return type;
    }
    else if (type.includes('[')) {
      type = type.split('[')[1].split(']')[0];
    }

    return type.split('!')[0];
  },

  /**
   * Returns default for a particular type
   *
   * @param {String} type Scalar type
   */
  getDefaultForType = (type) => {
    switch (type) {
      case 'String':
        return '';
      case 'Int':
        return 0;
      case 'Int!':
        return 0;
      case 'Boolean':
        return true;
      case 'ID':
        return 0;
      case 'object':
        return {};
      case '[]':
        return [];
      default:
        return '';
    }
  },

  /**
   * Generate types string
   *
   * @param dict dictionary of arguments
   */
  getVarsToTypesStr = (dict) => {
    return Object.entries(dict)
      .map(([varName, arg]) => {
        return `$${varName}: ${arg.type}`;
      })
      .join(', ');
  };

/**
 * Compile arguments dictionary for a field
 *
 * @param field current field object
 * @param duplicateArgCounts map for deduping argument name collisions
 * @param allArgsDict dictionary of all arguments
 */
function getFieldArgsDict (field, duplicateArgCounts, allArgsDict = {}) {
  return field.args.reduce((argumentDict, arg) => {
    if (arg.name in duplicateArgCounts) {
      const index = duplicateArgCounts[arg.name] + 1;
      duplicateArgCounts[arg.name] = index;
      argumentDict[`${arg.name}${index}`] = arg;
    }
    // Dedupe arguments
    else if (allArgsDict[arg.name]) {
      duplicateArgCounts[arg.name] = 1;
      argumentDict[`${arg.name}1`] = arg;
    }
    else {
      argumentDict[arg.name] = arg;
    }
    return argumentDict;
  }, {});
}

/** This function recursively resolves variable types and returns a default value for that type.
 *
 * @param {object} type
 * @param {object} gqlSchema
 * @param {Number} stack
 * @param {Number} stackLimit
 */
function resolveVariableType (type, gqlSchema, stack = 0, stackLimit = 5) {
  var fieldObj = {},
    fields;
  stack++;
  const argType = gqlSchema.getType(getTypeFromTypeObject(type));
  if (graphql.isInputObjectType(argType)) {
    fields = argType.getFields();
    Object.keys(fields).forEach((field) => {
      if (fields[field].type === type) {
        fieldObj[field] = '<Same as ' + type + '>';
      }
      else if (stack <= stackLimit) {
        if (type.toString().includes('[') && type.toString().includes(']')) {
          fieldObj[field] = [resolveVariableType(fields[field].type, gqlSchema, stack, stackLimit)];
        }
        fieldObj[field] = resolveVariableType(fields[field].type, gqlSchema, stack, stackLimit);
      }
    });
    return fieldObj;
  }
  return type.toString().includes('[') ?
    [getDefaultForType(argType.toString())] :
    getDefaultForType(argType.toString());
}

module.exports = {
  /** Generates queries from GraphQL schema
   *
   * @param {String} gqlSchema - String of GraphQL Schema in SDL format
   * @param {Object} options - Options
   *                 options.depth - depth to which query should be generated
   *                 options.variableDepth - determines the depth to which variables objects should be resolved
   *                 options.includeDeprecatedFields - Deprecated fields to be included or not.
   */
  schemaToQuery (gqlSchema, options) {
    const output = {};
    let depthLimit = options.depth,
      includeDeprecatedFields = options.includeDeprecatedFields || false,
      stackLimit = options.variableDepth || 5;

    /**
     * Generate the query for the specified field
     *
     * @param curName name of the current field
     * @param curParentType parent type of the current field
     * @param curParentName parent name of the current field
     * @param argumentsDict dictionary of arguments from all fields
     * @param duplicateArgCounts map for deduping argument name collisions
     * @param crossReferenceKeyList list of the cross reference
     * @param curDepth current depth of field
     */
    function generateQuery (
      curName,
      curParentType,
      curParentName,
      argumentsDict = {},
      duplicateArgCounts = {},
      crossReferenceKeyList = [], // [`${curParentName}To${curName}Key`]
      curDepth = 1) {

      const field = gqlSchema.getType(curParentType).getFields()[curName],
        curTypeName = field.type.inspect().replace(/[[\]!]/g, ''),
        curType = gqlSchema.getType(curTypeName);
      let queryStr = '',
        childQuery = '';

      if (curType.getFields) {
        const crossReferenceKey = `${curParentName}To${curName}Key`;
        if (crossReferenceKeyList.includes(crossReferenceKey) || curDepth > depthLimit) {
          return '';
        }
        crossReferenceKeyList.push(crossReferenceKey);
        let childKeys = Object.keys(curType.getFields());
        childQuery = childKeys
          .filter((fieldName) => {
            /* Exclude deprecated fields */
            const fieldSchema = gqlSchema.getType(curType).getFields()[fieldName];
            return includeDeprecatedFields || !fieldSchema.isDeprecated;
          })
          .map((cur) => {
            return generateQuery(cur, curType, curName, argumentsDict, duplicateArgCounts,
              crossReferenceKeyList, curDepth + 1).queryStr;
          })
          .filter((cur) => {
            return cur;
          })
          .join('\n');
      }

      if (!(curType.getFields && !childQuery)) {
        queryStr = `${'    '.repeat(curDepth)}${field.name}`;
        if (field.args.length > 0) {
          const dict = getFieldArgsDict(field, duplicateArgCounts, argumentsDict);
          Object.assign(argumentsDict, dict);

          queryStr += ` (${getArgsToVarsStr(dict)})`;
        }
        if (childQuery) {
          queryStr += ` {\n${childQuery}\n${'    '.repeat(curDepth)}}`;
        }
      }

      /* Union types */
      if (curType.astNode && curType.astNode.kind === 'UnionTypeDefinition') {
        const types = curType.getTypes();
        if (types && types.length) {
          const indent = `${'    '.repeat(curDepth)}`,
            fragIndent = `${'    '.repeat(curDepth + 1)}`;
          queryStr += ' {\n';

          for (let i = 0, len = types.length; i < len; i++) {
            const valueTypeName = types[i],
              valueType = gqlSchema.getType(valueTypeName),
              unionChildQuery = Object.keys(valueType.getFields())
                .map((cur) => {
                  return generateQuery(cur, valueType, curName, argumentsDict, duplicateArgCounts,
                    crossReferenceKeyList, curDepth + 2).queryStr;
                })
                .filter((cur) => { return cur; })
                .join('\n');

            queryStr += `${fragIndent}... on ${valueTypeName} {\n${unionChildQuery}\n${fragIndent}}\n`;
          }
          queryStr += `${indent}}`;
        }
      }
      return { queryStr, argumentsDict };
    }

    /**
     * Generate the query for the specified field
     *
     * @param obj one of the root objects(Query, Mutation, Subscription)
     * @param description description of the current object
     */
    function generateQueries (obj, description) {
      let currentObject = {},
        outputFolderName;
      switch (description) {
        case 'Mutation':
          outputFolderName = 'mutations';
          break;
        case 'Query':
          outputFolderName = 'queries';
          break;
        case 'Subscription':
          outputFolderName = 'subscriptions';
          break;
        default:
          console.log('[gqlg warning]:', 'description is required');
      }

      Object.keys(obj).forEach((type) => {

        let field,
          newDescription;

        // The name of the mutationType can be anything other than 'Mutation'
        // Handle for each type separately and use the new description to traverse through
        // the fields.
        if (description === 'Mutation') {
          field = gqlSchema._mutationType._fields[type];
          newDescription = gqlSchema._mutationType.name;
        }
        else if (description === 'Query') {
          field = gqlSchema._queryType._fields[type];
          newDescription = gqlSchema._queryType.name;
        }
        else if (description === 'Subscription') {
          field = gqlSchema._subscriptionType._fields[type];
          newDescription = gqlSchema._subscriptionType.name;
        }

        /* Only process non-deprecated queries/mutations: */
        if (includeDeprecatedFields || !field.isDeprecated) {
          const queryResult = generateQuery(type, newDescription),
            varsToTypesStr = getVarsToTypesStr(queryResult.argumentsDict);

          /* Generate variables Object from argumentDict */
          var variables = {};
          Object.entries(queryResult.argumentsDict).map(([varName, arg]) => {
            variables[varName] = resolveVariableType(arg.type, gqlSchema, 0, stackLimit);
          });

          let query = queryResult.queryStr;
          // here the `description` is used to construct the actual queries
          // Here has to be one of query, mutation, or subscription.
          query = `${description.toLowerCase()} ${type}${varsToTypesStr ? ` (${varsToTypesStr}) ` : ' '}{\n${query}\n}`;
          currentObject[type] = {
            query: query,
            variables: JSON.stringify(variables, null, 2)
          };
        }
      });
      output[outputFolderName] = currentObject;
    }

    if (gqlSchema.getMutationType()) {
      generateQueries(gqlSchema.getMutationType().getFields(), 'Mutation');
    }

    if (gqlSchema.getQueryType()) {
      generateQueries(gqlSchema.getQueryType().getFields(), 'Query');
    }

    if (gqlSchema.getSubscriptionType()) {
      generateQueries(gqlSchema.getSubscriptionType().getFields(), 'Subscription');
    }

    return output;
  }
};
