# protocall

[![Npm version](https://img.shields.io/npm/v/protocall.svg)](https://www.npmjs.com/package/protocall)
[![CI](https://github.com/omni-tools/protocall/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/omni-tools/protocall/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/omni-tools/protocall/branch/master/graph/badge.svg)](https://codecov.io/gh/omni-tools/protocall)

> Use of _“Protocall”s_ in your json configuration

Sometimes JSON just isn't enough for configuration needs. Occasionally it would be nice to use arbitrary types as values,
but JSON is necessarily a subset of all available JS types.

`protocall` enables the use of protocols and handlers to enable identification and special handling of json values.

:warning: This is was initially a fork from [shortstop](https://github.com/krakenjs/shortstop) and [shortstop-handlers](https://github.com/krakenjs/shortstop-handlers)


## Basic Usage

Just create a resolver, then use it to resolve your config as objects with `resolve` or as files with `resolveFile`.
You can either create a resolver with `protocall.create()` and then [customize it](#resolveruse),
or just use default provided resolver `protocall.getDefaultResolver()`

```js
const protocall = require('protocall');
const resolver = protocall.getDefaultResolver();
const config = {
    secret: "base64:SGVsbG8sIHdvcmxkIQ==",
    ssl: {
        pfx: "file:foo/bar",
        key: "file:foo/baz.key"
    }
};

resolver.resolve(config, (err, data) => {
    console.log(data);
    // {
    //     "secret": <Buffer ... >,
    //     "ssl" {
    //         "pfx": <Buffer ... >,
    //         "key": <Buffer ... >
    //     }
    // }
});
// Or using the promise returned...
resolver.resolve(config).then(data => {
    // Do something with the 'data
});
```

## (Default) Handlers

A handler can be either a function taking value and a callback, or just take some value and return directly the value or a promise:
```js
const handlerIdentityOne = (value, cb) => cb(null, value);
const handlerIdentityTwo = value => value;
const handlerIdentityThree = value => Promise.resolve(value);
```

Protocall is shipped with already defined handlers.
Here is the default handlers from [shortstop-handlers](https://github.com/krakenjs/shortstop-handlers).
All these are loaded by the `getDefaultResolver`
- [path](#path)
- [file](#file)
- [base63](#base64)
- [env](#env)
- [require](#require)
- [exec](#exec)
- [glob](#glob)


### path
`protocall.handlers.path([basedir])`
* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler that can be given to protocall to resolve file paths.

### file
`protocall.handlers.file([basedir], [options])`

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.
* `options` (*Object*, optional) - Options object provided to fs.readFile.

Creates a handler which resolves the provided value to the basedir and returns the contents of the file as a Buffer.


### base64
`protocall.handlers.base64()`

Creates a handler which will return a buffer containing the content of the base64-encoded string.


### env
`protocall.handlers.env()`

Creates a handler which will resolve the provided value as an environment variable, optionally casting the value using the provided filter. Supported filters are `|d`, `|b`, and `|!b` which will cast to Number and Boolean types respectively.

Examples:
```json
{
    "string": "env:HOST",
    "numver": "env:PORT|d",
    "true": "env:ENABLED|b",
    "false": "env:FALSY|b",
    "notFalse": "env:FALSY|!b"
}
```

### require
`protocall.handlers.require([basedir])`

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler which resolves and loads, and returns the specified module.

Examples:
```json
 {
    "path": "require:path",
    "minimist": "require:minimist",
    "mymodule": "require:./mymodule",
    "json": "require:../config/myjson"
}
```


### exec
`protocall.handlers.exec([basedir])`

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler which resolves and loads the specified module, executing the method (if specified) or the module itself, using the return value as the resulting value. The value should have the format `{module}(#{method})?`. If no function is able to be found this handler will throw with an error.

```json
{
    "functionFromModule": "exec:./mymodule#create",
    "module": "exec:./myothermodule"
};
```

### glob
`protocall.handlers.glob([basedir|options])`

* `basedir` (*String* or *Object*, optional) - The base path use for resolving or a `glob` options object per https://github.com/isaacs/node-glob#options

Creates a handler which match files using the patterns the shell uses.
```json
{
    "files": "glob:**/*.js"
}
```

## Resolver API
Basicly a resolver enable you to register new protocalls/handlers, and to resolve object(`resolve`) or files(`resolveFile`)

### `resolver.use`
There is two accepted signatures:

#### single protocol handler
`resolver.use(protocol, handler)`

* `protocol` (*String*) - The protocol used to identify a property to be processed, e.g. "file"
* `handler` (*Function*) - The implementation of the given protocol with signature `function (value, [callback])`

This method returns a function when invoked will remove the handler from the stack for this protocol.

```js
const protocall = require('protocall');

const resolver = protocall.create();
resolver.use('path', protocall.handlers.path());
resolver.use('file', protocall.handlers.file());
```
#### multiple protocol handlers
`resolver.use(protocolsToHandlers)`

* `protocolToHandlers` (*Object*) - An object mapping of protocol name to handler.

This method returns an object mapping protocol to their unsuscribing function

```js
const protocall = require('protocall');

const resolver = protocall.create();
resolver.use({
    path: protocall.handlers.path(),
    file: protocall.handlers.file()
});
```

### `resolve.resolve`
`resolver.resolve(data, [callback])`

* `data` (*Object*) - The object, containing protocols in values, to be processed.
* `callback` (*Function*) - Optional callback invoked when the processing is complete with signature `function (err, result)`.

Return a promise that is resolved to the processed data.

### `resolve.resolveFile`
`resolver.resolveFile(path, [callback]);`

* `path` (*String*) - The path to a file which is, or exports, JSON or a javascript object.
* `callback` (*Function*) - Optional callback invoked when the processing is complete with signature `function (err, result)`.

Return a promise that is resolved to the processed data.

## Advanced resolver usage

### Multiple handlers
Multiple handlers can be registered for a given protocol. They will be executed in the order registered and the output
of one handler will be the input of the next handler in the chain.

```js
const protocall = require('protocall');

const resolver = protocall.create();
resolver.use('path', protocall.handlers.resolve);
resolver.use('file', protocall.handlers.resolve);
resolver.use('file', fs.readFile);

const config = {key: 'file:foo/baz.key', certs: 'path:certs/myapp'};

resolver.resolve(json, function (err, data) {
    console.log(data);
    // {
    //     "key": <Buffer ... >,
    //     "certs": "/path/to/my/certs/myapp"
    // }
});
```


### Removing Handlers

When registered, handlers return an `unregister` function you can call when you no longer want a handler in the chain.

```js
const path = require('path');
const protocall = require('protocall');

const resolver = protocall.create();
const unusePathProtocall = resolver.use('path', protocall.handlers.resolve);

const config = {key: 'path:foo/baz.key'};

resolver.resolve(config, function (err, data) {
    console.log(data);
    // {   "key": "/path/to/my/foo/baz.key"  }

    unusePathProtocall();

    resolver.resolve(json, function (err, data) {
        console.log(data);
        // { "key": "path:foo/baz.key"  }
    });
});
```
