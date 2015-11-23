import { randomByte } from './random/index';

export let UUID = {
  rvalid: /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i,
  v4: function(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = randomByte()&0x0f;
      return (c === 'x' ? r : ((r&0x3)|0x8)).toString(16);
    });
  }
}

