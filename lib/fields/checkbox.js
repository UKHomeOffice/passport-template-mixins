'use strict';

const debug = require('debug')('hmpo:fields:Checkbox');
const InputField = require('./abstract/input');


class CheckboxField extends InputField {
    get PARTIAL() { return 'partials/forms/checkbox'; }

    get isSelected() {
        return this.value && this.value.toString() === 'true';
    }

    getOptions(options) {
        debug('getOptions');

        return super.getOptions(Object.assign({
            label: this.getText('label'),
            className: this.getClassName('field') || 'block-label',
            selected: this.isSelected,
            required: this.isRequired,
            compound: this.field.compound,
            attributes: this.field.attributes,
            toggle: this.field.toggle,
            child: this.field.child,
            renderChild: this.renderChild.bind(this)
        }, options));
    }
}

module.exports = CheckboxField;
