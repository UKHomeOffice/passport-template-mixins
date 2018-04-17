'use strict';

const CheckboxField = require('./checkbox');

class CheckboxRequiredField extends CheckboxField {
    get isRequired() { return true; }
}

module.exports = CheckboxRequiredField;
