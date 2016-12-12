var jsToCss = require('postcss-js/parser');
var postcss = require('postcss');
var sugarss = require('sugarss');
var globby = require('globby');
var vars = require('postcss-simple-vars');
var path = require('path');
var fs = require('fs');
var isWindows = require('os').platform().indexOf('win32') !== -1;

//
var fnObj = [];
var invokeObj = [];

var DEFINEFUNCTION_KEY = 'define-function';
var RETURN_KEY = 'return';

function removeSpace(str) {
    return str.replace(/\s+/g, '');
}

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
 *  Beacuse 'function' is a reserved keyword in JavaScript.
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

/**
 * [Filter the desired type in the nodes]
 * @param  {[Array]} nodes    [The node to be filtered]
 * @param  {[String]} nodeType [atrule default]
 * @param  {[String]} typeName [type name]
 * @return {[Array]}          [desired type array]
 */
function nodeTypeFilter(nodes, typeName, nodeType) {
    nodeType = nodeType || 'atrule';
    var resultArr = [];
    if(!Array.isArray(nodes)){
        console.log('The nodeTypeFilter function requires param nodes which is Array.')
    }

    for (var i = 0; i < nodes.length; i++) {
        if(nodes[i].type === nodeType && nodes[i].name === typeName) {
            resultArr.push(nodes[i]);
        }
    }

    return resultArr;
}

/**
 *  @define-function rem($val) {
 *      @return $val / 640 * 10 * 1rem;
 *  }
 *
 *  a {
 *      height: rem(640);
*   }
 */

// '$a' => 'a'
function getVariable(str) {
    return str.substr(1);
}

// 'rem($a, $b)' => {fnName: 'rem', fnArgs: [$a, $b]}
// '@return $val / 640 * 10 * 1rem' => {fnContent: '$val / 640 * 10 * 1rem'}
function getFnProps(fnNode) {
    var rs = {};
    var propsStr = fnNode.params;
    propsStr = removeSpace(propsStr);

    var nameRE = /[\w]+\(/g;
    var paramsRE = /\(\S+\)/g;
    var fnName = propsStr.match(nameRE)[0];
    var fnArgs = [];
    var fnContent = '';

    var fnContentNode = nodeTypeFilter(fnNode.nodes, 'return');

    fnName = fnName.substring(0, fnName.length - 1);
    fnArgs = propsStr.match(paramsRE)[0].replace(/\(|\)/g, '').split(',');
    fnContent = fnContentNode[0].params;

    rs.fnName = fnName;
    rs.fnArgs = fnArgs;
    rs.fnContent = fnContent;

    //console.log(rs);

    return rs;
}

// fnObj = {
//     'rem': {
//         'params': [a, b],
//         'content': 'a + b'
//     },
//     'tofix': {
//         'params': [a],
//         'content': 'rea'
//     }
// }

//height: rem(640);
function getInvokedParams(node) {
    var result = {};

    var fnValueRE = /\(\S*\)/g;
    var fnNameRE = /\S+\(/g;

    var nodeValue = removeSpace(node.value);
    if(fnValueRE.test(nodeValue)) {
        var valueStr = nodeValue.match(fnValueRE)[0].replace(/\(|\)/g, '');
        var temp = nodeValue.match(fnNameRE)[0];
        var nameStr = temp.substr(0, temp.length - 1);

        if (valueStr) {
            result.value = valueStr.split(',');
        } else {
            result.value = [];
        }

        if(nameStr) {
            result.name = nameStr;
        }

    }

    console.log(result);

    return result;
}

function parseFn(node) {

}

/**
 *  refer to http://astexplorer.net/#/2uBU1BLuJ1 .
 */
module.exports = postcss.plugin('postcss-precss-function', function (opts) {

    if(typeof opts === 'undefined') {
        opts = {};
    }

    opts = opts || {};

    var cwd = process.cwd();

    return function(root, result) {

        var fnNodeArr = nodeTypeFilter(root.nodes, 'define-function');

        var parseRs = getFnProps(fnNodeArr[0]);

        // remove define statement in result
        root.walkAtRules(function(rule) {
            if (rule.name === DEFINEFUNCTION_KEY) {
                rule.remove();
            }
        })



        // output result
        // console.log('result: ' + JSON.stringify(result));


    }


});
