'use strict';

const debug = require('debug')('hmpo:fields:Select');
const InputDate = require('./input-date');
const ErrorGroup = require('./error-group');

class InputDateGroup extends InputDate {
    constructor(content, ctx, options) {
        debug('constructor');
        super(content, ctx, options);

        this.errorGroup = new ErrorGroup({
            key: this.key,
            groupClassName: 'form-date',
            legendClassName: 'form-label-bold'
        }, ctx, options);

        this.errorGroupEnd = new ErrorGroup.End({}, ctx, options);
    }

    render() {
        let parts  = [
            this.errorGroup.render(),
            super.render(),
            this.errorGroupEnd.render(),
        ];
        return parts.join('\n');
    }
}

module.exports = InputDateGroup;
