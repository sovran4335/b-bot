"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import {
  parseCharacterImport,
  inferRole,
  ParsedCharacter,
} from "../../lib/parseCharacterImport";
import { createCharacter, resolveOfficialIds } from "../../lib/api/characters";
import { logAction } from "../../lib/logging/logAction";
import { useMe } from "../../lib/hooks";
import { CharacterAvatar } from "./CharacterAvatar";

type PreviewCharacter = ParsedCharacter & {
  officialCharacterId: string | null;
  jobId: string | null;
};

// "예시보기" 모달에 보여주는 실제 마이캐릭터 페이지 복사 예시 (전체 선택 복사 시 나오는 그대로)
const EXAMPLE_TEXT = `NEXON
메뉴
N
OFF
넥슨 회원가입
넥슨 로그인


Dungeon & Fighter

    새소식
    게임소개
    가이드
    모험가월드
    커뮤니티
    창작콘텐츠
    서비스센터
    자료실
    던파ON

GAME START
DirectX9로 게임하기
MY
마이페이지
마이캐릭터 보안관리 회원정보관리 세라관리 게시물관리 내소식 스킨관리
마이캐릭터
캐릭터현황
타임라인
주간던파
가입길드정보
프로필관리

    카인 디레지에 시로코 프레이 카시야스 힐더 안톤 바칼

    대표

        Lv.115

        ㅇㅅㅇ

        진(眞) 트래블러

        Lv.115

        네

        진(眞) 엘레멘탈 마스터

        Lv.115

        우럭

        진(眞) 엘레멘탈 바머

        Lv.115

        솬사

        진(眞) 소환사

        Lv.115

        러블리템포

        진(眞) 뮤즈

        Lv.115

        용맹의축복

        진(眞) 크루세이더

        Lv.115

        박종민

        진(眞) 크루세이더


- 대표캐릭터는 게임에서 생성한 캐릭터 중 선택할 수 있으며, 게시물 작성 또는 이벤트 참여 시 활용됩니다.
- 게임캐릭터의 변경된 정보가 웹사이트에 반영되는데 최대 2시간까지 소요될 수 있습니다.`;

export function CharacterImportModal({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewCharacter[] | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [showExample, setShowExample] = useState(false);
  const { data: adventure } = useMe();
  const queryClient = useQueryClient();

  const handleParse = async () => {
    const parsed = parseCharacterImport(raw);
    if (parsed.length === 0) {
      setParseError(
        "캐릭터를 찾을 수 없습니다. 마이캐릭터 페이지 전체를 그대로 복사해 붙여넣어 주세요.",
      );
      return;
    }
    setParseError(null);
    setResolving(true);
    try {
      // 초상화 이미지용 officialCharacterId/jobId 조회 — 실패해도 등록 자체는 막지 않는다
      const resolved = await resolveOfficialIds(parsed.map((c) => c.name));
      const byName = new Map(resolved.map((r) => [r.name, r]));
      setPreview(
        parsed.map((c) => ({
          ...c,
          officialCharacterId: byName.get(c.name)?.officialCharacterId ?? null,
          jobId: byName.get(c.name)?.jobId ?? null,
        })),
      );
    } catch {
      setPreview(
        parsed.map((c) => ({ ...c, officialCharacterId: null, jobId: null })),
      );
    } finally {
      setResolving(false);
    }
  };

  const removeAt = (index: number) => {
    setPreview((prev) => prev!.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (characters: ParsedCharacter[]) => {
      // 서버에 order 경쟁이 생기지 않도록 순차 등록한다. 캐릭터당 공식 API 조회가
      // 여러 번 붙어서(officialCharacterId, 장비점수) 느리므로 진행률을 보여준다.
      setSaveProgress(0);
      for (const c of characters) {
        await createCharacter({
          name: c.name,
          job: c.job,
          role: inferRole(c.job),
          score: 0,
        });
        setSaveProgress((p) => p + 1);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
      await logAction({
        actionType: "CHARACTER_CREATE",
        result: "SUCCESS",
        targetType: "Character",
      });
      onClose();
    },
    onError: async () => {
      await logAction({ actionType: "CHARACTER_CREATE", result: "FAILURE" });
    },
  });

  if (preview) {
    return (
      <Modal title="불러올 캐릭터 확인" onClose={onClose} wide>
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">
            불러오지 않을 캐릭터는 ✕ 버튼으로 제외한 뒤 저장하세요.
          </p>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {preview.map((c, i) => (
              <div
                key={`${c.name}-${c.job}-${i}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CharacterAvatar
                    serverId={adventure?.serverId}
                    officialCharacterId={c.officialCharacterId}
                    jobId={c.jobId}
                  />
                  <div className="min-w-0 flex flex-col ml-2 gap-0.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {c.name}
                    </span>
                    <span className="text-xs text-zinc-500">{c.job}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeAt(i)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label={`${c.name} 제외`}
                >
                  ✕
                </button>
              </div>
            ))}
            {preview.length === 0 && (
              <p className="p-4 text-center text-xs text-zinc-400">
                불러올 캐릭터가 없습니다.
              </p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-600">저장에 실패했습니다.</p>
          )}

          {mutation.isPending && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                  style={{
                    width: `${(saveProgress / preview.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-center text-xs text-zinc-400">
                등록 중... ({saveProgress}/{preview.length}) 공식 홈페이지에서
                장비점수·이미지를 같이 조회하고 있어 시간이 걸릴 수 있습니다.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 text-sm">
            <button
              onClick={() => setPreview(null)}
              disabled={mutation.isPending}
              className="px-3 py-1.5 text-zinc-500 disabled:opacity-50"
            >
              뒤로
            </button>
            <button
              onClick={() => mutation.mutate(preview)}
              disabled={preview.length === 0 || mutation.isPending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {mutation.isPending
                ? `저장 중... (${saveProgress}/${preview.length})`
                : `저장 (${preview.length}명)`}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal title="캐릭터 등록" onClose={onClose} wide>
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">
            넥슨 마이페이지 &gt; 마이캐릭터 화면 전체를 Ctrl+A, Ctrl+C로
            복사해서 아래에 붙여넣으세요.{" "}
            <button
              type="button"
              onClick={() => setShowExample(true)}
              className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              예시보기
            </button>
          </p>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder="마이캐릭터 페이지 내용을 여기에 붙여넣기"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
          <div className="flex justify-end gap-2 pt-2 text-sm">
            <button onClick={onClose} className="px-3 py-1.5 text-zinc-500">
              취소
            </button>
            <button
              onClick={() => void handleParse()}
              disabled={!raw.trim() || resolving}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {resolving ? "확인 중..." : "다음"}
            </button>
          </div>
        </div>
      </Modal>

      {showExample && (
        <Modal title="ℹ️ 복사 예시" onClose={() => setShowExample(false)}>
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              공식 홈페이지 마이페이지에서 아래와 같이 전체 선택(Ctrl+A) 후
              복사(Ctrl+C) 하여 붙여넣으시면 됩니다.
            </p>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300">
              {EXAMPLE_TEXT}
            </pre>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowExample(false)}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                닫기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
