let appPromise;

function first(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function getApp() {
  if (!appPromise) {
    appPromise = import("../server/src/app.js").then((mod) => mod.app);
  }

  return appPromise;
}

module.exports = async function handler(req, res) {
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

  const app = await getApp();
  return app(req, res);
};
