'use strict';

const lambdas = require('./lib/lambdas');
const fields = require('./lib/fields');
const mixins = require('./lib/mixins');
const errors = require('./lib/errors');

module.exports = options => {
    let lambdaMiddleware = lambdas.addLambdas(options);
    let fieldsMiddleware = fields.addFields(options);

    return (req, res, next) => {
        lambdaMiddleware(req, res);
        fieldsMiddleware(req, res);
        errors.middleware(req, res);
        next();
    };
};

module.exports.mixins = mixins;
module.exports.baseFields = fields.baseFields;
module.exports.fields = fields.fields;
module.exports.lambdas = lambdas.lambdas;
