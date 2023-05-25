
<a href="https://www.getpostman.com/"><img src="https://assets.getpostman.com/common-share/postman-logo-horizontal-320x132.png" /></a><br />
_Manage all of your organization's APIs in Postman, with the industry's most complete API development environment._

*Supercharge your API workflow.*  
*Modern software is built on APIs. Postman helps you develop APIs faster.*

# graphql-to-postman [![Build Status](https://travis-ci.com/postmanlabs/graphql-to-postman.svg?branch=master)](https://travis-ci.com/postmanlabs/graphql-to-postman)

This module can be used to convert a GraphQL schema into a [Postman Collection V2](https://github.com/postmanlabs/postman-collection) format.



<img src="https://voyager.postman.com/logo/postman-logo-orange.svg" width="320" alt="The Postman Logo">

*Supercharge your API workflow.*
*Modern software is built on APIs. Postman helps you develop APIs faster.*

# GraphQL to Postman Collection

![Build Status](https://github.com/postmanlabs/graphql-to-postman/actions/workflows/test.yml/badge.svg)

<a href="https://www.npmjs.com/package/graphql-to-postman" alt="Latest Stable Version">![npm](https://img.shields.io/npm/v/graphql-to-postman.svg)</a>
<a href="https://www.npmjs.com/package/graphql-to-postman" alt="Total Downloads">![npm](https://img.shields.io/npm/dw/graphql-to-postman.svg)</a>

#### Contents

1. [Getting Started](#getting-started)
2. [Command Line Interface](#command-line-interface)
    1. [Options](#options)
    2. [Usage](#usage)
3. [Using the converter as a NodeJS module](#using-the-converter-as-a-nodejs-module)
    1. [Convert Function](#convert)
    2. [Options](#options)
    3. [ConversionResult](#conversionresult)
    4. [Sample usage](#sample-usage)
    5. [Validate function](#validate-function)
4. [Conversion Schema](#conversion-schema)

---

---


## 💭 Getting Started

To use the converter as a Node module, you need to have a copy of the NodeJS runtime. The easiest way to do this is through npm. If you have NodeJS installed you have npm installed as well.

```terminal
$ npm install graphql-to-postman
```

If you want to use the converter in the CLI, install it globally with NPM:

```terminal
$ npm i -g graphql-to-postman
```


## 📖 Command Line Interface

The converter can be used as a CLI tool as well. The following [command line options](#options) are available.

`gql2postman [options]`

### Options

- `-s <source>`, `--spec <source>`
  Used to specify the GraphQL specification (file path) which is to be converted

- `-o <destination>`, `--output <destination>`
  Used to specify the destination file in which the collection is to be written

- `-p`, `--pretty`
  Used to pretty print the collection object while writing to a file

- `-i`, `--interface-version`
  Specifies the interface version of the converter to be used. Value can be 'v2' or 'v1'. Default is 'v2'.

- `-O`, `--options`
  Used to supply options to the converter, for complete options details see [here](/OPTIONS.md)

- `-c`, `--options-config`
  Used to supply options to the converter through config file, for complete options details see [here](/OPTIONS.md)

- `-t`, `--test`
  Used to test the collection with an in-built sample specification

- `-v`, `--version`
  Specifies the version of the converter

- `-h`, `--help`
  Specifies all the options along with a few usage examples on the terminal


###  Usage

- Takes a specification (spec.yaml) as an input and writes to a file (collection.json) with pretty printing and using provided options
```terminal
$ gql2postman -s spec.yaml -o collection.json -p -O depth=3,includeDeprecatedFields=true
```

- Takes a specification (spec.yaml) as an input and writes to a file (collection.json) with pretty printing and using provided options via config file
```terminal
$ gql2postman -s spec.yaml -o collection.json -p  -c ./examples/cli-options-config.json
```

- Takes a specification (spec.yaml) as an input and writes to a file (collection.json) with pretty printing and using provided options with larger depth limit
  to make sure more detailed and nested data is generated.
```terminal
$ gql2postman -s spec.yaml -o collection.json -p -O depth=7,includeDeprecatedFields=true,optimizeConversion=false
```

- Testing the converter
```terminal
$ gql2postman --test
```


## 🛠 Using the converter as a NodeJS module

In order to use the convert in your node application, you need to import the package using `require`.

```javascript
var Converter = require('graphql-to-postman')
```

The converter provides the following functions:

### Convert

The convert function takes in your GraphQL schema or SDL and converts it to a Postman collection.

Signature: `convert (data, options, callback);`

**data:**

```javascript
{ type: 'file', data: 'filepath' }
OR
{ type: 'string', data: '<entire GraphQL string - schema or SDL>' }
```

**options:**
```javascript
{
  depth: 4,
  includeDeprecatedFields: false,
  optimizeConversion: false
}
/*
All three properties are optional. Check the options section below for possible values for each option.
*/
```

**callback:**
```javascript
function (err, result) {
  /*
  result = {
    result: true,
    output: [
      {
        type: 'collection',
        data: {..collection object..}
      }
    ]
  }
  */
}
```

### Options

- `depth` - The number of levels of information that should be returned. (A depth level of “1” returns that object and
    its properties. A depth of “2” will return all the nodes connected to the level 1 node, etc.)

- `includeDeprecatedFields` - Generated queries will include deprecated fields or not.

- `optimizeConversion` - Optimizes conversion for schemas with complex and nested input objects by reducing the depth to
    which input objects are resolved in GraphQL variables.

### ConversionResult

- `result` - Flag responsible for providing a status whether the conversion was successful or not.

- `reason` - Provides the reason for an unsuccessful conversion, defined only if result if `false`.

- `output` - Contains an array of Postman objects, each one with a `type` and `data`. The only type currently supported is `collection`.



### Sample Usage
```javascript
const fs = require('fs'),
  Converter = require('graphql-to-postman'),
  gqlData = fs.readFileSync('sample-spec.yaml', {encoding: 'UTF8'});

Converter.convert({ type: 'string', data: gqlData },
  {}, (err, conversionResult) => {
    if (!conversionResult.result) {
      console.log('Could not convert', conversionResult.reason);
    }
    else {
      console.log('The collection object is: ', conversionResult.output[0].data);
    }
  }
);
```

### Validate Function

The validate function is meant to ensure that the data that is being passed to the [convert function](#convert-function) is a valid JSON object or a valid (YAML/JSON) string.

The validate function is synchronous and returns a status object which conforms to the following schema

#### Validation object schema

```javascript
{
  type: 'object',
  properties: {
    result: { type: 'boolean'},
    reason: { type: 'string' }
  },
  required: ['result']
}
```

##### Validation object explanation
- `result` - true if the data is valid GraphQL and can be passed to the convert function

- `reason` - Provides a reason for an unsuccessful validation of the specification
