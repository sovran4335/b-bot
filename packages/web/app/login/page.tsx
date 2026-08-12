"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { adventureNameSchema } from "../../lib/validation/schemas";
import { login } from "../../lib/api/auth";
import { ApiError } from "../../lib/api/client";
import { logAction } from "../../lib/logging/logAction";

const loginFormSchema = z.object({ adventureName: adventureNameSchema });
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = async ({ adventureName }: LoginFormValues) => {
    setServerError(null);
    try {
      const { isNewUser } = await login(adventureName);
      await logAction({ actionType: "LOGIN", result: "SUCCESS" });
      sessionStorage.setItem(
        "bbot_onboarding",
        isNewUser ? "new" : "returning",
      );
      router.push("/dashboard");
    } catch (err) {
      await logAction({ actionType: "LOGIN", result: "FAILURE" });
      setServerError(
        err instanceof ApiError ? err.body.message : "로그인에 실패했습니다.",
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
          공대표 로그인
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          모험단 이름만 입력하면 됩니다.
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

        {serverError && <p className="text-xs text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isSubmitting ? "로그인 중..." : "로그인 / 가입"}
        </button>
      </form>
    </main>
  );
}
