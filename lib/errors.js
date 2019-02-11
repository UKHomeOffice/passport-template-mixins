'use strict';

const debug = require('debug')('hmpo:errors');
const _ = require('underscore');

let getErrorMessage = (key, error, ctx, header) => {
    let fieldOptions = ctx.options && ctx.options.fields && ctx.options.fields[key];
    let contentkey = fieldOptions && fieldOptions.contentKey || key;

    let keys = [];

    if (header) keys.push(
        'fields.' + contentkey + '.validation.' + error.type + '_header',
        'validation.' + contentkey + '.' + error.type + '_header',
        'fields.' + contentkey + '.validation.default_header',
        'validation.' + contentkey + '.default_header'
    );

    if (header && error.errorGroup) keys.push(
        'fields.' + error.errorGroup + '.validation.' + error.type + '_header',
        'validation.' + error.errorGroup + '.' + error.type + '_header',
        'fields.' + error.errorGroup + '.validation.default_header',
        'validation.' + error.errorGroup + '.default_header'
    );

    keys.push(
        'fields.' + contentkey + '.validation.' + error.type,
        'validation.' + contentkey + '.' + error.type,
        'fields.' + contentkey + '.validation.default',
        'validation.' + contentkey + '.default'
    );

    if (error.errorGroup) keys.push(
        'fields.' + error.errorGroup + '.validation.' + error.type,
        'validation.' + error.errorGroup + '.' + error.type,
        'fields.' + error.errorGroup + '.validation.default',
        'validation.' + error.errorGroup + '.default'
    );

    keys.push(
        'validation.' + error.type,
        'validation.default'
    );

    let translate = ctx.translate();

    let context = Object.assign(
        {},
        ctx,
        {
            key: 'fields.' + contentkey,
            label: translate.call(ctx, 'fields.' + contentkey + '.label').toLowerCase(),
            legend: translate.call(ctx, 'fields.' + contentkey + '.legend').toLowerCase()
        },
        error.args
    );

    return translate.call(context, keys);
};

let middleware = (req, res) => {
    let render = res.render;
    res.render = function () {
        _.each(res.locals.errors, (error, key) => {
            error = Object.assign({}, error);
            error.message = error.message || getErrorMessage(key, error, res.locals);
            error.headerMessage = error.headerMessage || getErrorMessage(key, error, res.locals, true);
            res.locals.errors[key] = error;
            debug('Processed error message', error);
        });
        res.locals.errorlist = _.reject(res.locals.errors, (error, key) => error.errorGroup && error.errorGroup !== key);
        render.apply(this, arguments);
    };
};

module.exports = {
    getErrorMessage,
    middleware
};
