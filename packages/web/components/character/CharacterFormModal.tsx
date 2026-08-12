"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import {
  characterFormSchema,
  CharacterFormSchema,
} from "../../lib/validation/schemas";
import { createCharacter, updateCharacter } from "../../lib/api/characters";
import { CharacterCard } from "../../lib/types";
import { logAction } from "../../lib/logging/logAction";

const ROLE_SCORE_LABEL: Record<string, string> = {
  DEALER: "장비점수",
  BUFFER: "버프력",
};

export function CharacterFormModal({
  character,
  onClose,
}: {
  character?: CharacterCard; // 없으면 신규 등록
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CharacterFormSchema>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: character
      ? {
          name: character.name,
          job: character.job,
          role: character.role,
          score: character.score,
        }
      : { role: "DEALER" },
  });
  const role = watch("role");

  const mutation = useMutation({
    mutationFn: (values: CharacterFormSchema) =>
      character
        ? updateCharacter(character.id, values)
        : createCharacter(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
      await logAction({
        actionType: character ? "CHARACTER_UPDATE" : "CHARACTER_CREATE",
        result: "SUCCESS",
        targetType: "Character",
        targetId: character?.id,
      });
      onClose();
    },
    onError: async () => {
      await logAction({
        actionType: character ? "CHARACTER_UPDATE" : "CHARACTER_CREATE",
        result: "FAILURE",
      });
    },
  });

  return (
    <Modal title={character ? "캐릭터 수정" : "캐릭터 등록"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-zinc-500">이름</label>
          <input
            {...register("name")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.name && (
            <p className="text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="text-xs text-zinc-500">직업</label>
          <input
            {...register("job")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.job && (
            <p className="text-xs text-red-600">{errors.job.message}</p>
          )}
        </div>

        <div>
          <label className="text-xs text-zinc-500">역할</label>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" value="DEALER" {...register("role")} /> 딜러
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" value="BUFFER" {...register("role")} /> 버퍼
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500">
            {ROLE_SCORE_LABEL[role] ?? "점수"}
          </label>
          <input
            type="number"
            {...register("score", { valueAsNumber: true })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.score && (
            <p className="text-xs text-red-600">{errors.score.message}</p>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-600">저장에 실패했습니다.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          저장
        </button>
      </form>
    </Modal>
  );
}
