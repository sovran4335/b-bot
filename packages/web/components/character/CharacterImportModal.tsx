"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import {
  parseCharacterImport,
  inferRole,
  ParsedCharacter,
} from "../../lib/parseCharacterImport";
import { createCharacter } from "../../lib/api/characters";
import { logAction } from "../../lib/logging/logAction";

export function CharacterImportModal({ onClose }: { onClose: () => void }) {
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedCharacter[] | null>(null);
  const queryClient = useQueryClient();

  const handleParse = () => {
    const parsed = parseCharacterImport(raw);
    if (parsed.length === 0) {
      setParseError(
        "캐릭터를 찾을 수 없습니다. 마이캐릭터 페이지 전체를 그대로 복사해 붙여넣어 주세요.",
      );
      return;
    }
    setParseError(null);
    setPreview(parsed);
  };

  const removeAt = (index: number) => {
    setPreview((prev) => prev!.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (characters: ParsedCharacter[]) => {
      // 서버에 order 경쟁이 생기지 않도록 순차 등록한다.
      for (const c of characters) {
        await createCharacter({
          name: c.name,
          job: c.job,
          role: inferRole(c.job),
          score: 0,
        });
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
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">{c.job}</span>
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

          <div className="flex justify-end gap-2 pt-2 text-sm">
            <button onClick={() => setPreview(null)} className="px-3 py-1.5 text-zinc-500">
              뒤로
            </button>
            <button
              onClick={() => mutation.mutate(preview)}
              disabled={preview.length === 0 || mutation.isPending}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              저장 ({preview.length}명)
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="캐릭터 등록" onClose={onClose} wide>
      <div className="space-y-2">
        <p className="text-xs text-zinc-500">
          넥슨 마이페이지 &gt; 마이캐릭터 화면 전체를 Ctrl+A, Ctrl+C로 복사해서
          아래에 붙여넣으세요.
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
            onClick={handleParse}
            disabled={!raw.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            다음
          </button>
        </div>
      </div>
    </Modal>
  );
}
