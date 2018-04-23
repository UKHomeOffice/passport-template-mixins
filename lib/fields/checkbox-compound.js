'use strict';

const debug = require('debug')('hmpo:fields:CheckboxCompound');
const CheckboxField = require('./checkbox');

class CheckboxCompoundField extends CheckboxField {
    getField(content, baseOptions) {
        debug('getField');
        baseOptions = Object.assign({ compound: true }, baseOptions);
        return super.getField(content, baseOptions);
    }
}

module.exports = CheckboxCompoundField;
