/**
 * df.nexon.com 캐릭터 fetch API가 내려주는 buffPoint / equipmentPoint
 * 난독화 값을 obfuscateKey.key로 복호화하는 유틸리티.
 *
 * 방식: base64 디코드 -> key 바이트를 반복시켜 XOR -> 결과 문자열에서 숫자만 추출
 * (salt는 평문 앞부분에 그대로 echo 되는 접두사/패딩 역할로 보이며,
 *  실제 XOR 키 계산에는 사용되지 않는 것으로 확인됨)
 */

export interface ObfuscateKey {
  key: string; // base64
  salt: string; // base64 (현재 디코딩 로직엔 사용되지 않음, 참고용으로만 보관)
}

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function xorWithRepeatingKey(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

function bytesToLatin1String(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

/**
 * buffPoint / equipmentPoint 같은 난독화된 base64 문자열을 복호화해서
 * 그 안에 포함된 숫자(포인트 값)만 추출한다.
 *
 * @param obfuscatedValue  예: "WQ9GQm1iNjYEHFZSKw4HQwtzH0JaQnkMLhAaYF40MD8ZPQFiWhhGQG8V"
 * @param obfuscateKey     응답에 같이 내려오는 { key, salt } 객체
 * @returns 복호화된 숫자 문자열 (못 찾으면 null)
 */
export function decodePoint(
  obfuscatedValue: string,
  obfuscateKey: ObfuscateKey,
): string | null {
  const cipherBytes = base64ToBytes(obfuscatedValue);
  const keyBytes = base64ToBytes(obfuscateKey.key);

  const plainBytes = xorWithRepeatingKey(cipherBytes, keyBytes);
  const plainText = bytesToLatin1String(plainBytes);

  // 관찰된 샘플에서는 XOR 복호화 결과의 앞부분에 값과 무관한 고정 헤더가
  // 붙어있고(같은 응답 내 다른 필드끼리 동일), 그 헤더 안에도 우연히 숫자가
  // 섞여 있을 수 있어 단순 "첫 번째 숫자" 매칭은 신뢰할 수 없다.
  // 그래서 1) 헤더로 추정되는 구간을 건너뛰고, 2) 그래도 애매하면
  // 가장 긴 연속 숫자 구간을 선택하는 순서로 시도한다.
  //
  // ponytail: 이 오프셋(HEADER_SKIP)은 지금까지 관찰된 샘플 기준 값이며,
  // 넥슨 측 구현이 달라지면 깨질 수 있는 리버스 엔지니어링 추정치임 — 깨지면
  // 실제 응답 샘플 다시 떠서 헤더 길이 재확인.
  const HEADER_SKIP = 18;

  const afterHeader = plainText.slice(HEADER_SKIP);
  const headerMatch = afterHeader.match(/^\d+/);
  if (headerMatch) return headerMatch[0];

  // 헤더 추정이 안 맞는 경우를 대비한 fallback: 전체에서 가장 긴 숫자 구간
  const allMatches = plainText.match(/\d+/g);
  if (!allMatches || allMatches.length === 0) return null;

  return allMatches.reduce((longest, cur) =>
    cur.length > longest.length ? cur : longest,
  );
}
