'use strict';

const InputTextField = require('./input-text');

class TextareaField extends InputTextField {
    get PARTIAL() { return 'partials/forms/textarea-group'; }
}

module.exports = TextareaField;
