/* jshint node: true */

var jsbeautify = require('js-beautify').js_beautify;
var merge = require('deepmerge');
var through = require('through2');
var PluginError = require('gulp-util').PluginError;
var detectIndent = require('detect-indent');
var mout  = {};
mout.lang = require('mout/lang');

var PLUGIN_NAME = 'gulp-json-extender';
module.exports = function (editor, jsbeautifyOptions) {
    /*
     create 'editBy' function from 'editor'
     */
    var editBy;
    if (mout.lang.isFunction(editor)) {
        // edit JSON object by user specific function
        editBy = function (json, srcFilePath) {
            return editor(json, srcFilePath);
        };
    } else if (mout.lang.isObject(editor)) {
        // edit JSON object by merging with user specific object
        editBy = function (json) {
            return merge(json, editor);
        };
    }
    else if (mout.lang.isUndefined(editor)) {
        throw new PluginError(PLUGIN_NAME, 'missing "editor" option');
    }
    else {
        throw new PluginError(PLUGIN_NAME, '"editor" option must be a function or object');
    }

    /*
     js-beautify option
     */
    jsbeautifyOptions = jsbeautifyOptions || {};

    // always beautify output
    var beautify = true;

    /*
     create through object and return it
     */
    return through.obj(function (file, encoding, callback) {

        // ignore it
        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        // stream is not supported
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming is not supported'));
            return callback();
        }

        try {
            // try to get current indentation
            var indent = detectIndent(file.contents.toString('utf8'));

            // beautify options for this particular file
            var beautifyOptions = merge({}, jsbeautifyOptions); // make copy
            beautifyOptions.indent_size = beautifyOptions.indent_size || indent.amount || 2;
            beautifyOptions.indent_char = beautifyOptions.indent_char || (indent.type === 'tab' ? '\t' : ' ');

            // edit JSON object and get it as string notation
            var json = JSON.stringify(editBy(JSON.parse(file.contents.toString('utf8')), file.path), null, indent.indent);

            // beautify JSON
            if (beautify) {
                json = jsbeautify(json, beautifyOptions);
            }

            // write it to file
            file.contents = new Buffer(json);
        }
        catch (err) {
            this.emit('error', new PluginError(PLUGIN_NAME, err));
        }

        this.push(file);
        callback();

    });

};
