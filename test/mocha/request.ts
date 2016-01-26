import {request} from '../../src/request';
import {expect} from 'chai';
import {setup, teardown} from '../util/http/mock';

describe('request as fetch wrapper', function() {
  beforeEach(function() { setup(); });

  afterEach(function() { teardown(); });

  it('requests JSON data', function(done) {
    request.get('http://localhost:8000/context.json')
        .then(function(results: string) { return JSON.parse(results); })
        .then(function(results: any) {
          expect(results).to.have.property('entities');
        })
        .then(done, done);
  });
});
