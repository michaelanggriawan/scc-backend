import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { Readable } from 'stream';

export interface StoredFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface FileStream {
  body: Readable;
  contentType: string;
  contentLength?: number;
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly dir: string;
  private readonly maxBytes: number;

  // Object storage (S3-compatible, e.g. Railway/Tigris). When all creds are
  // present, uploads go to the bucket; otherwise they fall back to local disk
  // so `npm run dev` works with no cloud setup.
  private readonly s3?: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.dir = this.config.get<string>('uploads.dir') || 'uploads';
    this.maxBytes =
      (this.config.get<number>('uploads.maxMb') || 5) * 1024 * 1024;

    const s3 = this.config.get<{
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    }>('s3');
    this.bucket = s3?.bucket || '';

    if (s3?.endpoint && s3.bucket && s3.accessKeyId && s3.secretAccessKey) {
      this.s3 = new S3Client({
        endpoint: s3.endpoint,
        region: s3.region || 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: s3.accessKeyId,
          secretAccessKey: s3.secretAccessKey,
        },
      });
      this.logger.log(`Uploads → S3 bucket "${s3.bucket}"`);
    } else {
      if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
      this.logger.log(`Uploads → local disk "${this.dir}"`);
    }
  }

  get uploadDir(): string {
    return this.dir;
  }

  // Persist an in-memory uploaded file (to S3 or disk) and return its metadata.
  // The returned fileUrl is always `/files/<key>` and is served back by this
  // app, so the storage backend is transparent to the DB and the frontend.
  async save(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): Promise<StoredFile> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file was uploaded');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG or PDF files are allowed');
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `File is too large (max ${this.maxBytes / 1024 / 1024} MB)`,
      );
    }
    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const key = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;

    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } else {
      writeFileSync(join(this.dir, key), file.buffer);
    }

    return {
      fileUrl: `/files/${key}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  // Fetch a stored object for streaming back to the client at GET /files/:key.
  async getObject(key: string): Promise<FileStream> {
    // Guard against path traversal — keys are always flat basenames.
    const safeKey = basename(key);

    if (this.s3) {
      try {
        const out = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }),
        );
        return {
          body: out.Body as Readable,
          contentType: out.ContentType || this.mimeFromExt(safeKey),
          contentLength: out.ContentLength,
        };
      } catch {
        throw new NotFoundException('File not found');
      }
    }

    const path = join(this.dir, safeKey);
    if (!existsSync(path)) throw new NotFoundException('File not found');
    return { body: createReadStream(path), contentType: this.mimeFromExt(safeKey) };
  }

  private extFromMime(mime: string): string {
    if (mime === 'application/pdf') return '.pdf';
    if (mime === 'image/png') return '.png';
    return '.jpg';
  }

  private mimeFromExt(name: string): string {
    const ext = extname(name).toLowerCase();
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.png') return 'image/png';
    return 'image/jpeg';
  }
}
