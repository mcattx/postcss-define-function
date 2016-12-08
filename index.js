var jsToCss = require('postcss-js/parser');
var postcss = require('postcss');
var sugarss = require('sugarss');
var globby = require('globby');
var vars = require('postcss-simple-vars');
var path = require('path');
var fs = require('fs');
var isWindows = require('os').platform().indexOf('win32') !== -1;

function insideDefine(rule) {
    var parent = rule.parent;
    if(!parent) {
        return false;
    } else if(parent.name === 'define-function') {
        return true;
    } else {
        return insideDefine(parent);
    }
}

function insertObject(rule, obj, processFns) {
    var root = jsToCss(obj);
    root.each(function(node) {
        node.source = rule.source;
    });
    processFns(root);
    rule.parent.insertObject(rule, root);
}

/**
 *  Beacuse function is a reserved keyword in JavaScript.
 *  Create an alias: function -> fn
 */

function insertFn(result, fns, rule, processFns, opts) {
    var name = rule.params.split(/\s/, 1)[0];
    var rest = rule.params.slice(name.length).trim();

    var params;
    if(rest.trim() === '') {
        params = [];
    } else {
        params = postcss.list.comma(rest);
    }

    var meta = fns[name];
    var fn = meta && meta.fn;

    if(!meta) {
        if(!opts.silent) {
            throw rule.error('Undefined function ' + name);
        }
    } else if(fn.name === 'define-function') {
        var i;
        var values = {};
        for(i = 0; i < meta.args.length; i++) {
            values[meta.args[i][0]] = params[i] || meta.args[i][1];
        }

        var proxy = postcss.root();
        for(i = 0; i < fn.node.length; i++) {
            proxy.append(fn.node[i].clone());
        }

        if(meta.args.length) {
            vars({only: values})(proxy);
        }

        if(meta.content) {
            proxy.walkAtRules('function-content', function(content) {
                if(rule.nodes && rule.nodes.length > 0) {
                    content.replaceWith(rule.nodes)
                } else {
                    content.remove();
                }
            })
        }

        processFns(proxy);

        rule.parent.insertBefore(rule, proxy);
    } else if(typeof fn === 'object') {
        insertObject(rule, fn, processFns);
    } else if(typeof fn === 'function') {
        var args = [rule].concat(params);
        var nodes = fn.apply(this, args);
        if(typeof nodes === 'object') {
            insertObject(rule, nodes, processFns);
        }
    } else {
        console.log('something wrong happened.')
    }
}

function defineFunction(result, fns, rule) {
    var name = rule.params.split(/\s/, 1)[0];
    var other = rule.params.slice(name.length).trim();

    var args = [];
    if(other.length) {

    }
    var content = false;
    rule.walkAtRules('function-content', function() {
        content = true;
        return false;
    });

    fn[name] = {
        fn: rule,
        args: args,
        content: content
    };

    rule.remove();
}

module.exports = postcss.plugin('postcss-precss-function', function (opts) {

    if(typeof opts === 'undefined') {
        opts = {};
    }

    opts = opts || {};

    var cwd = process.cwd();
    var globs = [];
    var fns = {};

    if(opts.fnsDir) {
        if(!Array.isArray(opts.fnsDir)) {
            opts.fnsDir = [opts.fnsDir];
        }
        globs = opts.fnsDir.map(function(dir) {
            return path.join(dir, '*.{js,json,css,sss,pcss}');
        });
    }

    if(opts.fnsFiles) {
        globs = globs.concat(opts.fnsFiles);
    }

    return function(css, result) {

    }

    // Work with options here

    // return function (root, result) {

    //     // Transform CSS AST here

    // };
});
