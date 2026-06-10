import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/client"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const CustomerFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Họ và tên phải có ít nhất 2 ký tự")
    .max(100, "Họ và tên không được vượt quá 100 ký tự"),
  email: z.email("Email không hợp lệ"),
  phoneNumber: z
    .string()
    .min(10, "Số điện thoại phải có ít nhất 10 ký tự")
    .max(20, "Số điện thoại không được vượt quá 20 ký tự"),
  serviceName: z
    .string()
    .min(1, "Vui lòng chọn dịch vụ")
    .max(200, "Tên dịch vụ không được vượt quá 200 ký tự"),
})

async function sendTelegramNotification(
  fullName: string,
  email: string,
  phoneNumber: string,
  serviceName: string
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
    return
  }

  const text = [
    "📩 *Yêu cầu tư vấn mới*",
    "",
    `👤 *Họ và tên:* ${fullName}`,
    `📧 *Email:* ${email}`,
    `📞 *Số điện thoại:* ${phoneNumber}`,
    `🛠️ *Dịch vụ:* ${serviceName}`,
    "",
    `⏰ Thời gian: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`,
  ].join("\n")

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    })
  } catch (error) {
    console.error("[Telegram] Failed to send notification:", error)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = CustomerFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { fullName, email, phoneNumber, serviceName } = parsed.data

    await addDoc(collection(db, "customers"), {
      fullName,
      email,
      phoneNumber,
      serviceName,
      createdAt: serverTimestamp(),
    })

    await sendTelegramNotification(fullName, email, phoneNumber, serviceName)

    return NextResponse.json(
      {
        success: true,
        message: "Gửi thông tin thành công! Chúng tôi sẽ liên hệ bạn sớm nhất.",
      },
      { status: 201, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error("[Customers API Error]", error)

    return NextResponse.json(
      {
        success: false,
        message: "Đã xảy ra lỗi khi gửi thông tin. Vui lòng thử lại.",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
