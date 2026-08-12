import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

export interface StoredFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
]);

@Injectable()
export class UploadsService {
  private readonly dir: string;
  private readonly maxBytes: number;

  constructor(private readonly config: ConfigService) {
    this.dir = this.config.get<string>('uploads.dir') || 'uploads';
    this.maxBytes = (this.config.get<number>('uploads.maxMb') || 5) * 1024 * 1024;
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  get uploadDir(): string {
    return this.dir;
  }

  // Persist an in-memory uploaded file to disk and return its public metadata.
  save(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): StoredFile {
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
    const storedName = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
    writeFileSync(join(this.dir, storedName), file.buffer);

    return {
      fileUrl: `/files/${storedName}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  private extFromMime(mime: string): string {
    if (mime === 'application/pdf') return '.pdf';
    if (mime === 'image/png') return '.png';
    return '.jpg';
  }
}
