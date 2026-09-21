import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { PresignUploadDto } from './storage.dto';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucket: string;
  constructor(private readonly config: ConfigService<AppEnv, true>, private readonly prisma: PrismaService) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    const options = { region: config.get('S3_REGION', { infer: true }), forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }), credentials: { accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }), secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }) } };
    this.client = new S3Client({ ...options, endpoint: config.get('S3_ENDPOINT', { infer: true }) });
    this.publicClient = new S3Client({ ...options, endpoint: config.get('S3_PUBLIC_ENDPOINT', { infer: true }) ?? config.get('S3_ENDPOINT', { infer: true }) });
  }
  async presign(userId: string, dto: PresignUploadDto) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'];
    if (!allowed.includes(dto.contentType)) throw new BadRequestException('Only supported image, video, and audio reference files can be uploaded');
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `uploads/${userId}/${randomUUID()}-${safeName}`;
    const upload = await this.prisma.upload.create({ data: { userId, objectKey, filename: safeName, contentType: dto.contentType, size: dto.size } });
    const uploadUrl = await getSignedUrl(this.publicClient, new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, ContentType: dto.contentType, ContentLength: dto.size, Metadata: { uploadId: upload.id, ownerId: userId } }), { expiresIn: 900 });
    return { uploadId: upload.id, uploadUrl, expiresIn: 900, headers: { 'Content-Type': dto.contentType } };
  }
  async complete(userId: string, uploadId: string) {
    const upload = await this.prisma.upload.findFirst({ where: { id: uploadId, userId } });
    if (!upload) throw new NotFoundException('Upload not found');
    const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: upload.objectKey }));
    if (head.ContentLength !== upload.size || head.ContentType !== upload.contentType) throw new BadRequestException('Uploaded object does not match the declared file');
    return this.prisma.upload.update({ where: { id: upload.id }, data: { status: 'READY' } });
  }
  async put(key: string, body: Uint8Array, contentType: string) { await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType })); return key; }
  async read(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return { bytes: new Uint8Array(await result.Body!.transformToByteArray()), contentType: result.ContentType ?? 'application/octet-stream' };
  }
  signedUrl(key: string, downloadName?: string) { return getSignedUrl(this.publicClient, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/["\r\n]/g, '')}"` : undefined }), { expiresIn: 900 }); }
}
