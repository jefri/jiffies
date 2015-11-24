/// <reference path="./superagent/superagent.d.ts" />

declare module 'superagent-mock' {
  var t: SAMock;
  export = t;

  interface SAMock {
    (sa: any, mocks: MockConfig[]): saunset;
  }

  interface saunset {
    unset(): void;
  }

  interface MockConfig {
    pattern: string;
    fixtures(): void;
    get(match: any, data: any): {body: any};
  }
}

