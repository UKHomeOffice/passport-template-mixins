'use strict';

const OptionGroupField = require('./abstract/option-group');

class RadioGroupField extends OptionGroupField {
    get defaultType() { return 'radio'; }
}

module.exports = RadioGroupField;
