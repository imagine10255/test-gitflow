# Changelog

## [1.4.0-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.4.0-beta.1...v1.4.0-rc.0) (2026-08-27)

## [1.4.0-beta.1](https://github.com/imagine10255/test-gitflow/compare/v1.4.0-beta.0...v1.4.0-beta.1) (2026-08-27)


### Bug Fixes

* **audit:** record deactivation events ([edc378c](https://github.com/imagine10255/test-gitflow/commit/edc378c6179e09fb0bda810d9bf49e40a86ed9d4))
* **auth:** clear session on user deactivation ([bcaa8cf](https://github.com/imagine10255/test-gitflow/commit/bcaa8cfc880dc8c87f7421103c77cbd82ab1518a))
* **avatar:** limit upload size to 2MB ([6832055](https://github.com/imagine10255/test-gitflow/commit/683205526d3557ad420ec41e72c2b415732edc02))
* **user:** escape commas in CSV export ([adbad95](https://github.com/imagine10255/test-gitflow/commit/adbad957587eadd82237960c9bd0c9e7d21e6288))
* **user:** reject duplicate emails on import ([7480eac](https://github.com/imagine10255/test-gitflow/commit/7480eac4f16eea130eff2c5726b2cbf8e0b4a9c0))
* **user:** trim whitespace in email ([1249199](https://github.com/imagine10255/test-gitflow/commit/1249199a5f733f0e23a660c93638d67e92712f08))


### Features

* **user:** add export to CSV ([d4d7557](https://github.com/imagine10255/test-gitflow/commit/d4d755740e6328354db46361b10b4a9b4ea2bc0d))
* **user:** add password reset flow ([2923681](https://github.com/imagine10255/test-gitflow/commit/2923681e3d8ac9c3ce4fdd67da7844311a896fef))

## [1.4.0-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.3.0...v1.4.0-beta.0) (2026-08-27)


### Bug Fixes

* **audit:** handle empty action name ([1e307e4](https://github.com/imagine10255/test-gitflow/commit/1e307e438721bc89a723036881b241f478e349be))
* **auth:** correct token expiry calculation ([46dea28](https://github.com/imagine10255/test-gitflow/commit/46dea282edf523089447118a1a49efd5697d07f0))
* **user:** validate email format ([05e71d5](https://github.com/imagine10255/test-gitflow/commit/05e71d59b8bab7866ec76ad7ae1ecac09f0b6d03))


### Features

* **user:** add avatar upload ([e8825c5](https://github.com/imagine10255/test-gitflow/commit/e8825c581d06e0aae8a07e89367f7525d0fd084a))
* **user:** add bulk import ([43e426c](https://github.com/imagine10255/test-gitflow/commit/43e426c1403f571eab111157ece11477990b790e))
* **user:** add user deactivation ([1a1c2fd](https://github.com/imagine10255/test-gitflow/commit/1a1c2fd4ca0b254f42359a43fd5bbabb49948812))
* **user:** add user profile model ([4ffc8c1](https://github.com/imagine10255/test-gitflow/commit/4ffc8c1fb6c1eb90188a778645a57e618be2e448))
* **user:** add user search ([a17ebe7](https://github.com/imagine10255/test-gitflow/commit/a17ebe75c5a6c53cbb9578c5bd2320cfe1d48ef7))

# [1.3.0](https://github.com/imagine10255/test-gitflow/compare/v1.3.0-rc.1...v1.3.0) (2026-08-27)

## [1.3.0-rc.1](https://github.com/imagine10255/test-gitflow/compare/v1.3.0-rc.0...v1.3.0-rc.1) (2026-08-27)


### Bug Fixes

* **audit:** fallback to anonymous for missing user ([94f3ff8](https://github.com/imagine10255/test-gitflow/commit/94f3ff8fc4736978421cc620602882f94bf34949))
* **auth:** deny access when role is undefined ([f3da415](https://github.com/imagine10255/test-gitflow/commit/f3da415f8b042d8928352f5f248ac8dd470163f2))

## [1.3.0-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.3.0-beta.2...v1.3.0-rc.0) (2026-08-27)

## [1.3.0-beta.2](https://github.com/imagine10255/test-gitflow/compare/v1.3.0-beta.1...v1.3.0-beta.2) (2026-08-27)


### Features

* **audit:** query logs by user ([bb7d46f](https://github.com/imagine10255/test-gitflow/commit/bb7d46fbe10a6eb70e8a48889aa8ea728a789591))
* **audit:** record user actions ([f842a40](https://github.com/imagine10255/test-gitflow/commit/f842a40ac119ba1b10c9b6f0880bb2e2897eed9b))

## [1.3.0-beta.1](https://github.com/imagine10255/test-gitflow/compare/v1.3.0-beta.0...v1.3.0-beta.1) (2026-08-27)


### Bug Fixes

* **auth:** guard null token on refresh ([65f66c3](https://github.com/imagine10255/test-gitflow/commit/65f66c315b34957e0a4c3bc83693b88cee861ca5))
* **auth:** reject empty credentials ([4bc8d54](https://github.com/imagine10255/test-gitflow/commit/4bc8d5495baa7c9234a56022bcb95f9f3e1e9d6f))

## [1.3.0-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.2.0...v1.3.0-beta.0) (2026-08-27)


### Features

* **auth:** add login with token expiry ([c6b4757](https://github.com/imagine10255/test-gitflow/commit/c6b475729f86078cc67c84dd6f59df757213ae89))
* **auth:** add role-based permission check ([627f2d3](https://github.com/imagine10255/test-gitflow/commit/627f2d37ffcd9aa8a5ab867ac5916a008214f6c4))
* **auth:** add session refresh ([c0a3e9e](https://github.com/imagine10255/test-gitflow/commit/c0a3e9ec27d3b5a3ffeb28410c69559191eb3b03))

# [1.2.0](https://github.com/imagine10255/test-gitflow/compare/v1.2.0-rc.0...v1.2.0) (2026-08-27)

## [1.2.0-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.2.0-beta.3...v1.2.0-rc.0) (2026-08-27)

## [1.2.0-beta.3](https://github.com/imagine10255/test-gitflow/compare/v1.2.0-beta.2...v1.2.0-beta.3) (2026-08-27)

## [1.2.0-beta.2](https://github.com/imagine10255/test-gitflow/compare/v1.1.3...v1.2.0-beta.2) (2026-08-27)


### Features

* mate feature ([c74da83](https://github.com/imagine10255/test-gitflow/commit/c74da830bfd9e6f5bff0a623830caadaacf759e7))

## [1.2.0-beta.1](https://github.com/imagine10255/test-gitflow/compare/v1.1.2-rc.1...v1.2.0-beta.1) (2026-08-27)

## [1.2.0-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.2-rc.0...v1.2.0-beta.0) (2026-08-27)

# [1.1.3](https://github.com/imagine10255/test-gitflow/compare/v1.1.3-rc.0...v1.1.3) (2026-08-27)

## [1.1.3-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.2...v1.1.3-rc.0) (2026-08-27)


### Bug Fixes

* null crash on empty dataset ([7bea8a1](https://github.com/imagine10255/test-gitflow/commit/7bea8a159c6ad23e9179e155852f447c8689e5f2))

# [1.1.2](https://github.com/imagine10255/test-gitflow/compare/v1.2.0-beta.1...v1.1.2) (2026-08-27)

## [1.1.2-rc.1](https://github.com/imagine10255/test-gitflow/compare/v1.2.0-beta.0...v1.1.2-rc.1) (2026-08-27)


### Bug Fixes

* null guard on empty rows ([3f53219](https://github.com/imagine10255/test-gitflow/commit/3f53219a2ac800706c0c2dd5a0bc3b830e3e5d7c))

## [1.1.2-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.2-beta.0...v1.1.2-rc.0) (2026-08-27)

## [1.1.2-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.1-rc.1...v1.1.2-beta.0) (2026-08-27)


### Bug Fixes

* rewrite csv serializer for large datasets ([6707449](https://github.com/imagine10255/test-gitflow/commit/6707449721c57c60e30de6765c6f46bf84f128c1))

## [1.1.1-rc.1](https://github.com/imagine10255/test-gitflow/compare/v1.1.1-rc.0...v1.1.1-rc.1) (2026-08-27)


### Bug Fixes

* correct encoding label casing ([c2379bb](https://github.com/imagine10255/test-gitflow/commit/c2379bb042524ed6bd679bbbb446c57257aa8096))

## [1.1.1-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.1-beta.0...v1.1.1-rc.0) (2026-08-27)


### Features

* add column ordering ([efc7427](https://github.com/imagine10255/test-gitflow/commit/efc742704a5d905713bdb4f1e84f7884b210ec07))

## [1.1.1-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.1.0-beta.0...v1.1.1-beta.0) (2026-08-27)

## [1.1.0-beta.0](https://github.com/imagine10255/test-gitflow/compare/v1.0.0...v1.1.0-beta.0) (2026-08-27)

# [1.0.0](https://github.com/imagine10255/test-gitflow/compare/v1.0.0-rc.0...v1.0.0) (2026-08-27)

## [1.0.0-rc.0](https://github.com/imagine10255/test-gitflow/compare/v1.0.0-beta.1...v1.0.0-rc.0) (2026-08-27)

## [1.0.0-beta.1](https://github.com/imagine10255/test-gitflow/compare/v1.0.0-beta.0...v1.0.0-beta.1) (2026-08-27)

## 1.0.0-beta.0 (2026-08-27)
