import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_VISION_API_KEY is not set");
      return NextResponse.json(
        { error: "Google Cloud Vision API key belum dikonfigurasi" },
        { status: 500 }
      );
    }

    console.log("Vision API key exists, length:", apiKey.length);

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    console.log("Image base64 length:", base64.length);

    // Call Google Cloud Vision API
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    console.log("Calling Vision API...");

    const visionRes = await fetch(visionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error("Google Vision error status:", visionRes.status);
      console.error("Google Vision error body:", errText);
      return NextResponse.json(
        { error: `Gagal membaca teks dari foto KTP (${visionRes.status})`, detail: errText },
        { status: 500 }
      );
    }

    const visionData = await visionRes.json();
    console.log("Vision API success, annotations count:", visionData.responses?.[0]?.textAnnotations?.length || 0);
    const annotations = visionData.responses?.[0]?.textAnnotations;

    if (!annotations || annotations.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada teks yang terdeteksi di foto" },
        { status: 400 }
      );
    }

    // Full text from the image
    const fullText = annotations[0].description || "";
    console.log("Vision OCR text:", fullText);

    // Parse KTP data from text
    const result = parseKtpText(fullText);

    return NextResponse.json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("OCR KTP error:", errorMessage);
    return NextResponse.json(
      { error: `Terjadi kesalahan: ${errorMessage}` },
      { status: 500 }
    );
  }
}

function parseKtpText(text: string): { nik: string; nama: string; alamat: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract NIK (16 digits)
  let nik = "";
  for (const line of lines) {
    // Look for line with NIK label or just 16 digits
    const nikMatch = line.match(/(\d{16})/);
    if (nikMatch) {
      nik = nikMatch[1];
      break;
    }
    // Sometimes digits have spaces: "3211 0824 0398 0001"
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
    // Pattern: line starts with "Nama" and value is on same line after colon
    if (/^Nama$/i.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Next line should be the name (not another label)
      if (!/^(Tempat|NIK|Alamat|Jenis|Agama|Status|Pekerjaan)/i.test(nextLine)) {
        nama = nextLine.replace(/^[:\-]\s*/, "").trim();
        break;
      }
    }
  }

  // If nama contains "Tempat" or "Lahir", it picked up wrong line
  if (/tempat|lahir|kelamin/i.test(nama)) {
    nama = "";
  }

  // Extract Alamat
  let alamat = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const alamatMatch = line.match(/^Alamat\s*[:\-]\s*(.+)/i);
    if (alamatMatch) {
      alamat = alamatMatch[1].trim();
      // Sometimes address continues on next line
      if (i + 1 < lines.length && !/^(RT|Kel|Kec|Agama|Status|Pekerjaan)/i.test(lines[i + 1])) {
        alamat += " " + lines[i + 1].trim();
      }
      break;
    }
    if (/^Alamat$/i.test(line) && i + 1 < lines.length) {
      alamat = lines[i + 1].replace(/^[:\-]\s*/, "").trim();
      break;
    }
  }

  return { nik, nama, alamat };
}
