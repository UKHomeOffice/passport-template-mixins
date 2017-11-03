'use strict';

const moment = require('moment');
const _ = require('underscore');

const DATE_PARTS = ['year', 'month', 'day'];

module.exports = Controller => class extends Controller {
    configure(req, res, next) {
        req.form.options.dateFields = _.keys(_.pick(
            req.form.options.fields,
            field => field.validate === 'date' || _.contains(field.validate, 'date'))
        );

        _.forEach(req.form.options.dateFields, fieldName => this.configureDateField(req, fieldName));

        super.configure(req, res, next);
    }

    configureDateField(req, fieldName) {
        let dateField = req.form.options.fields[fieldName];
        let required = _.contains(dateField.validate, 'required');

        DATE_PARTS.forEach(part => {
            // get any existing date part field options
            let field = req.form.options.fields[fieldName + '-' + part];

            field = _.extend({
                errorGroup: fieldName,
                labelClassName: 'form-label',
                formatter: [ 'removehyphens' ]
            }, field);

            // add date part validators first
            if (!field.validate) field.validate = [];
            if (!_.isArray(field.validate)) field.validate = [ field.validate ];

            field.validate.unshift('date-' + part);
            field.validate.unshift('numeric');

            // only make part required if date field is required
            if (required) field.validate.unshift('required');

            req.form.options.fields[fieldName + '-' + part] = field;
        });
    }

    getValues(req, res, callback) {
        super.getValues(req, res, (err, values) => {
            if (err) return callback(err);
            req.form.options.dateFields.forEach(fieldName => {
                if (!values[fieldName]) return;
                let date = values[fieldName].split('-');
                values[fieldName + '-day'] = values[fieldName + '-day-raw'] || date[2];
                values[fieldName + '-month'] = values[fieldName + '-month-raw'] || date[1];
                values[fieldName + '-year'] = values[fieldName + '-year-raw'] || date[0];
            });
            callback(null, values);
        });
    }

    process(req, res, next) {
        _.forEach(req.form.options.dateFields, fieldName => this.processDateField(req, fieldName));
        super.process(req, res, next);
    }

    processDateField(req, fieldName) {
        const dayName = fieldName + '-day';
        const monthName = fieldName + '-month';
        const yearName = fieldName + '-year';

        let body = req.form.values;
        let field = req.form.options.fields[fieldName];

        // save raw values to replay on validation error
        body[dayName + '-raw'] = body[dayName];
        body[monthName + '-raw'] = body[monthName];
        body[yearName + '-raw'] = body[yearName];

        body[dayName] = field.inexact ? '01' : this._padDayMonth(body[dayName]);
        body[monthName] = this._padDayMonth(body[monthName]);
        body[yearName] = this._padYear(body[yearName], field.offset);

        body[fieldName] = body[yearName] + '-' + body[monthName] + '-' + body[dayName];

        if (body[fieldName] === '--' || (field.inexact && body[fieldName] === '--01')) {
            body[fieldName] = '';
        }
    }

    _padDayMonth(value) {
        if (value && value.match(/^\d$/)) return '0' + value;
        return value;
    }

    _padYear(value, offset) {
        if (value && value.match(/^\d{2}$/)) {
            let year = parseInt(value, 10);
            let centurySplit = (moment().year() - 2000) + (offset || 0);
            let prefix = (year <= centurySplit) ? '20' : '19';
            return prefix + value;
        }
        return value;
    }

    validateFields(req, res, callback) {
        super.validateFields(req, res, errors => {
            _.forEach(req.form.options.dateFields, fieldName => this.validateDateField(req, fieldName, errors));
            callback(errors);
        });
    }

    validateDateField(req, fieldName, errors) {
        if (!req.form.values[fieldName]) return;

        let fieldErrors = _.filter(errors, { errorGroup: fieldName });
        let numericErrors = !_.isEmpty(fieldErrors) && _.every(fieldErrors, error => error.type === 'numeric');
        if (numericErrors) {
            let errorType = 'date-numeric';
            if (errors[fieldName + '-year']) errorType += '-year';
            if (errors[fieldName + '-month']) errorType += '-month';
            if (errors[fieldName + '-day']) errorType += '-day';
            errors[fieldName] = new this.Error(
                fieldName,
                { type: errorType, errorGroup: fieldName },
                req
            );
            return;
        }

        let code = moment(req.form.values[fieldName], 'YYYY-MM-DD').invalidAt();
        let invalidElement = null;
        if (code === 0) invalidElement = 'year';
        if (code === 1) invalidElement = 'month';
        if (code === 2) invalidElement = 'day';

        if (invalidElement) {
            let error = { type: 'date-' + invalidElement, errorGroup: fieldName };
            errors[fieldName] =
                new this.Error(fieldName, error, req);
            errors[fieldName + '-' + invalidElement] =
                new this.Error(fieldName + '-' + invalidElement, error, req);
        }
    }

    saveValues(req, res, next) {
        _.forEach(req.form.options.dateFields, fieldName => {
            DATE_PARTS.forEach(part => {
                delete req.form.values[fieldName + '-' + part];
                delete req.form.values[fieldName + '-' + part + '-raw'];
            });
        });
        super.saveValues(req, res, next);
    }
};
