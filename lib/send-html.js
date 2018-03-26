// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: strong-error-handler
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* jshint node:true */

'use strict';
// var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('strong-error-handler:send-html');

var assetDir = path.resolve(__dirname, '../views');
var compiledTemplates = {
  // loading default template and stylesheet
  // default: loadDefaultTemplates(),
};

var htmlOptions = null;

var defaultHtmlOptions = {
  viewEngine: 'ejs',
  viewPath: assetDir,
  defaultView: 'default-error.ejs',
};

module.exports = sendHtml;

function sendHtml(res, data, options) {
  var toRender = {
    options: {},
    data: data,
  };
  // TODO: ability to call non-default template functions from options
  // var body = compiledTemplates.default(toRender);
  var body = getCompiledTemplate(data, options)(toRender);
  sendReponse(res, body);
}

/**
 * Compile and cache the file with the `filename` key in options
 *
 * @param viewEngine (description)
 * @param filepath (description)
 * @returns {Function} render function with signature fn(data);
 */
function compileTemplate(viewEngine, filepath) {
  debug('compiling template %s', filepath);
  var options = {
    cache: true,
    filename: filepath,
  };
  var fileContent = fs.readFileSync(filepath, 'utf8');
  return viewEngine.compile(fileContent, options);
}

// loads and cache default error templates
// function loadDefaultTemplates() {
//   var defaultTemplate = path.resolve(assetDir, 'default-error.ejs');
//   return compileTemplate(defaultTemplate);
// }

function sendReponse(res, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(body);
}

function getCompiledTemplate(data, options) {
  debug('calling getCompiledTemplate data=%o, options=%o', data, options);
  options = options || {};

  var statusCode = data.statusCode;
  if (statusCode && Array.isArray(htmlOptions.views)) {
    var match = htmlOptions.views.find(function(view) {
      var found = false;
      var codes = view.code;
      if (Array.isArray(codes)) {
        found = codes.includes(data.statusCode);
      } else if (typeof codes == 'object') {
        found = statusCode >= codes.from && statusCode <= codes.to;
      } else {
        found = statusCode == codes;
      }
      return found;
    });
    if (match) {
      debug('getCompiledTemplate returns %s', match.view);
      return compiledTemplates[match.view];
    }
  }
  debug('getCompiledTemplate returns %s', htmlOptions.defaultView);
  return compiledTemplates[htmlOptions.defaultView];
}

module.exports.configure = function configureHtml(options) {
  debug('configure with options=%o', options);
  htmlOptions = options.html || defaultHtmlOptions;
  var viewEngine = require(htmlOptions.viewEngine);
  var views = (htmlOptions.views || [])
    .filter(function(item) { return item.view; });
  if (htmlOptions.defaultView) {
    views.push(htmlOptions.defaultView);
  }
  views.forEach(function(view) {
    compiledTemplates[view] = compileTemplate(viewEngine,
      path.resolve(htmlOptions.viewPath, view));
  });
};
