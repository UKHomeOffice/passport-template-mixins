'use strict';

const index = require('../');

describe('Template Mixins', () => {

    it('returns template mixins function', () => {
        index.should.equal(require('../lib/template-mixins'));
    });

    it('returns a mixins object', () => {
        index.mixins.should.be.an('object');
    });

    it('should export the Date mixin', () => {
        index.mixins.Date.should.equal(require('../lib/mixins/date'));
    });
});
