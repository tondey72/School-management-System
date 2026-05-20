import net from "node:net";

const maxAttempts = Number(process.env.DEPS_WAIT_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DEPS_WAIT_DELAY_MS ?? 2000);

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://sms_user:sms_password@postgres:5432/sms?schema=public";
const redisUrl = process.env.REDIS_URL ?? "redis://redis:6379";

function parseHostPort(urlValue: string, fallbackPort: number): { host: string; port: number } {
  const parsed = new URL(urlValue);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || fallbackPort)
  };
}

function tcpCheck(host: string, port: number, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    const onError = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      reject(new Error(`Connection timeout: ${host}:${port}`));
    });

    socket.once("error", onError);
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDependencies(): Promise<void> {
  const db = parseHostPort(databaseUrl, 5432);
  const redis = parseHostPort(redisUrl, 6379);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await tcpCheck(db.host, db.port);
      await tcpCheck(redis.host, redis.port);

      // eslint-disable-next-line no-console
      console.log("Dependencies are ready (Postgres and Redis).");
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Waiting for dependencies... attempt ${attempt}/${maxAttempts}`);
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
}

waitForDependencies()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Dependency readiness check failed:", error);
    process.exit(1);
  });
