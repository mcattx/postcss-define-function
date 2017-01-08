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

test('test two decls', t => {
    return run(t, '@define-function pe($val) {@return $val / 10 * 5 * 1rem;} @callFn a {color: red;width: pe(10);}',
        'a {color: red;width: 5rem}'
        );
});

test('test multiple decls', t => {
    return run(t, '@define-function pe($val) {@return $val / 10 * 1rem;} @callFn a {color: red;width: pe(10);height: 20px}',
        'a {color: red;width: 1rem;height: 20px}'
        );
});

test('test multiple params in @return statement', t => {
    return run(t, '@define-function pe($val) {@return $val / $val * ($val - 2)rem;} @callFn a {color: red;width: pe(10);height: 20px}',
        'a {color: red;width: 8rem;height: 20px}'
        );
});

test('test multiple params in define statement', t => {
    return run(t , '@define-function pe($a, $b) {@return $a + $b + 10px;} @callFn a {width: pe(10, 10)}',
        'a {width: 30px}')
});

test('test different css value units', t => {
    return run(t, '@define-function pe($n) {@return $n / $n * ($n - 2)cm;} @callFn a {color: red;width: pe(10);height: 20px}',
        'a {color: red;width: 8cm;height: 20px}'
        );
});

// I decide not to support this feature, this function should be supported by postcss-simple-vars
// test.skip('test variables', t => {
//     return run(t, '$column: 20; @define-function pe() {@return $colum * 3px} @callFn a {width: pe();}',
//         'a {width: 60px}'
//         );
// });

test('throws error on unknown callFn', t => {
    return run(t, '@callFn a{width: te()}', 'Undefined @define-function te').catch(err => {
        t.deepEqual(err.reason, 'Undefined @define-function te');
    })
});

test('remove unknown callFn on request', t => {
    return run(t, '@callFn a{width: te()} b{}', 'b{}', { silent: true });
});
