// 단독 실행용 자가 점검: `node lib/store/raidPartyArrange.check.ts`
// 앱 코드에서는 import하지 않는다 — arrangeAllParties의 회귀만 잡는 용도.
import assert from "node:assert/strict";
import type { RaidSlot } from "../types";
import { arrangeAllParties } from "./raidPartyArrange.ts";

function char(id: string, role: "DEALER" | "BUFFER") {
  return {
    id,
    adventureId: "a",
    name: id,
    job: "job",
    role,
    score: 0,
    order: 0,
    officialCharacterId: null,
    serverId: null,
    jobId: null,
  };
}

function slot(id: string, slotInParty: number, character: ReturnType<typeof char> | null) {
  return { id, partyId: "p1", slotInParty, character } as RaidSlot;
}

// 버퍼 1명이 0번 자리에 있으면 3번(4번째) 자리로 옮겨진다
{
  const before = [
    slot("s0", 0, char("buffer", "BUFFER")),
    slot("s1", 1, char("d1", "DEALER")),
    slot("s2", 2, null),
    slot("s3", 3, char("d3", "DEALER")),
  ];
  const after = arrangeAllParties(before);
  assert.equal(after.find((s) => s.id === "s3")!.character!.id, "buffer");
  assert.equal(after.find((s) => s.id === "s0")!.character!.id, "d3");
}

// 이미 3번 자리에 있으면 그대로(불필요한 변경 없음)
{
  const before = [
    slot("s0", 0, char("d1", "DEALER")),
    slot("s1", 1, null),
    slot("s2", 2, null),
    slot("s3", 3, char("buffer", "BUFFER")),
  ];
  const after = arrangeAllParties(before);
  assert.deepEqual(after, before);
}

// 버퍼가 2명이면 규칙 무시(그대로 둠)
{
  const before = [
    slot("s0", 0, char("b1", "BUFFER")),
    slot("s1", 1, char("b2", "BUFFER")),
    slot("s2", 2, null),
    slot("s3", 3, char("d1", "DEALER")),
  ];
  const after = arrangeAllParties(before);
  assert.deepEqual(after, before);
}

console.log("raidPartyArrange: ok");
