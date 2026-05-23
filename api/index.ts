import { app } from "../server/src/app";

type QueryValue = string | string[] | undefined;

function first(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function handler(req: any, res: any) {
  const path = first(req.query?.path);

  if (typeof path === "string" && path.length > 0) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query ?? {})) {
      if (key === "path" || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          query.append(key, String(item));
        }
      } else {
        query.append(key, String(value));
      }
    }

    const qs = query.toString();
    req.url = `/api/${path}${qs ? `?${qs}` : ""}`;
  } else {
    req.url = "/api";
  }

  return app(req, res);
}
