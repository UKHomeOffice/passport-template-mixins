'use strict';

const debug = require('debug')('hmpo:field:InputTextCompound');
const InputTextField = require('./input-text');

class InputTextCompoundField extends InputTextField {
    getField(content, baseOptions) {
        debug('getField');
        baseOptions = Object.assign({ compound: true }, baseOptions);
        return super.getField(content, baseOptions);
    }
}

module.exports = InputTextCompoundField;
