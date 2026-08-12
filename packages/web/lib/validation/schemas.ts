import { z } from "zod";

// 6장: 공용 유효성 규칙
export const adventureNameSchema = z.string().refine((v) => {
  const weightedLength = [...v].reduce(
    (acc, ch) => acc + (/[가-힣]/.test(ch) ? 2 : 1),
    0,
  );
  return v.length >= 1 && weightedLength <= 16;
}, "모험단 이름은 한글 최대 8자 또는 영문 최대 16자입니다."); // [가정: 혼용 규칙]

export const scoreSchema = z.number().int().min(0);

export const characterFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  job: z.string().min(1, "직업을 입력해주세요."),
  role: z.enum(["DEALER", "BUFFER"]),
  score: scoreSchema,
});

export type CharacterFormSchema = z.infer<typeof characterFormSchema>;
