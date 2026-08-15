import { Injectable } from '@nestjs/common';
import COS from 'cos-nodejs-sdk-v5';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { env } from '../config/env';

export interface PutSignature {
  url: string;
  storageKey: string;
  method: 'PUT' | 'POST';
  expiresAt: string;
}

@Injectable()
export class StorageService {
  private readonly cos: COS | null;
  private readonly localRoot: string;

  constructor() {
    this.localRoot = resolve(
      env.localStorageDir || join(process.cwd(), 'storage'),
    );
    if (env.cosSecretId && env.cosSecretKey && env.cosBucket) {
      this.cos = new COS({
        SecretId: env.cosSecretId,
        SecretKey: env.cosSecretKey,
      });
    } else {
      this.cos = null;
    }
  }

  get cosEnabled(): boolean {
    return this.cos !== null;
  }

  buildKey(input: {
    taskId: string;
    area: string;
    version: number;
    logicalName: string;
  }): string {
    const safe = input.logicalName
      .trim()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]+/g, '-')
      .slice(0, 80);
    return `tasks/${input.taskId}/${input.area}/v${input.version}-${safe}`;
  }

  async presignPut(storageKey: string): Promise<PutSignature> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    if (this.cos) {
      const url = await this.cosGetUrl(storageKey, 'PUT', 600);
      return { url, storageKey, method: 'PUT', expiresAt };
    }
    return {
      url: `${env.publicBaseUrl}/api/v1/attachments/upload-direct`,
      storageKey,
      method: 'POST',
      expiresAt,
    };
  }

  async presignGet(storageKey: string): Promise<string> {
    if (this.cos) {
      return this.cosGetUrl(storageKey, 'GET', 600);
    }
    return `${env.publicBaseUrl}/api/v1/attachments/download-direct?storageKey=${encodeURIComponent(storageKey)}`;
  }

  async putBuffer(storageKey: string, buffer: Buffer): Promise<void> {
    if (this.cos) {
      await new Promise<void>((resolvePromise, reject) => {
        this.cos!.putObject(
          {
            Bucket: env.cosBucket,
            Region: env.cosRegion,
            Key: storageKey,
            Body: buffer,
          },
          (error) => (error ? reject(error) : resolvePromise()),
        );
      });
      return;
    }
    const target = this.localPath(storageKey);
    mkdirSync(dirname(target), { recursive: true });
    await new Promise<void>((resolvePromise, reject) => {
      const stream = createWriteStream(target);
      stream.on('finish', resolvePromise);
      stream.on('error', reject);
      stream.end(buffer);
    });
  }

  async getStream(storageKey: string): Promise<Readable> {
    if (this.cos) {
      const body = await new Promise<Buffer>((resolvePromise, reject) => {
        this.cos!.getObject(
          {
            Bucket: env.cosBucket,
            Region: env.cosRegion,
            Key: storageKey,
          },
          (error, data) => {
            if (error) {
              reject(error);
            } else if (!Buffer.isBuffer(data.Body)) {
              reject(new Error('Unexpected COS response'));
            } else {
              resolvePromise(data.Body);
            }
          },
        );
      });
      return Readable.from(body);
    }
    const target = this.localPath(storageKey);
    if (!existsSync(target)) {
      throw new Error('文件不存在');
    }
    return createReadStream(target);
  }

  private cosGetUrl(
    storageKey: string,
    method: 'PUT' | 'GET',
    expires: number,
  ): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      this.cos!.getObjectUrl(
        {
          Bucket: env.cosBucket,
          Region: env.cosRegion,
          Key: storageKey,
          Method: method,
          Sign: true,
          Expires: expires,
        },
        (error, data) => {
          if (error || !data?.Url) {
            reject(error ?? new Error('COS 签名失败'));
          } else {
            resolvePromise(data.Url);
          }
        },
      );
    });
  }

  private localPath(storageKey: string): string {
    const safe = storageKey.replace(/[^a-zA-Z0-9/._-]/g, '_');
    const target = resolve(this.localRoot, safe);
    if (
      target !== this.localRoot &&
      !target.startsWith(this.localRoot + sep)
    ) {
      throw new Error('非法存储路径');
    }
    return target;
  }
}
