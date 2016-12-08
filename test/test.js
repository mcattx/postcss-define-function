var postcss = require('postcss');
var path = require('path');
var test = require('ava');

var fn = require('../');

function run(t, input, output, opts) {
    return postcss(fn(opts)).process(input).then(
        result => {
            t.deepEqual(result.css, output);
            t.deepEqual(result.warnings().length, 0);
        }
    )
}

// test case
// core feature
test('test core feature', t => {
    return run(t, '@define-funtion rem($val) {@return $val / 640 * 10 * 1rem;} a {width: rem(640);}',
        'a {width: 10rem;}'
        );
});

// test('supports function -- @functions', t => {

// });
