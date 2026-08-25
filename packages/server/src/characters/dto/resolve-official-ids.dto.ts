import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

// 등록 미리보기(아직 캐릭터가 DB에 없는 시점)에서 이름만으로 초상화 이미지를 붙이기 위한 조회
export class ResolveOfficialIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  names!: string[];
}

export interface OfficialIdLookupResultDto {
  name: string;
  officialCharacterId: string | null;
  jobId: string | null;
}
