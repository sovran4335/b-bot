import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { env } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(cookieParser());
  // 7.1: metadata 등 과대한 로그 body 방어 [가정] — 정밀한 필드별 10KB 검증 대신 전역 요청 크기 제한으로 대체
  app.use(json({ limit: '256kb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: env.corsOrigin, credentials: true });
  await app.listen(env.port);
}
void bootstrap();
