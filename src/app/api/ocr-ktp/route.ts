import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageUrl = body.url as string | undefined;

    if (!imageUrl) {
      return NextResponse.json({ error: "URL gambar tidak ditemukan" }, { status: 400 });
    }

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR API key belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Transform Cloudinary URL to get compressed version (max width 1200px, quality 80, <1MB)
    const compressedUrl = getCompressedCloudinaryUrl(imageUrl);
    console.log("OCR using URL:", compressedUrl);

    // Send compressed URL to OCR.space
    const ocrForm = new URLSearchParams();
    ocrForm.append("url", compressedUrl);
    ocrForm.append("language", "eng");
    ocrForm.append("isOverlayRequired", "false");
    ocrForm.append("OCREngine", "2");
    ocrForm.append("scale", "true");
    ocrForm.append("isTable", "true");

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

/**
 * Transform Cloudinary URL to add compression:
 * - Resize to max 1200px width
 * - Quality 80
 * - Format JPEG (smaller)
 * 
 * Input:  https://res.cloudinary.com/xxx/image/upload/v123/ktp/abc.jpg
 * Output: https://res.cloudinary.com/xxx/image/upload/w_1200,q_80,f_jpg/v123/ktp/abc.jpg
 */
function getCompressedCloudinaryUrl(url: string): string {
  // Cloudinary URL pattern: .../image/upload/[optional_transforms/]v1234/folder/file.ext
  const uploadIndex = url.indexOf("/image/upload/");
  if (uploadIndex === -1) return url; // Not a Cloudinary URL, return as-is

  const base = url.slice(0, uploadIndex + "/image/upload/".length);
  const rest = url.slice(uploadIndex + "/image/upload/".length);

  // Add transforms: resize + quality + format
  return `${base}w_1200,q_80,f_jpg/${rest}`;
}

function parseKtpText(text: string): { nik: string; nama: string; alamat: string } {
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  console.log("Parsed lines:", lines);

  // Extract NIK (16 digits)
  let nik = "";
  for (const line of lines) {
    const nikMatch = line.match(/(\d{16})/);
    if (nikMatch) {
      nik = nikMatch[1];
      break;
    }
    // Digits with spaces/dots
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
    const namaMatch = line.match(/Nama\s*[:\-]\s*(.+)/i);
    if (namaMatch && !/tempat|lahir/i.test(namaMatch[1])) {
      nama = namaMatch[1].trim();
      break;
    }
  }

  // Clean nama
  nama = nama.replace(/[^A-Za-z\s.',-]/g, "").replace(/\s+/g, " ").trim();

  // Extract Alamat - gabungkan dengan RT/RW, Kel, Kec
  let alamat = "";
  let rtRw = "";
  let kelDesa = "";
  let kecamatan = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Alamat
    const alamatMatch = line.match(/Alamat\s*[:\-]\s*(.+)/i);
    if (alamatMatch && !alamat) {
      alamat = alamatMatch[1].trim();
      // Check if next line continues address (not a label)
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (!/^(RT|Kel|Kec|Agama|Status|Pekerjaan|Kewarganegaraan)/i.test(next)) {
          alamat += " " + next.trim();
        }
      }
    }

    // RT/RW
    const rtMatch = line.match(/RT\s*[\/\\]\s*RW\s*[:\-]?\s*(.+)/i);
    if (rtMatch) rtRw = rtMatch[1].trim();

    // Kel/Desa
    const kelMatch = line.match(/Kel\s*[\/\\]?\s*Desa\s*[:\-]?\s*(.+)/i);
    if (kelMatch) kelDesa = kelMatch[1].trim();

    // Kecamatan
    const kecMatch = line.match(/Kecamatan\s*[:\-]?\s*(.+)/i);
    if (kecMatch) kecamatan = kecMatch[1].trim();
  }

  // Build full address
  const addressParts: string[] = [];
  if (alamat) addressParts.push(alamat);
  if (rtRw) addressParts.push(`RT/RW ${rtRw}`);
  if (kelDesa) addressParts.push(`Kel. ${kelDesa}`);
  if (kecamatan) addressParts.push(`Kec. ${kecamatan}`);

  const fullAddress = addressParts.join(", ");

  return { nik, nama, alamat: fullAddress };
}
