'use strict';

const debug = require('debug')('hmpo:mixins:fields');
const _ = require('underscore');
const path = require('path');


// This returns a middleware that places mixins against the `res.locals` object.
//
// - options:
//   - viewsDirectory: the folder in which templates are found in.
//   - viewEngine: the type of view, defaults to 'html'.
//   - sharedTranslationsKey: used to find translations relatively within
//     the translations.json. Useful for field and button labels.
//   - translate: a translate function
//   - fields: static field configuration (overridden by `res.locals.options.fields`)


const baseFields = {
    'base': require('./abstract/base'),
    'input': require('./abstract/input'),
    'option-group': require('./abstract/option-group')
};

const fields = {
    'input-text': require('./input-text'),
    'input-text-compound': require('./input-text-compound'),
    'input-text-code': require('./input-text-code'),
    'input-number': require('./input-number'),
    'input-phone': require('./input-phone'),
    'textarea': require('./textarea'),
    'radio-group': require('./radio-group'),
    'checkbox-group': require('./checkbox-group'),
    'select': require('./select'),
    'checkbox': require('./checkbox'),
    'checkbox-compound': require('./checkbox-compound'),
    'checkbox-required': require('./checkbox-required'),
    'input-submit': require('./input-submit'),
    'error-group': require('./error-group'),
    'error-group-end': require('./error-group').End,
    'input-date': require('./input-date'),
    'input-date-group': require('./input-date-group'),
};

let templateCache = {};

let addFields = options => {
    debug('addFields');

    options = Object.assign({
        fields: {},
        viewsDirectory: path.resolve(__dirname, '..', '..'),
        viewEngine: 'html',
        sharedTranslationsKey: '',
        templateCache,
    }, options);
    options = Object.assign({
        viewExtension: '.' + options.viewEngine
    }, options);
    if (options.sharedTranslationsKey.match(/[^.]$/)) options.sharedTranslationsKey += '.';

    return (req, res) => {
        let requestOptions = Object.assign({
            translate: req.translate || _.identity
        }, options);
        debug('addFields.middleware');

        if (req.app && req.app.get('view cache') === false) {
            debug('addFields.middleware disabling view cache');
            requestOptions.templateCache = false;
        }

        _.each(fields, function (field, name) {
            res.locals[name] = field.handler(res.locals, requestOptions);
        });
    };
};

module.exports = {
    templateCache,
    baseFields,
    fields,
    addFields
};
