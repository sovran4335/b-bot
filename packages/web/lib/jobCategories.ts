export interface JobCategory {
  jobId: string;
  jobName: string;
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    jobId: "41f1cdc2ff58bb5fdc287be0db2a8df3",
    jobName: "귀검사(남)",
  },
  {
    jobId: "a7a059ebe9e6054c0644b40ef316d6e9",
    jobName: "격투가(여)",
  },
  {
    jobId: "afdf3b989339de478e85b614d274d1ef",
    jobName: "거너(남)",
  },
  {
    jobId: "3909d0b188e9c95311399f776e331da5",
    jobName: "마법사(여)",
  },
  {
    jobId: "f6a4ad30555b99b499c07835f87ce522",
    jobName: "프리스트(남)",
  },
  {
    jobId: "944b9aab492c15a8474f96947ceeb9e4",
    jobName: "거너(여)",
  },
  {
    jobId: "ddc49e9ad1ff72a00b53c6cff5b1e920",
    jobName: "도적",
  },
  {
    jobId: "ca0f0e0e9e1d55b5f9955b03d9dd213c",
    jobName: "격투가(남)",
  },
  {
    jobId: "a5ccbaf5538981c6ef99b236c0a60b73",
    jobName: "마법사(남)",
  },
  {
    jobId: "17e417b31686389eebff6d754c3401ea",
    jobName: "다크나이트",
  },
  {
    jobId: "b522a95d819a5559b775deb9a490e49a",
    jobName: "크리에이터",
  },
  {
    jobId: "1645c45aabb008c98406b3a16447040d",
    jobName: "귀검사(여)",  
  },
  {
    jobId: "0ee8fa5dc525c1a1f23fc6911e921e4a",
    jobName: "나이트",
  },
  {
    jobId: "3deb7be5f01953ac8b1ecaa1e25e0420",
    jobName: "마창사",
  },
  {
    jobId: "0c1b401bb09241570d364420b3ba3fd7",
    jobName: "프리스트(여)",
  },
  {
    jobId: "986c2b3d72ee0e4a0b7fcfbe786d4e02",
    jobName: "총검사",
  },
  {
    jobId: "b9cb48777665de22c006fabaf9a560b3",
    jobName: "아처",
  },
  {
    jobId: "8d4d2001cdb357e41633c234eb7501b5",
    jobName: "제국기사",
  },
] as const;

// jobId 리터럴 유니언 — JOB_CATEGORIES에서 자동 유도, 따로 손으로 안 맞춰도 됨
export type JobId = (typeof JOB_CATEGORIES)[number]["jobId"];
