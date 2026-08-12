// ============================================================
// DAVA DOSYASI — VERİ KATMANI
// Bu dosya yalnızca veri tutar. Oyun mantığı bu dosyayı okur.
//
// Bir vakanın şeması:
//   id, title, story                 → tanım + olay anlatımı
//   teaser                           → arşiv kartında görünen kısa tanıtım cümlesi
//   scene.summary                    → olay yeri kısa tarif
//   scene.plan                       → kroki çerçevesi (koordinatlar METRE, x batı→doğu, y kuzey→güney; kuzey yukarıda)
//      { caption, w, d, enclosed?, features? }
//      features: { kind: "window"|"door", wall: "K"|"G"|"D"|"B", from, to, swing?, label? }
//                { kind: "line", x1, y1, x2, y2 }  → saha çizgisi (örn. park yeri)
//   scene.objects                    → krokide çizilen öğeler; x,y = merkez (metre)
//      { form, x, y, w?, h?, rot?, mx?, my?, label, label2? }
//      form: "desk"|"shelf"|"chair"|"chair-fallen"|"car"|"body-seat"|"body"|
//            "cup"|"patch"|"box"|"paper"|"blanket"|"cap"|"mirror"
//      mx, my: numara rozetinin konumunu elle belirler (opsiyonel)
//   scene.evidence                   → olay yerinde toplanan kanıtlar {name, desc}
//   csi                              → Olay Yeri İnceleme Raporu
//   autopsy                          → Otopsi: dış/iç muayene
//   autopsy.injuries.external        → dış yüzey bulguları {x,y,label,kind}
//   autopsy.injuries.internal        → iskelet/iç organ bulguları {x,y,label,kind}
//   interrogation                    → POLİSİN YAPTIĞI sorgu tutanağı
//      {speaker, text, clue?, subject} → clue: ipucu saklayan satır; subject: o an sorgulanan şüphelinin id'si
//   deathCauses + deathCauseCorrect  → ölüm nedeni seçenekleri
//   motives + motiveCorrect          → katilin sebebi için seçenekler
//   suspects                         → şüpheliler {id, name, initial, note}
//   verdictEvidence                  → karar kanıt havuzu {name, ok, keys?, why}
//      ok: kararı gerçekten destekliyor mu; why: sonuç raporunda gösterilen kısa gerekçe
//      keys: oyuncunun serbest metnini eşleştirmek için normalize anahtar kelimeler
//   culprit                          → doğru suçlu id'si
//   solution                         → açıklama
// ============================================================

