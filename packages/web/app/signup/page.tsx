"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupFormSchema, SignupFormValues } from "../../lib/validation/schemas";
import { signup } from "../../lib/api/auth";
import { ApiError } from "../../lib/api/client";
import { logAction } from "../../lib/logging/logAction";
import { SERVER_LABELS, ServerId } from "../../lib/types";

const SERVER_IDS = Object.keys(SERVER_LABELS) as ServerId[];

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupFormSchema) });

  const onSubmit = async ({ adventureName, serverId }: SignupFormValues) => {
    setServerError(null);
    try {
      await signup(adventureName, serverId);
      await logAction({ actionType: "LOGIN", result: "SUCCESS" });
      sessionStorage.setItem("bbot_onboarding", "new");
      router.push("/dashboard");
    } catch (err) {
      await logAction({ actionType: "LOGIN", result: "FAILURE" });
      setServerError(
        err instanceof ApiError ? err.body.message : "회원가입에 실패했습니다.",
      );
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          회원가입
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          모험단 이름과 서버를 입력하세요
        </p>

        <div className="space-y-1">
          <input
            {...register("adventureName")}
            placeholder="모험단 이름"
            autoFocus
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
          {errors.adventureName && (
            <p className="text-xs text-red-600">
              {errors.adventureName.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <select
            {...register("serverId")}
            defaultValue=""
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="" disabled>
              서버 선택
            </option>
            {SERVER_IDS.map((id) => (
              <option key={id} value={id}>
                {SERVER_LABELS[id]}
              </option>
            ))}
          </select>
          {errors.serverId && (
            <p className="text-xs text-red-600">{errors.serverId.message}</p>
          )}
        </div>

        {serverError && <p className="text-xs text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          로그인으로 돌아가기
        </button>
      </form>
    </main>
  );
}
