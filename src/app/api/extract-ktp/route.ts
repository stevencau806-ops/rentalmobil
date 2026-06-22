import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const apiKey = process.env.API_CO_ID_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key api.co.id belum dikonfigurasi" },
        { status: 500 }
      );
    }

    // Forward file to api.co.id KTP extractor
    const extractForm = new FormData();
    extractForm.append("file", file);

    const extractRes = await fetch("https://use.api.co.id/ocr/ktp-extract", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "x-api-co-id": apiKey,
      },
      body: extractForm,
    });

    const responseText = await extractRes.text();
    console.log("api.co.id response status:", extractRes.status);
    console.log("api.co.id response body:", responseText);

    if (!extractRes.ok) {
      return NextResponse.json(
        { 
          error: `Gagal extract data KTP (${extractRes.status}). Silakan isi data manual.`,
          detail: responseText 
        },
        { status: 500 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Response dari API tidak valid. Silakan isi data manual." },
        { status: 500 }
      );
    }

    // Normalize response - handle various response structures
    const extracted = result.data || result.result || result;

    return NextResponse.json({
      nik: extracted.nik || extracted.NIK || "",
      nama: extracted.nama || extracted.name || extracted.Nama || "",
      tempat_lahir: extracted.tempat_lahir || extracted.birthplace || extracted.tempatLahir || "",
      tanggal_lahir: extracted.tanggal_lahir || extracted.birthdate || extracted.tanggalLahir || "",
      jenis_kelamin: extracted.jenis_kelamin || extracted.gender || extracted.jenisKelamin || "",
      alamat: extracted.alamat || extracted.address || extracted.Alamat || "",
      rt_rw: extracted.rt_rw || extracted.rtRw || extracted.RT_RW || "",
      kelurahan: extracted.kelurahan || extracted.village || extracted.kelDesa || "",
      kecamatan: extracted.kecamatan || extracted.district || extracted.Kecamatan || "",
      agama: extracted.agama || extracted.religion || extracted.Agama || "",
      status_perkawinan: extracted.status_perkawinan || extracted.marital_status || extracted.statusPerkawinan || "",
      pekerjaan: extracted.pekerjaan || extracted.occupation || extracted.Pekerjaan || "",
      kewarganegaraan: extracted.kewarganegaraan || extracted.nationality || extracted.Kewarganegaraan || "",
    });
  } catch (err) {
    console.error("Extract KTP error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat extract data KTP. Silakan isi data manual." },
      { status: 500 }
    );
  }
}
