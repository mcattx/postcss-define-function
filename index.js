var postcss = require('postcss');
var path = require('path');

var fn = {};
// record all customize function name
var fnNameList = [];

var DEFINEFUNCTION_KEY = 'define-function';
var FUNCTION_KEY = 'function';
var RETURN_KEY = 'return';
var PARSEFUNCTION_KEY = 'callFn';

/**
 * [remove space in target string]
 * @param  {[String]} str
 * @return {[String]}
 */
function removeSpace(str) {
    return str.replace(/\s+/g, '');
}

/**
 * [replaceFn description]
 * @param  {[type]} name    [custom function name]
 * @param  {[type]} args    [custom function arguments]
 * @param  {[type]} content [custom function content]
 * @return {[String]}
 *
 *
 *  rem(640) => 640 / 640 * 10 rem;
 */
function replaceFn(name, args, content) {
    var newContent = '';
    var oneVarRE = /(\$\w+)/g;
    var variableRE = /(\$\w+)([\+\-\*/@])/g;
    var content = removeSpace(content);
    // to get '$a' in the end of a content string beacuse of my bad Reg
    content = content + '@';
    var length = args.length;

    if (length) {
        if(length === 1) {
            content = content.replace(oneVarRE, args[0]);
        } else {
            var i = 0;
            var replacer = function(str, $1, $2) {
                if(args[i]){
                    return args[i++] + $2;
                } else {
                    return str;
                }

            }
            content = content.replace(variableRE, replacer);
        }

    } else {
        // no params
        content = content;
    }
    // delete '@'
    newContent = content.substr(0, content.length - 1);



    return newContent;
}

/**
 * [computeValue description]
 * @param  {[String]} valueStr [css value to be calculated]
 * @return {[String]}
 *
 * '640 / 640 * 10 rem' => '10rem'
 */
function computeValue(valueStr) {
    var resultStr = '';
    // length data unit
    var unit = ['%', 'in', 'cm', 'mm', 'em', 'ex', 'pt', 'pc', 'px', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'ch'];
    var unitStr = unit.join('|');
    var unitRE = new RegExp(unitStr, 'g');
    var tempStr = valueStr.match(unitRE)[0];
    if(tempStr) {
        valueStr = valueStr.replace(tempStr, '');
        valueStr = eval(valueStr);
        resultStr = valueStr + tempStr;
    }
    return resultStr;
}

/**
 *  refer to : https://github.com/postcss/postcss-mixins/blob/master/index.js
 *  beacuse last version code is too ugly, I decide to refactor my codes.
 */

function insideDefine(rule) {
    var parent = rule.parent;
    if(!parent) {
        return false;
    } else if(parent.name === DEFINEFUNCTION_KEY) {
        return true;
    } else {
        return insideDefine(parent);
    }
}

function insertFn(root, fns, fnNames, rule, processFns, opts) {

    rule.walkDecls(function(i) {
        var name = detachCustomName(i.value);
        var args = detachCustomValues(i.value);

        if(name && name != '') {
            var selector = i.parent.params;
            var prop = i.prop;
            var meta = fns[name];
            var fn = meta && meta.fn;


            if(!meta) {
                if(!opts.silent) {
                    throw rule.error('Undefined @define-function ' + name);
                } else {
                    i.parent.remove();
                }

            } else{
                var content = meta.content;
                if(fnNames.indexOf(name) !== -1) {
                    var tempValue = replaceFn(name, args, content);
                    i.value = computeValue(tempValue);

                    // @callFn a {} => a {};
                    var proxy = postcss.parse('a{}');
                    proxy.type = 'rule';
                    proxy.selector = i.parent.params;
                    proxy.nodes = i.parent.nodes;
                    i.parent.replaceWith(proxy);
                }
            }

        }
    })

}

function defineFn(result, fns, fnNames, rule) {
    var fn = detachProps(rule);
    var name = fn.name;
    var args = fn.args;
    var content = fn.content;

    fns[name] = {
        name: name,
        args: args,
        content: content
    };

    fnNames.push(name);

    rule.remove();
}
/**
 * [detach custom name in rule]
 * @param  {[String]} ruleName
 * @return {[String]}
 *
 * rem(400) || rem($val) => rem
 */
function detachCustomName(ruleName) {
    ruleName = removeSpace(ruleName);
    var nameRE = /[-\w]+\(/g;
    var name = '';

    if(ruleName.match(nameRE)) {
        name = ruleName.match(nameRE)[0];
        name = name.substring(0, name.length - 1);
    }

    return name;
}

/**
 * [detachCustomValues description]
 * @param  {[String]} ruleName [ruleName]
 * @return {[Array]}
 *
 *  'rem(a, b, c)' => ['a', 'b', 'c']
 */
function detachCustomValues(ruleName) {
    ruleName = removeSpace(ruleName);
    var argsRE = /\(\S+\)/g;
    var args = [];
    if(ruleName.match(argsRE)) {
        args = ruleName.match(argsRE)[0].replace(/\(|\)/g, '').split(',');
    }

    return args;
}

/**
 * [detach props from function definition]
 * @param  {[String]} rule [Postcss Rule]
 * @return {[Object]}
 *
 * @define-function rem($val) {@return $val / 640 * 10 * 1rem} => {name: 'rem', args: ['$val'], content: '$val / 640 * 10 * 1rem'}
 *
 */
function detachProps(rule) {
    var rs = {};
    var params = removeSpace(rule.params);
    var argsRE = /\(\S+\)/g;

    var name = detachCustomName(params);

    var args = detachCustomValues(params);

    var content = removeSpace(rule.nodes[0].params);

    rs.name = name;
    rs.args = args;
    rs.content = content;
    return rs;
}

module.exports = postcss.plugin('postcss-precss-function', function(opts) {
    if (typeof opts === 'undefined') {
        opts = {};
    }

    var cwd = process.cwd();
    var globs = [];
    var fns = {};
    var fnNames = [];

    return function(css, result, root) {
        var processFns = function(root) {
            root.walkAtRules(function(i) {
                if(i.name === PARSEFUNCTION_KEY) {
                    if(!insideDefine(i)) {
                        insertFn(root, fns, fnNames, i, processFns, opts);
                    }
                } else if(i.name === DEFINEFUNCTION_KEY) {
                    defineFn(result, fns, fnNames, i);
                }
            })
        }

        processFns(css);

    }
});

