'use strict';

const debug = require('debug')('hmpo:fields:InputDate');
const InputNumber = require('./input-number');
const BaseField = require('./abstract/base');

class InputDate extends BaseField {
    constructor(content, ctx, options) {
        debug('constructor');
        super(content, ctx, options);
        this.createDateFields(ctx, options);
    }

    createDateFields(ctx, options) {
        if (this.isExact) {
            this.dayField = new InputNumber({
                key: this.key + '-day',
                min: 1,
                max: 31,
                maxlength: 2
            }, ctx, options);
        }

        this.monthField = new InputNumber({
            key: this.key + '-month',
            min: 1,
            max: 12,
            maxlength: 2
        }, ctx, options);

        this.yearField = new InputNumber({
            key: this.key + '-year',
            maxlength: 4
        }, ctx, options);
    }

    get isExact() { return this.field.inexact !== true; }

    render() {
        let parts  = [];

        if (this.dayField) parts.push(this.dayField.render());
        parts.push(this.monthField.render());
        parts.push(this.yearField.render());

        return parts.join('\n');
    }
}

module.exports = InputDate;
