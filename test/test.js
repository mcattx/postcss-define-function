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

/**
 * [core feature]
 * usage:
 *
 * @define-function functionName($foo) {
 *     @return $foo + 10px;
 * }
 *
 * @funciton .bar {
 *     width: functionName(10);
 * }
 *
 */
test('test core feature', t => {
    return run(t, '@define-function rem($val) {@return $val / 640 * 10 * 1rem;} @callFn a {width: rem(640);}',
        'a {width: 10rem}'
        );
});



// test('throws error on unknown function', t => {
//     // return run(t, 'a{width: fix(10)}').catch(err => {
//     //     console.log('err: '+ err);
//     return postcss(fn).process('@callFn A{}').catch(err => {
//         console.log(err)
//         t.deepEqual(err, 'Undefined @define-function A');
//     })
// });

test('throws error', t => {
    return run(t, '@callFn a{width: te()}', 'Undefined @define-function te').catch(err => {
        t.deepEqual(err.reason, 'Undefined @define-function te');
    })
});

// test('cans remove unknown function on request', t => {
//     return run(t, '@function A; a{}', 'a{}', {silent: true});
// });

// test('supports function -- @functions', t => {

// });
