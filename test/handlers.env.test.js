const test = require('ava');

const handlers = require('../src/handlers');

const envHandler = handlers.env();

test('env api', t => {
  t.is(typeof envHandler, 'function');
  t.is(envHandler.length, 1);
});

test('env raw', t => {
  process.env.TEST_SAMPLE = '8000';
  t.is(envHandler('TEST_SAMPLE'), '8000');
});

test('env as number', t => {
  process.env.TEST_SAMPLE_NUMBER = '8000';
  t.is(envHandler('TEST_SAMPLE_NUMBER|d'), 8000);
});

test('env as number but not empty', t => {
  process.env.TEST_SAMPLE_NAN = '';
  t.assert(Number.isNaN(envHandler('TEST_SAMPLE_NAN|d')));
});

test('env as number but string', t => {
  process.env.TEST_SAMPLE_NAN_STR = 'not a number';
  t.assert(Number.isNaN(envHandler('TEST_SAMPLE_NAN_STR|d')));
});

test('env as booolean (some string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL = '8000';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL|b'), true);
});

test('env as boolean (true string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_STR = 'true';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_STR|b'), true);
});

test('env as boolean (false string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_STR_FALSE = 'false';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_STR_FALSE|b'), false);
});

test('env as boolean (false number)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_INT_FALSE = '0';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_INT_FALSE|b'), false);
});

test('env as boolean from empty', t => {
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_UNDEFINED_VARENV|b'), false);
});

test('env as booolean negation (some string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL = '8000';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL|!b'), false);
});

test('env as boolean negation (true string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_STR = 'true';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_STR|!b'), false);
});

test('env as boolean negation (false string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_STR_FALSE = 'false';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_STR_FALSE|!b'), true);
});

test('env as boolean negation (false number)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_INT_FALSE = '0';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_INT_FALSE|!b'), true);
});

test('env as boolean negation from empty', t => {
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_UNDEFINED_VARENV|!b'), true);
});
