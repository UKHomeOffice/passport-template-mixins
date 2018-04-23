'use strict';

const BaseField = require('../../../lib/fields/abstract/base');

describe('Base Field', () => {
    it('creates a base instance', () => {
        let field = new BaseField();
        field.field.should.eql({});
    });
});
