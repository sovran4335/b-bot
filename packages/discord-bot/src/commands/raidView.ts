// /공대표보기: 상위탭 -> 카테고리(난이도) -> 기수 순으로 버튼 눌러가며 탐색.
//
// 상태는 서버 메모리가 아니라 각 버튼의 customId(`rv:<action>:<...id>`)에 그대로 실어 보낸다.
// 그래서 "세션"이 따로 만료되지 않는다 — 메시지가 지워지지 않는 한, 버튼은 클릭할 때마다 매번
// 새 인터랙션(그리고 새 15분짜리 응답 토큰)을 받으므로 30분이든 며칠이든 그대로 동작한다
// (요청 "세션 최소 30분 유지" 요건을 이 방식으로 충족).
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import {
  getRaidGroups,
  getRaidCategories,
  getRaidTeams,
  getRaidTeam,
} from "../apiClient";
import { RaidSlot } from "../types";

export const data = new SlashCommandBuilder()
  .setName("공대표보기")
  .setDescription("공대표를 확인합니다");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply(await renderGroups());
}

// index.ts가 customId 접두어("rv:")로 걸러서 넘겨준다
export async function handleButton(interaction: ButtonInteraction) {
  const [, action, ...args] = interaction.customId.split(":");
  let view;
  switch (action) {
    case "g":
      view = await renderGroups();
      break;
    case "c":
      view = await renderCategories(args[0]);
      break;
    case "s":
      view = await renderCategorySummary(args[0], args[1]);
      break;
    case "n":
    case "p": // 이전 기수 버튼 — 번호 바로가기 버튼과 customId가 겹치지 않게 액션 코드만 분리, 내용은 "n"과 동일
    case "x": // 다음 기수 버튼 — 위와 동일한 이유
      view = await renderGenerationDetail(args[0], args[1], Number(args[2]));
      break;
    default:
      view = { content: "알 수 없는 버튼입니다.", embeds: [], components: [] };
  }
  await interaction.update(view);
}

const ROW_SIZE = 5;
const MAX_ROWS = 5;

// 버튼 5개씩 한 행, 최대 5행(=25개)까지만 — 그 이상은 Discord 메시지 한 개에 못 담는다 [가정: 페이지네이션은 아직 필요할 만큼 그룹/카테고리/기수가 많지 않아 생략]
function chunkButtons(buttons: ButtonBuilder[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length && rows.length < MAX_ROWS; i += ROW_SIZE) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.slice(i, i + ROW_SIZE),
      ),
    );
  }
  return rows;
}

async function renderGroups() {
  const groups = await getRaidGroups();
  const embed = new EmbedBuilder()
    .setTitle("상위탭 선택")
    .setDescription(
      groups.length
        ? "지금 뭐 돌고 있나요"
        : "아직 생성된 레이드가 없거나 오류났지에",
    );
  const buttons = groups
    .slice(0, 25)
    .map((g) =>
      new ButtonBuilder()
        .setCustomId(`rv:c:${g.id}`)
        .setLabel(g.label)
        .setStyle(ButtonStyle.Primary),
    );
  return { embeds: [embed], components: chunkButtons(buttons) };
}

async function renderCategories(groupId: string) {
  const [groups, categories] = await Promise.all([
    getRaidGroups(),
    getRaidCategories(groupId),
  ]);
  const group = groups.find((g) => g.id === groupId);
  const embed = new EmbedBuilder()
    .setTitle(`${group?.label ?? "상위탭"} — 난이도 선택`)
    .setDescription(
      categories.length
        ? `${group?.label ?? "상위탭"} 난이도를 선택하세요`
        : "아직 생성된 카테고리가 없거나 오류났지에",
    );
  const buttons = categories
    .slice(0, 25)
    .map((c) =>
      new ButtonBuilder()
        .setCustomId(`rv:s:${groupId}:${c.id}`)
        .setLabel(c.label)
        .setStyle(ButtonStyle.Primary),
    );
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("rv:g")
      .setLabel("◀ 뒤로 가기")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    embeds: [embed],
    components: [...chunkButtons(buttons), backRow].slice(0, MAX_ROWS),
  };
}

