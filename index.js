'use strict';

var through = require('through2');
var gutil = require('gulp-util');
var beautify = require('js-beautify').js_beautify;
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var template = require('./lib/art');

var PluginError = gutil.PluginError;

module.exports = function (opts) {
    function replaceExtension(path) {
        return gutil.replaceExtension(path, '.js');
    }

    function transform(file, enc, cb) {
        if (file.isNull()) return cb(null, file);
        if (file.isStream()) return cb(new PluginError('gulp-template', 'Streaming not supported'));
        var tpl_name = path.basename(file.path, '.html');
        var dest = replaceExtension(file.path);
        var str = file.contents.toString('utf8');
        //去掉单行注释
        // str = str.replace(/\/\/[^\\n]*/g,'');
        //去掉换行
        // str = str.replace(/\n\t/g,'');

        //渲染模版
        var render_opts = opts || {
            compress: true
        };

        var tpls = [];
        var $ = cheerio.load(str);
        if ($('script').length < 1) {
            render_opts.filename = 'getMain';
            tpls.push('getMain:' + template.render(str, render_opts));
        } else {
            $('script').each(function () {
                var $this = $(this);
                var filename = $this.attr('id') || 'getMain';
                var content = $this.html();
                //处理 $1,模版内容
                render_opts.filename = filename;

                var rendered = template.render(content, render_opts);
                tpls.push(filename + ':' + rendered);
            });
        }

        tpls = beautify(';(function(rc) {var funcs = {\n' + tpls.join(',').replace(/\/\*\*\//g, '') + '};\nrc.template.addTempFuncs(\'tpl.' + tpl_name + '\',funcs);})(window.Tatami);', {indent_size: 2});
        file.contents = new Buffer(tpls);
        file.path = dest;
        cb(null, file);
    }

    return through.obj(transform);
};
