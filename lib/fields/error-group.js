'use strict';

const debug = require('debug')('hmpo:fields:InputText');
const InputField = require('./abstract/input');
const BaseField = require('./abstract/base');

class ErrorGroup extends InputField {
    get PARTIAL() { return 'partials/forms/error-group'; }

    getOptions(options) {
        debug('getOptions');
        return super.getOptions(Object.assign({
            legend: this.getText('legend'),
            legendClassName: this.getClassName('legend')
        }, options));
    }
}

class ErrorGroupEnd extends BaseField {
    get PARTIAL() { return 'partials/forms/error-group-end'; }

    getField() {
        return {};
    }

    getOptions() {
        return {};
    }
}

ErrorGroup.end = ErrorGroup.End = ErrorGroupEnd;

module.exports = ErrorGroup;
