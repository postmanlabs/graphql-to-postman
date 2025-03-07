# Changelog for graphql-to-postman

## [Unreleased]

## [v1.0.0] - 2025-03-07

## [v0.3.0] - 2024-07-10

### Chore

-   Updated postman-collection to v4.4.0.

## [v0.2.0] - 2024-07-03

### Updated

-   Updated graphql version to v15.8.0.

## [v0.1.1] - 2024-04-05

### Fixed

-   Fixed an issue where GQL definition of having Union self refs past depth limit was failing with RangeError.

#### v0.1.0 (June 06, 2023)

-   Added support for CLI usage to convert GraphQL definition to collection with custom depth.
-   Added maximum limit to depth allowed via usage of module APIs.

### v0.0.12 (March 30, 2023)

-   Fixed issue where conversion failed with type error while resolving non-defined variables.
-   Added support for release script.

### v0.0.12 (January 9, 2023)

-   Fix for - [#10070](hhttps://github.com/postmanlabs/postman-app-support/issues/10070) Added support for nested lists.

### v0.0.11 (Sept 27, 2021)

-   Fix for - [#24](https://github.com/postmanlabs/graphql-to-postman/issues/24) Fixed an issue where nesting was faulty.

### v0.0.10 (Sept 27, 2021)

-   Fix for - [#9884](https://github.com/postmanlabs/postman-app-support/issues/9884) Fixed an issue with union types self referencing

### v0.0.9 (April 9, 2021)

-   Added the support for changing stack depth if required.

### v0.0.8 (March 15, 2021)

-   Fixed issue where error shown was meaningless for incorrect GraphQL SDL.

### v0.0.7 (Oct 23, 2020)

-   fix for - [#8863](https://github.com/postmanlabs/postman-app-support/issues/8863) Fixed an issue where custom name for type threw an error.

### v0.0.6 (Jul 23, 2020)

-   Fix for circular reference input object types.
-   Fix for introspection query response type support.

### v0.0.5 (May 15, 2020)

-   Fix for - [#8429](https://github.com/postmanlabs/postman-app-support/issues/8429) [#10](https://github.com/postmanlabs/graphql-to-postman/issues/10) - Schemas with Input type will now be converted successfully.

#### v0.0.4 (April 29, 2020)

-   Sanitization of options.
-   Added a function for getting meta data.

#### v0.0.3 (March 26, 2020)

-   Fix for empty collection generation for certain queries.

#### v0.0.2 (December 20, 2019)

-   Support for GraphQL variables.

#### v0.0.1 (December 10, 2019)

-   Base release

[Unreleased]: https://github.com/postmanlabs/graphql-to-postman/compare/v1.0.0...HEAD

[v1.0.0]: https://github.com/postmanlabs/graphql-to-postman/compare/v0.3.0...v1.0.0

[v0.3.0]: https://github.com/postmanlabs/graphql-to-postman/compare/v0.2.0...v0.3.0

[v0.2.0]: https://github.com/postmanlabs/graphql-to-postman/compare/v0.1.1...v0.2.0

[v0.1.1]: https://github.com/postmanlabs/graphql-to-postman/compare/011f91a2fff94f02aeefcfc004a96777a62829bb...v0.1.1
