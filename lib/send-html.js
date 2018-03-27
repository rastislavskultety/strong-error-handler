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

var defaultOptions = {
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
  options = (options || {}).html || defaultOptions;

  var statusCode = data.statusCode;
  if (statusCode && Array.isArray(options.errors)) {
    var match = options.errors.find(function(error) {
      var found = false;
      var codes = error.code;
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
      debug('getCompiledTemplate found view %s', match.view);
      return compiledTemplates[path.resolve(options.viewPath, match.view)];
    }
  }
  debug('getCompiledTemplate found view %s', options.defaultView);
  return compiledTemplates[path.resolve(options.viewPath,
    options.defaultView)];
}

module.exports.configure = function configureHtml(options) {
  debug('configure with options=%o', options);
  options = (options || {}).html || defaultOptions;
  var viewEngine = require(options.viewEngine);
  var views = (options.errors || [])
    .map(function(error) { return error.view; });
  if (options.defaultView) {
    views.push(options.defaultView);
  }
  // remove duplicates and compile all views
  views
    .map(function(view) { return path.resolve(options.viewPath, view); })
    .filter(function(view) { return !compiledTemplates[view]; })
    .forEach(function(view) {
      debug('template %s path=%s', view, options.viewPath);
      compiledTemplates[view] = compileTemplate(viewEngine,
        path.resolve(options.viewPath, view));
    });
};
