'use strict';

const debug = require('debug')('hmpo:fields:InputNumber');
const InputTextField = require('./input-text');

class InputNumberField extends InputTextField {
    getField(content, baseOptions) {
        debug('getField');
        baseOptions = Object.assign({ pattern: '[0-9]*' }, baseOptions);
        return super.getField(content, baseOptions);
    }
}

module.exports = InputNumberField;
