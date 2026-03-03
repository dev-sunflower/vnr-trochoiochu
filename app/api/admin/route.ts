import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ADMIN_STATE_FILE = path.join("/tmp", "admin-state.json");

function readAdminState() {
  try {
    if (fs.existsSync(ADMIN_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_STATE_FILE, "utf-8"));
    }
  } catch {}
  return { activeAdminToken: null, lastPingTime: 0 };
}

function writeAdminState(state: any) {
  try {
    fs.writeFileSync(ADMIN_STATE_FILE, JSON.stringify(state));
  } catch {}
}

const globalForAdmin = global as unknown as {
  activeAdminToken: string | null;
  lastPingTime: number;
};

// Initial sync from file if exists
if (globalForAdmin.activeAdminToken === undefined) {
  const persisted = readAdminState();
  globalForAdmin.activeAdminToken = persisted.activeAdminToken;
  globalForAdmin.lastPingTime = persisted.lastPingTime;
}

export async function POST(req: Request) {
  const body = await req.json();
  const now = Date.now();

  // Sync from file to catch updates from other instances
  const current = readAdminState();
  globalForAdmin.activeAdminToken = current.activeAdminToken;
  globalForAdmin.lastPingTime = current.lastPingTime;

  if (body.action === "login") {
    if (body.username === "admin" && body.password === "vnr202nhom3") {
      if (
        globalForAdmin.activeAdminToken &&
        now - globalForAdmin.lastPingTime < 10000
      ) {
        return NextResponse.json({
          success: false,
          error:
            "Đã có Quản trò khác đang điều khiển. Hãy thử lại sau 10 giây nếu người đó đã thoát!",
        });
      }
      globalForAdmin.activeAdminToken = Math.random().toString(36).substring(7);
      globalForAdmin.lastPingTime = now;

      writeAdminState({
        activeAdminToken: globalForAdmin.activeAdminToken,
        lastPingTime: globalForAdmin.lastPingTime,
      });

      return NextResponse.json({
        success: true,
        token: globalForAdmin.activeAdminToken,
      });
    }

    return NextResponse.json({
      success: false,
      error: "Sai tài khoản hoặc mật khẩu",
    });
  }

  if (body.action === "ping") {
    // If server state is empty OR the previous admin has timed out,
    // let this token take over the session.
    if (!globalForAdmin.activeAdminToken || now - globalForAdmin.lastPingTime > 10000) {
      globalForAdmin.activeAdminToken = body.token;
      globalForAdmin.lastPingTime = now;
      
      writeAdminState({
        activeAdminToken: globalForAdmin.activeAdminToken,
        lastPingTime: globalForAdmin.lastPingTime,
      });

      return NextResponse.json({ success: true });
    }

    if (body.token === globalForAdmin.activeAdminToken) {
      globalForAdmin.lastPingTime = now;
      
      writeAdminState({
        activeAdminToken: globalForAdmin.activeAdminToken,
        lastPingTime: globalForAdmin.lastPingTime
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      error: "Phiên đăng nhập không hợp lệ hoặc đã có Quản trò khác.",
    });
  }

  if (body.action === "logout") {
    if (body.token === globalForAdmin.activeAdminToken) {
      globalForAdmin.activeAdminToken = null;
      writeAdminState({ activeAdminToken: null, lastPingTime: 0 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Lệnh không hợp lệ" });
}
