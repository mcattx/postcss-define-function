var postcss = require('postcss');
var path = require('path');
var test = require('ava');

// alias postcss-define-function -> fn
var fn = require('../');

function run(t, input, output, opts) {
    return postcss(fn(opts)).process(input).then(
        result => {
            t.deepEqual(result.css, output);
            t.deepEqual(result.warnings().length, 0);
        }
    )
}

// test cases

test('test core feature', t => {
    return run(t, '@define-function rem($val) {@return $val / 640 * 10 * 1rem;} @callFn a {width: rem(640);}',
        'a {width: 10rem}'
        );
});

test('throws error on unknown callFn', t => {
    return run(t, '@callFn a{width: te()}', 'Undefined @define-function te').catch(err => {
        t.deepEqual(err.reason, 'Undefined @define-function te');
    })
});

test('remove unknown callFn on request', t => {
    return run(t, '@callFn a{width: te()} b{}', 'b{}', { silent: true });
});
