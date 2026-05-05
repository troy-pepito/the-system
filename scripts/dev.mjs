// Wrapper for `next dev`. Bumps the Node heap before Next starts so a
// transient file-watch hiccup (e.g. OneDrive reshuffling files mid-edit
// on Troy's machine) doesn't cascade into a worker-respawn loop that
// burns through memory and kills the dev server.
//
// 8 GB is overkill for steady-state dev — Next typically uses 1–2 GB —
// but the headroom prevents the cliff where a struggling Turbopack
// worker fails to allocate, gets respawned, and the new worker fails
// for the same reason on a tighter system.
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim(),
};

// Pass the command as a single shell string (instead of cmd + args
// array) so Node doesn't fire DEP0190. shell:true is required on
// Windows to execute the .cmd shim that pnpm/npm installs into
// node_modules/.bin/next.
const child = spawn("next dev", {
  env,
  stdio: "inherit",
  shell: true,
});

// On Windows, shell:true wraps the child in cmd.exe and signals don't
// propagate through it reliably — the wrapper exits but `next dev`
// stays alive as an orphan, holding port 3000 and refusing the next
// `pnpm dev`. Use taskkill /T to nuke the whole tree by PID. On other
// platforms, signal-forwarding is enough.
if (process.platform === "win32") {
  const killTree = () => {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  };
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, killTree);
  }
} else {
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => child.kill(sig));
  }
}

child.on("exit", (code) => process.exit(code ?? 0));
