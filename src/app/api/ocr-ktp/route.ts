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

    // Send to OCR.space API
    const ocrForm = new FormData();
    ocrForm.append("file", file);
    ocrForm.append("language", "ind"); // Indonesian
    ocrForm.append("isOverlayRequired", "false");
    ocrForm.append("OCREngine", "2"); // Engine 2 lebih akurat untuk dokumen

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: ocrForm,
    });

    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      console.error("OCR.space error:", ocrRes.status, errText);
      return NextResponse.json(
        { error: "Gagal membaca teks dari foto KTP" },
        { status: 500 }
      );
    }

    const ocrData = await ocrRes.json();

    if (ocrData.IsErroredOnProcessing) {
      console.error("OCR.space processing error:", ocrData.ErrorMessage);
      return NextResponse.json(
        { error: "Gagal memproses foto KTP" },
        { status: 500 }
      );
    }

    const fullText = ocrData.ParsedResults?.[0]?.ParsedText || "";
    console.log("OCR.space text:", fullText);

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
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract NIK (16 digits)
  let nik = "";
  for (const line of lines) {
    const nikMatch = line.match(/(\d{16})/);
    if (nikMatch) {
      nik = nikMatch[1];
      break;
    }
    // Sometimes digits have spaces or dots
    const digits = line.replace(/[^0-9]/g, "");
    if (digits.length === 16 && /NIK|^\d/.test(line)) {
      nik = digits;
      break;
    }
  }

  // Extract Nama
  let nama = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Pattern: "Nama : SURYA" or "Nama: SURYA"
    const namaMatch = line.match(/^Nama\s*[:\-]\s*(.+)/i);
    if (namaMatch) {
      nama = namaMatch[1].trim();
      break;
    }
    // Pattern: line is just "Nama" and next line is value
    if (/^Nama$/i.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (!/^(Tempat|NIK|Alamat|Jenis|Agama|Status|Pekerjaan)/i.test(nextLine)) {
        nama = nextLine.replace(/^[:\-]\s*/, "").trim();
        break;
      }
    }
  }

  // Clean nama - remove non-alpha chars
  if (nama && /tempat|lahir|kelamin/i.test(nama)) {
    nama = "";
  }

  // Extract Alamat
  let alamat = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const alamatMatch = line.match(/^Alamat\s*[:\-]\s*(.+)/i);
    if (alamatMatch) {
      alamat = alamatMatch[1].trim();
      break;
    }
    if (/^Alamat$/i.test(line) && i + 1 < lines.length) {
      alamat = lines[i + 1].replace(/^[:\-]\s*/, "").trim();
      break;
    }
  }

  return { nik, nama, alamat };
}
