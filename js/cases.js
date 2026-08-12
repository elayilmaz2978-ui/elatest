// ============================================================
// DAVA DOSYASI — VERİ KATMANI
// Bu dosya yalnızca veri tutar. Oyun mantığı bu dosyayı okur.
//
// Bir vakanın şeması:
//   id, title, story                 → tanım + olay anlatımı
//   scene.summary                    → olay yeri kısa tarif
//   scene.objects                    → sahne illüstrasyonu: SVG çizilecek nesne listesi
//      {kind, x, y, w, h, fill, label?}
//   scene.evidence                   → olay yerinde toplanan kanıtlar {name, desc}
//   csi                              → Olay Yeri İnceleme Raporu
//   autopsy                          → Otopsi: dış/iç muayene
//   autopsy.injuries.external        → dış yüzey bulguları {x,y,label,kind}
//   autopsy.injuries.internal        → iskelet/iç organ bulguları {x,y,label,kind}
//   interrogation                    → POLİSİN YAPTIĞI sorgu tutanağı
//      {speaker, text, clue?, subject} → clue: ipucu saklayan satır; subject: o an sorgulanan şüphelinin id'si
//   deathCauses + deathCauseCorrect  → ölüm nedeni seçenekleri
//   suspects                         → şüpheliler {id, name, initial, note}
//   culprit                          → doğru suçlu id'si
//   solution                         → açıklama
// ============================================================

