'use strict';

const index = require('../');

describe('Template Mixins', () => {

    it('returns a setup function', () => {
        index.should.be.a('function');
    });

    it('exports base field classes', () => {
        index.baseFields.should.equal(require('../lib/fields').baseFields);
    });

    it('exports field classes', () => {
        index.fields.should.equal(require('../lib/fields').fields);
    });

    it('exports mixin controllers', () => {
        index.mixins.should.equal(require('../lib/mixins'));
    });

    it('exports the Date mixin controller', () => {
        index.mixins.Date.should.equal(require('../lib/mixins/date'));
    });

    describe('setup function', () => {

        it('returns a middleware function', () => {
            index().should.be.a('function');
        });

        it('adds lambdas and fields to res.locals', () => {
            let req = {};
            let res = {
                locals: {}
            };
            let next = sinon.stub();

            index()(req, res, next);

            res.locals.t.should.be.a('function');
            res.locals['input-text'].should.be.a('function');
            next.should.have.been.calledWithExactly();
        });
    });
});
