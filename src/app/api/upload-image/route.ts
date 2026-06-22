import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file harus JPG, PNG, atau WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 10MB" },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Auto-compress transformation: resize max 1200px, quality auto, format auto
    const transformation = "w_1200,c_limit,q_auto,f_auto";

    const timestamp = Math.round(Date.now() / 1000);
    const signatureStr = `folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureStr).digest("hex");

    // Upload to Cloudinary with auto-compress
    const uploadForm = new FormData();
    uploadForm.append("file", base64);
    uploadForm.append("folder", folder);
    uploadForm.append("timestamp", timestamp.toString());
    uploadForm.append("api_key", apiKey);
    uploadForm.append("signature", signature);
    uploadForm.append("transformation", transformation);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadForm }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error("Cloudinary upload error:", errBody);
      return NextResponse.json(
        { error: "Gagal upload gambar" },
        { status: 500 }
      );
    }

    const result = await uploadRes.json();

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error("Upload image error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat upload" },
      { status: 500 }
    );
  }
}
