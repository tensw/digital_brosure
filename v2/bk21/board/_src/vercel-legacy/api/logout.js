export const config = { runtime: 'edge' };
export default async function handler() {
  const h = new Headers({ 'content-type': 'application/json' });
  h.append('set-cookie', 'bk21_s=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  h.append('set-cookie', 'bk21_u=; Path=/; Secure; SameSite=Lax; Max-Age=0');
  return new Response(JSON.stringify({ ok:true }), { status:200, headers:h });
}
