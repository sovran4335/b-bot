import { Injectable, Logger } from '@nestjs/common';
import { env } from '../common/env';

// 던파 공식 Open API (https://developers.neople.co.kr). D9의 officialCharacterId를
// 채우는 용도 — 등록 시 이름으로 검색해서 매칭되면 캐릭터 고유 id를 저장해둔다.
const BASE_URL = 'https://api.neople.co.kr/df/servers';

interface NeopleCharacterRow {
  characterId: string;
  jobId: string;
  jobName: string;
}

interface NeopleCharacterSearchResponse {
  rows: NeopleCharacterRow[];
}

export interface NeopleCharacterMatch {
  characterId: string;
  jobId: string;
  jobName: string; // Job 참조 테이블에 없는 새 직업일 때 upsert용
}

@Injectable()
export class NeopleCharacterService {
  private readonly logger = new Logger(NeopleCharacterService.name);

  // 서버+캐릭터명이 정확히 일치하면 rows[0]이 그 캐릭터라고 가정한다(사용자 확인 사항).
  async lookupCharacter(
    serverId: string,
    characterName: string,
  ): Promise<NeopleCharacterMatch | null> {
    if (!env.neopleApiKey) return null; // 키 미설정 시 조용히 스킵

    const url = `${BASE_URL}/${serverId}/characters?characterName=${encodeURIComponent(characterName)}&apikey=${env.neopleApiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as NeopleCharacterSearchResponse;
      const first = data.rows?.[0];
      if (!first) return null;
      return {
        characterId: first.characterId,
        jobId: first.jobId,
        jobName: first.jobName,
      };
    } catch (err) {
      this.logger.warn(
        `character lookup failed for "${characterName}": ${err}`,
      );
      return null;
    }
  }
}