const CASES = [
  {
    id: 1,
    title: "Perşembe Gecesi Kütüphane Vakası",
    teaser: "Kapısı içeriden kilitli bir arşiv odası, masada yarım bardak çay ve çekmecede "
      + "boş bir kutu. Kütüphaneci Arda Yalın'ı o gece ne susturdu?",
    story: "25 Ekim Perşembe gecesi 22:40 sıralarında, belediye arşiv kütüphanesinde "
      + "kütüphaneci Arda Yalın (54), çalışma masasında, başı öne düşmüş halde bulundu. "
      + "Odaya ilk giren gece bekçisi Kaan Yurt, Arda'nın vücuduna dokunmadı ve durumu 112'ye "
      + "bildirdi. Kapı içeriden kilitliydi; anahtar da yalnızca Arda'da bulundu. "
      + "Arda'nın son iki haftadır uykusuzluğu, dalgınlığı ve 'kâbuslar gördüğünü' söylediği "
      + "biliniyor. Masasında yarım bardak çay, pencere denizliklerinin altında bir parça nemli "
      + "kıyı toprağı ve çekmecede kilitli bir kutu duruyordu. Kutunun içi boştu. "
      + "Uzun yıllardır aynı rafların arasında çalışan Arda, alışkanlıklarına sıkı sıkıya bağlı, "
      + "titiz bir adam olarak tanınırdı; kütüphane kapandıktan sonra da içeride kalıp çalışması "
      + "kimseyi şaşırtmazdı. O gece sessizliği yalnızca eski binanın ara sıra gelen gıcırtıları "
      + "bozuyordu.",
    scene: {
      summary: "Kütüphane 6x5 m, pencereler kuzey cephede. Ceset, çalışma masasının "
        + "arkasındaki koltukta oturur durumda. Masanın üstünde yarım bardak çay, altında "
        + "spor ayakkabı çamuru, arka pencerenin önünde devrilmiş bir sandalye var.",
      plan: {
        caption: "Belediye arşiv kütüphanesi",
        w: 6, d: 5, enclosed: true,
        features: [
          { kind: "window", wall: "K", from: 1.2, to: 4.8, label: "Arka pencere" },
          { kind: "door", wall: "G", from: 2.4, to: 3.5, swing: "in", label: "Kapı — içeriden kilitli" }
        ]
      },
      objects: [
        { form: "body-seat", x: 3.35, y: 4.15, mx: 4.45, my: 4.35, label: "Arda Yalın (ceset)", label2: "koltukta, başı öne düşmüş" },
        { form: "desk", x: 2.9, y: 3.2, w: 1.7, h: 0.85, mx: 2.3, my: 2.95, label: "Çalışma masası" },
        { form: "cup", x: 2.45, y: 3.35, label: "Yarım bardak çay", label2: "dibinde çökmüş toz" },
        { form: "box", x: 3.4, y: 3.0, w: 0.42, h: 0.3, label: "Boş kilitli kutu", label2: "çekmecede" },
        { form: "patch", x: 3.0, y: 1.05, w: 1.4, h: 1.6, label: "Çamur izleri", label2: "42 numara, kıyı kili" },
        { form: "chair-fallen", x: 4.9, y: 1.35, rot: 70, label: "Devrik sandalye" },
        { form: "shelf", x: 0.28, y: 2.2, w: 0.5, h: 2.4, label: "Kitaplık (arşiv)" }
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
      finding: "Kapı içeriden kilitli; tek istisna arka bahçe penceresi. Pencere çilesi "
        + "gevşetilmiş; denizlikte taze macun izi ve koyu renkli bir kumaş lifi bulundu. "
        + "Bardaktan sıvı numunesi alındı (50 ml); bardağın kenarında soluk bir ruj izi tespit "
        + "edildi. Çamur iki ayrı ayakkabı izine karşılık geldi: biri masaya ulaşan 42 numara "
        + "spor ayakkabı — iz pencereden masaya gidip geri dönüyor — diğeri pencerenin önündeki "
        + "yuvarlak taban. Devrik sandalyenin altında ezilmiş toprak topakları var; odada "
        + "boğuşma izi yok. Kilitli kutunun kilidi zorlanmadan açılmış; içi eldivenle "
        + "boşaltılmış olmalı ki tek parmak izi alınamadı. Arka bahçede yabani Datura (boru "
        + "çiçeği) öbeği tespit edildi; tohum keselerinin bir kısmı koparılmış. İlk değerlendirme: "
        + "'içeriden kilit — cevap içeride'.",
      items: [
        "Bardak içi sıvı: 50 ml, laboratuvara",
        "Bardak kenarı ruj izi: karşılaştırma için adli fotoğraf",
        "Çamur kazınması: 2 örnek",
        "Denizlik macunu + kumaş lifi: 1 örnek",
        "Kutu + kilit düzeneği: adli fotoğraf, zorlama izi yok",
        "Datura öbeği: bitki ve tohum kesesi örneği",
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
          { x: 78, y: 96, kind: "stomach", label: "Mide: 180 ml sıvı + siyah tohumlar (bitki artığı)" },
          { x: 70, y: 73, kind: "heart", label: "Kalp: ritim bozukluğu (aritmi) izi" },
          { x: 70, y: 129, kind: "bladder", label: "Mesane dolu, böbrek olağan" }
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
    motives: [
      "Arşivden çaldığı nadir belgelerin ortaya çıkmasını engellemek",
      "Miras kavgası",
      "Kütüphane binasını sattırmak",
      "Eski bir husumet"
    ],
    motiveCorrect: "Arşivden çaldığı nadir belgelerin ortaya çıkmasını engellemek",
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
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Son bir şey, Kaan Bey. Son haftalarda devriyelerde arka bahçede dikkatinizi çeken bir şey oldu mu?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Şimdi aklıma geliyor... İki sabah, kilitli bıraktığım arka bahçe kapısını açık buldum. Rüzgâr dedim geçtim; artık o kadar emin değilim.", clue: true },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Kaan Bey, ikinci tura geçiyoruz. Devriyeniz saat kaçta başlar, güzergâhınız sabit midir?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Yirmi birde başlar, yirmi üçte biter. Önce ön kapı, sonra arka bahçe, en son kütüphane pencereleri. Yirmi yıldır aynı sıra." },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Perşembe akşamı yirmi bir ile yirmi iki arasında kütüphane yönünden bir ses duydunuz mu?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Dokuz buçuk gibi tok bir ses geldi; sanki içeride bir şey devrildi. 'Eski bina, tahtası oynar' dedim, üstüne varmadım.", clue: true },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Arda Bey ile aranız nasıldı? Size dert yandığı olur muydu?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Efendi bir adamdı. Son zamanlarda 'Kaan, bu binada benden başka biri daha dolaşıyor' derdi. Ben yaşlılık kuruntusu sandım." },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Işığı görüp içeri girdiğinizde pencere tarafına baktınız mı?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Arda'yı görünce aklım başımdan gitti; telefona sarıldım. Pencere tarafına bakamadım." },
        { subject: "kaan",  speaker: "Hakim A. Karan", text: "Son soru: bahçe kapısının kilidi hakkında ne biliyorsunuz?" },
        { subject: "kaan",  speaker: "Bekçi Kaan Yurt", text: "Kilit ay başından beri tutmuyordu, yönetime söyledim. Kapıyı rüzgâr bile açar artık; kim yaptıysa oradan girmiştir.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Sıra üçüncü görgü şahsında. Belediye çalışanı Kenan Sorgu, Perşembe akşamı saatlerinde içerdiniz mi?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Sulama düzeneğini ayarlamak için bahçeye gitmiştim. İçeri girmediğime yemin edebilirim." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Pencere önünde devrilmiş sandalye ve kıyı çamuru var. Siz kıyıda çalışıyorsunuz, değil mi?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Bahçeye kıyıdan çakıl döküldüğü doğrudur; ancak geceleri içeri kimse giremez, pencerenin önündeki iz muhtemelen benimdir.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Bardaktaki çayın içine ne konduğunu biliyor musunuz?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Ne konacak? Çay çaydır. Arda'nın uykusuzluğu için bitkisel bir şey içtiğini duymuştum, o kadar." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Kilitli kutuda ne olduğunu biliyorsunuz?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Arda kutuda hep hasta günlüğü tutardı; kutunun boşalması tuhaf.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Kenan Bey, ikinci tur. Sulama mesainiz hangi saatlerde? Perşembe akşamı bahçeden ne zaman ayrıldınız?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Sulama beşte başlar, hava kararmadan biter. Perşembe sekize doğru çıktım; o saatte bahçe boştu." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Sekizden sonra bahçeye döndünüz mü?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Dönmedim. Evim iki sokak ötede; akşam yemeğinden sonra çıkmam. Karım da şahittir." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Pencere önündeki izin sizin olabileceğini söylemiştiniz. Ayakkabınız kaç numara?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Kırk dört, çizme giyerim. İz spor ayakkabıysa benim değildir; ben bahçede çizmeden başka şey giymem.", clue: true },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Arda Bey'in kutusu hakkında başka ne bilirsiniz?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Arda o kutuyu çekmeceden ayırmazdı; anahtarı hep cebindeydi. Bir keresinde 'Kenan, insanın sigortası kâğıttır' demişti. Başka bir şey bilmem." },
        { subject: "kenan", speaker: "Hakim A. Karan", text: "Bahçe kapısının kilidi hakkında bir bilginiz var mı?" },
        { subject: "kenan", speaker: "Kenan Sorgu", text: "Kilit ay başından beri tutmuyordu; belediyeye yazdım, 'sıradayız' dediler. Kapıyı artık rüzgâr bile açar.", clue: true },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "En son görüşmede Arda ne durumdaydı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "İki haftadır uykusuz ve dalgındı; kâbuslar gördüğünü, 'gece duvardan sesler geldiğini' söyledi. Kalbi sağlıklıydı." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Kâbuslar ve sesler... Kendisine herhangi bir bitki, ilaç ya da takviye yazdınız mı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Yalnızca papatya çayı önerdim; ruh haline dair kayıt tuttum. Uyku için bitkisel bir şey kullanmadı." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Bir şey daha: ruj izi. Bardakta bir ruj izine rastlandı, tonunuzla eşleşiyor." },
        { subject: "esra",  speaker: "Doktor Esra", text: "Bardakların genel tıbbi bakımda yaygın bir başlığıdır; benim rujum eski bir iz olabilir. Yanıltıcı olabilir, kutunun içini hiç görmedim." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Son bir soru: Arda'ya uyku için tohum ya da bitki karışımı öneren biri olmuş muydu?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Geçen hafta 'biri bahçeden topladığı tohumlarla uyku karışımı yapmayı önerdi' demişti; kim olduğunu söylemedi. Ben kesinlikle karşı çıkmıştım.", clue: true },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Doktor Hanım, ikinci tur. Arda Bey size en son ne zaman muayeneye geldi?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Ölümünden beş gün önce, cuma öğleden sonra. Tansiyonu biraz yüksekti; uyku düzenini konuştuk, papatya çayına devam dedim." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "O görüşmede tohum karışımı konusunu açtı mı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Açtı. 'Biri önerdi ama yanaşmıyorum' dedi. Kimin önerdiğini sordum; 'işten, bitkiden anlayan biri' demekle yetindi.", clue: true },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Arda Bey'in düzenli kullandığı bir ilaç var mıydı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Yoktu. Kalbi sağlamdı, kan değerleri temizdi. Uykusuzluk dışında şikâyeti yoktu; o da son iki haftanın işiydi." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Bardaktaki ruj izi size ait çıktı. Hangi ziyaretinizden kaldı?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Salı günü kahvesini ben götürmüştüm; iz oradan kalmıştır. Bardak yıkanmadan durduysa iz de kalır." },
        { subject: "esra",  speaker: "Hakim A. Karan", text: "Kâbusların bir zehirlenmeden kaynaklanabileceği aklınıza geldi mi?" },
        { subject: "esra",  speaker: "Doktor Esra", text: "Gelseydi o gece orada olurdum. Düşük doz atropin insanı haftalarca oyalayabilir; bunu ancak raporları okuyunca birleştiriyorum.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Nermin Hanım, kütüphaneyi her sabah siz temizliyorsunuz. Arda ile son görüşmeniz ne zamandı?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Salı sabahı. Masası dağınıktı, kutusunu sıkı sıkı tutuyordu. Bana 'Nermin, bu kutu benim sigortam' dedi." },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Aranızın açık olduğu söyleniyor. Geçen ay sizi arşivden eksilen evrakla mı suçladı?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Eksilen evrakı sordu, ben de 'ben temizlikçi kadınım, evrak neyime' dedim. Sonra özür diledi; 'sen değilsin, içeride biri var' dedi.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Olay gecesi neredeydiniz?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Evdeydim, kocam da yanımdaydı. Ama bir şey söyleyeyim: şu Fikret Bey'i geçen hafta iki gece arka bahçede gördüm, 'sigara içiyorum' dedi. Gece bekçisi bile bahçeye çıkmaz." },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Fikret Bey'in gece bahçede ne işi vardı?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Pencereye doğru eğiliyordu. Ben yaşlı gözlerime güvenmem ama eğildiği pencere, Arda'nın odasının penceresiydi.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "'Bu kutu benim sigortam' dediniz. Kutu hakkında Arda Bey başka ne söyledi?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "'Bana bir şey olursa, içindeki liste benim yerime konuşur' dedi. O zaman anlam vermemiştim; şimdi tüylerim diken diken.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Nermin Hanım, ikinci tur. Fikret Bey bahçede 'sigara içiyordum' dedi. Kendisi sigara içer mi?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Fikret Bey sigara içmez ki! Yirmi yıldır aynı binadayız, elinde sigara görmedim. Öyle deyince ben de şaşırdım.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Onu gördüğünüz o iki gece saat kaçtı? Elinde bir şey var mıydı?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "İlkinde on bir gibiydi, elinde küçük bir bez torba vardı. İkincisinde torba yoktu; pencerenin kenarını yokluyordu, çileyle uğraşır gibi.", clue: true },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Arda Bey 'içeride biri var' dediğinde bir isim verdi mi?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Vermedi. 'Sen değilsin Nermin, içeride biri var; kutu söyleyecek' dedi. Kutunun adını o gün öğrendim." },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Perşembe gecesi evdeydiniz. Başka şahidiniz var mı?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Komşumuz çaya gelmişti, on bire kadar oturduk. Sonra uyuduk. Sabah polis kapıyı çaldı." },
        { subject: "nermin", speaker: "Hakim A. Karan", text: "Son olarak: Arda Bey'in kutusunu en son ne zaman gördünüz?" },
        { subject: "nermin", speaker: "Nermin Kaya", text: "Salı sabahı, çekmeceye kilitlerken. Anahtarı yeleğinin cebine koydu; hep öyle yapardı." },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Hale Hanım, çay ocağı sizinsiniz. Perşembe akşamı kütüphaneye çay gitti mi?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Gitti. Akşamüstü biri geldi, iki bardak çay istedi. 'Arda Abi'ye götüreceğim, akşam çayı sever' dedi." },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Kimdi bu kişi?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Yüzünü tam görmedim, kütüphaneden biri olduğunu söyledi. Bardakları aldı, bahçe tarafına döndü.", clue: true },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Arda'nın çay içmediğini, kahve içtiğini biliyor muydunuz?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Herkes bilir! O yüzden garibime gitti. Ama 'misafiri vardır' dedim, üstüne varmadım." },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Çaya bir şey katmış olabilir misiniz?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Ocağımın demliğine her akşam mühür vururum, sabah ben açarım. Benim çayımdan ölüm çıkmaz, kayıtlarım meydanda.", clue: true },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "İyice düşünün Hale Hanım. Çayı almaya gelen kişide dikkatinizi çeken başka bir şey var mıydı?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Parmak uçlarında mürekkep lekesi vardı; kâğıt tozu, o arşiv kokusu... O yüzden kütüphaneden sandım. Şimdi düşününce, kütüphaneden sanmamı isteyen biriymiş.", clue: true },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Hale Hanım, ikinci tur. Çayı almaya gelen kişi saat kaçta geldi?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Altı buçuk, yedi arası. Ocak kapanışa hazırlanıyordu; son müşteri oydu." },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Bardakları nasıl istedi? Ödemesini nasıl yaptı?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Bozukluk verdi, üstü kalsın dedi. Bir de 'Arda Abi ince belli bardak sever, onlardan koy' dedi. Onu herkes bilmez.", clue: true },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Sesini hatırlıyor musunuz? Genç miydi, yaşlı mı?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Orta yaşlı bir erkek sesi, biraz kısık. Şimdi düşününce... Fikret Bey ocağa ara sıra çaya gelir; sesi onunkine benziyordu. Yüzünü görmedim, yemin edemem.", clue: true },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "O kişiyi daha önce ocağınızda gördünüz mü?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Yüzünü görmedim diyorum ya... Boyu posu orta, omuzları düşük. Kütüphane tarafına doğru yürüdü." },
        { subject: "hale",  speaker: "Hakim A. Karan", text: "Çayın yanına başka bir şey aldı mı?" },
        { subject: "hale",  speaker: "Hale Demirci", text: "Şeker istemedi; 'Arda Abi şekersiz içer' dedi. Bir de peçete aldı, cebine koydu." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Tolga Bey, Arda'nın yeğenisiniz. Aranız nasıldı?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "İyiydi... yani, son haftaya kadar. Borçlarım vardı, para istedim, vermedi. 'Bu miras sana kalmayacak' dedi, kavga ettik." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Perşembe akşamı neredeydiniz?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Saat dokuz buçukta kütüphaneye gittim, barışmaya. Kapıyı çaldım, açan olmadı. İçeride ışık yanıyordu ama." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Işık yanıyor, kapı açılmıyor. Sonra ne yaptınız?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Arka tarafa dolandım. Pencerede bir gölge gördüm; içeride biri eğilmiş, bir şey arıyordu. Korktum, kaçtım. Yemin ederim içeri girmedim.", clue: true },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Ayakkabınız kaç numara?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Kırk üç. Niye sordunuz? ...Çamur izi falan varsa benim değildir; ben o gece bahçeye bile basmadım.", clue: true },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Tolga Bey, ikinci tur. Penceredeki gölgeyi polise neden anlatmadınız?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Korktum. Borç yüzünden kavga etmiştik; gölgeyi söylesem 'yeğeni gece oradaydı' derlerdi. Başımı belaya sokmak istemedim." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Gölgeyi anlatın. Tam olarak ne yapıyordu?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Masanın çekmecesine eğilmiş, bir şey arıyordu. Arda'ya bakmadı bile; derdi çekmeceyleydi, cesetle değil.", clue: true },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Kaçarken bahçede ya da sokakta kimseyi gördünüz mü?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Kimseyi görmedim. Nefes nefese eve kadar koştum; karım kapıyı açtı, yüzüm bembeyazdı." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "Borçlarınız kime? Arda Bey'den başka yardım istediniz mi?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Bankayaydı; kredi çekmiştim, ödeyemedim. Arda Abi'den başka kimseden istemedim; 'bu miras sana kalmayacak' deyince ipler koptu." },
        { subject: "tolga", speaker: "Hakim A. Karan", text: "O gece giydiğiniz ayakkabı nerede şimdi?" },
        { subject: "tolga", speaker: "Tolga Yalın", text: "Evde, kapının yanında. İsterseniz bakın; çamuru yoktur. O gece sokakta kaldım, bahçeye basmadım.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Fikret Bey, yirmi yıllık mesai arkadaşısınız. Arda'yı en iyi siz tanırsınız." },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Tanırdım. Titiz adamdı. Perşembe günü saat beşte çıktım, evime gittim. Bir daha görmedim." },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Arda son haftalarda uykusuzdu; geceleri odasında sesler duyduğunu söylüyordu. Dikkatinizi çekti mi?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Arda yaşlanıyordu, malum. Kâbuslar, kuruntular... Emekliliği gelmişti, kafası karışıktı." },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Kilitli kutudan haberiniz var. İçinde ne saklardı?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Şu... eksik evrak listesi. Yani, kişisel notları. Arda her şeyi kutuya koyardı.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Polis kutunun içeriğini kimseye açıklamadı, Fikret Bey. 'Eksik evrak listesini' nereden biliyorsunuz?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Tahmin ettim. Arşivde dedikodu olur, bilirsiniz. Arda'nın bir şeylerin eksildiğini söylediğini herkes duydu." },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Bir de şu var: Nermin Hanım sizi geçen hafta iki gece arka bahçede, pencerenin önünde görmüş." },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Sigara içiyordum. Bahçe herkese açık. Ayrıca ben kırk bir numara giyerim; çamurdaki iz falan benim değildir.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Bir şey daha, Fikret Bey. 'Çamurdaki iz benim değildir' dediniz — oysa çamur izine dair kimseye bilgi vermedik." },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Ben... bahçede sigara içerken görmüştüm. Pencerenin önünde iz vardı. Gören herkes fark eder.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Fikret Bey, ikinci tur. Perşembe akşamı beşte çıktınız; evinize nasıl gittiniz, sizi gören oldu mu?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Yürüdüm, on beş dakika. Apartmanda komşum merdivende gördü, selamlaştık. Yalnız yaşarım; başka gören olmadı." },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Yani o gece evde olduğunuzu doğrulayacak biri yok." },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Televizyon açıktı, çay demledim. Bunlar kanıt mı bilmiyorum ama evdeydim." },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Nermin Hanım, yirmi yıldır elinizde sigara görmediğini söylüyor." },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Nermin Hanım'ın gözü iyi görmez, kendisi söyledi. İçerim ben; az içerim ama içerim.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Arşivin anahtarı kimdeydi? Gece kapıdan girmek mümkün müydü?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Anahtar yalnız Arda'daydı; kapıdan gece giremezsiniz. Pencerenin çilesi aylardır gevşektir, yönetime yazdım; gelen giden olmadı.", clue: true },
        { subject: "fikret", speaker: "Hakim A. Karan", text: "Son soru: Arda'nın çekmecesini en son ne zaman açtınız?" },
        { subject: "fikret", speaker: "Fikret Aksel", text: "Hiç açmadım. Arda çekmecesine dokundurtmazdı. Neden soruyorsunuz; parmak izim çıkmadı ya?" }
      ]
    },
    suspects: [
      { id: "esra", name: "Dr. Esra", initial: "E", note: "Arda'nın doktoru" },
      { id: "kenan", name: "Kenan Sorgu", initial: "K", note: "Belediye çalışanı" },
      { id: "kaan", name: "Bekçi Kaan", initial: "K", note: "Gece bekçisi" },
      { id: "nermin", name: "Nermin Kaya", initial: "N", note: "Temizlik görevlisi" },
      { id: "hale", name: "Hale Demirci", initial: "H", note: "Çay ocağı sahibi" },
      { id: "tolga", name: "Tolga Yalın", initial: "T", note: "Arda'nın yeğeni" },
      { id: "fikret", name: "Fikret Aksel", initial: "F", note: "Yardımcı arşiv uzmanı" }
    ],
    culprit: "fikret",
    verdictEvidence: [
      { name: "Yarım bardak çay", ok: true, keys: ["çay", "bardak"], why: "Dibindeki acı-buruş toz Datura tohumuydu; zehir çaya katıldı." },
      { name: "Spor ayakkabı çamuru", ok: true, keys: ["çamur", "ayakkabı", "spor", "kil"], why: "42 numara, kıyı kili — pencereden giren Fikret'in izi." },
      { name: "Boş kilitli kutu", ok: true, keys: ["kutu", "belge"], why: "İçindeki eksik belge listesi motife işaret ediyordu; kutuyu geceleri Fikret arıyordu." },
      { name: "Arka pencere", ok: true, keys: ["pencere", "sandalye", "çile"], why: "Gevşek çile ve devrik sandalye katilin giriş yolunu gösteriyor." },
      { name: "Bardak içi sıvı: 50 ml, laboratuvara", ok: false, keys: ["50 ml", "laboratuvar", "numune", "sıvı"], why: "Örnek teslim tutanağı; belirleyici sonuç toksikoloji raporunda." },
      { name: "Çamur kazınması: 2 örnek", ok: false, keys: ["kazınma", "kazıntı"], why: "Toplama işlemi; tek başına kimseyi işaret etmiyor." },
      { name: "Kutu + kilit düzeneği: adli fotoğraf", ok: false, keys: ["fotoğraf", "kilit düzeneği"], why: "Belgeleme işlemi; bulgu değil." },
      { name: "Parmak izi taraması: sonuçsuz", ok: false, keys: ["parmak"], why: "Sonuçsuz tarama kararı desteklemez." }
    ],
    solution: "Katil Fikret'ti. Arda, arşivden nadir belgelerin eksildiğini fark edip eksik "
      + "kayıt listesini kilitli kutuya koymuştu; belgeleri satan Fikret'ti. Haftalarca gece "
      + "pencereden girip kutuyu aradı — Arda'nın duyduğu 'duvardan sesler' buydu ve düşük doz "
      + "tohumlarla çayını test ediyordu (kâbuslar, kuruntular). Perşembe akşamı Hale'nin "
      + "ocağından 'Arda Abi'ye' diye ekstra çay aldı, Datura tohumlarını katıp pencereden "
      + "girdi; 42 numara iz ve devrik sandalye onundu. Tolga'nın pencerede gördüğü gölge, "
      + "Nermin'in bahçedeki 'sigara içen adam'ı ve Hale'nin ekstra çayı onu işaret etti; "
      + "kutunun içeriğini kimse söylemeden 'eksik evrak listesi' deyivermesi ve kimse "
      + "sormadan ayakkabı numarasını savunması son halkaydı. Esra'nın 'biri tohum karışımı "
      + "önerdi' sözü de Fikret'e çıkıyordu. Kenan'ın çamur izi gerçekten sulamadan, Esra'nın "
      + "ruj izi eski bir bardaktandı; ikisi de temize çıktı."
  },
  {
    id: 2,
    title: "Şoför Işığında Vakası",
    teaser: "Motoru çalışır, ışıkları sönük bir otomobil; dünkü gazete ve yanlış açıya ayarlı "
      + "dikiz aynası. Şoför Ferman, direksiyona kimin geçtiğini biliyordu.",
    story: "Ferman (38), sabaha karşı otomobilinin sürücü koltuğunda, motoru çalışır halde "
      + "bulundu. Kapılar kilitli değildi; yan koltukta dünkü tarihli açık bir gazete, aynada "
      + "ise arka koltuk görünen bir açı vardı. Ferman kısa boylu bir erkekti ve son günlerde "
      + "'aşırı yorgunum, titriyorum' diyordu. Kapatılmamış benzin kapağı ve araç içine "
      + "yayılmış iki farklı koku da rapora işlendi. "
      + "Yıllardır aynı şirkette şoförlük yapan Ferman, her sabah gazetesini kendisi alan, "
      + "düzenine düşkün bir adamdı. Onu tanıyanlar son günlerde artan yorgunluğunu ve "
      + "tedirginliğini fark etmişti; ama kimse bunun sonun başlangıcı olduğunu aklına "
      + "getirmemişti.",
    scene: {
      summary: "Araç, şehir içi bir otoparkın arka bölgesinde. Motor çalışır, ışıklar sönük. "
        + "Sürücü koltuğuna yığılmış ceset. Yolcu koltuğunda dünkü gazete, arka koltukta ince "
        + "bir battaniye sarılı durumda.",
      plan: {
        caption: "Şehir otoparkı — arka bölge",
        w: 8.5, d: 11, enclosed: false,
        features: [
          { kind: "line", x1: 2.2, y1: 0.6, x2: 2.2, y2: 10.4 },
          { kind: "line", x1: 4.8, y1: 0.6, x2: 4.8, y2: 10.4 },
          { kind: "line", x1: 7.4, y1: 0.6, x2: 7.4, y2: 10.4 }
        ]
      },
      objects: [
        { form: "car", x: 3.5, y: 6.2, w: 1.9, h: 4.7, mx: 2.95, my: 8.15, label: "Araç", label2: "motor çalışır, ışıklar sönük" },
        { form: "body-seat", x: 3.05, y: 5.05, mx: 5.45, my: 4.15, label: "Ferman (ceset)", label2: "sürücü koltuğunda yığılmış" },
        { form: "paper", x: 4.0, y: 5.05, w: 0.5, h: 0.38, mx: 5.45, my: 5.25, label: "Dünkü gazete", label2: "yolcu koltuğunda açık" },
        { form: "mirror", x: 3.5, y: 4.45, w: 0.34, h: 0.16, mx: 5.45, my: 6.35, label: "Dikiz aynası", label2: "arka koltuğa dönük" },
        { form: "blanket", x: 3.5, y: 7.35, w: 1.3, h: 0.65, mx: 5.45, my: 7.45, label: "Battaniye", label2: "arka koltukta sarılı" },
        { form: "cap", x: 4.62, y: 7.7, mx: 5.45, my: 8.55, label: "Benzin kapağı", label2: "kapatılmamış" }
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
      finding: "Kapılar kilitsiz; kontak anahtarı çevrik, motor rölantide çalışır bulundu. "
        + "Gazete dünkü tarihle açık; sayfalarında yalnızca Ferman'a ait izler var. Dikiz "
        + "aynası arka koltuğu gösterecek biçimde ayarlı — ayna düğmesinde silinmiş, yarım bir "
        + "avuç izi kaldı. Benzin kapağı açık; kapağın vida dişine açık renkli bir bez lifi "
        + "takılmış. Sürücü kapısının yanında, otopark çıkışına dönük 44-45 numara yarım taban "
        + "izi bulundu. Araç içinde izmarit yok; tütün kokusu döşemeye değil havaya sinmiş — "
        + "yani yakın zamanda biri kapı açıkken içmiş. Ön koltukta içecek izine rastlanmadı; "
        + "demek ki çay bardağı araçtan çıkarıldı.",
      items: [
        "Koku örneği (tütün/vanilya): 2 aktif karbon tüpü",
        "Gazete: fiziksel kanıt + parmak izi taraması",
        "Ayna mekanizması: adli fotoğraf + avuç izi sürüntüsü",
        "Benzin kapağı çevresi: DNA örneği + bez lifi",
        "Yarım taban izi: alçı kalıp alındı",
        "Battaniye: lif örneği"
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
          { x: 78, y: 96, kind: "stomach", label: "Mide boş; ilaç emilimi dışında iz yok" },
          { x: 63, y: 94, kind: "liver", label: "Karaciğer: yüksek ilaç konsantrasyonu" }
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
    motives: [
      "Naylon fatura düzeninin savcılığa bildirilmesini engellemek",
      "Sigorta parası",
      "Şirket hisselerini ele geçirmek",
      "Kıskançlık"
    ],
    motiveCorrect: "Naylon fatura düzeninin savcılığa bildirilmesini engellemek",
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
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Bir de istasyon kayıtları var Mert Bey. Ferman'dan sonra o pompaya yaklaşan araç oldu mu?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Ferman'dan sonra o pompaya tek araç yaklaşmadı. Yani kapağı açan, yakıt için değil; doğrudan o aracın yanına gelmiş.", clue: true },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Mert Bey, ikinci tur. Ferman yakıt alırken nasıldı? Bir gariplik var mıydı?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Yüzü solgundu, elleri titriyordu. 'İyiyim' dedi ama iyi görünmüyordu. Son gelişlerinde hep biraz daha çöküktü.", clue: true },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Ödemeyi nasıl yaptı? Konuştu mu sizinle?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Kartla ödedi. 'Bu hafta çok yorgunum Mert, gözümü açık tutamıyorum' dedi. 'Doktora git' dedim; güldü, 'vakit yok' dedi." },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Ferman çıktıktan sonra istasyonda onu soran oldu mu?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Soran olmadı. Ama akşama doğru koyu paltolu, uzun biri geldi; su aldı, 'otopark tarafına hangi sokaktan gidilir' diye sordu. Herkes bilir orayı; garibime gitti.", clue: true },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Kapağı sonradan açan biri iz bırakır mı?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Kapak boyalı yüzey; kurcalayan iz bırakır. Polis DNA örneği aldı diye duydum; sonuç her şeyi söyler." },
        { subject: "mert",  speaker: "Hakim A. Karan", text: "Sizce Ferman kendi kapağını açık bırakır mıydı?" },
        { subject: "mert",  speaker: "Mert Benzinci", text: "Ferman titiz adamdı; aracına gözü gibi bakardı. Kapağı açık unutmazdı. Ne olduysa onun dışında oldu." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Selin Hanım, size geçiyorum. Kardeşinizin son durumu hakkında ne biliyorsunuz?" },
        { subject: "selin", speaker: "Selin", text: "Son günlerde çok yorgundu, 'titriyorum' dedi. Öğleden sonra uğradım, 'kendine dikkat et' dedim, çıktım." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Çıkar çıkmaz kapıyı kim kilitledi?" },
        { subject: "selin", speaker: "Selin", text: "Kilitlemedim bile; girdiğimde kapı açıktı. Saat 16:00 civarıydı. Kardeşim arabada tek başına oturuyordu, uyukladığını düşündüm.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Uyukluyordu. Siz ona bir şey içirdiniz mi?" },
        { subject: "selin", speaker: "Selin", text: "İçirdim mi... peki. Çay verdiğimi hatırlıyorum, uyku ilacıyla baş ederim dedi." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Uyku ilacı mı? Hangi ilaçtan bahsediyorsunuz?" },
        { subject: "selin", speaker: "Selin", text: "Ben bilmem; deli gibi uykusuzdu, 'uyku ilacım var' dedi, şişeden bir şey sıkarak çayına damlattım. Onu uyandıramadım.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Selin Hanım, ikinci tur. Uyku damlası şişesi nerede dururdu?" },
        { subject: "selin", speaker: "Selin", text: "Aracın torpido gözünde. 'Gözümün önünde olsun' derdi, hep orada tutardı. Ben de oradan aldım, çayına damlattım.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Şişeyi en son ne zaman elinize aldınız? Ondan önce araca kim erişmiş olabilir?" },
        { subject: "selin", speaker: "Selin", text: "Perşembe öğleden sonra, çayı demlerken. Ondan önce araç garajdaydı; sabah Kadir Bey uğramıştı, evrak almış. Torpidoya baktı mı bilmem.", clue: true },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Kardeşiniz son günlerde size bir şey emanet etti mi? Bir söz, bir vasiyet?" },
        { subject: "selin", speaker: "Selin", text: "'Sen karışma, cuma günü her şey bitecek' dedi. Ne biteceğini söylemedi. Sorsam da susardı." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Dörtte ayrıldınız. Akşam yediye kadar neredeydiniz?" },
        { subject: "selin", speaker: "Selin", text: "Eve gittim, komşumla çay içtim, sonra markete uğradım. Fişim var isterseniz. Yediden sonra evdeydim." },
        { subject: "selin", speaker: "Hakim A. Karan", text: "Vanilya kokusu size aitmiş. Araca en son ne zaman bindiniz?" },
        { subject: "selin", speaker: "Selin", text: "Çarşamba öğlen, birlikte yemek yedik; parfümüm o gün sinmiştir. Perşembe binmedim; kapıdan baktım, uyukluyordu, dokunmadım." },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Nazan Hanım, mahallenin eczacısısınız. Ferman'ın uyku damlası sizden mi?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Evet. Doktor reçetesiyle, kontrollü satılan bir damla. Şişeyi on gün önce ablası Selin Hanım'a teslim ettim; Ferman kendisi gelemiyordu." },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Selin Hanım ifadesinde 'şişeden sıkıp çayına damlattım' diyor. Damlanın rengini hatırlıyor musunuz?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Benim verdiğim damla hafif yeşilimsidir, üretici öyle boyar. Selin Hanım'ın tarif ettiği şişe ise renksizdi. Benim verdiğim şişe kullanılmadı.", clue: true },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Şişe nasıl değiştirilmiş olabilir?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "İlacı alan kişi şişeyi aracında ya da evinde tuttuysa, ona erişen herkes değiştirebilir. Flunitrazepam her eczanede bulunmaz; ama karaborsası boldur." },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Sizden reçetesiz flunitrazepam isteyen oldu mu?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Bir hafta önce bir adam geldi, 'uyku için güçlü bir şey' dedi; uzun boylu, paltolu. Reddettim, reçetesiz veremem. Sinirlendi, çıktı.", clue: true },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Selin Hanım sizin şişenizi kullansaydı, çayda bir iz kalır mıydı?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Benim damlam yeşilimsidir; açık renkli çaya damlasa rengi dönerdi. Kullandığı şişe renksizdi diyor — demek şişe önceden değiştirilmiş.", clue: true },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Nazan Hanım, ikinci tur. O uzun boylu adamı biraz daha anlatın. Yaşı, sesi, elleri?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Kırk, kırk beş arası. Sesi tok, buyurgan; emir vermeye alışmış. Elleri bakımlıydı, saati pahalıydı. Madde düşkünü biri değildi; parası olan biriydi.", clue: true },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "O adam ilacı başka yerden bulmuş olabilir mi?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Karaborsada bulunur ama izi sürülür. Bu mahallede reçetesiz verecek eczane yok; başka semte gitmiştir ya da birine aldırmıştır." },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Kadir Alaz'ı tanır mısınız? Şirketi eczanenizden alışveriş yapar mı?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Şirket adına ilk yardım dolabı için iki kez fatura kestim. Kendisiyle yüz yüze gelmedim; imzaları muhasebecisi attı." },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "Şişe değiştirildiyse, benim verdiğim şişe nerede olabilir?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Atılmış ya da saklanmıştır. Benim verdiğim şişede eczane etiketi ve seri numarası var; bulunursa kimin elinden geçtiği araştırılır.", clue: true },
        { subject: "nazan", speaker: "Hakim A. Karan", text: "O adam bir daha geldi mi eczaneye?" },
        { subject: "nazan", speaker: "Eczacı Nazan", text: "Gelmedi. Ama olaydan sonraki cumartesi, vitrinin önünden uzun biri geçti sanki. Yüzünü seçemedim." },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Yusuf Bey, otoparkın görevlisi sizsiniz. Gece neredeydiniz?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Kulübedeydim; gözüm kamerada değil kapıdadır benim. Sabah aracı ben fark ettim, motor hâlâ çalışıyordu." },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Araçta yoğun tütün kokusu var." },
        { subject: "yusuf", speaker: "Yusuf", text: "Ben içerim, doğru. Ama aracın kapısından içeri sigara sokmadım; koku aracın içine sinmiş, eski değil taze. Benden önce biri içti orada." },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Akşam saatlerinde aracın yanına gelen oldu mu?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Yedi gibi biri geldi. Uzun boylu, koyu paltolu. Sürücü kapısını açıp eğildi, iki dakika kaldı, çıktı. Yüzünü görmedim.", clue: true },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Ferman'ın ablası dörtte gelmiş, kapıyı kilitlemeden gitmiş. Yani araç herkese açıktı." },
        { subject: "yusuf", speaker: "Yusuf", text: "Açıktı. Ama o uzun adam abla değildi; Selin Hanım kısacık kadın, kapıya bile zor yetişir. Bunu ben bile bilirim.", clue: true },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Son bir şey, Yusuf Bey. O uzun boylu adamda dikkatinizi çeken başka bir şey var mıydı?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Hava soğuk sayılmazdı ama ellerinde eldiven vardı. Acele etmeden, rahat yürüdü; ne yapacağını bilen biri gibi.", clue: true },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Yusuf Bey, ikinci tur. O uzun adam aracın yalnızca sürücü kapısına mı gitti?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Hayır. Önce sürücü kapısına eğildi, sonra aracın arkasına dolandı; sağ arka tarafta bir kez daha eğildi. 'Ayakkabısını bağlıyor' sandım.", clue: true },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Adam ayrılırken araçta bir değişiklik oldu mu?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Adam giderken motor çalışıyordu; gelirken araç ölüydü. Yani motoru çalıştıran da oydu.", clue: true },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Gece boyunca başka gelen giden oldu mu?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Bir tek o. Başka araç girmedi, yaya geçmedi. Sabaha karşı çöp kamyonu geçti, o kadar." },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Sabah aracı fark ettiğinizde ilk ne yaptınız?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Kapı kilitli değildi; çektim, açıldı. Motor uğultusu, bir de o koku... Hemen polisi aradım, kimseye haber vermedim, hiçbir şeye dokunmadım." },
        { subject: "yusuf", speaker: "Hakim A. Karan", text: "Adamın yüzünü hiç görmediniz mi?" },
        { subject: "yusuf", speaker: "Yusuf", text: "Bir kez, çıkarken lambanın altına geldi: uzun, zayıf, koyu paltolu. Yüzü gölgede kaldı. Ama yürüyüşü topuklarına basa basa, rahattı; burayı bilen biri gibi." },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Feride Hanım, Ferman'la iki yıl evli kaldınız. Boşanma çekişmeliymiş." },
        { subject: "feride", speaker: "Feride", text: "Çekişmeliydi. Nafakayı kesti; sigorta poliçesini de öğrenmiş, lehtarı bendim, onu bile iptal ettirmeye çalıştı." },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Sigorta... Yani ölümü size para kazandırırdı." },
        { subject: "feride", speaker: "Feride", text: "Kağıt üstünde öyle. Ama ben onu iki gün önce son kez gördüm, konuşmaya gittim. Ağlıyordu. 'Defterler, defterler' deyip duruyordu." },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Hangi defterler?" },
        { subject: "feride", speaker: "Feride", text: "Şirket defterleri. 'Başıma bir şey gelirse Kadir'in defterlerine bak, her şey orada' dedi. Saçmalıyor sandım.", clue: true },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Araçta tütün kokusu var. Siz içer misiniz?" },
        { subject: "feride", speaker: "Feride", text: "İki yıl önce bıraktım. Ferman da içmezdi. O koku ikimizin de değil.", clue: true },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Feride Hanım, ikinci tur. Sigorta poliçesinin miktarı ne kadardı?" },
        { subject: "feride", speaker: "Feride", text: "İki yüz bin. Boşanmadan önce yapılmıştı; iptal ettirmeye çalıştı ama lehtar değişikliği için benim imzam gerekiyordu, vermedim." },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Ferman size 'defterlere bak' dediğinde, Kadir Bey'in defterleri olduğunu nereden biliyordunuz?" },
        { subject: "feride", speaker: "Feride", text: "Ferman anlatırdı; iki yıl evli kaldım, şirket sofralarına da girdim. Naylon fatura işini ondan duydum. 'Cuma günü dilekçeyi veriyorum' demişti bana da.", clue: true },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Perşembe akşamı neredeydiniz?" },
        { subject: "feride", speaker: "Feride", text: "Evdeydim. Annemle telefonda konuştum, dokuz gibi kapattım; televizyon izleyip uyudum. Telefon kayıtları da vardır." },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Ferman'ı son gördüğünüzde yanında ya da yakınında biri var mıydı?" },
        { subject: "feride", speaker: "Feride", text: "Otoparkta buluştuk. Konuşurken arkamızdan koyu paltolu, uzun biri geçti; Ferman sustu, adam geçene kadar konuşmadı. 'Kimdi o' dedim, 'önemli değil' dedi.", clue: true },
        { subject: "feride", speaker: "Hakim A. Karan", text: "Ölümü size para kazandırdı. Bunu nasıl açıklarsınız?" },
        { subject: "feride", speaker: "Feride", text: "Kâğıt üstünde öyle duruyor; açıklayamam. Ama Ferman'ı öldüren, onun konuşmasından korkan biridir. Ben iki yıl bekledim, öldürmek için mi?" },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Baran Bey, Ferman'ın en yakın arkadaşısınız. Son günlerde nasıldı?" },
        { subject: "baran", speaker: "Baran", text: "Korkuyordu. Eskiden rakı sofrasında gülen adam, son iki hafta susuyordu. 'Cuma günü dilekçeyi veriyorum, ya batacağım ya çıkacağım' dedi." },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Ne dilekçesi?" },
        { subject: "baran", speaker: "Baran", text: "Kadir'in şirketinde naylon fatura işi varmış. Ferman şofördü ama defterleri o taşırdı, her şeyi gördü. Savcılığa gidecekti.", clue: true },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Kadir Bey bunu biliyor muydu?" },
        { subject: "baran", speaker: "Baran", text: "Bilmez olur mu? Ferman 'Kadir dün bana defterleri sordu, ne kadar bildiğimi ölçtü' dedi. Korkusu ondan." },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Olay akşamı Ferman'ı gördünüz mü?" },
        { subject: "baran", speaker: "Baran", text: "Sekizde uğradım, camdan gördüm; koltukta uyukluyordu. 'Abi sen git, uyku damlam var, iyiyim' demişti öğleden sonra. Uyandırmadım. Son görüşümmüş.", clue: true },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Baran Bey, ikinci tur. Dilekçe konusunu Ferman'la en son ne zaman konuştunuz?" },
        { subject: "baran", speaker: "Baran", text: "Olaydan iki gün önce, rakı sofrasında. 'Cuma günü dilekçeyi veriyorum; ya batacağım ya çıkacağım' dedi. Son ciddi konuşmamızdı." },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Bu konuşmayı duyan oldu mu?" },
        { subject: "baran", speaker: "Baran", text: "Sofrada ikimiz vardık, mekân tenhaydı. Ama Ferman korkuyordu; 'Kadir dün defterleri sordu, ne kadar bildiğimi ölçtü' dedi. Duymuş olmasından korkuyordu.", clue: true },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Sekizde aracın yanına gittiğinizde otoparkta başka biri var mıydı?" },
        { subject: "baran", speaker: "Baran", text: "Kimse yoktu. Giderken dikiz aynasından gördüm: otoparkın arka tarafında, karanlıkta biri duruyordu sanki. Dönüp bakmadım; keşke baksaydım.", clue: true },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Ferman'ın dilekçeyi vereceğini Kadir Bey'in bilmesi mümkün müydü?" },
        { subject: "baran", speaker: "Baran", text: "Ferman şirkette her şeyi anlatırdı, saf adamdı. Kadir'in kulağına gitmiştir. Zaten defterleri sorması, bir şeyler sezdiğini gösteriyor." },
        { subject: "baran", speaker: "Hakim A. Karan", text: "Sizce bu işi kim yapar?" },
        { subject: "baran", speaker: "Baran", text: "Ben hâkim değilim, savcı değilim. Ama Ferman'ın korktuğu tek adam Kadir'di. Gerisini siz bilirsiniz." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Kadir Bey, Ferman şirketinizde şofördü. Nasıl bir çalışandı?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Dürüsttü... yani öyle bilirdim. Ölümüne üzüldüm. Motor çalışır vaziyette bulunmuş, yazık; egzoz dumanı mı diye düşündüm önce." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Motorun çalıştığını size kim söyledi? Bu detay tutanağa yeni geçti, henüz kimseyle paylaşılmadı." },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Yusuf aradı sabah, kulübeden. 'Patron, Ferman'ın arabası çalışıyor' dedi.", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Ferman'ı en son ne zaman gördünüz?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Perşembe sabahı garaja uğradım, evrak aldım. Ferman uyukluyordu, uyandırmadım. Sonra görmedim." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Ferman cuma günü savcılığa dilekçe verecekmiş. Haberiniz var mıydı?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Ne dilekçesi? Ferman şofördü, evrak işinden anlamazdı. Kim uydurduysa..." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Baran Bey ve Feride Hanım ayrı ayrı anlattı: şirket defterlerindeki usulsüzlük." },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Dedikodu. Ferman son zamanlarda dengesizdi, herkese bir şey anlatıyordu. Benim defterlerim tertemizdir, inceletebilirsiniz.", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Bir de eczane var. Nazan Hanım'a bir hafta önce uzun boylu, paltolu bir adam gelip reçetesiz güçlü uyku ilacı istemiş. Boyunuz kaç, Kadir Bey?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Doksan iki. Bu şehirde uzun boylu bir tek ben miyim? Paltoyu da herkes giyer. Ben o eczaneye hiç gitmedim." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Son olarak: Yusuf Bey ifadesinde sabah kimseyi aramadığını, doğrudan polisi aradığını söyledi. Motor detayını nereden biliyorsunuz?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Karıştırdım herhalde. Şoförler kendi arasında konuşur; duymuşumdur bir yerden.", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "'Yusuf aradı sabah' demiştiniz. Saat kaçtı o arama? Kayıtlara baktıracağız." },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Tam hatırlamıyorum... Yedi gibi, belki biraz sonra. Acelem vardı, detaylar bulanık.", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Kadir Bey, ikinci tur. Perşembe sabahı garajda ne kadar kaldınız?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Beş dakika, bilemedin on. Ferman uyukluyordu; uyandırmadım, evrak dosyasını aldım, çıktım." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Ferman'ın aracına yaklaştınız mı? Torpido gözüne baktınız mı?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Evrak dosyası garaj rafındaydı; araca yaklaşmadım. Torpidoyla işim olmaz benim.", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Perşembe akşamı on dokuz ile yirmi bir arası neredeydiniz?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Evdeydim. Yalnız yaşıyorum; yemek yedim, telefona baktım. Gören olmadı ama telefon kayıtlarım evden görünüyordur." },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Uzun, koyu bir paltolunuz var mı?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Var, herkesin var. Kış günü palto giymek suç mu? Boyum uzun diye eczaneye giden ben mi oluyorum?", clue: true },
        { subject: "kadir", speaker: "Hakim A. Karan", text: "Son soru: Ferman cuma günü dilekçeyi verseydi, şirketiniz ne duruma düşerdi?" },
        { subject: "kadir", speaker: "Kadir Alaz", text: "Hiçbir şey olmazdı; defterlerim temiz dedim size. Avukatımla konuşmadan başka soru cevaplamayacağım." }
      ]
    },
    suspects: [
      { id: "mert", name: "Mert Benzinci", initial: "M", note: "İstasyon sahibi" },
      { id: "selin", name: "Selin", initial: "S", note: "Ferman'ın kız kardeşi" },
      { id: "nazan", name: "Eczacı Nazan", initial: "N", note: "Mahalle eczanesi" },
      { id: "yusuf", name: "Yusuf", initial: "Y", note: "Otopark görevlisi" },
      { id: "feride", name: "Feride", initial: "F", note: "Ferman'ın eski eşi" },
      { id: "baran", name: "Baran", initial: "B", note: "Ferman'ın arkadaşı" },
      { id: "kadir", name: "Kadir Alaz", initial: "K", note: "Şirket sahibi, patron" }
    ],
    culprit: "kadir",
    verdictEvidence: [
      { name: "Dikiz aynası açısı", ok: true, keys: ["ayna", "dikiz"], why: "Arka koltuğa dönük ayna uzun boylu birinin ayarı — Kadir'in boyuna uyuyor." },
      { name: "Kapatılmamış benzin kapağı", ok: true, keys: ["benzin", "kapak"], why: "İstasyonda kapanmıştı; sonradan açıp sahneyi kuran el Kadir'indi." },
      { name: "Dünkü tarihli gazete", ok: true, keys: ["gazete", "tarih"], why: "Ferman'ın iki gündür araca binmediğini gösterip zaman çizgisini kilitledi." },
      { name: "Benzin kapağı çevresi DNA örneği", ok: true, keys: ["dna"], why: "Kapağı son açan kişiden alınan örnek Kadir'e işaret ediyor." },
      { name: "Araç içi iki koku", ok: false, keys: ["koku", "tütün", "vanilya"], why: "Yanıltıcı: tütün Yusuf'un kulübesinden, vanilya Selin'den." },
      { name: "Koku örneği (tütün/vanilya): 2 aktif karbon tüpü", ok: false, keys: ["karbon"], why: "Yanıltıcı kokuların toplanması; kararı desteklemiyor." },
      { name: "Gazete (fiziksel kanıt)", ok: false, keys: ["fiziksel"], why: "Teslim tutanağı; belirleyici olan gazetenin tarihiydi, kendisi değil." },
      { name: "Ayna mekanizması fotoğrafı", ok: false, keys: ["mekanizma"], why: "Belgeleme işlemi; belirleyici olan aynanın açısıydı." }
    ],
    solution: "Katil Kadir'di. Ferman, şirketteki naylon fatura düzenini görmüş ve cuma günü "
      + "savcılığa dilekçe verecekti; Feride'ye 'başıma bir şey gelirse defterlere bak' demişti. "
      + "Kadir perşembe sabahı garaja uğrayıp uyku damlası şişesini, flunitrazepam dolu renksiz "
      + "bir şişeyle değiştirdi — Nazan'ın 'benim damlam yeşilimsidir' ifadesi oyunu bozdu. "
      + "Selin, şişenin değiştirildiğini bilmeden çaya damlattı. Akşam yedide Yusuf'un gördüğü "
      + "uzun boylu, paltolu adam Kadir'di: aynayı kendi boyuna göre ayarladı, benzin kapağını "
      + "açtı, motoru çalışır bıraktı. Nazan'a bir hafta önce reçetesiz ilaç isteyen 'uzun "
      + "boylu, paltolu' kişi de oydu. Motor detayını polisten önce bilmesi ve 'Yusuf aradı' "
      + "yalanı — Yusuf kimseyi aramamıştı — son halkaydı. Tütün kokusu Yusuf'un kulübesinden, "
      + "vanilya Selin'den; ikisi de yanıltıcıydı."
  }
];