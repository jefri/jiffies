import {UUID} from '../../src/UUID';
import {expect} from 'chai';

describe('UUID', function() {
  it('generates random UUIDs',
     function() { expect(UUID.v4()).to.match(UUID.rvalid); });
  return it('is generating UUIDs with random numbers', function() {
    expect(UUID.v4()).to.not.equal('00000000-0000-4000-8000-000000000000');
  });
});
