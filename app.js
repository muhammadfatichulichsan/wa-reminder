const axios = require("axios");
const moment = require("moment-timezone");

const csvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSR5z3TdydX6DojM-howYBJ1-r_A48qO_rwpk6QLe0rbT6gv_5acHaTZ0GvrGfFiynRYJVcW-HefI4o/pub?gid=405497208&single=true&output=csv";

const BASECAMP_LINK = "https://share.google/JFRiVdpLkND3JGv9k";

// =======================
// AMBIL DATA SPREADSHEET
// =======================
async function fetchSheet() {
  const res = await axios.get(csvUrl);
  const rows = res.data.split("\n").slice(1); // Skip header
  return rows.map((r) => r.split(","));
}

// =======================
// TEMPLATE PESAN WHATSAPP
// =======================
function buildMessage(name, paket, peserta) {
  return `
Halo *${name}*, ini pengingat kegiatan *Canyoning* untuk besok.

🕗 *Jam Kumpul:* 08:00 pagi
👥 *Jumlah Peserta:* ${peserta}
🎫 *Paket:* ${paket}

🎒 *Perlengkapan Wajib:*
- Baju ganti
- Sepatu/Sandal anti slip
- Obat pribadi

📍 *Lokasi Basecamp:* ${BASECAMP_LINK}

Sampai jumpa besok! 🙌
`.trim();
}

// =======================
// PARSE TANGGAL INDONESIA → DD/MM/YYYY
// =======================
function parseTanggalIndo(tanggal) {
  const bulanIndo = {
    januari: "01",
    februari: "02",
    maret: "03",
    april: "04",
    mei: "05",
    juni: "06",
    juli: "07",
    agustus: "08",
    september: "09",
    oktober: "10",
    november: "11",
    desember: "12",
  };

  tanggal = tanggal.trim().toLowerCase(); // contoh: "2 desember 2025"
  const [tgl, bln, thn] = tanggal.split(" ");
  return `${tgl.padStart(2, "0")}/${bulanIndo[bln]}/${thn}`;
}

// =======================
// KIRIM WHATSAPP VIA FONNTE
// =======================
async function sendWA(phone, message) {
  try {
    const res = await axios.post(
      "https://api.fonnte.com/send",
      {
        target: phone,
        message: message,
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN,
        },
      }
    );
    console.log("✔️ WA terkirim ke:", phone);
  } catch (e) {
    console.log("❌ Gagal kirim ke:", phone, e.response?.data || e.message);
  }
}

// =======================
// MAIN PROCESS
// =======================
(async () => {
  console.log("🚀 Reminder berjalan...");

  const rows = await fetchSheet();
  const today = moment().tz("Asia/Jakarta").startOf("day");

  for (const row of rows) {
    const tanggalFormatted = parseTanggalIndo(row[1]);
    const tanggalTrip = moment(tanggalFormatted, "DD/MM/YYYY").tz("Asia/Jakarta");

    const paket = row[2];
    const name = row[3];
    const phone = row[4];
    const peserta = row[5];

    if (!phone) continue;

    const selisih = tanggalTrip.diff(today, "days");

    // Kirim hanya H-1
    if (selisih !== 1) continue;

    const msg = buildMessage(name, paket, peserta);

    await sendWA(phone, msg);
    console.log("============================================");
  }

  console.log("🎯 Selesai memproses reminder hari ini.");
})();