async function renderCategorySummary(groupId: string, categoryId: string) {
  const [groups, categories, teams] = await Promise.all([
    getRaidGroups(),
    getRaidCategories(groupId),
    getRaidTeams(categoryId),
  ]);
  const group = groups.find((g) => g.id === groupId);
  const category = categories.find((c) => c.id === categoryId);
  const sortedTeams = [...teams].sort(
    (a, b) => a.generationIndex - b.generationIndex,
  );

  // 참여 모험단 집계용으로 기수마다 상세(슬롯+캐릭터)를 조회한다 — 기수 개수가 몇 개 안 되니 병렬로도 충분
  const details = await Promise.all(sortedTeams.map((t) => getRaidTeam(t.id)));
  const countByAdventure = new Map<string, number>();
  for (const detail of details) {
    for (const slot of detail.slots) {
      if (!slot.character) continue;
      const name = slot.character.adventureName;
      countByAdventure.set(name, (countByAdventure.get(name) ?? 0) + 1);
    }
  }
  const participants =
    [...countByAdventure.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count}명)`)
      .join("\n") || "아직 참여 중인 공대원이 없습니다.";

  const embed = new EmbedBuilder()
    .setTitle(`${group?.label ?? ""} — ${category?.label ?? ""}`)
    .addFields(
      { name: "총 기수", value: `${sortedTeams.length}개`, inline: true },
      { name: "참여 모험단", value: participants },
    );

  const buttons = sortedTeams
    .slice(0, 25)
    .map((t) =>
      new ButtonBuilder()
        .setCustomId(`rv:n:${groupId}:${categoryId}:${t.generationIndex}`)
        .setLabel(t.generationLabel)
        .setStyle(ButtonStyle.Primary),
    );
  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`rv:c:${groupId}`)
      .setLabel("◀ 뒤로 가기")
      .setStyle(ButtonStyle.Secondary),
  );
  return {
    embeds: [embed],
    components: [...chunkButtons(buttons), backRow].slice(0, MAX_ROWS),
  };
}

const ROLE_LABEL: Record<string, string> = {
  DEALER: "<:ico_equi:1542574377487433789>",
  BUFFER: "<:ico_buff:1542574373393928244>",
};

// 파티 평균 장비점수: 딜러만 집계(버퍼 score는 버프력이라 단위가 달라 섞지 않음) — RaidBoard.tsx와 동일 규칙
function averageDealerScore(slots: RaidSlot[]): number | null {
  const scores = slots
    .filter((s) => s.character?.role === "DEALER")
    .map((s) => s.character!.score);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

async function renderGenerationDetail(
  groupId: string,
  categoryId: string,
  generationIndex: number,
) {
  const teams = await getRaidTeams(categoryId);
  const sortedTeams = [...teams].sort(
    (a, b) => a.generationIndex - b.generationIndex,
  );
  const currentIdx = sortedTeams.findIndex(
    (t) => t.generationIndex === generationIndex,
  );
  if (currentIdx === -1) {
    return {
      content: "해당 기수를 찾을 수 없습니다 (그 사이 삭제됐을 수 있음).",
      embeds: [],
      components: [],
    };
  }

  const detail = await getRaidTeam(sortedTeams[currentIdx].id);
  const embed = new EmbedBuilder().setTitle(detail.generationLabel);

  for (const party of [...detail.parties].sort((a, b) => a.order - b.order)) {
    const partySlots = detail.slots
      .filter((s) => s.partyId === party.id)
      .sort((a, b) => a.slotInParty - b.slotInParty);
    const lines = partySlots.map((s) =>
      s.character
        ? `${s.slotInParty + 1}. **${s.character.name}** (${s.character.job}) — ${ROLE_LABEL[s.character.role]} **${s.character.score.toLocaleString()}**`
        : `${s.slotInParty + 1}. ~~빈 자리~~`,
    );
    const avg = averageDealerScore(partySlots);
    lines.push(
      avg !== null ? `\n평균 장비점수: <:ico_equi:1542574377487433789> **${avg.toLocaleString()}**\n` : "\n평균 장비점수: <:ico_equi:1542574377487433789> -\n",
    );
    // 캐릭터 줄에서 뺀 모험단 이름을 파티명 옆에 몰아서 표시 — 여러 모험단이 섞여 있으면(D5) 전부 나열
    const adventureNames = [
      ...new Set(
        partySlots
          .map((s) => s.character?.adventureName)
          .filter((name): name is string => !!name),
      ),
    ];
    const partyTitle = adventureNames.length
      ? `${party.label} [${adventureNames.join(", ")}]`
      : party.label;
    embed.addFields({ name: partyTitle, value: lines.join("\n") });
  }
  if (detail.parties.length === 0) {
    embed.setDescription("이 기수에 파티 구성이 없습니다.");
  }

  const prev = sortedTeams[currentIdx - 1];
  const next = sortedTeams[currentIdx + 1];
  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        prev ? `rv:p:${groupId}:${categoryId}:${prev.generationIndex}` : "rv:noop:prev",
      )
      .setLabel(`◀ ${prev?.generationIndex ?? 1} 기수`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!prev),
    new ButtonBuilder()
      .setCustomId(`rv:s:${groupId}:${categoryId}`)
      .setLabel("목록으로")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(
        next ? `rv:x:${groupId}:${categoryId}:${next.generationIndex}` : "rv:noop:next",
      )
      .setLabel(`${next?.generationIndex ?? sortedTeams.length} 기수 ▶`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!next),
  );
  // 기수 번호 바로가기 [1][2][3].. — 지금 보고 있는 기수는 눌러도 소용없으니 disabled로 표시
  const genButtons = sortedTeams
    .slice(0, 15) // navRow+backRow가 이미 2행 차지해서 남는 3행(5개씩)까지만
    .map((t) =>
      new ButtonBuilder()
        .setCustomId(`rv:n:${groupId}:${categoryId}:${t.generationIndex}`)
        .setLabel(String(t.generationIndex))
        .setStyle(
          t.generationIndex === generationIndex
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(t.generationIndex === generationIndex),
    );
  const genRows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < genButtons.length; i += ROW_SIZE) {
    genRows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        genButtons.slice(i, i + ROW_SIZE),
      ),
    );
  }

  return { embeds: [embed], components: [navRow, ...genRows] };
}
