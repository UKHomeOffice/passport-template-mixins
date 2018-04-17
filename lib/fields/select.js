'use strict';

const debug = require('debug')('hmpo:fields:Select');
const OptionGroupField = require('./abstract/option-group');
const OptionInputText = require('./input-text');

class SelectField extends OptionInputText {
    constructor(content, ctx, options) {
        debug('constructor');
        super(content, ctx, options);
        this.optionField = new OptionGroupField(content, ctx, options);
    }

    get PARTIAL() { return 'partials/forms/select'; }

    getOptions(options) {
        debug('getOptions');
        options = this.optionField.getOptions(options);
        return super.getOptions(options);
    }
}

module.exports = SelectField;
