'use strict';

const debug = require('debug')('hmpo:fields:OptionGroup');
const InputField = require('./input');
const _ = require('underscore');

class OptionGroupField extends InputField {
    get PARTIAL() { return 'partials/forms/option-group'; }

    get defaultType() { return 'group'; }

    get type() { return this.field.type || this.defaultType; }

    get items() {
        debug('items');
        return _.map(this.field.items || this.field.options, item => this.optionItem(item));
    }

    optionItem(item) {
        debug('optionItem', item);

        if (typeof item !== 'object') {
            item = { value: item };
        }

        let label;
        if (item.label) {
            label = item.label;
        } else {
            let labelKey = item.labelKey;
            if (!labelKey && item.value !== undefined && item.value !== '') {
                labelKey = ['fields', this.field.contentKey || this.key, 'options', item.value, 'label'].join('.');
            }
            if (labelKey) label = this.translate(labelKey);
        }

        let data = {
            value: item.value,
            label: label || '',
            toggle: item.toggle,
            child: item.child,
            attributes: item.attributes
        };

        data.type = this.type;

        data.selected = _.isArray(this.value)
            ? this.value.indexOf(data.value) > -1
            : this.value === data.value;

        return data;
    }

    getOptions(options) {
        debug('getOptions');
        return super.getOptions(Object.assign({
            legend: this.getText('legend', true),
            legendClassName: this.getClassName('legend'),
            role: this.type === 'radio' ? 'radiogroup': 'group',
            renderChild: this.renderChild.bind(this),
            items: this.items
        }, options));
    }
}

module.exports = OptionGroupField;
