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

    const extractRes = await fetch("https://api.co.id/v1/ktp-extractor", {
      method: "POST",
      headers: {
        "x-api-co-id": apiKey,
      },
      body: extractForm,
    });

    if (!extractRes.ok) {
      const errText = await extractRes.text();
      console.error("api.co.id extract error:", extractRes.status, errText);
      return NextResponse.json(
        { error: "Gagal extract data KTP. Pastikan foto jelas dan tidak buram." },
        { status: 500 }
      );
    }

    const result = await extractRes.json();

    // Normalize response - api.co.id may return data in different structures
    const extracted = result.data || result;

    return NextResponse.json({
      nik: extracted.nik || "",
      nama: extracted.nama || extracted.name || "",
      tempat_lahir: extracted.tempat_lahir || extracted.birthplace || "",
      tanggal_lahir: extracted.tanggal_lahir || extracted.birthdate || "",
      jenis_kelamin: extracted.jenis_kelamin || extracted.gender || "",
      alamat: extracted.alamat || extracted.address || "",
      rt_rw: extracted.rt_rw || "",
      kelurahan: extracted.kelurahan || extracted.village || "",
      kecamatan: extracted.kecamatan || extracted.district || "",
      agama: extracted.agama || extracted.religion || "",
      status_perkawinan: extracted.status_perkawinan || extracted.marital_status || "",
      pekerjaan: extracted.pekerjaan || extracted.occupation || "",
      kewarganegaraan: extracted.kewarganegaraan || extracted.nationality || "",
    });
  } catch (err) {
    console.error("Extract KTP error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat extract data KTP" },
      { status: 500 }
    );
  }
}
