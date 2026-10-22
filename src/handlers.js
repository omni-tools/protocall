const fs = require('fs');
const path = require('path');
const _ = require('lodash/fp');
const {globby} = require('globby');
const {default: callsites} = require('callsites');

const getCallerFolder = () => {
  const file = callsites()[2].getFileName(); // note: 2 and not 0 since wrapped in function
  return path.dirname(file);
};

/**
 * Creates the protocol handler for the `path:` protocol
 * @param basedir
 * @returns {Function}
 */
function _path(basedir) {
  const baseDirectory = basedir || getCallerFolder();
  return function pathHandler(file) {
    // Absolute path already, so just return it.
    if (path.resolve(file) === file) return file;

    return path.resolve(baseDirectory, ...file.split('/'));
  };
}

/**
 * Creates the protocol handler for the `file:` protocol
 * @param basedir
 * @param options
 * @returns {Function}
 */
function file(basedir, options) {
  if (_.isObject(basedir)) {
    options = basedir;
    basedir = undefined;
  }

  const pathHandler = _path(basedir);
  options = options || {encoding: null, flag: 'r'};

  return function fileHandler(file, cb) {
    fs.readFile(pathHandler(file), options, cb);
  };
}

/**
 * Creates the protocol handler for the `buffer:` protocol
 * @returns {Function}
 */
function base64() {
  return function base64Handler(value) {
    return Buffer.from(value, 'base64');
  };
}

/**
 * Creates the protocol handler for the `env:` protocol
 * @returns {Function}
 */
function env() {
  const filters = {
    d(value) {
      return parseInt(value, 10);
    },
    b(value) {
      return !['', 'false', '0', undefined].includes(value);
    },
    '!b'(value) {
      return ['', 'false', '0', undefined].includes(value);
    }
  };

  return function envHandler(value) {
    let result;

    Object.keys(filters).some(function(key) {
      const fn = filters[key];
      const pattern = `|${key}`;
      const loc = value.indexOf(pattern);

      if (loc > -1 && loc === value.length - pattern.length) {
        value = value.slice(0, -pattern.length);
        result = fn(process.env[value]);
        return true;
      }

      return false;
    });

    return result === undefined ? process.env[value] : result;
  };
}

/**
 * Creates the protocol handler for the `require:` protocol
 * @param basedir
 * @returns {Function}
 */
function _require(basedir) {
  const resolvePath = _path(basedir);
  return function requireHandler(value) {
    const _module = /^\.{0,2}\//.test(value) ? resolvePath(value) : value;
    // resolve if start with ../ ./ or /
    // @see http://nodejs.org/api/modules.html#modules_file_modules
    // NOTE: Technically, paths with a leading '/' don't need to be resolved, but leaving for consistency.

    // eslint-disable-next-line import/no-dynamic-require
    return require(_module);
  };
}

/**
 * Creates the protocol handler for the `exec:` protocol
 * @param basedir
 * @returns {Function}
 */
function exec(basedir) {
  const require = _require(basedir);
  return function execHandler(value) {
    const [modulePath, propertyName] = value.split('#');
    // eslint-disable-next-line import/no-dynamic-require
    const _module = require(modulePath);
    const method = propertyName ? _module[propertyName] : _module;

    if (_.isFunction(method)) return method();

    throw new Error(`exec: unable to locate function in ${value}`);
  };
}

/**
 * Creates the protocol handler for the `glob:` protocol
 * @param options https://github.com/mrmlnc/fast-glob#options-1
 * @returns {Function}
 */
function glob(options) {
  if (_.isString(options)) {
    options = {cwd: options};
  }

  options = options || {};
  options.cwd = options.cwd || getCallerFolder();

  const resolvePath = _path(options.cwd);
  return function globHandler(value) {
    return globby(value, options).then(paths => paths.map(resolvePath));
  };
}

module.exports = {path: _path, file, base64, env, require: _require, exec, glob};
