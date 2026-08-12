import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { UploadsService } from './uploads.service';

// Serves stored uploads (S3 or disk) at GET /files/:key. This route is
// excluded from the global 'api/v1' prefix in main.ts so the public URL
// stays `/files/<key>`, matching what save() returns and the frontend expects.
@ApiExcludeController()
@Controller('files')
export class FilesController {
  constructor(private readonly uploads: UploadsService) {}

  @Public()
  @Get(':key')
  async serve(@Param('key') key: string, @Res() res: Response): Promise<void> {
    const { body, contentType, contentLength } =
      await this.uploads.getObject(key);
    res.setHeader('Content-Type', contentType);
    if (contentLength != null) {
      res.setHeader('Content-Length', String(contentLength));
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    body.pipe(res);
  }
}
