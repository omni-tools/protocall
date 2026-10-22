const path = require('path');
const test = require('ava');
const _ = require('lodash/fp');
const protocall = require('..');

function foo(input) {
  return `${input}_foo`;
}

function bar(input, cb) {
  setImmediate(cb.bind(null, null, `${input}_bar`));
}

test('resolve', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', foo);
    resolver.use('bar', bar);

    const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
    resolver.resolve(source, function resolve(err, actual) {
      t.falsy(err);
      t.is(actual.foo, 'foo_foo');
      t.is(actual.bar, 'bar_bar');
      t.is(actual.baz, false);
      t.not(actual, source);
      done();
    });
  }));

test('resolve with filename', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', foo);
    resolver.use('bar', function (data, file, cb) {
      cb(null, file + data);
    });

    const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
    resolver.resolve(source, __filename, function resolve(err, actual) {
      t.falsy(err);
      t.is(actual.foo, 'foo_foo');
      t.is(actual.bar, `${__filename}bar`);
      t.is(actual.baz, false);
      t.not(actual, source);
      done();
    });
  }));

test('nested resolve', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', foo);
    resolver.use('bar', bar);

    const source = {
      foo: 'bar',
      truthy: true,
      falsy: false,
      numeric: 10,
      call: 'foo:maybe',
      i: {
        came: 'bar:in',
        like: ['foo:a', {wrecking: 'bar:ball'}]
      }
    };

    resolver.resolve(source, function resolve(err, actual) {
      t.falsy(err);
      t.not(actual, source);
      t.is(actual.foo, source.foo);
      t.is(actual.truthy, source.truthy);
      t.is(actual.falsy, source.falsy);
      t.is(actual.numeric, source.numeric);
      t.is(actual.call, 'maybe_foo');
      t.is(actual.i.came, 'in_bar');
      t.is(actual.i.like[0], 'a_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar');
      done();
    });
  }));

test('async resolve error', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', function err(input, cb) {
      cb(new Error('fail'));
    });

    const source = {foo: 'foo:foo', bar: false};
    resolver.resolve(source, function resolve(err, actual) {
      t.assert(err);
      t.is(err.message, 'fail');
      t.falsy(actual);
      done();
    });
  }));

test('sync resolve uncaught error', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('test', function err() {
      throw new Error('fail');
    });

    const source = {foo: 'test:foo', bar: false};
    resolver.resolve(source, function resolve(err, actual) {
      t.assert(err);
      t.is(err.message, 'fail');
      t.assert(!actual);
      done();
    });
  }));

test('resolveFile', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', foo);
    resolver.use('bar', bar);

    const source = require('./fixtures/test');
    resolver.resolveFile(path.resolve(__dirname, './fixtures/test'), function resolve(err, actual) {
      t.falsy(err);
      t.is(actual.foo, source.foo);
      t.is(actual.truthy, source.truthy);
      t.is(actual.falsy, source.falsy);
      t.is(actual.numeric, source.numeric);
      t.is(actual.call, 'maybe_foo');
      t.is(actual.i.came, 'in_bar');
      t.is(actual.i.like[0], 'a_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar');
      done();
    });
  }));

test('resolveFile txt', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.use('foo', foo);
    resolver.use('bar', bar);

    const source = require('./fixtures/test');
    resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'), function (err, actual) {
      t.falsy(err);
      t.is(actual.foo, source.foo);
      t.is(actual.truthy, source.truthy);
      t.is(actual.falsy, source.falsy);
      t.is(actual.numeric, source.numeric);
      t.is(actual.call, 'maybe_foo');
      t.is(actual.i.came, 'in_bar');
      t.is(actual.i.like[0], 'a_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar');
      done();
    });
  }));

test('resolveFile error', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.resolveFile('./notfound.txt', function (err, actual) {
      t.assert(err);
      t.assert(!actual);

      resolver.resolveFile(
        path.resolve(__dirname, './fixtures/invalid.txt'),
        function (err, actual) {
          t.assert(err);
          t.assert(!actual);
          done();
        }
      );
    });
  }));

test('stack', t =>
  new Promise(done => {
    const parent = protocall.create();
    parent.use('foo', foo);
    parent.use('bar', bar);

    const child = protocall.create(parent);

    const source = require('./fixtures/test');
    child.resolve(source, function (err, actual) {
      t.falsy(err);
      t.not(actual, source);
      t.is(actual.call, 'maybe_foo');
      t.is(actual.i.came, 'in_bar');
      t.is(actual.i.like[0], 'a_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar');

      child.use('foo', foo);
      child.use('bar', bar);

      child.resolve(source, function (err, actual) {
        t.falsy(err);
        t.is(actual.call, 'maybe_foo_foo');
        t.is(actual.i.came, 'in_bar_bar');
        t.is(actual.i.like[0], 'a_foo_foo');
        t.is(actual.i.like[1].wrecking, 'ball_bar_bar');
        done();
      });
    });
  }));

test('preserve types Buffer', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.resolve({buffer: Buffer.alloc(0)}, function (err, data) {
      t.falsy(err);
      t.assert(data);
      t.assert(data.buffer);
      t.assert(Buffer.isBuffer(data.buffer));
      done();
    });
  }));

test('preserve types Date', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.resolve({date: new Date()}, function (err, data) {
      t.falsy(err);
      t.assert(data);
      t.assert(data.date);
      t.assert(_.isDate(data.date));
      done();
    });
  }));

test('preserve types RegExp', t =>
  new Promise(done => {
    const resolver = protocall.create();
    resolver.resolve({regexp: new RegExp('.')}, function (err, data) {
      t.falsy(err);
      t.assert(data);
      t.assert(data.regexp);
      t.assert(_.isRegExp(data.regexp));
      done();
    });
  }));
