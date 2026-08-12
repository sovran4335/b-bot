// middleware.ts가 "/"를 /login 또는 /dashboard로 항상 리다이렉트하므로 이 페이지는 렌더되지 않는다.
export default function Home() {
  return null;
}
