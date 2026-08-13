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
//      { form, x, y, w?, h?, rot?, mx?, my?, label, label2?, real? }
//      form: "desk"|"shelf"|"chair"|"chair-fallen"|"car"|"body-seat"|"body"|
//            "cup"|"patch"|"box"|"paper"|"blanket"|"cap"|"mirror"
//      mx, my: numara rozetinin konumunu elle belirler (opsiyonel)
//      real: kanıt toplama bulmacasında bu öğe gerçek kanıt mı (true), yanıltıcı mı (false);
//            bayraksız öğeler toplanamaz (ceset, araç...)
//   scene.evidence                   → olay yerinde toplanan kanıtlar {name, desc}
//   scene.notes / csi.notes / autopsy.notes / interrogation.notes
//                                    → uzmanlığa özel gizli notlar (yalnız o rolün cihazında görünür)
//   csi                              → Olay Yeri İnceleme Raporu
//   autopsy                          → Otopsi: dış/iç muayene
//   autopsy.injuries.external        → dış yüzey bulguları {x,y,label,kind}
//   autopsy.injuries.internal        → iskelet/iç organ bulguları {x,y,label,kind}
//   interrogation                    → POLİSİN YAPTIĞI sorgu tutanağı
//      {speaker, text, clue?, subject} → clue: ipucu saklayan satır; subject: o an sorgulanan şüphelinin id'si
//      interrogation.pressure        → kademeli sorgu turları {subject, minClues, records:[...]}
//         minClues: bu kadar ipucu işaretlenince tur açılır; records salt okunur ödül ifadesidir
//   timeline                         → zaman çizelgesi bulmacası: KRONOLOJİK sırayla olay metinleri
//   quiz                             → karar öncesi çapraz analiz soruları {q, options, correct}
//   elimination                      → eleme masası, SERBEST METİN {id, correct, keys}
//      correct: oyuncu doğru yazınca gösterilen tam gerekçe; keys: oyuncu metnini doğrulayan
//      anahtar kelimeler (culprit için "elenemez/katil" gibi ifadeler)
//   lab                              → kriminal laboratuvar bulmacası {sample, options, correct, note}
//   confrontation                    → eleme sonrası yüzleşme turu {statement, answer, why}
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
        { form: "desk", x: 2.9, y: 3.2, w: 1.7, h: 0.85, mx: 2.3, my: 2.95, label: "Çalışma masası", real: false },
        { form: "cup", x: 2.45, y: 3.35, label: "Yarım bardak çay", label2: "dibinde çökmüş toz", real: true },
        { form: "box", x: 3.4, y: 3.0, w: 0.42, h: 0.3, label: "Boş kilitli kutu", label2: "çekmecede", real: true },
        { form: "patch", x: 3.0, y: 1.05, w: 1.4, h: 1.6, label: "Çamur izleri", label2: "42 numara, kıyı kili", real: true },
        { form: "chair-fallen", x: 4.9, y: 1.35, rot: 70, label: "Devrik sandalye", real: true },
        { form: "shelf", x: 0.28, y: 2.2, w: 0.5, h: 2.4, label: "Kitaplık (arşiv)", real: false }
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
      ],
      notes: [
        "Çamur izleri pencereden masaya düz bir hatta gidip dönüyor — içeri giren kişi oyalanmadan çaya yöneldi.",
        "Devrik sandalyenin çevresinde çamur izi yok; sandalye kaçış sırasında aceleyle devrildi.",
        "Pencere çilesi haftalar önce gevşetilmiş — içeri giren kişi bu zayıflığı önceden biliyordu."
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
      ],
      notes: [
        "Kutunun kilidi ince bir uçla zorlanmadan açılmış — katilin ya anahtarı vardı ya da kilit açmakta usta.",
        "Bardaktaki çay Hale'nin ocağından; zehir demliğe değil, bardağa sonradan katıldı.",
        "Ruj izi oksitlenmiş, günler öncesine ait — çay lekesinin tazeliğiyle uyuşmuyor."
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
        + "kalp ritim bozukluğu ve solunum durmasına bağlıdır.",
      notes: [
        "Midedeki siyah tohumlar Datura ile birebir uyumlu; zehir yemekle değil, sıvıyla — çayla — alınmış.",
        "Kâbuslar ve dalgınlık iki haftadır sürüyordu: katil düşük dozlarla önceden alıştırma yapmış.",
        "Kalp sağlıklıydı; ritim bozukluğu zehrin sonucu, doğal bir kriz değil."
      ]
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
      ],
      pressure: [
        {
          subject: "kaan", minClues: 3, records: [
            { subject: "kaan", speaker: "Hakim A. Karan", text: "Kaan Bey, bir kez daha düşünün: o gece pencere tarafında hiç ışık ya da hareket gördünüz mü?" },
            { subject: "kaan", speaker: "Bekçi Kaan Yurt", text: "Arka cepheye bakmadım devriyede; ön kapıya odaklandım. Ama şimdi hatırlıyorum: dokuz buçukta ses geldiğinde ışık bir yanıp bir söner gibi oldu.", clue: true },
            { subject: "kaan", speaker: "Hakim A. Karan", text: "Arda Bey'in gece içeride kalması normal miydi?" },
            { subject: "kaan", speaker: "Bekçi Kaan Yurt", text: "Normaldi; kapıyı içeriden kilitler, çalışırdı. O yüzden kimse şüphelenmedi." }
          ]
        },
        {
          subject: "nermin", minClues: 6, records: [
            { subject: "nermin", speaker: "Hakim A. Karan", text: "Nermin Hanım, Fikret Bey'in elindeki bez torbayı biraz daha anlatın." },
            { subject: "nermin", speaker: "Nermin Kaya", text: "Küçük, koyu bir torbaydı; içinde şişe gibi bir şey vardı. Sabah çöpe attığını gördüm; çöpçüden önce karıştırmak istedim ama bulamadım.", clue: true },
            { subject: "nermin", speaker: "Hakim A. Karan", text: "Kutunun anahtarını Arda Bey'in üzerinde gördüğünüzden emin misiniz?" },
            { subject: "nermin", speaker: "Nermin Kaya", text: "Yeleğinin cebindeydi, zincirle bağlıydı. Anahtar hep cebindeydi; polis buldu mu bilmem." }
          ]
        },
        {
          subject: "hale", minClues: 9, records: [
            { subject: "hale", speaker: "Hakim A. Karan", text: "Hale Hanım, o akşamki müşteri dışında Fikret Bey'i ocağınızda hatırlıyor musunuz?" },
            { subject: "hale", speaker: "Hale Demirci", text: "Gelir arada; hep aynı şeyi söyler: 'Arda Abi'ye götürüyorum.' O akşam da aynı cümleyi duyunca garipsemedim.", clue: true },
            { subject: "hale", speaker: "Hakim A. Karan", text: "Çayı alan kişi sizce Arda Bey'i tanıyor muydu?" },
            { subject: "hale", speaker: "Hale Demirci", text: "İnce belli bardak istedi, şekersiz dedi. Tanıyan biri. Ama Arda'nın çay içmediğini bilen biri miydi... işte onu bilemem." }
          ]
        },
        {
          subject: "fikret", minClues: 12, records: [
            { subject: "fikret", speaker: "Hakim A. Karan", text: "Fikret Bey, Nermin Hanım'ın gördüğü bez torbayı hatırlıyor musunuz?" },
            { subject: "fikret", speaker: "Fikret Aksel", text: "Torba mı? Ben... çöp atmış olabilirim. Ne olduğunu hatırlamıyorum.", clue: true },
            { subject: "fikret", speaker: "Hakim A. Karan", text: "Son bir kez: perşembe gecesi kütüphaneye hiç girdiniz mi?" },
            { subject: "fikret", speaker: "Fikret Aksel", text: "Girmedim. Kaç kez söyleyeceğim? Avukatımı istiyorum." }
          ]
        }
      ],
      notes: [
        "Fikret, kimse söylemeden 'eksik evrak listesi' dedi — kutunun içeriğini katilden başkası bilmiyordu.",
        "Nermin, Fikret'i iki gece pencereye eğilirken gördü; elinde koyu bir bez torba vardı.",
        "Hale'den ekstra çayı alan kişi 'Arda Abi'ye götürüyorum' dedi — Fikret'in her zamanki cümlesi."
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
      + "ruj izi eski bir bardaktandı; ikisi de temize çıktı.",
    timeline: [
      "Eksik belgelerin listesi kutuya kondu.",
      "Geceleri pencere çilesi yoklandı; içeride sesler duyuldu.",
      "Kâbus ve dalgınlık şikâyeti doktor muayenesine taşındı.",
      "'Bu kutu benim sigortam' cümlesi kuruldu.",
      "Ocaktan iki bardak çay sipariş edildi.",
      "Pencerede eğilmiş bir gölge görüldü; içeriden tok bir ses geldi.",
      "Işık açık bulundu, 112 arandı."
    ],
    quiz: [
      {
        q: "Katil, içeriden kilitli kütüphaneye nasıl girdi?",
        options: ["Arka pencereden", "Yedek anahtarla", "İçeride saklanarak", "Ön kapıdan"],
        correct: "Arka pencereden"
      },
      {
        q: "Masadaki yarım bardak çay aslında neyin işaretiydi?",
        options: ["Arda çay içmezdi; bardak ona ait değildi", "Arda'nın misafiri sevdiğinin", "Bekçinin ikram ettiğinin", "Arda'nın son dileğinin"],
        correct: "Arda çay içmezdi; bardak ona ait değildi"
      },
      {
        q: "Kilitli kutunun içinde ne vardı?",
        options: ["Arşivden eksilen belgelerin listesi", "Arda'nın hasta günlüğü", "Bir miktar para", "Kutu her zaman boştu"],
        correct: "Arşivden eksilen belgelerin listesi"
      },
      {
        q: "Sorgulardaki hangi detay bilinçli bir yanıltmacaydı?",
        options: ["Esra'nın bardaktaki ruj izi", "Pencere önündeki çamur", "Devrik sandalye", "Hale'den çay siparişi"],
        correct: "Esra'nın bardaktaki ruj izi"
      },
      {
        q: "Fikret'i ele veren en belirgin dil sürçmesi hangisiydi?",
        options: ["Kimse söylemeden kutudaki 'eksik evrak listesi'nden bahsetmesi", "Arda'yı tanımadığını iddia etmesi", "Yanlış saatte çıktığını söylemesi", "Hale'nin ocağını inkâr etmesi"],
        correct: "Kimse söylemeden kutudaki 'eksik evrak listesi'nden bahsetmesi"
      },
      {
        q: "Olay yeri uzmanına göre çamur izlerinin yönü neyi gösteriyor?",
        options: ["İçeri giren kişi oyalanmadan çaya yöneldi", "Katil odada uzun süre arandı", "İçeri iki farklı kişi girdi", "İzler bekçiye ait"],
        correct: "İçeri giren kişi oyalanmadan çaya yöneldi"
      },
      {
        q: "Adli tıbba göre Arda'nın kâbusları iki haftadır neden sürüyordu?",
        options: ["Düşük doz zehirle önceden alıştırma yapılmıştı", "Arda zaten hasta biriydi", "Doktor yanlış ilaç vermişti", "Aşırı kahve tüketiyordu"],
        correct: "Düşük doz zehirle önceden alıştırma yapılmıştı"
      },
      {
        q: "Kriminal laboratuvara göre kutu kilidinin zorlanmamış olması neye işaret eder?",
        options: ["Katilin anahtarı vardı ya da kilit açmayı biliyordu", "Arda kutuyu kendisi açmıştı", "Kutu hep boştu", "Temizlikçi açık bırakmıştı"],
        correct: "Katilin anahtarı vardı ya da kilit açmayı biliyordu"
      }
    ],
    elimination: [
      {
        id: "kaan",
        correct: "Cesedi bulan ve 112'yi arayan kişi; çayın garipliğini fark edip soruşturmayı o başlattı.",
        keys: ["bulan", "112", "ihbar", "haber", "ilk giren"]
      },
      {
        id: "kenan",
        correct: "Çizmesi 44 numara; pencere önündeki iz 42 numara spor ayakkabı.",
        keys: ["44", "kırk dört", "çizme"]
      },
      {
        id: "esra",
        correct: "Ruj izi günler önceki bardaktan; papatya dışında hiçbir şey önermedi, kâbusların sebebini bilmiyordu.",
        keys: ["ruj", "papatya", "eski bardak"]
      },
      {
        id: "nermin",
        correct: "O gece evdeydi; kocası ve komşusu şahit. Fikret'i yalnızca pencerede gördü.",
        keys: ["evde", "koca", "komşu", "şahit"]
      },
      {
        id: "hale",
        correct: "Demliğine her akşam mühür vuruyor; çay temizdi, zehir sonradan katıldı.",
        keys: ["mühür", "demlik", "ocak"]
      },
      {
        id: "tolga",
        correct: "Ayakkabısı 43 numara; iz 42. O gece bahçeye basmadı, gölgeyi görünce kaçtı.",
        keys: ["43", "kırk üç", "kaçtı"]
      },
      {
        id: "fikret",
        correct: "Elenemez: 42 numara iz, çay siparişi, kutu bilgisi ve pencere çilesi onu işaret ediyor.",
        keys: ["elenemez", "katil", "işaret", "o yaptı", "suçlu"]
      }
    ],
    lab: [
      {
        sample: "Bardak içi sıvı",
        options: ["Atropin / skopolamin alkaloitleri", "Yalnızca kafein", "Barbitürat türevi", "Etil alkol"],
        correct: "Atropin / skopolamin alkaloitleri",
        note: "Dibinde çöken toz, Datura kaynaklı alkaloitlerle eşleşti."
      },
      {
        sample: "Çamur kazınması",
        options: ["Kıyı kili + 42 numara taban", "Bahçe toprağı + 44 numara çizme", "İnşaat tozu", "Şebeke suyu kalıntısı"],
        correct: "Kıyı kili + 42 numara taban",
        note: "Kil türü yalnız kıyıya özgü; Kenan'ın çizmesi 44 numara."
      },
      {
        sample: "Bardak kenarı ruj izi",
        options: ["Eski iz — Dr. Esra'nın tonuyla uyumlu", "Taze iz — kimliği belirsiz", "Ruj değil, boya lekesi"],
        correct: "Eski iz — Dr. Esra'nın tonuyla uyumlu",
        note: "İz oksitlenmiş; günler önceki bir bardaktan kalma."
      },
      {
        sample: "Kutu kilidi",
        options: ["İnce uçla açılmış, parmak izi yok", "Çekiçle zorlanmış", "Kilit mekanizması kırık", "Çok sayıda parmak izi var"],
        correct: "İnce uçla açılmış, parmak izi yok",
        note: "Zorlama yok: katilin ya anahtarı vardı ya da eli kilit açmaya yatkın."
      },
      {
        sample: "Datura tohum kesesi",
        options: ["Taze koparılmış — son bir hafta", "Aylar önce kurumuş", "Market ürünü, ambalajlı"],
        correct: "Taze koparılmış — son bir hafta",
        note: "Bahçedeki öbekten yakın zamanda koparılmış; keseler eksik."
      }
    ],
    confrontation: [
      { statement: "Fikret, cinayetten önce haftalarca gece kutuyu aradı.", answer: true, why: "Arda'nın duyduğu sesler ve Nermin'in iki gece üst üste görmesi bunu kanıtlıyor." },
      { statement: "Zehir, Hale'nin ocağında demliğe katıldı.", answer: false, why: "Demlik her akşam mühürleniyor; zehir bardağa sonradan katıldı." },
      { statement: "Kutunun içinde Arda'nın hasta günlüğü vardı.", answer: false, why: "İçinde arşivden eksilen belgelerin listesi vardı; Kenan'ın tahmini yanlıştı." },
      { statement: "Katil, kutunun anahtarını bulamadan kilidi ince uçla açtı.", answer: true, why: "Anahtar zincirle Arda'nın yelek cebindeydi; kilitte zorlama izi yok." }
    ]
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
        { form: "paper", x: 4.0, y: 5.05, w: 0.5, h: 0.38, mx: 5.45, my: 5.25, label: "Dünkü gazete", label2: "yolcu koltuğunda açık", real: true },
        { form: "mirror", x: 3.5, y: 4.45, w: 0.34, h: 0.16, mx: 5.45, my: 6.35, label: "Dikiz aynası", label2: "arka koltuğa dönük", real: true },
        { form: "blanket", x: 3.5, y: 7.35, w: 1.3, h: 0.65, mx: 5.45, my: 7.45, label: "Battaniye", label2: "arka koltukta sarılı", real: false },
        { form: "cap", x: 4.62, y: 7.7, mx: 5.45, my: 8.55, label: "Benzin kapağı", label2: "kapatılmamış", real: true }
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
      ],
      notes: [
        "Sürücü kapısının yanındaki yarım taban izi otopark çıkışına dönük — sahneyi düzenleyen kişi aceleyle ayrıldı.",
        "Dikiz aynası uzun boylu birine göre ayarlı; Ferman kısa boyluydu, bu ayar onun olamaz.",
        "Gazete dünkü tarihli ama sayfalar yeni açılmış gibi düzgün — sahneye sonradan kondu."
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
      ],
      notes: [
        "Benzin kapağının vida dişine takılan bez lifi havsız — kapak iz bırakmamak için bezle açıldı.",
        "Tütün kokusu döşemeye değil havaya sinmiş: kapı açıkken içilmiş, içen araca binmemiş.",
        "Araçta izmarit yok; vanilya kokusu ise Selin'in her zamanki parfümü."
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
        + "Ölüm ilacın solunumu baskılamasıyla gelişti. Karbon monoksit düzeyi ölçülmedi.",
      notes: [
        "Mide boş; ilaç yemekle değil, öğleden sonra içirilen çayla alındı.",
        "Düşük vücut ısısı sedasyonla uyumlu — soğuktan donma değil, ilaç kaynaklı.",
        "Karaciğerdeki yoğun ilaç birikimi, dozun tek seferde ve yüksek verildiğini gösteriyor."
      ]
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
      ],
      pressure: [
        {
          subject: "mert", minClues: 3, records: [
            { subject: "mert", speaker: "Hakim A. Karan", text: "Mert Bey, Ferman'ın yakıt aldığı saati tam hatırlıyor musunuz? Kaydınız var mı?" },
            { subject: "mert", speaker: "Mert Benzinci", text: "Kayıt sistemimizde var: on beş kırk iki. Ferman yalnızdı; pompaya arkasından yaklaşan da olmadı.", clue: true },
            { subject: "mert", speaker: "Hakim A. Karan", text: "Koyu paltolu adamın su aldığı saat kaçtı?" },
            { subject: "mert", speaker: "Mert Benzinci", text: "Ona da bakarız... on sekiz elli beş. Yani adam, otoparkta görüldüğü saatten hemen önce marketteydi.", clue: true }
          ]
        },
        {
          subject: "nazan", minClues: 6, records: [
            { subject: "nazan", speaker: "Hakim A. Karan", text: "Nazan Hanım, o uzun adamın sesiyle ilgili bir şey daha: tanıdık geliyor muydu?" },
            { subject: "nazan", speaker: "Eczacı Nazan", text: "Şimdi düşününce... buyurgan bir tonu vardı, patron gibi konuşuyordu. Sokaktan biri değildi.", clue: true },
            { subject: "nazan", speaker: "Hakim A. Karan", text: "Adamın saati dışında dikkatinizi çeken bir aksesuar var mıydı?" },
            { subject: "nazan", speaker: "Eczacı Nazan", text: "Yüzüğü yoktu; parmakları bakımlıydı. Paltonun yakası kalkıktı, çıkarken de düzeltmedi." }
          ]
        },
        {
          subject: "yusuf", minClues: 9, records: [
            { subject: "yusuf", speaker: "Hakim A. Karan", text: "Yusuf Bey, gece otoparka araç girişi oldu mu hiç?" },
            { subject: "yusuf", speaker: "Yusuf", text: "O saatte otopark boştu; gelen tek araç yoktu. Yaya bir tek o adamdı — yani yürüyerek geldi.", clue: true },
            { subject: "yusuf", speaker: "Hakim A. Karan", text: "Sabah polisi aradığınız saat kaçtı? Başka kimi aradınız?" },
            { subject: "yusuf", speaker: "Yusuf", text: "Altıyı on geçe aradım 155'i. Öncesinde Ferman'ın kapısını tıklattım, cevap yoktu. Başka kimseyi aramadım.", clue: true }
          ]
        },
        {
          subject: "kadir", minClues: 12, records: [
            { subject: "kadir", speaker: "Hakim A. Karan", text: "Kadir Bey, garaj kamerasının kayıtlarını istedik. Perşembe sabahı kaç dakika göründüğünüzü tahmin edin." },
            { subject: "kadir", speaker: "Kadir Alaz", text: "Beş dakika dedim ya. Kamera varsa çıkar. Neden uzatıyorsunuz?", clue: true },
            { subject: "kadir", speaker: "Hakim A. Karan", text: "Ferman'ı dilekçeden vazgeçirmek için hiç konuştunuz mu?" },
            { subject: "kadir", speaker: "Kadir Alaz", text: "Dilekçe olduğunu sizden duyuyorum. Avukatımla görüşmeden başka cevap yok." }
          ]
        }
      ],
      notes: [
        "Nazan'ın verdiği damla yeşilimsi; Selin'in kullandığı şişe renksizdi — şişe değiştirilmiş.",
        "Yusuf, yedi sularında uzun boylu, paltolu bir adamı sürücü kapısına eğilirken gördü.",
        "Kadir, polisin açıklamadığı 'motor çalışıyordu' detayını önceden bildi ve 'Yusuf aradı' yalanı tutanakla çürüdü."
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
      + "vanilya Selin'den; ikisi de yanıltıcıydı.",
    timeline: [
      "Dilekçe kararı verildi.",
      "Defterler soruldu, bilgi ölçüldü.",
      "Eczaneden reçetesiz ilaç istendi, reddedildi.",
      "Garajda bir şişe değiştirildi.",
      "Çaya damla damlatıldı.",
      "Ayna ayarlandı, kapak açıldı, motor çalışır bırakıldı.",
      "Motor uğultusuyla araç bulundu; polis arandı."
    ],
    quiz: [
      {
        q: "Zehir Ferman'ın vücuduna nasıl girdi?",
        options: ["Çayına damlatılan uyku damlasıyla", "Benzin istasyonundaki kahveyle", "Enjeksiyonla", "Selin'in getirdiği yemekle"],
        correct: "Çayına damlatılan uyku damlasıyla"
      },
      {
        q: "Damlalık şişesinin değiştirildiğini kesin olarak ne gösterdi?",
        options: ["Nazan'ın şişesi yeşilimsiydi; kullanılan şişe renksizdi", "Ferman'ın parmak izleri", "İstasyon kamerası kayıtları", "Yusuf'un ifadesi"],
        correct: "Nazan'ın şişesi yeşilimsiydi; kullanılan şişe renksizdi"
      },
      {
        q: "Dikiz aynasının açısı neyi kanıtladı?",
        options: ["Aynayı uzun boylu birinin ayarladığını", "Ferman'ın arka koltuğa baktığını", "Aynanın kırık olduğunu", "Katilin kısa boylu olduğunu"],
        correct: "Aynayı uzun boylu birinin ayarladığını"
      },
      {
        q: "Araç içindeki tütün ve vanilya kokuları neydi?",
        options: ["Yanıltmaca; ikisi de başka kişilerden geliyordu", "Katilin bıraktığı izler", "Ferman'ın kendi kokuları", "Motor arızasının işareti"],
        correct: "Yanıltmaca; ikisi de başka kişilerden geliyordu"
      },
      {
        q: "Kadir'i ele veren en belirgin açık neydi?",
        options: ["Motorun çalıştığını bilmesi ve 'Yusuf aradı' demesi — Yusuf kimseyi aramamıştı", "Ferman'ı tanımadığını söylemesi", "Garaja yanlış araçla gelmesi", "Palto giydiğini inkâr etmesi"],
        correct: "Motorun çalıştığını bilmesi ve 'Yusuf aradı' demesi — Yusuf kimseyi aramamıştı"
      },
      {
        q: "Olay yeri uzmanına göre yarım taban izi neyi gösteriyor?",
        options: ["Sahneyi düzenleyen kişi aceleyle ayrıldı", "Ferman araçtan inip yürüdü", "Yusuf araca yaklaştı", "Polis geç geldi"],
        correct: "Sahneyi düzenleyen kişi aceleyle ayrıldı"
      },
      {
        q: "Kriminal laboratuvara göre benzin kapağındaki bez lifi ne anlama geliyor?",
        options: ["Kapak iz bırakmamak için bezle açıldı", "Ferman'ın ceketinden düştü", "Battaniyeden koptu", "Eski bir iz"],
        correct: "Kapak iz bırakmamak için bezle açıldı"
      },
      {
        q: "Adli tıbba göre ilacın alınma biçimi neydi?",
        options: ["Öğleden sonra içirilen çayla, tek yüksek dozda", "Yemekle birlikte yavaş yavaş", "Solunum yoluyla", "Enjeksiyonla"],
        correct: "Öğleden sonra içirilen çayla, tek yüksek dozda"
      }
    ],
    elimination: [
      {
        id: "mert",
        correct: "Benzin kapağını istasyonda kendisi kapattı; kayıtlar o saatten sonra pompaya araç yaklaşmadığını gösteriyor.",
        keys: ["kapattı", "kayıt", "pompa", "istasyon"]
      },
      {
        id: "selin",
        correct: "Damlalığı kardeşinin kendi ilacı sanarak kullandı; şişe çoktan değiştirilmişti, kapıyı da kilitlemediğini açıkça anlattı.",
        keys: ["değiştirilmiş", "kendi ilacı", "sandı", "şişe"]
      },
      {
        id: "nazan",
        correct: "Reçetesiz ilacı reddetti; kendi verdiği şişe yeşilimsiydi ve olayda kullanılmadı.",
        keys: ["reddetti", "reçetesiz", "yeşil", "envanter"]
      },
      {
        id: "yusuf",
        correct: "Gece boyu kulübedeydi; tütün kokusu kulübesinden geldi, araca girmedi ve yalnız polisi aradı.",
        keys: ["kulübe", "polisi aradı", "155", "girmedi"]
      },
      {
        id: "feride",
        correct: "Ferman'ı en son iki gün önce gördü; o gece evdeydi, annesi ve telefon kayıtları şahit.",
        keys: ["anne", "telefon", "iki gün", "evde"]
      },
      {
        id: "baran",
        correct: "Sekizde yalnızca camdan bakıp uyandırmadı; Ferman'ın en yakın arkadaşıydı ve dilekçeyi destekliyordu.",
        keys: ["cam", "uyandırmadı", "arkadaş", "sekiz"]
      },
      {
        id: "kadir",
        correct: "Elenemez: şişe değişimi, ayna ayarı, benzin kapağı ve motor detayı bilgisi onu işaret ediyor.",
        keys: ["elenemez", "katil", "işaret", "o yaptı", "suçlu"]
      }
    ],
    lab: [
      {
        sample: "Kan örneği",
        options: ["Flunitrazepam + metaboliti", "Yalnızca etil alkol", "Karbon monoksit", "Antidepresan"],
        correct: "Flunitrazepam + metaboliti",
        note: "78 ng/ml — uyku dozunun çok üzerinde, toksik aralıkta."
      },
      {
        sample: "Benzin kapağı lifi",
        options: ["Havsız silme bezi — araçta yok", "Ferman'ın ceketi", "Battaniye lifi", "Koltuk kumaşı"],
        correct: "Havsız silme bezi — araçta yok",
        note: "Kapak, parmak izi bırakmamak için bezle açılmış."
      },
      {
        sample: "Yarım taban izi",
        options: ["44-45 numara, çıkışa dönük", "42 numara, araca dönük", "Ferman'ın kendi ayakkabısı", "Kadın topuğu"],
        correct: "44-45 numara, çıkışa dönük",
        note: "Sahneyi düzenleyen kişi işini bitirip aceleyle ayrılmış."
      },
      {
        sample: "Ayna düğmesi sürüntüsü",
        options: ["Silinmiş ama yarım avuç izi kaldı", "Yalnızca Ferman'ın parmak izi", "Hiç iz yok", "Selin'in avuç izi"],
        correct: "Silinmiş ama yarım avuç izi kaldı",
        note: "Katil sildi ama tamamen yok edemedi."
      },
      {
        sample: "Battaniye lifi",
        options: ["Ferman'a ait — üçüncü kişi izi yok", "Kadir'in paltosuna ait", "Kan bulaşmış", "Yanık izi var"],
        correct: "Ferman'a ait — üçüncü kişi izi yok",
        note: "Battaniye yanıltıcı; kurbanın kendi battaniyesi."
      }
    ],
    confrontation: [
      { statement: "Selin, kardeşini bilerek zehirledi.", answer: false, why: "Şişe değiştirilmişti; Selin kendi uyku damlası sandı." },
      { statement: "Uyku damlası şişesi perşembe sabahı değiştirildi.", answer: true, why: "Kadir sabah garaja uğradı; Selin çayı dörtte içirdi." },
      { statement: "Dikiz aynasındaki ayar Ferman'a aitti.", answer: false, why: "Ferman kısa boyluydu; ayna arka koltuğu gösterecek biçimde, uzun birine göre ayarlandı." },
      { statement: "Kadir, Ferman'ın cuma günü vereceği dilekçeden korkuyordu.", answer: true, why: "Baran da Feride de dilekçeyi ve Kadir'in korkusunu doğruladı." }
    ]
  },
  {
    id: 3,
    title: "Fener Otelinde Son Gece",
    teaser: "304 numaralı odanın balkonu, yıkanmış bir çay bardağı ve terasta yatan emekli "
      + "bir hâkim. Selim Deniz düştü mü, yoksa çok daha önce mi öldürüldü?",
    story: "Emekli ağır ceza hâkimi Selim Deniz (67), Deniz Feneri Oteli'nin 304 numaralı "
      + "odasının balkonunun altındaki taş terasta, sabah 06:10'da bulundu. Bir haftadır "
      + "otelde kalıyordu: her sabah sahilde yürüyüşe çıkar, her akşam balkonunda ıhlamur "
      + "çayı içerdi. Balkon kapısı açık, balkondaki iki sandalyeden biri devrik, küçük masanın "
      + "üzerindeki tepside yıkanmış bir çay bardağı duruyordu. İlk izlenim 'kazaen düşme' "
      + "oldu; ancak gece bekçisi Haluk, 04:15'te teras yönünden ağır bir gürültü duyduğunu, "
      + "03:30 civarında da servis merdiveni yanında 'olmaması gereken' birini gördüğünü "
      + "söyledi. Selim Deniz, on beş yıl önceki ünlü 'Liman Davası'nın hâkimi olarak "
      + "tanınıyordu; o dava iki ailenin ocağına ateş düşürmüştü.",
    scene: {
      summary: "304 numaralı oda 4x5 m; balkon kuzey cephede. Balkon kapısı açık, "
        + "sandalyelerden biri devrik, küçük masada yıkanmış çay bardağı olan tepsi var. "
        + "Ceset balkonun hemen altındaki taş terasta. Odada zorlanma izi yok; balkon "
        + "korkuluğu 1,1 m yüksekliğinde.",
      plan: {
        caption: "Deniz Feneri Oteli — 304 numaralı oda + balkon",
        w: 6, d: 6.5, enclosed: true,
        features: [
          { kind: "door", wall: "G", from: 2.4, to: 3.3, label: "Oda kapısı" },
          { kind: "window", wall: "B", from: 2.6, to: 4.2, label: "Batı penceresi" },
          { kind: "line", x1: 0, y1: 1.5, x2: 2.0, y2: 1.5 },
          { kind: "line", x1: 4.0, y1: 1.5, x2: 6, y2: 1.5 },
          { kind: "line", x1: 2.0, y1: 1.5, x2: 2.0, y2: 0.02 },
          { kind: "line", x1: 4.0, y1: 1.5, x2: 4.0, y2: 0.02 }
        ]
      },
      objects: [
        { form: "desk", x: 2.7, y: 0.55, w: 0.8, h: 0.5, mx: 1.5, my: 0.5, label: "Balkon masası", label2: "üzerinde tepsi", real: false },
        { form: "cup", x: 2.7, y: 0.55, mx: 4.6, my: 0.4, label: "Çay bardağı", label2: "yıkanmış, tepside", real: true },
        { form: "chair", x: 2.35, y: 1.1, mx: 1.4, my: 1.25, label: "Sandalye", label2: "balkonda, dolu", real: false },
        { form: "chair-fallen", x: 3.5, y: 0.9, mx: 4.7, my: 1.1, label: "Devrik sandalye", label2: "balkon masasının yanı", real: true },
        { form: "patch", x: 3.3, y: 0.32, w: 0.5, h: 0.3, mx: 5.1, my: 0.25, label: "Yarım taban izi", label2: "korkuluk dibinde", real: true },
        { form: "shelf", x: 0.55, y: 4.6, w: 0.5, h: 1.6, mx: 1.3, my: 5.3, label: "Gardırop", label2: "kapaklar kapalı", real: false }
      ],
      evidence: [
        { name: "Yıkanmış çay bardağı", desc: "Tepsi gece boyu balkonda kaldığı halde bardak tertemiz; ıhlamur kokusu sürüyor. Toz ve çay tortusu yok." },
        { name: "Devrik sandalye", desc: "Balkon masasının yanında; biri aceleyle kalkmış ya da sahne düzenlenmiş gibi." },
        { name: "Balkon korkuluğu", desc: "1,1 m yüksekliğinde; 1,72 m boyundaki Selim'in üzerinden 'kazayla' aşması için kaldırılması ya da itilmesi gerekir." },
        { name: "Açık balkon kapısı", desc: "Zorlanma yok; oda kapısı kapalı ama kilitli değil. İçeride dağılmış eşya yok." },
        { name: "Kesik yüksükotu sapları", desc: "Otel bahçesindeki yüksükotlarından üç sap taze kesilmiş; kesik yerinde hâlâ öz su var." }
      ],
      notes: [
        "Yıkanmış bardak sahnelemenin ilk çatlağı: gece boyu dışarıda kalan tepside toz olurdu.",
        "Korkuluk 1,1 m; 1,72 m boyundaki Selim'in üzerinden 'kazayla' aşması için kaldırılması gerekir.",
        "Devrik sandalye masanın yanına iliştirilmiş — biri aceleyle kalkmış gibi dursun diye."
      ]
    },
    csi: {
      examiner: "Olay Yeri İnceleme Görevlisi T. Aksoy",
      date: "Vaka günü 08:30",
      finding: "Odada zorlanma izi yok; balkon kapısı açık bırakılmış. Tepsideki bardak "
        + "yıkanmış: parmak izi taraması sonuçsuz, bez lifi de bulunamadı. Balkon "
        + "korkuluğunun dış yüzeyinde koyu renkli kumaş lifi ve korkuluk dibinde yarım taban "
        + "izi (43-44 numara) saptandı. Servis merdiveninin sahanlığında taze sürtünme "
        + "izleri var. Bahçede yüksükotu (Digitalis) öbeğinden üç sap kesilmiş; kesim aleti "
        + "aranıyor. Otel giriş ve servis kapısı kameraları incelemede.",
      items: [
        "Bardak içi sürüntü: laboratuvara",
        "Korkuluk lifi: kriminal lif analizi",
        "Korkuluk dibi taban izi: alçı kalıp",
        "Servis merdiveni sürtünme izleri: adli fotoğraf",
        "Yüksükotu sapları: botanik örnek",
        "Kamera kayıtları: giriş + servis kapısı"
      ],
      notes: [
        "Bardak silinmiş: parmak izi yok, bez lifi yok — dikkatli bir el tarafından yıkandı.",
        "Korkuluktaki koyu kumaş lifi garson üniformasıyla eşleşiyor.",
        "Servis merdiveni sahanlığındaki sürtünme izleri taze: o gece ağır bir şey taşındı."
      ]
    },
    autopsy: {
      victim: { age: 67, height: 172, weight: 78 },
      pathologist: "Doç. Dr. E. Özkan, Adli Tıp Kurumu",
      date: "Vaka günü 11:30",
      external: "Erkek, 67 yaş, 172 cm, 78 kg. Yüksekten düşme ile uyumlu yaralanmalar: "
        + "sağ bacak ve kalçada çoklu kırık, sağ omuzda geniş ekimoz. Ancak ekimozların "
        + "rengi soluk; yara çevresinde belirgin yaşamsal tepki yok. Ellerde ve tırnak "
        + "aralarında savunma izi yok. Göz bebekleri geniş ve sabit.",
      internal: "Kalp hafif büyümüş; karıncık iç yüzünde peteşiyal kanamalar. Midede ıhlamur "
        + "kokulu yaklaşık 150 ml sıvı; mide mukozası konjesyone. Kan, karaciğer ve böbrek "
        + "örnekleri toksikolojiye gönderildi.",
      injuries: {
        external: [
          { x: 30, y: 20, kind: "mydriasis", label: "Geniş ve sabit göz bebekleri" },
          { x: 22, y: 55, kind: "cold", label: "Ekimozlar soluk; yaşamsal tepki zayıf" },
          { x: 75, y: 78, kind: "flush", label: "Sağ bacak ve kalçada çoklu kırık" }
        ],
        internal: [
          { x: 50, y: 62, kind: "heart", label: "Karıncık iç yüzünde peteşiyal kanamalar" },
          { x: 62, y: 92, kind: "stomach", label: "Mide: ıhlamur kokulu sıvı, konjesyone mukoza" },
          { x: 78, y: 88, kind: "liver", label: "Karaciğer: yüksek ilaç konsantrasyonu" }
        ]
      },
      toxicology: [
        ["Digoksin (serum)",        "6,4 ng/ml",  "Terapötik 0,5–2,0 ng/ml", "Yüksek, toksik"],
        ["Digitoksin metabolitleri", "pozitif",    "bitkisel kaynak işaretçisi", "Kanıt"],
        ["Ihlamur (tilia) artığı",   "pozitif",    "mide içeriği",             "Çay"],
        ["Etil alkol",               "negatif",    "—",                         "—"],
        ["Sedatifler",               "negatif",    "—",                         "—"]
      ],
      causeNote: "Ölüm, yüksek doz digoksinin yol açtığı kalp ritim bozukluğuna bağlıdır. "
        + "Düşmeye bağlı yaralanmalarda yaşamsal tepki yok; düşme ölüm sonrasında "
        + "gerçekleşmiştir. Ölüm zamanı 00:30–01:00 civarıdır — 04:15 değil.",
      notes: [
        "Ekimozlar soluk ve yaşamsal tepki yok: düşme, ölüm gerçekleştikten sonra.",
        "Kalpte peteşi + yüksek digoksin: ölüm ritim bozukluğundan.",
        "Ellerde savunma izi yok: Selim çırpınmadı; bilincini çoktan kaybetmişti."
      ]
    },
    deathCauses: [
      "Digoksin (yüksükotu) zehirlenmesi",
      "Yüksekten düşmeye bağlı ölüm (çoklu travma)",
      "Kalp krizi (miyokard enfarktüsü)",
      "İlaç etkisiyle kazaen düşme"
    ],
    deathCauseCorrect: "Digoksin (yüksükotu) zehirlenmesi",
    motives: [
      "Liman Davası'nda Selim'in hapse gönderdiği babasının intikamını almak",
      "Kurbanın mirasına konmak",
      "Otelin mülkiyetini ele geçirmek",
      "Eski bir davayı susturmak"
    ],
    motiveCorrect: "Liman Davası'nda Selim'in hapse gönderdiği babasının intikamını almak",
    interrogation: {
      officer: "Sorgu Hakimi A. Karan, Emniyet Müdürlüğü",
      date: "Vaka günü 15:00",
      records: [
        { subject: "nesli", speaker: "Hakim A. Karan", text: "Nesli Hanım, kurban bir haftadır otelinizde kalıyordu. Onu tanıyor muydunuz?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Kayıt gününde tanıdım. Selim Deniz — Liman Davası'nın hâkimi. On beş yıl önce kardeşimi hapse gönderdi; kardeşim on iki yıl yattı, çıktıktan sonra yıkıldı. Saklamadım: geldiği gün yüzüne tükürdüm." },
        { subject: "nesli", speaker: "Hakim A. Karan", text: "Yüzüne tükürdünüz. Sonra?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Sonra hiçbir şey. Bana baktı, 'o davayı hatırlıyorum' dedi, odasına çıktı. Sevmem ama öldürmem; öldüren, karşısındakine benzer." },
        { subject: "nesli", speaker: "Hakim A. Karan", text: "Perşembe akşamı neredeydiniz?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Otel hesaplarını kapatıp dokuzda çıktım; giriş kamerası gösterir. Evime gittim; kızım ona doğru bana geldi, sabaha kadar beraberdik.", clue: true },
        { subject: "nesli", speaker: "Hakim A. Karan", text: "Selim Bey'in akşam çayı ritüelini biliyor muydunuz?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Bilmeyen yoktu. Her akşam on gibi balkonda ıhlamur; çayı Recep götürürdü. Selim Bey onu severdi, 'bu çocuk dikkatli' derdi.", clue: true },
        { subject: "nesli", speaker: "Hakim A. Karan", text: "Selim Deniz'e kırgın başka kim var?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Liman Davası'nda içeri girenlerin aileleri. İki aileydi: benimki ve bir diğeri. Fazlasını söylemeyeyim." },
        { subject: "nesli", speaker: "Hakim A. Karan", text: "O gece olağan dışı bir şey fark ettiniz mi?" },
        { subject: "nesli", speaker: "Nesli Arslan", text: "Etmedim; otelde bile değildim. Sabah polis aradı; önce inanamadım, düştü sandım." },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "Doktor Vedat, kurbanın eski dostusunuz. Onu en son ne zaman gördünüz?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Perşembe öğleden sonra dörtte. Odasına çıktım, tansiyonuna baktım, sohbet ettik. Kalbi biraz yorgundu; 'kendini zorlama' dedim. Beşte ayrıldım." },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "Neler konuştunuz?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Eski günleri, Liman Davası'nı. 'Vedat, o davada görevimi yaptım ama geceleri uyuyamadığım oluyor' dedi. Son zamanlarda çok düşünür olmuştu." },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "Digoksin reçete eder misiniz?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Ederim; kalp hastalarına, düşük dozda. Kliniğimdeki dolap kilitlidir, defterle sayarım. Polis kontrol etti: envanter tam, tek ampul eksik değil.", clue: true },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "Selim Bey digoksin kullanıyor muydu?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Hayır. Selim tansiyon ilacı kullanırdı, digoksin değil. Kan düzeyi yüksekse dışarıdan gelmiştir; benim dolabımdan da değildir.", clue: true },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "O gece neredeydiniz?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Akşam sekizden sabaha kadar hastanede nöbetteydim; nöbet defteri ve hemşireler doğrular. Hastaneden yalnızca dokuza doğru, yemek için yirmi dakika çıktım." },
        { subject: "vedat", speaker: "Hakim A. Karan", text: "Balkon, çay... Düşmeye yorumunuz?" },
        { subject: "vedat", speaker: "Dr. Vedat", text: "Selim yüksekten korkardı; balkon korkuluğuna yaslanmazdı bile. 'Düşmek mi? Ne münasebet' derdi. Düştüyse, biri yardım etmiştir." },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Recep, o akşam çayı sen götürdün. Ritüeli anlat." },
        { subject: "recep", speaker: "Recep Yaman", text: "Selim Bey her akşam on gibi ıhlamur içerdi. Ben demlerdim, tepsiyle balkona bırakırdım. Bahşişi boldu. O akşam da her zamanki gibiydi." },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Çayı saat kaçta götürdünüz?" },
        { subject: "recep", speaker: "Recep Yaman", text: "On gibi. Kapıyı tıklattım, açtı, tepsiyi aldı. 'İyi geceler evlat' dedi. Son görüşüm oydu." },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Çayda bir gariplik fark ettiniz mi?" },
        { subject: "recep", speaker: "Recep Yaman", text: "Tadımlık aldı, 'biraz acı olmuş' dedi. Ben de 'ıhlamur yeni mahsul, ondan beyim' dedim. Güldü, 'peki öyle olsun' dedi.", clue: true },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Otelden saat kaçta ayrıldınız?" },
        { subject: "recep", speaker: "Recep Yaman", text: "Vardiyam on birde bitti. Çıkışımı yaptım, ön kapıdan çıktım. Kamera gösterir.", clue: true },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Haluk Bey 03:30'da servis merdiveni yanında birini görmüş." },
        { subject: "recep", speaker: "Recep Yaman", text: "Ben değildim. Ben saatler önce çıkmıştım. Haluk yaşlıdır, gözü iyi görmez. Belki kedidir." },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Otel bahçesinde yüksükotu var. Bilir misiniz?" },
        { subject: "recep", speaker: "Recep Yaman", text: "Mor çiçekli, güzel ama tehlikeli bir bitki; bahçıvan 'dokunmayın, kalbi durdurur' derdi. Ben hiç dokunmadım.", clue: true },
        { subject: "recep", speaker: "Hakim A. Karan", text: "Liman Davası size bir şey ifade ediyor mu?" },
        { subject: "recep", speaker: "Recep Yaman", text: "Yıllar önceki ünlü dava; duymuşluğum var. Neden sordunuz, benimle ne ilgisi var?" },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "Müjde Hanım, cesedi siz buldunuz. Anlatın." },
        { subject: "mujde", speaker: "Müjde", text: "Sabah altıda temizliğe başlarım. Terasa çıktığımda gördüm; bağırdım, elimdeki bez düştü. Yaklaşmadım, koşup Haluk'u çağırdım." },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "Perşembe günü 304'ü temizlediniz mi?" },
        { subject: "mujde", speaker: "Müjde", text: "Öğlen temizledim. Selim Bey'in odası hep düzenliydi; çöpünü boşalttım, havlularını değiştirdim. Olağan dışı bir şey yoktu." },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "Balkondaki çay bardağı — siz mi topladınız?" },
        { subject: "mujde", speaker: "Müjde", text: "Sabah tepsiyi ben topladım. Bardak tertemizdi, ıhlamur kokuyordu. Garibime gitti: gece boyu dışarıda kalan tepside toz olur; bu silinmişti.", clue: true },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "O akşam kimseyi gördünüz mü?" },
        { subject: "mujde", speaker: "Müjde", text: "Ben akşam altıda çıkarım; akşamı görmem. Ama perşembe öğlen odayı temizlerken koridorda Recep Bey'le Selim Bey'i duydum; sesleri alçaktı ama gergindi.", clue: true },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "Selim Bey personele nasıl davranırdı?" },
        { subject: "mujde", speaker: "Müjde", text: "Kibar, sessiz. Hepimizi adımızla sorardı. En çok Recep'i severdi; 'o çocuk dikkatli' derdi." },
        { subject: "mujde", speaker: "Hakim A. Karan", text: "Bahçede, çiçeklerde dikkatinizi çeken bir şey var mı?" },
        { subject: "mujde", speaker: "Müjde", text: "Ben bahçeye bakmam ama cuma sabahı çiçek tarhı karışmıştı; mor çiçek sapları kesilmişti. Bahçıvan kesmiştir sandım." },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Ferit Bey, kurbanın yeğenisiniz. Aranız nasıldı?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Dayım sert adamdı. Miras yüzünden aramızda gerginlik vardı, inkâr etmem. Ama yine de dayımdı." },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Perşembe akşamı ziyaret ettiniz. Ne konuştunuz?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Sekizde geldim. Yazlıktan yine açtım konusunu; sinirlendi, 'malımın gözüne bakıyorsun' dedi. Tartıştık. Dokuzda çıktım." },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Çıkışınızı gören var mı?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Giriş kamerası. Doğruca şehirdeki bara gittim; ikiye kadar oradaydım. Fişim poliste, barmen beni tanır.", clue: true },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Dayınızın parası size ne zaman kalacaktı?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Vasiyet var mı onu bile bilmiyorum; 'hepsini vakfa bırakacağım' der, benimle dalga geçerdi. Bakın, para için öldürecek olsam kameraya görünmediğim bir gece seçmez miydim?", clue: true },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Dayınıza kırgın birini biliyor musunuz?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Liman Davası. O davada adam mahkûm etti; emekli olunca 'bir gün beni bulurlar' derdi. Ben şaka sanırdım." },
        { subject: "ferit", speaker: "Hakim A. Karan", text: "Otelde dikkatinizi çeken bir şey oldu mu?" },
        { subject: "ferit", speaker: "Ferit Deniz", text: "Garson. Odadan çıkarken koridorda masaları topluyordu; bizim tartışmayı izlemiş. Göz göze geldik, başını çevirdi." },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Nazlı Hanım, yan odadaydınız. Selim Bey'i tanır mıydınız?" },
        { subject: "nazli", speaker: "Nazlı", text: "Otelde tanıştık. Birkaç sabah kahvaltıda sohbet ettik; kibar, sessiz bir beydi. Emekli hâkim olduğunu bile bilmezdim." },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Perşembe gecesi bir şey duydunuz mu?" },
        { subject: "nazli", speaker: "Nazlı", text: "On bir gibi yan odanın balkon kapısı açılıp kapandı, sandalye sürtündü. Hava almaya çıktı sandım. Sonra sessizlik.", clue: true },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Ondan sonra ses duydunuz mu?" },
        { subject: "nazli", speaker: "Nazlı", text: "Sabaha karşı dörtte ağır bir şey düştü; uyandım. Mutfakta kasa düştü sandım. Saate baktım: dört on beş.", clue: true },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Koridorda kimseyi gördünüz mü?" },
        { subject: "nazli", speaker: "Nazlı", text: "Gece ikiye doğru tuvalete kalkmıştım; koridor boştu ama servis merdiveni gıcırdadı. Üstüne düşünmedim." },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Otelde kalma sebebiniz?" },
        { subject: "nazli", speaker: "Nazlı", text: "Deniz havası, doktor tavsiyesi. İki haftadır buradayım. Yetmiş yaşındayım; uykum hafiftir, her sese uyanırım." },
        { subject: "nazli", speaker: "Hakim A. Karan", text: "Selim Bey'in ziyaretçisi oldu mu?" },
        { subject: "nazli", speaker: "Nazlı", text: "Perşembe akşamı genç bir adam geldi; bir süre yüksek sesle konuştular, sonra adam kapıyı çarpıp çıktı. Bir de öğleden sonra doktor gelmişti." },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Haluk, o gece görevdeydin. Ne gördün?" },
        { subject: "haluk", speaker: "Haluk", text: "Bütün gece ön girişteyim; kamera gösterir. Üç buçukta sigara için bahçeye çıktım." },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Ve?" },
        { subject: "haluk", speaker: "Haluk", text: "Servis merdiveninin yanında birini gördüm. Uzun boylu, zayıf, koyu üniformalı. Seslenecektim, köşeden kaydı. Recep sandım; ama Recep on birde çıkmıştı.", clue: true },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Sonra?" },
        { subject: "haluk", speaker: "Haluk", text: "Dört on beşte teras tarafından ağır bir gürültü geldi. Bakmaya gittim; karanlıkta bir şey görünmüyordu. 'Kedi devirdi' dedim. Altıda Müjde'nin çığlığıyla uyandım.", clue: true },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Servis merdivenini kimler kullanır?" },
        { subject: "haluk", speaker: "Haluk", text: "Personel. Üçüncü kat koridoruna çıkar, mutfakla bağlantılıdır. Anahtarı personeldedir; kapı içeriden kilitli değildir." },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Bahçede dikkatini çeken bir şey var mı?" },
        { subject: "haluk", speaker: "Haluk", text: "Olaydan bir gün önce yüksükotu saplarının kesildiğini fark ettim. Üç sap. Bahçıvana söyledim; 'ben kesmedim' dedi.", clue: true },
        { subject: "haluk", speaker: "Hakim A. Karan", text: "Selim Bey'le konuşur muydunuz?" },
        { subject: "haluk", speaker: "Haluk", text: "Her sabah yürüyüşe çıkar, 'günaydın Haluk' derdi. Düzeni olan adamdı. O yüzden kazaen düştüğüne hiç inanmadım." }
      ],
      pressure: [
        {
          subject: "nazli", minClues: 3, records: [
            { subject: "nazli", speaker: "Hakim A. Karan", text: "Bir kez daha: sandalye sürtünmesi — balkonda tek kişi mi vardı?" },
            { subject: "nazli", speaker: "Nazlı", text: "Tek sandalye sürtündü. Sonra hafif bir fısıltı duydum; iki kişi konuşur gibi. Emin olamam, duvarlar kalın.", clue: true },
            { subject: "nazli", speaker: "Hakim A. Karan", text: "Kapıyı çarpıp çıkan genç adam — eşkâli?" },
            { subject: "nazli", speaker: "Nazlı", text: "Uzun boylu, koyu ceketli. Merdivenden inerken arkasından baktım; dönüp bakmadı." }
          ]
        },
        {
          subject: "haluk", minClues: 6, records: [
            { subject: "haluk", speaker: "Hakim A. Karan", text: "03:30'da gördüğün kişiyi anlat. Yürüyüşü nasıldı?" },
            { subject: "haluk", speaker: "Haluk", text: "Hızlı ama koşmadan, yerini bilen biri gibi yürüdü. Elinde personel anahtarlığı vardı; kapı ışığı yandı.", clue: true },
            { subject: "haluk", speaker: "Hakim A. Karan", text: "O kişi dışarıdan gelmiş olabilir mi?" },
            { subject: "haluk", speaker: "Haluk", text: "Olmaz. Gece ön kapı kilitli, kamera kayıtta. Servis girişinden yalnız personel girer.", clue: true }
          ]
        },
        {
          subject: "vedat", minClues: 9, records: [
            { subject: "vedat", speaker: "Hakim A. Karan", text: "Doktor, digoksin bitkiden elde edilebilir mi?" },
            { subject: "vedat", speaker: "Dr. Vedat", text: "Elbette. Yüksükotu — Digitalis purpurea. Yaprak ve tohum kaynatılırsa kalbi durduran bir konsantre elde edilir. Botanikten anlayan herkes bilir.", clue: true },
            { subject: "vedat", speaker: "Hakim A. Karan", text: "Çaya katılsa tadı anlaşılır mı?" },
            { subject: "vedat", speaker: "Dr. Vedat", text: "Digoksin acıdır; ama ıhlamura bal katılırsa maskelenir. Selim çayına hep bal koyardı.", clue: true }
          ]
        },
        {
          subject: "recep", minClues: 12, records: [
            { subject: "recep", speaker: "Hakim A. Karan", text: "Recep, kameralara baktık: on birde çıkış yapmışsın; ama servis kapısı..." },
            { subject: "recep", speaker: "Recep Yaman", text: "Çıktım diyorum! ...Kamera ne gösteriyor?", clue: true },
            { subject: "recep", speaker: "Hakim A. Karan", text: "Haluk 03:30'da personel anahtarlığı gördü. O gece anahtarlığını teslim etmeyen tek kişi sensin." },
            { subject: "recep", speaker: "Recep Yaman", text: "Ben... anahtarlığı resepsiyona bırakmayı unutmuş olabilirim. Olur böyle şeyler.", clue: true }
          ]
        }
      ],
      notes: [
        "Recep on birde çıktığını söylüyor; Haluk 03:30'da merdivende personel anahtarlı birini gördü.",
        "'Biraz acı olmuş' çay ve 'yeni mahsul' bahanesi — kurbanın son sözleri.",
        "Müjde tepsiyi silinmiş buldu; Nazlı gürültüyü 04:15'te duydu."
      ]
    },
    suspects: [
      { id: "nesli", name: "Nesli Arslan", initial: "N", note: "Otel müdürü" },
      { id: "vedat", name: "Dr. Vedat", initial: "V", note: "Otel doktoru, aile dostu" },
      { id: "recep", name: "Recep Yaman", initial: "R", note: "Garson" },
      { id: "mujde", name: "Müjde", initial: "M", note: "Temizlik görevlisi" },
      { id: "ferit", name: "Ferit Deniz", initial: "F", note: "Selim'in yeğeni" },
      { id: "nazli", name: "Nazlı", initial: "N", note: "305 numaralı odanın misafiri" },
      { id: "haluk", name: "Haluk", initial: "H", note: "Gece bekçisi" }
    ],
    culprit: "recep",
    verdictEvidence: [
      { name: "Yıkanmış çay bardağı", ok: true, keys: ["bardak", "yıkanmış", "tepsi", "temiz"], why: "Gece boyu dışarıda kalan tepside bardak tertemizdi; zehirle birlikte parmak izi de silinmişti." },
      { name: "Devrik balkon sandalyesi", ok: true, keys: ["sandalye", "devrik"], why: "Sahnelemenin son dokunuşu; 'kalkarken devrildi' süsü verilmişti." },
      { name: "Kesik yüksükotu sapları", ok: true, keys: ["yüksükotu", "çiçek", "sap", "bitki", "digitalis"], why: "Üç sap taze kesilmişti; digoksinin bitkisel kaynağı." },
      { name: "Korkuluk yüksekliği ve kurbanın boyu", ok: true, keys: ["korkuluk", "boy", "yükseklik"], why: "1,72 m boyundaki Selim'in 1,1 m korkuluktan kazayla aşması mümkün değil; savunma izi de yok." },
      { name: "Oda kapısının kilitsiz olması", ok: false, keys: ["oda kapısı", "kilit"], why: "Herkesin girebildiğini gösterir ama tek başına kimseyi işaret etmez." },
      { name: "Selim'in tansiyon ilaçları", ok: false, keys: ["tansiyon", "ilaç", "reçete"], why: "Düzenli kullandığı ilaçlar; ölüm nedeni değil." },
      { name: "Nazlı'nın deniz havası tedavisi", ok: false, keys: ["deniz havası", "tedavi"], why: "Misafirin otelde kalma sebebi; olayla ilgisi yok." },
      { name: "Ferit'in miras kavgası", ok: false, keys: ["miras", "kavga", "yeğen"], why: "Yanlış kişiye işaret eden motif; Ferit'in alibisi kamera ve fişle doğrulandı." }
    ],
    solution: "Katil Recep'ti. On beş yıl önceki Liman Davası'nda Hâkim Selim, Recep'in "
      + "babasını hapse göndermiş; baba orada ölmüştü. Recep adını değiştirip bir ay önce "
      + "otelde işe girdi ve bekledi. Perşembe akşamı bahçedeki yüksükotundan hazırladığı "
      + "konsantreyi ıhlamur çayına kattı; Selim 'biraz acı' dedi, 'yeni mahsul' diye "
      + "geçiştirdi. Ölüm gece yarısına doğru balkon koltuğunda gerçekleşti. 04:15'te sahneyi "
      + "kurdu: sandalyeyi devirdi, cesedi korkuluktan aşırdı, bardağı yıkadı. Onu ele veren "
      + "Haluk oldu: 03:30'da servis merdiveninde personel anahtarlığıyla görülen kişi oydu. "
      + "Dr. Vedat'ın dolap envanteri tamdı, Nesli'nin çıkışı kameralıydı, Ferit'in bar fişi "
      + "vardı; üçü de temize çıktı.",
    lab: [
      {
        sample: "Bardak içi sürüntü",
        options: ["Digoksin + ıhlamur kalıntısı", "Yalnızca etil alkol", "Barbitürat türevi", "Siyanür"],
        correct: "Digoksin + ıhlamur kalıntısı",
        note: "Bardak yıkanmıştı ama dibindeki mikro çiziklerde digoksin izi kaldı."
      },
      {
        sample: "Korkuluk lifi",
        options: ["Koyu renkli garson üniforması kumaşı", "Selim'in pijama kumaşı", "Nazlı'nın şalı", "Üçüncü kişi izi yok"],
        correct: "Koyu renkli garson üniforması kumaşı",
        note: "Lif, garson üniformasıyla eşleşti; Selim'in kıyafetinden lif yok."
      },
      {
        sample: "Korkuluk dibi taban izi",
        options: ["43-44 numara taban — Recep'in ayakkabısıyla uyumlu", "Selim'in kendi terliği", "38 numara kadın ayakkabısı", "Haluk'un botları"],
        correct: "43-44 numara taban — Recep'in ayakkabısıyla uyumlu",
        note: "İz, Recep'in vardiya ayakkabısının taban deseniyle eşleşti."
      },
      {
        sample: "Yüksükotu sapı",
        options: ["Taze kesilmiş — kesit bahçedeki öbekle eşleşiyor", "Aylar önce kurumuş", "Market ürünü buket malzemesi"],
        correct: "Taze kesilmiş — kesit bahçedeki öbekle eşleşiyor",
        note: "Sapın özü hâlâ nemli; kesit yüzeyi bahçedeki kütükle birebir eşleşti."
      },
      {
        sample: "Mide içeriği",
        options: ["Ihlamur çayı + yüksek doz digoksin", "Kahve + sedatif", "Alkol + uyku ilacı"],
        correct: "Ihlamur çayı + yüksek doz digoksin",
        note: "Çaydaki bal acılığı maskelemişti; ölüm içimden saatler sonra gelişti."
      }
    ],
    confrontation: [
      { statement: "Selim Deniz'in ölümü, gürültünün duyulduğu 04:15 civarında gerçekleşti.", answer: false, why: "Otopsi ölüm saatini 00:30–01:00 aralığına koyuyor; düşme ölüm sonrasında sahnelendi." },
      { statement: "Çay, balkona çıkarılmadan önce zehirlenmişti.", answer: true, why: "Digoksin bardaktaydı; Recep konsantreyi çayı hazırlarken kattı." },
      { statement: "Dr. Vedat'ın digoksin dolabı zehrin kaynağıydı.", answer: false, why: "Dolap envanteri tamdı; zehir bahçedeki yüksükotu bitkisinden elde edildi." },
      { statement: "Haluk'un 03:30'da merdivende gördüğü kişi Recep'ti.", answer: true, why: "On birde çıktığını söyledi; personel anahtarlığı ve kameralar aksini gösterdi." }
    ],
    timeline: [
      "Liman Davası'nda bir baba hapse girdi.",
      "Otelde yeni bir garson işe başladı.",
      "Bir misafir kayıt yaptırdı; yüzüne tükürüldü.",
      "Bahçeden üç mor sap kesildi.",
      "Odaya tansiyon muayenesi yapıldı.",
      "Miras tartışması yaşandı, kapı çarpıldı.",
      "Balkona ıhlamur çayı çıkarıldı.",
      "Ağır bir gürültü duyuldu; sabah çığlık atıldı."
    ],
    quiz: [
      {
        q: "Selim Deniz'in gerçek ölüm nedeni neydi?",
        options: ["Çayına katılan digoksin zehirlenmesi", "Düşmeye bağlı çoklu travma", "Kalp krizi", "İlaç etkisiyle kazaen düşme"],
        correct: "Çayına katılan digoksin zehirlenmesi"
      },
      {
        q: "Düşmenin sahnelendiğini ne gösterdi?",
        options: ["Gürültü 04:15'te duyuldu ama ölüm saati gece yarısıydı", "Balkon kapısının açık olması", "Odanın düzenli olması", "Çayın soğumuş olması"],
        correct: "Gürültü 04:15'te duyuldu ama ölüm saati gece yarısıydı"
      },
      {
        q: "Zehir nereden elde edilmişti?",
        options: ["Otel bahçesindeki yüksükotu bitkisinden", "Dr. Vedat'ın ilaç dolabından", "Eczaneden", "Ferit'in getirdiği ilaçtan"],
        correct: "Otel bahçesindeki yüksükotu bitkisinden"
      },
      {
        q: "Ferit'i kesin olarak temize çıkaran neydi?",
        options: ["Giriş kamerası ve bardaki fiş", "Dayısını sevmesi", "O gece uyuması", "Müjde'nin ifadesi"],
        correct: "Giriş kamerası ve bardaki fiş"
      },
      {
        q: "Recep'in en belirgin hatası neydi?",
        options: ["On birde çıktığını söylemesi — oysa 03:30'da servis merdiveninde görüldü", "Bahşiş almaması", "Tepsiyi yıkamaması", "Kapıyı tıklattığını unutması"],
        correct: "On birde çıktığını söylemesi — oysa 03:30'da servis merdiveninde görüldü"
      }
    ],
    elimination: [
      {
        id: "nesli",
        correct: "21:00'de evine gitti; giriş kamerası ve kızı doğruluyor. Zehirlenme daha sonra oldu.",
        keys: ["kamera", "kız", "ev", "dokuz"]
      },
      {
        id: "vedat",
        correct: "Digoksin dolabının envanteri tam; gece boyu hastanede nöbetteydi.",
        keys: ["envanter", "nöbet", "hastane", "dolap"]
      },
      {
        id: "recep",
        correct: "Elenemez: çay, yüksükotu ve 03:30'daki personel anahtarlığı onu işaret ediyor.",
        keys: ["elenemez", "katil", "işaret", "o yaptı", "suçlu"]
      },
      {
        id: "mujde",
        correct: "18:00'de temizliği bitirip ayrıldı; cesedi sabah bulup alarm veren de o.",
        keys: ["temizlik", "ayrıldı", "buldu", "on sekiz", "18"]
      },
      {
        id: "ferit",
        correct: "Kamera 21:00'de ayrıldığını gösteriyor; 02:00'ye kadar şehirdeydi, fişi var.",
        keys: ["fiş", "bar", "kamera", "dokuz"]
      },
      {
        id: "nazli",
        correct: "Kurbanla otelde tanıştı; bütün gece kendi odasındaydı, bağlantısı tanıklıktan ibaret.",
        keys: ["tanıştı", "oda", "tanık", "ilk kez"]
      },
      {
        id: "haluk",
        correct: "Ön giriş kamerası gece boyunca yerinde olduğunu gösteriyor; gürültüyü duyan ve merdivendeki kişiyi gören tanık o.",
        keys: ["kamera", "giriş", "tanık", "duydu", "gördü"]
      }
    ]
  }
];