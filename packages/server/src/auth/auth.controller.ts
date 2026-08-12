import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SelectServerDto } from './dto/select-server.dto';
import { toAdventureDto } from './dto/adventure.dto';
import type { AdventureDto } from './dto/adventure.dto';
import { SessionGuard } from './session.guard';
import type { RequestWithAdventure } from './session.guard';
import { CurrentAdventure } from './current-adventure.decorator';
import type { Adventure } from '@prisma/client';
import { env } from '../common/env';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ adventure: AdventureDto; isNewUser: boolean }> {
    const { adventure, isNewUser, sessionId, expiresAt } =
      await this.authService.login(dto.adventureName);
    this.setSessionCookie(res, sessionId, expiresAt);
    return { adventure: toAdventureDto(adventure), isNewUser };
  }

  @Post('auth/logout')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async logout(
    @Req() req: RequestWithAdventure,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    // SessionGuard를 통과했으므로 쿠키에 세션 id가 존재함이 보장된다
    const sessionId = req.cookies?.[env.sessionCookieName] as string;
    await this.authService.logout(sessionId);
    res.clearCookie(env.sessionCookieName);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentAdventure() adventure: Adventure): AdventureDto {
    return toAdventureDto(adventure);
  }

  @Patch('me/server')
  @UseGuards(SessionGuard)
  async selectServer(
    @CurrentAdventure() adventure: Adventure,
    @Body() dto: SelectServerDto,
  ): Promise<AdventureDto> {
    const updated = await this.authService.selectServer(
      adventure.id,
      dto.serverId,
    );
    return toAdventureDto(updated);
  }

  private setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
    res.cookie(env.sessionCookieName, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.cookieSecure,
      expires: expiresAt,
    });
  }
}
