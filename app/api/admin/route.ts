import { NextResponse } from "next/server";

const globalForAdmin = global as unknown as {
  activeAdminToken: string | null;
  lastPingTime: number;
};

if (globalForAdmin.activeAdminToken === undefined) {
  globalForAdmin.activeAdminToken = null;
  globalForAdmin.lastPingTime = 0;
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === "login") {
    if (body.username === "admin" && body.password === "vnr202nhom3") {
      const now = Date.now();

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
      globalForAdmin.lastPingTime = Date.now();

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
    if (body.token === globalForAdmin.activeAdminToken) {
      globalForAdmin.lastPingTime = Date.now();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({
      success: false,
      error: "Phiên đăng nhập không hợp lệ",
    });
  }

  if (body.action === "logout") {
    if (body.token === globalForAdmin.activeAdminToken) {
      globalForAdmin.activeAdminToken = null;
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Lệnh không hợp lệ" });
}
