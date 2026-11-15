export interface Compressor {
  /** UTF-8 text, as a zlib stream, as unpadded base64url. */
  deflate: (text: string) => Promise<string>;
  /** base64url or standard base64, padded or not, to text. Rejects invalid input. */
  inflate: (encoded: string) => Promise<string>;
}
