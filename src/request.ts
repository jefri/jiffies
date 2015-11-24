import * as superagent from 'superagent';

var req: any = function(uri: string): Promise<string> {
  return get(uri)
}
req.get = get
req.post = post

export let request: {
  (uri: string): Promise<string>,
  get: (uri: string) => Promise<string>,
  post: (uri: string, options: PostOptions) => Promise<string>
} = req;

export function get(uri: string): Promise<string> {
  return new Promise<string>(function(resolve: Function, reject: Function) {
    return superagent.get(uri).end((err: any, {ok, text}) => {
      if (err != null) {
        return reject(err);
      } else if (!ok) {
        return reject(text);
      } else {
        return resolve(text);
      }
    });
  });
}

export interface PostOptions {
  data?: any,
  dataType?: string,
}

export function post(uri: string, options: PostOptions): Promise<string> {
  let req = superagent.post(uri);
  if (options.dataType) {
    req.set('Content-type', options.dataType);
  }
  if (options.data) {
    req.send(options.data);
  }
  return new Promise<string>(function(resolve: Function, reject: Function) {
    req.end((err: any, {text}) => {
      if (err != null) {
        return reject(err);
      } else {
        return resolve(text);
      }
    });
  });
}


