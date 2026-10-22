import { responseSecurity, runtimeEvent } from "../lib/outsea/runtime";
import { demoEnabled, demoRequestAllowed } from "../lib/outsea/demo";
import { handle, backgroundDrain } from "../lib/outsea/server";
import handler from "vinext/server/fetch-handler";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const configuredOrigin = (env as Cloudflare.Env & { PUBLIC_ORIGIN?: string }).PUBLIC_ORIGIN;
    if (configuredOrigin && new URL(request.url).origin !== configuredOrigin) {
      return new Response("Unexpected service origin", { status: 403 });
    }
    if (demoEnabled() && !demoRequestAllowed(request)) {
      return new Response("Local demo accepts loopback requests only", { status: 403 });
    }
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const response = await handle(request);
      if (response.ok && request.method === "POST" && /\/api\/jobs(?:$|\/[^/]+\/retry$)/.test(url.pathname)) {
        ctx.waitUntil(
          backgroundDrain().catch(() => runtimeEvent("background_drain", "后台任务推进失败，请检查服务日志")),
        );
      }
      return responseSecurity(response, request);
    }
    return responseSecurity(await handler.fetch(request, env, ctx), request);
  },
};
