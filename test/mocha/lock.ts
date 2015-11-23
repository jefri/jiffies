import { lock } from '../../dist';
import { expect } from 'chai';

// if (window) {
//  jiffies = window['jiffies'];
//}

describe('Lock', function() {
  it('prevents reentry', function() {
    let count = 0
    let inc = lock(function() {
      if (count > 4) { return; }
      inc();
      count++;
    });
    inc();
    expect(count).to.equal(1);
  });
});
