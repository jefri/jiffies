
declare module "jiffies" {
  // interface Event {
  //
  // }

  interface lock {
    (fn: Function): Function
  }

  interface request {}

  interface UUID {
    rvalid: RegExp, v4(): string
  }

  // promise: require('./promise'),
  // request: require('./request'),

  export = {
    // Event,
    lock, reqeust, UUID
  };
}
