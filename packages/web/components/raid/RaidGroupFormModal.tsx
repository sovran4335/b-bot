"use client";

import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../Modal";
import { RaidGroup } from "../../lib/types";
import { createRaidGroup, updateRaidGroup } from "../../lib/api/raidGroups";

interface FormValues {
  label: string;
}

export function RaidGroupFormModal({
  group,
  onClose,
}: {
  group?: RaidGroup; // 없으면 신규 생성
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { label: group?.label ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      group
        ? updateRaidGroup(group.id, values.label)
        : createRaidGroup(values.label),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["raid-groups"] });
      onClose();
    },
  });

  return (
    <Modal title={group ? "상위탭 수정" : "상위탭 생성"} onClose={onClose}>
      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-zinc-500">상위탭 이름</label>
          <input
            {...register("label", { required: true })}
            placeholder="예: 미카엘라"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.label && (
            <p className="text-xs text-red-600">이름을 입력해주세요.</p>
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
