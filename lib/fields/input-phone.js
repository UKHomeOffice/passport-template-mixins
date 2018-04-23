'use strict';

const debug = require('debug')('hmpo:fields:InputPhone');
const InputTextField = require('./input-text');

class InputPhoneField extends InputTextField {
    get maxlength() {
        debug('maxlength');
        return super.maxlength || 18;
    }
}

module.exports = InputPhoneField;
