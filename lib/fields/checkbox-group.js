'use strict';

const OptionGroupField = require('./abstract/option-group');

class CheckboxGroupField extends OptionGroupField {
    get defaultType() { return 'checkbox'; }
}

module.exports = CheckboxGroupField;
