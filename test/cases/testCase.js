var postcss = require('postcss');
var path = require('path');
var fs = require('fs');

// alias postcss-define-function -> fn
var fn = require('../../index.js');

var opts = {
    silent: true
};

fs.readFile('test/cases/source.css', 'utf8', (err, css) => {
    postcss(fn(opts)).process(css).then(
        result => {
            fs.writeFile('test/cases/result.css', result, (err) => {
                if(err) {
                    console.log('Write file error: ' + err);
                }
            })
        }
    ).catch((err) => {
        console.log('err: ' + err);
    })
})



