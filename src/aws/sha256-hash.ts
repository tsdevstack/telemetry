import { createHash, createHmac, type Hash, type Hmac } from 'node:crypto';

type SourceData = string | ArrayBuffer | ArrayBufferView;

/**
 * SHA-256 (or HMAC-SHA-256 with a secret) in the shape the AWS request
 * signer expects, on Node's crypto.
 */
export class Sha256Hash {
  private readonly hash: Hash | Hmac;

  constructor(secret?: SourceData) {
    this.hash =
      secret === undefined
        ? createHash('sha256')
        : createHmac('sha256', Sha256Hash.toBuffer(secret));
  }

  update(data: SourceData, encoding?: 'utf8' | 'ascii' | 'latin1'): void {
    this.hash.update(Sha256Hash.toBuffer(data, encoding));
  }

  digest(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(this.hash.digest()));
  }

  private static toBuffer(
    data: SourceData,
    encoding?: 'utf8' | 'ascii' | 'latin1',
  ): Buffer {
    if (typeof data === 'string') {
      return Buffer.from(data, encoding ?? 'utf8');
    }
    if (ArrayBuffer.isView(data)) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
    return Buffer.from(data);
  }
}
