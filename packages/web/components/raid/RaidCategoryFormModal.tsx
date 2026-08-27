"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { RaidCategory } from "../../lib/types";
import {
  createRaidCategory,
  updateRaidCategory,
} from "../../lib/api/raidCategories";
import { logAction } from "../../lib/logging/logAction";

interface FormValues {
  label: string;
  partyTemplate: { label: string; colorHex?: string }[];
}

export function RaidCategoryFormModal({
  category,
  groupId,
  onClose,
}: {
  category?: RaidCategory; // 없으면 신규 생성
  groupId: string; // 신규 생성 시 소속시킬 상위탭
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: category
      ? {
          label: category.label,
          partyTemplate: category.partyTemplate.map((p) => ({
            label: p.label,
            colorHex: p.colorHex ?? undefined,
          })),
        }
      : {
          label: "",
          partyTemplate: [
            { label: "레드", colorHex: "#ef4444" },
            { label: "옐로", colorHex: "#eab308" },
            { label: "그린", colorHex: "#22c55e" },
          ],
        },
  });
  // 파티 2~6개 수준의 짧은 리스트라 dnd 대신 위/아래 버튼으로 순서 변경 (5.2.1)
  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "partyTemplate",
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      category
        ? updateRaidCategory(category.id, values)
        : createRaidCategory({ ...values, groupId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["raid-categories", groupId],
      });
      await logAction({
        actionType: category ? "RAID_CATEGORY_UPDATE" : "RAID_CATEGORY_CREATE",
        result: "SUCCESS",
        targetType: "RaidCategory",
        targetId: category?.id,
      });
      onClose();
    },
    onError: async () => {
      await logAction({
        actionType: category ? "RAID_CATEGORY_UPDATE" : "RAID_CATEGORY_CREATE",
        result: "FAILURE",
      });
    },
  });

  return (
    <Modal title={category ? "탭 수정" : "탭 생성"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-zinc-500">탭 이름</label>
          <input
            {...register("label", { required: true })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.label && (
            <p className="text-xs text-red-600">탭 이름을 입력해주세요.</p>
          )}
        </div>

        <div>
          <label className="text-xs text-zinc-500">파티 구성</label>
          <div className="mt-1 space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-1">
                <input
                  {...register(`partyTemplate.${index}.label` as const, {
                    required: true,
                  })}
                  placeholder="파티 이름 (예: 레드)"
                  className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <input
                  type="color"
                  {...register(`partyTemplate.${index}.colorHex` as const)}
                  className="h-8 w-8 rounded border border-zinc-300 dark:border-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => index > 0 && swap(index, index - 1)}
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    index < fields.length - 1 && swap(index, index + 1)
                  }
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ label: "" })}
            className="mt-2 text-xs text-zinc-600 underline dark:text-zinc-300"
          >
            + 파티 추가
          </button>
        </div>

        <p className="text-[11px] text-zinc-400">
          이 설정은 앞으로 생성되는 기수부터 적용됩니다. (D11)
        </p>

        {mutation.isError && (
          <p className="text-xs text-red-600">저장에 실패했습니다.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || fields.length === 0}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          저장
        </button>
      </form>
    </Modal>
  );
}
