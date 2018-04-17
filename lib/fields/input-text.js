'use strict';

const debug = require('debug')('hmpo:fields:InputText');
const InputField = require('./abstract/input');


class InputTextField extends InputField {
    get PARTIAL() { return 'partials/forms/input-text-group'; }

    get defaultType() { return 'text'; }

    get type() { return this.field.type || this.defaultType; }

    get maxlength() {
        return this.getValidatorArgument('maxlength') ||
                this.getValidatorArgument('exactlength') ||
                this.field.maxlength;
    }

    getOptions(options) {
        debug('getOptions');
        return super.getOptions(Object.assign({
            value: this.value,
            label: this.getText('label'),
            labelClassName: this.getClassName('label') || 'form-label-bold',
            labelTextClassName: this.getClassName('labelText'),
            type: this.type,
            min: this.field.min,
            max: this.field.max,
            maxlength: this.maxlength,
            pattern: this.field.pattern,
            compound: this.field.compound,
            autocomplete: this.field.autocomplete,
            attributes: this.field.attributes
        }, options));
    }
}

module.exports = InputTextField;
