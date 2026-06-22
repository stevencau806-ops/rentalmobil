import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR API key belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Convert file to base64 (OCR.space accepts base64 which avoids file upload issues)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // If file > 1MB, we need to compress it
    // OCR.space free tier limit is 1MB
    let base64Image: string;
    if (buffer.length > 900 * 1024) {
      // Compress by reducing quality - convert to JPEG base64
      // Use sharp-like approach with canvas isn't available on serverless
      // Instead, send as base64 with reduced size indicator
      // Actually, let's just send the raw base64 and set filetype
      base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    // Determine filetype
    let filetype = "JPG";
    if (file.type === "image/png") filetype = "PNG";
    else if (file.type === "image/webp") filetype = "WEBP";

    // Send to OCR.space API using base64
    const ocrForm = new URLSearchParams();
    ocrForm.append("base64Image", base64Image);
    ocrForm.append("language", "ind");
    ocrForm.append("isOverlayRequired", "false");
    ocrForm.append("OCREngine", "2");
    ocrForm.append("filetype", filetype);
    ocrForm.append("scale", "true"); // auto-scale for better accuracy
    ocrForm.append("isTable", "true"); // helps with structured docs like KTP

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: ocrForm.toString(),
    });

    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      console.error("OCR.space HTTP error:", ocrRes.status, errText);
      return NextResponse.json(
        { error: `OCR gagal (${ocrRes.status})` },
        { status: 500 }
      );
    }

    const ocrData = await ocrRes.json();
    console.log("OCR.space response:", JSON.stringify(ocrData).slice(0, 500));

    if (ocrData.IsErroredOnProcessing) {
      const errMsg = ocrData.ErrorMessage || ocrData.ErrorDetails || "Unknown error";
      console.error("OCR.space processing error:", errMsg);

      // If file too large, try with Engine 1 (more lenient)
      if (String(errMsg).includes("size") || String(errMsg).includes("limit")) {
        return NextResponse.json(
          { error: "Foto terlalu besar. Coba foto dengan ukuran lebih kecil (<1MB)." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Gagal memproses foto: ${errMsg}` },
        { status: 500 }
      );
    }

    const fullText = ocrData.ParsedResults?.[0]?.ParsedText || "";
    console.log("OCR text result:", fullText);

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "Tidak ada teks yang terdeteksi di foto" },
        { status: 400 }
      );
    }

    // Parse KTP data from OCR text
    const result = parseKtpText(fullText);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OCR KTP error:", msg);
    return NextResponse.json(
      { error: `Terjadi kesalahan: ${msg}` },
      { status: 500 }
    );
  }
}

function parseKtpText(text: string): { nik: string; nama: string; alamat: string } {
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  console.log("Parsed lines:", lines);

  // Extract NIK (16 digits)
  let nik = "";
  for (const line of lines) {
    // Direct 16-digit match
    const nikMatch = line.match(/(\d{16})/);
    if (nikMatch) {
      nik = nikMatch[1];
      break;
    }
    // Digits with spaces/dots: "3211 0824 0398 0001"
    const cleaned = line.replace(/[\s.\-]/g, "");
    const digitsOnly = cleaned.replace(/[^0-9]/g, "");
    if (digitsOnly.length >= 16 && /NIK|^\d/.test(line)) {
      nik = digitsOnly.slice(0, 16);
      break;
    }
  }

  // Extract Nama
  let nama = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // "Nama : SURYA" or "Nama: SURYA" or "Nama :SURYA"
    const namaMatch = line.match(/Nama\s*[:\-]\s*(.+)/i);
    if (namaMatch && !/tempat|lahir/i.test(namaMatch[1])) {
      nama = namaMatch[1].trim();
      break;
    }
  }

  // Clean nama
  nama = nama.replace(/[^A-Za-z\s.',-]/g, "").replace(/\s+/g, " ").trim();

  // Extract Alamat
  let alamat = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const alamatMatch = line.match(/Alamat\s*[:\-]\s*(.+)/i);
    if (alamatMatch) {
      alamat = alamatMatch[1].trim();
      // Check if next line continues address (not a label)
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (!/^(RT|Kel|Kec|Agama|Status|Pekerjaan|Kewarganegaraan)/i.test(next)) {
          alamat += " " + next.trim();
        }
      }
      break;
    }
  }

  return { nik, nama, alamat };
}
