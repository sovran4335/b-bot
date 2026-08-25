import { Injectable, Logger } from '@nestjs/common';
import { decodePoint, ObfuscateKey } from './decode-point';

// 던파 공식 홈페이지(df.nexon.com) 캐릭터 검색이 내부적으로 치는 API.
// Referer 헤더 없이 호출하면 403 — 인증/쿠키는 필요 없고 이 헤더만 있으면 됨(curl로 확인).
const FETCH_URL = 'https://df.nexon.com/world/character/fetch';
const REFERER = 'https://df.nexon.com/world/character';

interface NexonCharacterFetchItem {
  characterName: string;
  bufferCharacter: boolean;
  equipmentPoint: string; // 난독화됨, decodePoint로 복호화 필요
  buffPoint: string; // 난독화됨
  obfuscateKey: ObfuscateKey;
}

interface NexonCharacterFetchResponse {
  body: NexonCharacterFetchItem[];
}

@Injectable()
export class NexonScoreService {
  private readonly logger = new Logger(NexonScoreService.name);

  // 서버+캐릭터명이 정확히 일치하면 검색 결과 0번째가 그 캐릭터라고 가정한다
  // (사용자 확인 사항 — 실제로 정확히 일치하는 이름으로 검색하면 0번째로 옴).
  // 버퍼 캐릭터는 buffPoint(버프력), 나머지는 equipmentPoint(장비점수)를 점수로 쓴다.
  async lookupScore(
    serverId: string,
    characterName: string,
  ): Promise<number | null> {
    const url = `${FETCH_URL}?serverName=${serverId.toUpperCase()}&characName=${encodeURIComponent(characterName)}`;
    try {
      const res = await fetch(url, {
        headers: { Referer: REFERER, 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as NexonCharacterFetchResponse;
      const first = data.body?.[0];
      if (!first) return null;

      const obfuscated = first.bufferCharacter
        ? first.buffPoint
        : first.equipmentPoint;
      const decoded = decodePoint(obfuscated, first.obfuscateKey);
      if (decoded === null) return null;

      const score = Number(decoded);
      return Number.isFinite(score) ? score : null;
    } catch (err) {
      this.logger.warn(`score lookup failed for "${characterName}": ${err}`);
      return null;
    }
  }
}
