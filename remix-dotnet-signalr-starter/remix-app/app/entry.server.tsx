import { PassThrough } from "node:stream";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext
) {
  const callbackName = isbot(request.headers.get("user-agent") || "")
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    const didAbort = new AbortController();

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(body as any, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError: reject,
        onError(error: unknown) {
          console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
    request.signal.addEventListener("abort", () => {
      didAbort.abort();
      abort();
    });
  });
}
