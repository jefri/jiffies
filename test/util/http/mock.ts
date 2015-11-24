import * as nock from 'nock';
import * as superagent from 'superagent';
import * as samock from 'superagent-mock';

let mocks: any = null;

export function setup() {
  mocks = samock(superagent, [{
    pattern: 'http://localhost:8000/context.json',
    fixtures: function() {},
    get: function(match: any, data: any) {
      return { body: { entities: {} } };
    }
  }]);
}

export function teardown() {
  mocks.unset();
}