const CASES = [
  {
    id: 1,
    title: "Perşembe Gecesi Kütüphane Vakası",
    story: "25 Ekim Perşembe gecesi 22:40 sıralarında, belediye arşiv kütüphanesinde "
      + "kütüphaneci Arda Yalın (54), çalışma masasında, başı öne düşmüş halde bulundu. "
      + "Odaya ilk giren gece bekçisi Kaan Yurt, Arda'nın vücuduna dokunmadı ve durumu 112'ye "
      + "bildirdi. Kapı içeriden kilitliydi; anahtar da yalnızca Arda'da bulundu. "
      + "Arda'nın son iki haftadır uykusuzluğu, dalgınlığı ve 'kâbuslar gördüğünü' söylediği "
      + "biliniyor. Masasında yarım bardak çay, pencere denizliklerinin altında bir parça nemli "
      + "kıyı toprağı ve çekmecede kilitli bir kutu duruyordu. Kutunun içi boştu.",
    scene: {
      summary: "Kütüphane 6x5 m, pencereler kuzey cephede. Ceset, çalışma masasının "
        + "arkasındaki koltukta oturur durumda. Masanın üstünde yarım bardak çay, altında "
        + "spor ayakkabı çamuru, arka pencerenin önünde devrilmiş bir sandalye var.",
      objects: [
        { kind: "rect", x: 6, y: 8, w: 88, h: 3.5, fill: "#8a6d3b", label: "Kuzey cephe (pencere denizliği)" },
        { kind: "rect", x: 20, y: 44, w: 42, h: 3.5, fill: "#6b4f30", label: "Çalışma masası" },
        { kind: "ellipse", x: 46, y: 32, w: 9, h: 9, fill: "#5f1414", label: "Arda (oturur halde)" },
        { kind: "circle", x: 24, y: 40, w: 4, fill: "#a0712f", label: "Yarım bardak çay" },
        { kind: "circle", x: 14, y: 62, w: 5, fill: "#8a6d3b", label: "Çamur izleri", label2: "spor ayakkabı" },
        { kind: "rect", x: 66, y: 20, w: 10, h: 8, fill: "#7a6142", label: "Boş kilitli kutu" },
        { kind: "rect", x: 52, y: 66, w: 7, h: 8, fill: "#6b4f30", label: "Devrik sandalye" }
      ],
      // 3D gezinti: metre cinsinden ölçülü yerleşim.
      // Kütüphane 6x5 m (scene.summary). Kuzey duvarı z=0, güney kapı z=5.
      modelSpace: { width: 6, depth: 5, wallH: 3.2, enclosed: true,
        camStart: { x: 3, y: 3.0, z: 4.3, pitch: -0.52 } },
      model3d: [
        { kind: "box", x: 3,   y: 1,   z: 0.03, w: 3.6,   h: 1.8,   d: 0.06, color: "#9fb6c2", name: "Kuzey pencere",   note: "Denizlikte nemli çamur; pencere çilesi gevşek." },
        { kind: "box", x: 3,   y: 0,   z: 0.9,  w: 1.2,   h: 0.12,  d: 1.4,  color: "#8a6d3b", name: "Çamur izleri",    note: "Kıyıya özgü kil; 42 numara spor ayakkabı." },
        { kind: "box", x: 4.9, y: 0,   z: 1.2,  w: 0.55,  h: 0.45,  d: 1.15, color: "#6b4f30", name: "Devrik sandalye",  note: "Kuzey penceresinin önünde devrilmiş." },
        { kind: "box", x: 0.25, y: 0,  z: 2.5,  w: 0.4,   h: 2.6,   d: 0.9,  color: "#8a7a5c", name: "Kitaplık",         note: "Belediye arşivi; raflar tozlu ama son sıra temiz." },
        { kind: "box", x: 2.9, y: 0,   z: 3.2,  w: 1.6,   h: 0.75,  d: 0.8,  color: "#6b4f30", name: "Çalışma masası",   note: "Üzerinde yarım bardak çay; çekmecede boş kilitli kutu." },
        { kind: "box", x: 3.6, y: 0,   z: 3.2,  w: 0.5,   h: 1.15,  d: 0.5,  color: "#5f1414", name: "Arda (ceset)",      note: "Masada başı öne düşmüş, gözleri açık oturuyor." },
        { kind: "box", x: 2.4, y: 0.75, z: 3.35, w: 0.09, h: 0.09,  d: 0.09, color: "#a0712f", name: "Yarım bardak çay",  note: "Dibinde çökmüş acı-buruş toz tabakası; 50 ml numune." },
        { kind: "box", x: 3,   y: 0,   z: 4.98, w: 1.1,   h: 2.1,   d: 0.05, color: "#4a4034", name: "Güney kapı",       note: "İçeriden kilitli; anahtar yalnızca Arda'da bulundu." },
        { kind: "box", x: 3,   y: 3.05, z: 2.5, w: 0.12,  h: 0.12,  d: 0.12, color: "#ffc36b", name: "Tavan lambası",    note: "Tek sıcak ışık kaynağı; açık." }
      ],
      evidence: [
        { name: "Yarım bardak çay", desc: "Dibinde çökmüş, hafif acı-buruş bir toz tabakası; sıvı saklandı." },
        { name: "Spor ayakkabı çamuru", desc: "42 numara spor ayakkabı; toprak analizi kıyı bölgesine özgü kil." },
        { name: "Boş kilitli kutu", desc: "İçi titizlikle boşaltılmış, parmak izi yok." },
        { name: "Arka pencere", desc: "Pencere çilesi gevşek; önünde devrik sandalye ve toprak bulaşığı." }
      ]
    },
    csi: {
      examiner: "Olay Yeri İnceleme Görevlisi S. Demir",
      date: "26 Ekim, 00:15",
      finding: "Kapı içeriden kilitli; tek istisna arka bahçe penceresi. Bardaktan sıvı "
        + "numunesi alındı (50 ml). Çamur iki ayrı ayakkabı izine karşılık geldi: biri masaya "
        + "ulaşan spor, diğeri pencerenin önündeki yuvarlak taban. Kilitli kutu laboratuvara "
        + "gönderildi. İlk değerlendirme: 'içeriden kilit — içeride cevap'.",
      items: [
        "Bardak içi sıvı: 50 ml, laboratuvara",
        "Çamur kazınması: 2 örnek",
        "Kutu + kilit düzeneği: adli fotoğraf",
        "Parmak izi taraması: sonuçsuz"
      ]
    },
    autopsy: {
      victim: { age: 54, height: 172, weight: 74 },
      pathologist: "Doç. Dr. E. Özkan, Adli Tıp Kurumu",
      date: "26 Ekim, 09:30",
      external: "Erkek, 54 yaş, 172 cm, 74 kg. Vücutta kesici/delici yaralanma yok. "
        + "Göz bebekleri belirgin şekilde geniş ve ışığa tepkisiz (midriyazis). Cilt kuru, "
        + "sıcak ve yaygın kırmızımsı (flushing). Ağız ve boğaz mukozası kurumuş; dilde hafif "
        + "yarılma. Tırnak diplerinde siyanoz yok.",
      internal: "Mide içeriği yaklaşık 180 ml, kahverengi-sıvı ve çok sayıda küçük siyah "
        + "tohum parçası içeriyor. Kalp: ağırlık normal, koronerler açık. Akciğerlerde ödem. "
        + "Karaciğer ve böbrek olağan. Mesane dolu. Gastrik içerikten tohum örneği alındı.",
      injuries: {
        external: [
          { x: 70, y: 25, kind: "mydriasis", label: "Göz bebekleri geniş, ışığa tepkisiz (midriyazis)" },
          { x: 70, y: 85, kind: "flush", label: "Cilt kuru-sıcak, yaygın kızarıklık (flushing)" },
          { x: 66, y: 40, kind: "dry", label: "Ağız/boğaz mukozası kuruluğu" }
        ],
        internal: [
          { x: 70, y: 100, kind: "stomach", label: "Mide: 180 ml sıvı + siyah tohumlar (bitki artığı)" },
          { x: 62, y: 66, kind: "heart", label: "Kalp: ritim bozukluğu (aritmi) izi" },
          { x: 70, y: 126, kind: "bladder", label: "Mesane dolu, böbrek olağan" }
        ]
      },
      toxicology: [
        ["Atropin (serum)",            "214 ng/ml",  "Terapötik: < 0,5–1 ng/ml",  "Çok yüksek, öldürücü aralıkta"],
        ["Skopolamin (serum)",         "9 ng/ml",    "Belirtilemez düzey",        "Datura türü bitki izi"],
        ["Hyosiyamin (serum)",         "45 ng/ml",   "< 1 ng/ml",                 "Datura türü bitki izi"],
        ["Etil alkol",                 "0 ‰",        "—",                          "Temiz"],
        ["Digoksin / kardiyak ilaç",   "negatif",    "—",                          "—"],
        ["Barbitürik asid türevi",     "negatif",    "—",                          "—"]
      ],
      causeNote: "Bulgular antikolinerjik (atropin) sendrom ile uyumlu: midriyazis, kuru-sıcak "
        + "cilt, flushing ve gastrik tohumlar. Ölüm, yüksek doz atropin etkisiyle gelişen "
        + "kalp ritim bozukluğu ve solunum durmasına bağlıdır."
    },
    deathCauses: [
      "Atropin (Datura) zehirlenmesi",
      "Kalp krizi (miyokard enfarktüsü)",
      "Akciğer ödemi",
      "Etil alkol zehirlenmesi"
    ],
    deathCauseCorrect: "Atropin (Datura) zehirlenmesi",
    interrogation: {
      officer: "Sorgu Hakimi A. Karan, Emniyet Müdürlüğü",
      date: "26 Ekim, 14:00",
      records: [
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Perşembe gecesi saat 22:40'ta binaya ilk giren sizsiniz. Ne gördünüz?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Devriyemde ışık açık görünce sessizce girdim. Arda masada oturuyordu, gözleri açıktı, cevap vermedi. Dokunmadım, telefonla bildirdim." },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Çok düzenli anlattınız. Masadaki çaydan kimse bahsetti mi?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Bakkaldan çay söylerdi insan bilir; ama Arda çay içmezdi, kahve içerdi. O bardak garip." },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Neden garipti?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Arda sabahları kendi demlemesini yapar, akşam da çayı sonibragah birine bırakır gelirdi. Kimseye verecek biri yoktu o gece.", clue: true },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Kütüphane gece 22:00 en gelen normal kapanış saati midir?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Tutanak öyle diyorsa öyledir. Ben 22:00'da açık kapı gördüm; kapı içeriden kilitsiz boşaldığında öğreneceğiz.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Sıra üçüncü görgü şahsında. Belediye çalışanı Kenan Sorgu, Perşembe akşamı saatlerinde içerdiniz mi?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Sulama düzeneğini ayarlamak için bahçeye gitmiştim. İçeri girmediğime yemin edebilirim." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Pencere önünde devrilmiş sandalye ve kıyı çamuru var. Siz kıyıda çalışıyorsunuz, değil mi?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Bahçeye kıyıdan çakıl döküldüğü doğrudur; ancak geceleri içeri kimse giremez, pencerenin önündeki iz muhtemelen benimdir.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Bardaktaki çayın içine ne konduğunu biliyor musunuz?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Ne konacak? Çay çaydır. Arda'nın uykusuzluğu için bitkisel bir şey içtiğini duymuştum, o kadar." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Kilitli kutuda ne olduğunu biliyorsunuz?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Arda kutuda hep hasta günlüğü tutardı; kutunun boşalması tuhaf.", clue: true },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "En son görüşmede Arda ne durumdaydı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "İki haftadır uykusuz ve dalgındı; kâbuslar gördüğünü, 'gece duvardan sesler geldiğini' söyledi. Kalbi sağlıklıydı." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Kâbuslar ve sesler... Kendisine herhangi bir bitki, ilaç ya da takviye yazdınız mı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Yalnızca papatya çayı önerdim; ruh haline dair kayıt tuttum. Uyku için bitkisel bir şey kullanmadı." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Bir şey daha: ruj izi. Bardakta bir ruj izine rastlandı, tonunuzla eşleşiyor." },
        { subject: "esra",  speaker: "Doktor Esra", text: "Bardakların genel tıbbi bakımda yaygın bir başlığıdır; benim rujum eski bir iz olabilir. Yanıltıcı olabilir, kutunun içini hiç görmedim." }
      ]
    },
    suspects: [
      { id: "esra", name: "Dr. Esra", initial: "E", note: "Arda'nın doktoru" },
      { id: "kenan", name: "Kenan Sorgu", initial: "K", note: "Belediye çalışanı" },
      { id: "kaan", name: "Bekçi Kaan", initial: "K", note: "Gece bekçisi" }
    ],
    culprit: "kenan",
    solution: "Katil Kenan'dı. Tutanağın ipuçları: Kaan'ın 'çay son kimseye bırakılmazdı' "
      + "demeci ve 'kapı kilitsiz' ifadesi, bardak ile kapının akıl dışı olduğunu gösteriyor; "
      + "Kenan'ın pencere önündeki izi 'muhtemelen benimdir' diye sahiplenmesi esas şüpheydi. "
      + "Otopsi atropin zehrine işaret etti: midriyazis, kuru-sıcak kırmızı cilt ve midede siyah "
      + "tohumlar. Arda'nın akşam çayı arka bahçeden geldiği için zehirlenme kolayca katildi; "
      + "Kenan, uykusuzluk için 'bitkisel şey içtiğini' bilen tek kişiydi ve bahçede Datura "
      + "boru çiçeği yetişiyordu. Erken kapanışı 'sulama' bahanesiyle ayarladı, tohumları sıcak "
      + "çaya karıştırdı; ilk belirtiler (kabuslar, sesler) zaten günlerdir Arda'yı test ediyordu. "
      + "Ruj izi ve boş kutu birer yanıltıcı oyun idi."
  },
  {
    id: 2,
    title: "Şoför Işığında Vakası",
    story: "Ferman (38), sabaha karşı otomobilinin sürücü koltuğunda, motoru çalışır halde "
      + "bulundu. Kapılar kilitli değildi; yan koltukta dünkü tarihli açık bir gazete, aynada "
      + "ise arka koltuk görünen bir açı vardı. Ferman kısa boylu bir erkekti ve son günlerde "
      + "'aşırı yorgunum, titriyorum' diyordu. Kapatılmamış benzin kapağı ve araç içine "
      + "yayılmış iki farklı koku da rapora işlendi.",
    scene: {
      summary: "Araç, şehir içi bir otoparkın arka bölgesinde. Motor çalışır, ışıklar sönük. "
        + "Sürücü koltuğuna yığılmış ceset. Yolcu koltuğunda dünkü gazete, arka koltukta ince "
        + "bir battaniye sarılı durumda.",
      objects: [
        { kind: "rect", x: 14, y: 14, w: 62, h: 40, fill: "#7a6142", label: "Araç" },
        { kind: "rect", x: 24, y: 26, w: 20, h: 16, fill: "#93a8b0", label: "Cam" },
        { kind: "rect", x: 52, y: 26, w: 18, h: 16, fill: "#93a8b0", label: "Cam" },
        { kind: "ellipse", x: 28, y: 52, w: 10, h: 7, fill: "#5f1414", label: "Sürücü koltuğu / ceset" },
        { kind: "rect", x: 46, y: 20, w: 17, h: 8, fill: "#d8c9a8", label: "Yolcu: gazete" },
        { kind: "circle", x: 70, y: 30, w: 6, fill: "#8a6d3b", label: "Benzin kapağı (açık)" },
        { kind: "ellipse", x: 64, y: 46, w: 9, h: 6, fill: "#6b4f30", label: "Battaniye (arka koltu)" }
      ],
      // Açık otopark: zemin + park çizgileri; duvar yok.
      modelSpace: { width: 14, depth: 16, wallH: 0, enclosed: false,
        camStart: { x: 6.5, y: 1.8, z: 10.4, pitch: -0.22 },
        parking: [ { x: 2.2, z: 3, l: 11 }, { x: 4.8, z: 3, l: 11 },
                   { x: 8.4, z: 3, l: 11 }, { x: 10,  z: 3, l: 11 } ] },
      model3d: [
        { kind: "box", x: 3.5,   y: 0,    z: 7.2,  w: 1.9,   h: 1.2,   d: 4.7,  color: "#6b645a", name: "Araç",           note: "Motor çalışır, ışıklar sönük; kapılar kilitli değil." },
        { kind: "box", x: 3.5,   y: 1.2,  z: 7.4,  w: 1.7,   h: 0.4,   d: 3,    color: "#8fb4c6", name: "Ön cam / kabin",  note: "İçeriden sürücü koltuğu görünüyor." },
        { kind: "box", x: 3.25,  y: 0,    z: 7.2,  w: 0.5,   h: 1.05,  d: 0.6,  color: "#5f1414", name: "Ferman (ceset)",   note: "Sürücü koltuğunda yığılmış; dış travma izi yok." },
        { kind: "box", x: 4.1,   y: 0.55, z: 7.5,  w: 0.35,  h: 0.02,  d: 0.5,  color: "#d8c9a8", name: "Dünkü gazete",     note: "Yolcu koltuğunda açık; iki gün önceki tarihli." },
        { kind: "box", x: 4.5,   y: 0.6,  z: 8.9,  w: 0.08,  h: 0.25,  d: 0.25, color: "#8a6d3b", name: "Açık benzin kapağı", note: "İstasyonda kapanmıştı; şimdi açık. DNA örneği alındı." },
        { kind: "box", x: 3.5,   y: 0.5,  z: 8.9,  w: 1.1,   h: 0.15,  d: 0.7,  color: "#a0712f", name: "Battaniye",       note: "Arka koltukta sarılı-katlı." },
        { kind: "box", x: 3.5,   y: 1.35, z: 6.4,  w: 0.06,  h: 0.2,   d: 0.35, color: "#4a6fa5", name: "Dikiz aynası",    note: "Sürücüyü değil arka koltuğu gösteriyor — sürücü ayarı değil." }
      ],
      evidence: [
        { name: "Dikiz aynası açısı", desc: "Ayna sürücüyü değil arka koltuğu gösteriyor; kısa boylu sürücünün kendi ayarı değil." },
        { name: "Kapatılmamış benzin kapağı", desc: "Son dolum istasyonda gerçekleşti ve kapak kapandı; açık kalması sonradan tekrar açıldığını gösterir." },
        { name: "Dünkü tarihli gazete", desc: "Ferman gazeteyi her sabah kendisi alırdı; dünkü gazete olması iki gündür araca bineninin olmadığını gösterir." },
        { name: "Araç içi iki koku", desc: "Tütün ve vanilya karışımı; kokular araç içinde yoğun." }
      ]
    },
    csi: {
      examiner: "Olay Yeri İnceleme Görevlisi F. Balcı",
      date: "Vaka günü 07:45",
      finding: "Kapı kilitsiz; kontak anahtarı çevrik. Gazete dünkü tarihle açık. Ayna arka "
        + "koltuk görünecek biçimde ayarlı. Benzin kapağı açık. Araç içi koku örnekleri alındı. "
        + "Ön koltukta içecek izine rastlanmadı.",
      items: [
        "Koku örneği (tütün/vanilya): 2 aktif karbon tüpü",
        "Gazete (fiziksel kanıt)",
        "Ayna mekanizması fotoğrafı",
        "Benzin kapağı çevresi DNA örneği"
      ]
    },
    autopsy: {
      victim: { age: 38, height: 165, weight: 61 },
      pathologist: "Doç. Dr. E. Özkan, Adli Tıp Kurumu",
      date: "Vaka günü 11:00",
      external: "Erkek, 38 yaş, 165 cm, 61 kg. Dış travma izi yok. Göz bebekleri ışığa "
        + "tepkisiz, hafif daralmış (miyozis) görünümde. Dil üzerinde beyazımsı kuruluk. "
        + "Vücut ısısı düşük; hipotermi kuşkusu vardır.",
      internal: "Mide boş. Kan, karaciğer, böbrek ve safra örnekleri toksikolojiye gönderildi. "
        + "Kalpte olağan, koronerler açık. Akciğerler normal.",
      injuries: {
        external: [
          { x: 70, y: 25, kind: "miosis", label: "Hafif daralmış göz bebekleri (miyozis)" },
          { x: 70, y: 85, kind: "cold", label: "Vücut ısısı düşük, kuru-açık ten" }
        ],
        internal: [
          { x: 70, y: 100, kind: "stomach", label: "Mide boş; ilaç emilimi dışında iz yok" },
          { x: 78, y: 74, kind: "liver", label: "Karaciğer: yüksek ilaç konsantrasyonu" }
        ]
      },
      toxicology: [
        ["Flunitrazepam (serum)",       "78 ng/ml",   "Uyku öncesi doz < 5 ng/ml",  "Yüksek, toksik"],
        ["4-hidroksiflunitrazepam",     "pozitif",    "metaboliti",                 "Kanıt"],
        ["Etil alkol",                  "0,4 ‰",      "—",                           "Düşük"],
        ["Parasetamol",                 "negatif",    "—",                           "—"],
        ["Kafein",                      "1,8 mg/L",   "0,5–10 mg/L",                 "Terapötik"]
      ],
      causeNote: "Yüksek doz flunitrazepam etkisine bağlı derin sedasyon ve solunum depresyonu. "
        + "Ölüm ilacın solunumu baskılamasıyla gelişti. Karbon monoksit düzeyi ölçülmedi."
    },
    deathCauses: [
      "Flunitrazepam (sedatif-hipnotik) zehirlenmesi",
      "Karbon monoksit zehirlenmesi",
      "Kalp krizi (aritmi)",
      "Yüksek doz kafein"
    ],
    deathCauseCorrect: "Flunitrazepam (sedatif-hipnotik) zehirlenmesi",
    interrogation: {
      officer: "Sorgu Hakimi A. Karan, Emniyet Müdürlüğü",
      date: "Vaka günü 13:30",
      records: [
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Benzin istasyonu sahibi Mert Bey, Ferman'ı en son ne zaman, nerede gördünüz?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Dün öğleden sonra yakıt almak için geldi; kapağı ben kapattım, o tek başına çıktı." },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Aracın kapağı sonradan açılmış görünüyor. Siz mi unuttunuz?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Ben kapama işlemimi kuralına göre yaparım, kayıt sırası var. Kapağın açıldığını görsem birbirine bağlardım.", clue: true },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Araçta dikiz aynası arka koltuğu gösteriyor ve gazete dünkü tarihli. Bu size ne düşündürür?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Ferman kısa boylu, aynayı kendisi o açıya getiremez; birisi sürücü koltuğundan ayarlamış. Gazete dünküyse, araç dün de kullanılmadı demektir." },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Araç içinde tütün ve vanilya kokusu var." },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Ferman içmezdi; tütün onun olamaz. Vanilya kokusu kız kardeşine, Selin'e ait olur; istasyon kayıtları onun her gün buraya geldiğini gösterir.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Selin Hanım, size geçiyorum. Kardeşinizin son durumu hakkında ne biliyorsunuz?" },
        { subject: "selin", speaker: "Selin", text: "Son günlerde çok yorgundu, 'titriyorum' dedi. Öğleden sonra uğradım, 'kendine dikkat et' dedim, çıktım." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Çıkar çıkmaz kapıyı kim kilitledi?" },
        { subject: "selin", speaker: "Selin", text: "Kilitlemedim bile; girdiğimde kapı açıktı. Saat 16:00 civarıydı. Kardeşim arabada tek başına oturuyordu, uyukladığını düşündüm.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Uyukluyordu. Siz ona bir şey içirdiniz mi?" },
        { subject: "selin", speaker: "Selin", text: "İçirdim mi... peki. Çay verdiğimi hatırlıyorum, uyku ilacıyla baş ederim dedi." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Uyku ilacı mı? Hangi ilaçtan bahsediyorsunuz?" },
        { subject: "selin", speaker: "Selin", text: "Ben bilmem; deli gibi uykusuzdu, 'uyku ilacım var' dedi, şişeden bir şey sıkarak çayına damlattım. Onu uyandıramadım.", clue: true }
      ]
    },
    suspects: [
      { id: "mert", name: "Mert Benzinci", initial: "M", note: "İstasyon sahibi" },
      { id: "selin", name: "Selin", initial: "S", note: "Ferman'ın kız kardeşi" }
    ],
    culprit: "selin",
    solution: "Katil Selin'di. Mert'in 'kapak kuralına göre kapandı' ifadesi, kapağın sonradan "
      + "açıldığını; 'vanilya kız kardeşe ait' kaydı onu araca bağlıyordu. Selin'in tutanakta "
      + "kendi ağzıyla söylediği 'uyuya kaldı', 'uyku ilacını çayına damlattım' ve 'uyandıramadım' "
      + "itirafları tek başına yeterli. Otopside flunitrazepam toksisitesi, miyozis ve düşük "
      + "vücut ısısı bunu doğruladı. Ferman'ı sedatlayıp aracıyla sahneledi; benzin kapağını "
      + "açık bırakıp gazetenin eski tarihini de 'aracı dün kimse kullanmadı' yanıltısına "
      + "çevirdi. Aynayı ise arka koltuğa bakacak biçimde ayarlayarak 'bir yolcu vardı' oyunu "
      + "kurdu — oyunun ölümcül tarafı, kardeşinin ilacını kasten artırmış olmasıydı."
  }
];