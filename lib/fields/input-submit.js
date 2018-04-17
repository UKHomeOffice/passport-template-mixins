'use strict';

const debug = require('debug')('hmpo:field:InputSubmit');
const BaseField = require('./abstract/base');

class InputSubmit extends BaseField {
    get PARTIAL() { return 'partials/forms/input-submit'; }

    get defaultId() { return 'submit-button'; }
    get defaultLabel() { return 'next'; }

    getField(content, baseOptions) {
        baseOptions = baseOptions || {};

        let props = (content || '').split(' ');

        let options = Object.assign({}, baseOptions, {
            key: props[1] || this.defaultId,
            labelKey: 'buttons.' + (props[0] || this.defaultLabel)
        });

        return options;
    }

    getOptions(options) {
        debug('getOptions');
        return Object.assign({
            key: this.key,
            value: this.getText('label')
        }, options);
    }
}

module.exports = InputSubmit;
