'use strict';

const debug = require('debug')('hmpo:fields:InputTextCode');
const InputTextField = require('./input-text');

class InputTextCodeField extends InputTextField {
    getField(content, baseOptions) {
        debug('getField');
        baseOptions = Object.assign({ className: 'input-code' }, baseOptions);
        return super.getField(content, baseOptions);
    }
}

module.exports = InputTextCodeField;
