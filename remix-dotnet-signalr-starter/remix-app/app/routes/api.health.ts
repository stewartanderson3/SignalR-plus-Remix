import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // This will get proxied to .NET if you prefer, but here it's a Remix route example
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" }
  });
}
