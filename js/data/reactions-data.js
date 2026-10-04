/**
 * TEPKİMENİN ÜÇ YÜZÜ - 12 Kimyasal Tepkime Veritabanı
 * Yönerge Sayfa 19 ve 20 standartlarına birebir uygun veri modeli.
 * NOT: 1. Aşamada (Gözlem) formüller öğrenciye gösterilmez; kimyasal adlar ve fiziksel durumlar kullanılır.
 */

const REACTIONS_DATA = {
  nahco3_hcl: {
    id: "nahco3_hcl",
    title: "Sodyum hidrojen karbonat + Hidroklorik asit",
    description: "Sodyum hidrojen karbonat çözeltisi ile hidroklorik asit çözeltisinin tepkimesi",
    // Reaktifler (Makroskobik Adlandırma)
    fixedVessel: {
      name: "Sodyum hidrojen karbonat çözeltisi",
      state: "Sulu çözelti",
      volume: 120, // mL
      color: 0xe0f2fe,
      liquidOpacity: 0.55,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti",
      volume: 60, // mL
      color: 0xf0f9ff,
      liquidOpacity: 0.45
    },
    // Tepkime Sonucu ve Gözlem
    result: {
      primaryType: "gas", // 'gas' | 'precipitate' | 'neutralization' | 'smoke'
      targetTemp: 35.6,
      finalColor: 0xe2e8f0,
      finalOpacity: 0.5,
      bubbles: {
        intensity: "high", // 'low' | 'medium' | 'high'
        color: 0xffffff,
        speed: 1.5,
        durationMs: 7000
      },
      precipitate: null,
      vapor: {
        intensity: "medium",
        color: 0xffffff
      },
      evidenceSummary: "Yoğun gaz kabarcıkları çıkışı ve sıcaklık artışı"
    },
    // Pedagojik Değerlendirme ve Dönüt Kuralları
    pedagogy: {
      expectedKeyEvidence: ["kabarcık", "gaz", "köpürme", "kaynama", "hava"],
      supportingEvidence: ["sıcaklık", "ısınma", "derece", "arttı"],
      misconceptions: {
        precipitate: {
          keywords: ["çökelti", "katı", "çöktü", "tortu"],
          feedback: "Kabın içinde görülen değişimi tekrar incele. Katı birikimi mi var, yoksa sıvı içinde kabarcıklar mı oluşuyor?"
        },
        color_only: {
          keywords: ["renk", "sarardı", "mavi"],
          feedback: "Renk değişiminden ziyade sıvının içinde hareket eden taneciklere ve yukarı yükselen yapılara odaklan."
        }
      },
      correctFeedback: "Gaz oluşumuna işaret eden kabarcıklar gözlendi. Sıcaklık artışı destekleyici kanıttır. Şimdi bu değişimi tanecik düzeyinde modelleyelim.",
      guidancePrompt: "Sıvı içine asit döküldüğünde kabarcık oluşumu mu yoksa katı birikimi mi gözlemlediniz?"
    },
    // İleriki aşamalar (Aşama 2-7) için kimyasal tanecik bilgisi (Yönerge S.19 & S.20)
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Na⁺", charge: 1, count: 1, color: "#9333ea" },
        { type: "polyatomic", symbol: "HCO₃⁻", charge: -1, count: 1, formula: "HCO3", color: "#ef4444" },
        { type: "ion", symbol: "H⁺", charge: 1, count: 1, color: "#ffffff" },
        { type: "ion", symbol: "Cl⁻", charge: -1, count: 1, color: "#22c55e" }
      ],
      products: [
        { type: "ion", symbol: "Na⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "Cl⁻", state: "suda", count: 1 },
        { type: "molecule", symbol: "H₂O", state: "s", count: 1 },
        { type: "molecule", symbol: "CO₂", state: "g", count: 1 }
      ],
      equation: "NaHCO₃(suda) + HCl(suda) → NaCl(suda) + H₂O(s) + CO₂(g)"
    }
  },

  caco3_hcl: {
    id: "caco3_hcl",
    title: "Kalsiyum karbonat + Hidroklorik asit",
    description: "Kalsiyum karbonat katısı ile hidroklorik asit çözeltisinin tepkimesi",
    fixedVessel: {
      name: "Kalsiyum karbonat katısı (ve su)",
      state: "Katı toz/parçacık",
      volume: 80,
      color: 0xf1f5f9,
      liquidOpacity: 0.35,
      hasPrecipitate: true, // dipte beyaz katı var
      precipitateColor: 0xffffff,
      precipitateAmount: 0.6,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti",
      volume: 60,
      color: 0xf0f9ff,
      liquidOpacity: 0.45
    },
    result: {
      primaryType: "gas",
      targetTemp: 28.5,
      finalColor: 0xe0f2fe,
      finalOpacity: 0.4,
      bubbles: {
        intensity: "high",
        color: 0xffffff,
        speed: 1.8,
        durationMs: 7500
      },
      precipitate: {
        action: "dissolve", // katı eriyip yok olur!
        finalAmount: 0.0
      },
      vapor: { intensity: "low", color: 0xffffff },
      evidenceSummary: "Katının çözünmesi/erimesi ve şiddetli gaz kabarcığı çıkışı"
    },
    pedagogy: {
      expectedKeyEvidence: ["kabarcık", "gaz", "köpürme", "katı eridi", "katı çözündü", "kayboldu"],
      supportingEvidence: ["sıcaklık", "ısınma"],
      misconceptions: {
        precipitate: {
          keywords: ["çökelti oluştu", "katı oluştu", "çöktü"],
          feedback: "Dikkatli incele; yeni bir katı mı oluştu, yoksa dipteki mevcut katı kabarcıklar çıkararak eridi mi?"
        }
      },
      correctFeedback: "Katı maddenin gaz kabarcıkları eşliğinde eriyerek çözündüğü ve gaz çıktığı gözlendi. Şimdi tanecik modelini kuralım.",
      guidancePrompt: "Dipteki katı maddeye ve çıkan kabarcıklara odaklanınız."
    },
    microscopic: {
      reactants: [
        { type: "crystal", symbol: "CaCO₃(k)", count: 1 },
        { type: "ion", symbol: "2 H⁺", count: 2 },
        { type: "ion", symbol: "2 Cl⁻", count: 2 }
      ],
      products: [
        { type: "ion", symbol: "Ca²⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "2 Cl⁻", state: "suda", count: 2 },
        { type: "molecule", symbol: "H₂O", state: "s", count: 1 },
        { type: "molecule", symbol: "CO₂", state: "g", count: 1 }
      ],
      equation: "CaCO₃(k) + 2HCl(suda) → CaCl₂(suda) + H₂O(s) + CO₂(g)"
    }
  },

  na2co3_hcl: {
    id: "na2co3_hcl",
    title: "Sodyum karbonat + Hidroklorik asit",
    description: "Sodyum karbonat çözeltisi ile hidroklorik asit çözeltisinin tepkimesi",
    fixedVessel: {
      name: "Sodyum karbonat çözeltisi",
      state: "Sulu çözelti",
      volume: 120,
      color: 0xe0f2fe,
      liquidOpacity: 0.5,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti",
      volume: 60,
      color: 0xf0f9ff,
      liquidOpacity: 0.45
    },
    result: {
      primaryType: "gas",
      targetTemp: 27.2,
      finalColor: 0xe0f2fe,
      finalOpacity: 0.45,
      bubbles: {
        intensity: "high",
        color: 0xffffff,
        speed: 1.6,
        durationMs: 6500
      },
      precipitate: null,
      vapor: { intensity: "low", color: 0xffffff },
      evidenceSummary: "Hızlı gaz kabarcığı çıkışı"
    },
    pedagogy: {
      expectedKeyEvidence: ["kabarcık", "gaz", "köpürme"],
      supportingEvidence: ["sıcaklık"],
      misconceptions: {
        precipitate: {
          keywords: ["çökelti", "katı", "tortu"],
          feedback: "Sıvı içinde bir katı birikimi yok; yukarı doğru hızla hareket eden hava/gaz keseciklerini incele."
        }
      },
      correctFeedback: "Karışım anında gaz çıkışına işaret eden kabarcıklar gözlendi.",
      guidancePrompt: "Sıvı yüzeyine doğru hareket eden oluşumlara dikkat ediniz."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "2 Na⁺", count: 2 },
        { type: "ion", symbol: "CO₃²⁻", count: 1 },
        { type: "ion", symbol: "2 H⁺", count: 2 },
        { type: "ion", symbol: "2 Cl⁻", count: 2 }
      ],
      products: [
        { type: "ion", symbol: "2 Na⁺", state: "suda", count: 2 },
        { type: "ion", symbol: "2 Cl⁻", state: "suda", count: 2 },
        { type: "molecule", symbol: "H₂O", state: "s", count: 1 },
        { type: "molecule", symbol: "CO₂", state: "g", count: 1 }
      ],
      equation: "Na₂CO₃(suda) + 2HCl(suda) → 2NaCl(suda) + H₂O(s) + CO₂(g)"
    }
  },

  h2o2_ki: {
    id: "h2o2_ki",
    title: "Hidrojen peroksit + Potasyum iyodür",
    description: "Hidrojen peroksit çözeltisinin potasyum iyodür katalizörlüğünde parçalanması",
    fixedVessel: {
      name: "Hidrojen peroksit çözeltisi",
      state: "Sulu çözelti",
      volume: 100,
      color: 0xf0fdf4,
      liquidOpacity: 0.5,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Potasyum iyodür çözeltisi",
      state: "Sulu çözelti (Katalizör)",
      volume: 40,
      color: 0xfef9c3,
      liquidOpacity: 0.6
    },
    result: {
      primaryType: "gas",
      targetTemp: 44.5,
      finalColor: 0xd97706, // sarımsı kahverengi ara renk
      finalOpacity: 0.75,
      bubbles: {
        intensity: "high",
        color: 0xfef3c7,
        speed: 2.2,
        durationMs: 8000
      },
      precipitate: null,
      vapor: { intensity: "high", color: 0xffffff },
      evidenceSummary: "Ani köpürme, yoğun gaz çıkışı, sararma ve yüksek sıcaklık artışı"
    },
    pedagogy: {
      expectedKeyEvidence: ["köpürme", "kabarcık", "gaz", "oksijen", "köpük"],
      supportingEvidence: ["sıcaklık", "ısınma", "sarı", "kahverengi"],
      misconceptions: {
        precipitate: {
          keywords: ["çökelti", "katı"],
          feedback: "Oluşan yapı katı bir çökelti değil, sıvı içinde tutunan yoğun gaz köpüğüdür."
        }
      },
      correctFeedback: "Ani köpürme, şiddetli gaz çıkışı ve belirgin sıcaklık artışı gözlendi. (Potasyum iyodür harcanmayan katalizördür).",
      guidancePrompt: "Oluşan köpürmeye ve termometredeki hızlı yükselmeye dikkat edin."
    },
    microscopic: {
      reactants: [
        { type: "molecule", symbol: "2 H₂O₂", count: 2 },
        { type: "catalyst", symbol: "KI", state: "katalizör" }
      ],
      products: [
        { type: "molecule", symbol: "2 H₂O", state: "s", count: 2 },
        { type: "molecule", symbol: "O₂", state: "g", count: 1 }
      ],
      equation: "2H₂O₂(suda) —[KI]→ 2H₂O(s) + O₂(g)"
    }
  },

  hcl_naoh: {
    id: "hcl_naoh",
    title: "Hidroklorik asit + Sodyum hidroksit",
    description: "Asit-baz nötralleşme tepkimesi",
    fixedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti",
      volume: 100,
      color: 0xf0f9ff,
      liquidOpacity: 0.4,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Sodyum hidroksit çözeltisi",
      state: "Sulu çözelti",
      volume: 80,
      color: 0xf0f9ff,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "neutralization",
      targetTemp: 39.8,
      finalColor: 0xf8fafc,
      finalOpacity: 0.35,
      bubbles: null, // Kabarcık yok!
      precipitate: null, // Çökelti yok!
      vapor: { intensity: "low", color: 0xffffff },
      evidenceSummary: "Sıvı tamamen berrak kalır; termometrede ani ve yüksek sıcaklık artışı olur"
    },
    pedagogy: {
      expectedKeyEvidence: ["sıcaklık", "ısınma", "termometre", "arttı", "ısı"],
      supportingEvidence: ["berrak", "renksiz", "değişmedi", "çökelti yok", "kabarcık yok"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz", "köpük"],
          feedback: "Sıvının içine dikkatle bakın; herhangi bir gaz kabarcığı çıkışı var mı? Termometreye odaklanın!"
        },
        precipitate: {
          keywords: ["çökelti", "katı", "çöktü"],
          feedback: "Sıvı berraklığını korumaktadır, herhangi bir katı oluşumu yoktur."
        }
      },
      correctFeedback: "Karışım berrak kalmasına rağmen termometrede belirgin bir sıcaklık artışı gözlendi (ekzotermik nötralleşme).",
      guidancePrompt: "Her tepkimede gözle görünür kabarcık veya çökelti olmayabilir. Termometre sütununu inceleyin!"
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "H⁺", count: 1 },
        { type: "ion", symbol: "Cl⁻", count: 1 },
        { type: "ion", symbol: "Na⁺", count: 1 },
        { type: "ion", symbol: "OH⁻", count: 1 }
      ],
      products: [
        { type: "ion", symbol: "Na⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "Cl⁻", state: "suda", count: 1 },
        { type: "molecule", symbol: "H₂O", state: "s", count: 1 }
      ],
      equation: "HCl(suda) + NaOH(suda) → NaCl(suda) + H₂O(s)"
    }
  },

  nh3_hcl: {
    id: "nh3_hcl",
    title: "Amonyak + Hidroklorik asit",
    description: "Amonyak çözeltisi ile hidroklorik asit buharlarının tuz oluşturma tepkimesi",
    fixedVessel: {
      name: "Amonyak çözeltisi",
      state: "Sulu çözelti",
      volume: 100,
      color: 0xf1f5f9,
      liquidOpacity: 0.45,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti",
      volume: 60,
      color: 0xf0f9ff,
      liquidOpacity: 0.45
    },
    result: {
      primaryType: "smoke",
      targetTemp: 31.5,
      finalColor: 0xf8fafc,
      finalOpacity: 0.5,
      bubbles: null,
      precipitate: null,
      vapor: {
        intensity: "dense_smoke", // Yoğun beyaz duman / sis!
        color: 0xffffff,
        durationMs: 8000
      },
      evidenceSummary: "Beher ağzından yükselen yoğun beyaz duman/sis ve sıcaklık artışı"
    },
    pedagogy: {
      expectedKeyEvidence: ["duman", "sis", "beyaz duman", "buhar", "gaz bulutu"],
      supportingEvidence: ["sıcaklık", "ısınma"],
      misconceptions: {
        precipitate: {
          keywords: ["çökelti", "katı dibe çöktü"],
          feedback: "Değişim sıvının dibinde değil, beherin ağzında ve havada meydana geliyor. Yükselen beyaz buluta bakın."
        }
      },
      correctFeedback: "Beher ağzında yoğun beyaz duman (amonyum klorür mikro kristalleri sisi) oluştuğu ve sıcaklığın yükseldiği gözlendi.",
      guidancePrompt: "Sıvıların temas ettiği yüzeyden yukarı doğru yayılan beyaz oluşumu inceleyin."
    },
    microscopic: {
      reactants: [
        { type: "molecule", symbol: "NH₃", count: 1 },
        { type: "ion", symbol: "H⁺", count: 1 },
        { type: "ion", symbol: "Cl⁻", count: 1 }
      ],
      products: [
        { type: "ion", symbol: "NH₄⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "Cl⁻", state: "suda", count: 1 }
      ],
      equation: "NH₃(suda) + HCl(suda) → NH₄Cl(suda/k)"
    }
  },

  pbno32_ki: {
    id: "pbno32_ki",
    title: "Kurşun(II) nitrat + Potasyum iyodür",
    description: "Kurşun(II) nitrat ile potasyum iyodür çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Kurşun(II) nitrat çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 100,
      color: 0xf8fafc,
      liquidOpacity: 0.4,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Potasyum iyodür çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf8fafc,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 22.0, // Sıcaklık değişmez
      finalColor: 0xfef08a,
      finalOpacity: 0.7,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0xfacc15, // Parlak sarı PbI2 katısı!
        crystalType: "solid_precipitate",
        settleSpeed: 0.8,
        finalAmount: 0.85
      },
      vapor: null,
      evidenceSummary: "İki renksiz sıvı karıştığında parlak sarı renkli katı çökelti oluşur ve dibe çöker"
    },
    pedagogy: {
      expectedKeyEvidence: ["sarı çökelti", "çökelti", "sarı katı", "çökelek", "çöktü", "katı oluştu", "sarı"],
      supportingEvidence: ["sıcaklık değişmedi", "kabarcık yok"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz", "köpük"],
          feedback: "Sıvı içinde yukarı doğru çıkan gaz kabarcığı var mı? Yoksa dibe doğru çöken renkli bir katı mı oluştu?"
        }
      },
      correctFeedback: "İki renksiz çözelti karıştığında parlak sarı renkli katı bir çökelti oluştu ve dibe çöktü.",
      guidancePrompt: "Sıvıların karıştığı anda oluşan parlak renkli katı partiküllere dikkat edin."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Pb²⁺", count: 1 },
        { type: "ion", symbol: "2 NO₃⁻", count: 2 },
        { type: "ion", symbol: "2 K⁺", count: 2 },
        { type: "ion", symbol: "2 I⁻", count: 2 }
      ],
      products: [
        { type: "crystal", symbol: "PbI₂(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "2 K⁺", state: "suda", count: 2 },
        { type: "ion", symbol: "2 NO₃⁻", state: "suda", count: 2 }
      ],
      equation: "Pb(NO₃)₂(suda) + 2KI(suda) → PbI₂(k) + 2KNO₃(suda)"
    }
  },

  agno3_hcl: {
    id: "agno3_hcl",
    title: "Gümüş nitrat + Hidroklorik asit",
    description: "Gümüş nitrat ile hidroklorik asit çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Gümüş nitrat çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 100,
      color: 0xf8fafc,
      liquidOpacity: 0.4,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Hidroklorik asit çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf0f9ff,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 22.0,
      finalColor: 0xf1f5f9,
      finalOpacity: 0.8,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0xffffff, // Beyaz AgCl katısı!
        crystalType: "solid_precipitate",
        settleSpeed: 0.9,
        finalAmount: 0.8
      },
      vapor: null,
      evidenceSummary: "Süt beyazı renginde yoğun katı çökelti oluşumu ve bulanıklaşma"
    },
    pedagogy: {
      expectedKeyEvidence: ["beyaz çökelti", "çökelti", "beyaz katı", "çökelek", "bulanık", "süt"],
      supportingEvidence: ["sıcaklık değişmedi"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz", "köpük"],
          feedback: "Sıvı içinde gaz kabarcığı değil, ışığı engelleyen beyaz katı parçacıklar oluşmaktadır."
        }
      },
      correctFeedback: "Karışım anında süt kıvamında beyaz bir katı çökelti oluştuğu ve dibe çöktüğü gözlendi.",
      guidancePrompt: "Şeffaf sıvının aniden opak beyaz bir katı süspansiyona dönüşmesini inceleyin."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Ag⁺", count: 1 },
        { type: "ion", symbol: "NO₃⁻", count: 1 },
        { type: "ion", symbol: "H⁺", count: 1 },
        { type: "ion", symbol: "Cl⁻", count: 1 }
      ],
      products: [
        { type: "crystal", symbol: "AgCl(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "H⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "NO₃⁻", state: "suda", count: 1 }
      ],
      equation: "AgNO₃(suda) + HCl(suda) → AgCl(k) + HNO₃(suda)"
    }
  },

  cuno32_naoh: {
    id: "cuno32_naoh",
    title: "Bakır(II) nitrat + Sodyum hidroksit",
    description: "Bakır(II) nitrat ile sodyum hidroksit çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Bakır(II) nitrat çözeltisi",
      state: "Sulu çözelti (Açık Mavi)",
      volume: 100,
      color: 0x38bdf8, // Açık mavi
      liquidOpacity: 0.65,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Sodyum hidroksit çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf8fafc,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 24.2,
      finalColor: 0x0284c7,
      finalOpacity: 0.85,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0x0369a1, // Koyu mavi Cu(OH)2 çökeltisi!
        crystalType: "gelatinous_precipitate",
        settleSpeed: 0.6,
        finalAmount: 0.85
      },
      vapor: null,
      evidenceSummary: "Açık mavi çözelti içinde jelimsi koyu mavi katı çökelti oluşumu"
    },
    pedagogy: {
      expectedKeyEvidence: ["mavi çökelti", "koyu mavi", "çökelti", "katı", "jel", "çökelek"],
      supportingEvidence: ["sıcaklık"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz"],
          feedback: "Kabarcık oluşumu yoktur; açık mavi sıvının içinde kümelenen koyu mavi katı kütlelere bakın."
        }
      },
      correctFeedback: "Açık mavi çözeltiye reaktif eklendiğinde koyu mavi renkli katı bir çökelti oluştu.",
      guidancePrompt: "Reaktifin damladığı noktalarda oluşan koyu mavi katı jel yapıları inceleyin."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Cu²⁺", count: 1 },
        { type: "ion", symbol: "2 NO₃⁻", count: 2 },
        { type: "ion", symbol: "2 Na⁺", count: 2 },
        { type: "ion", symbol: "2 OH⁻", count: 2 }
      ],
      products: [
        { type: "crystal", symbol: "Cu(OH)₂(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "2 Na⁺", state: "suda", count: 2 },
        { type: "ion", symbol: "2 NO₃⁻", state: "suda", count: 2 }
      ],
      equation: "Cu(NO₃)₂(suda) + 2NaOH(suda) → Cu(OH)₂(k) + 2NaNO₃(suda)"
    }
  },

  cacl2_na2co3: {
    id: "cacl2_na2co3",
    title: "Kalsiyum klorür + Sodyum karbonat",
    description: "Kalsiyum klorür ile sodyum karbonat çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Kalsiyum klorür çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 100,
      color: 0xf8fafc,
      liquidOpacity: 0.4,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Sodyum karbonat çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf8fafc,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 22.0,
      finalColor: 0xf1f5f9,
      finalOpacity: 0.75,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0xffffff, // Kireç taşı CaCO3 beyaz katısı
        crystalType: "solid_precipitate",
        settleSpeed: 0.75,
        finalAmount: 0.75
      },
      vapor: null,
      evidenceSummary: "İki berrak sıvı karıştığında tebeşir/kireç benzeri beyaz katı çökelti oluşumu"
    },
    pedagogy: {
      expectedKeyEvidence: ["beyaz çökelti", "çökelti", "kireç", "katı", "çökelek"],
      supportingEvidence: ["sıcaklık değişmedi"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz", "köpük"],
          feedback: "Sıvı içinde yukarı çıkan gaz kabarcığı yoktur; beyaz katı kireç partiküllerinin çökelmesini izleyin."
        }
      },
      correctFeedback: "İki berrak çözelti karıştırıldığında beyaz bir kireç çökeltisi meydana geldi.",
      guidancePrompt: "Berrak sıvıların birleştiği an oluşan beyaz katı bulanıklığa bakın."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Ca²⁺", count: 1 },
        { type: "ion", symbol: "2 Cl⁻", count: 2 },
        { type: "ion", symbol: "2 Na⁺", count: 2 },
        { type: "ion", symbol: "CO₃²⁻", count: 1 }
      ],
      products: [
        { type: "crystal", symbol: "CaCO₃(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "2 Na⁺", state: "suda", count: 2 },
        { type: "ion", symbol: "2 Cl⁻", state: "suda", count: 2 }
      ],
      equation: "CaCl₂(suda) + Na₂CO₃(suda) → CaCO₃(k) + 2NaCl(suda)"
    }
  },

  agno3_ki: {
    id: "agno3_ki",
    title: "Gümüş nitrat + Potasyum iyodür",
    description: "Gümüş nitrat ile potasyum iyodür çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Gümüş nitrat çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 100,
      color: 0xf8fafc,
      liquidOpacity: 0.4,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Potasyum iyodür çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf8fafc,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 22.0,
      finalColor: 0xfef9c3,
      finalOpacity: 0.75,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0xfef08a, // Krem / açık sarı AgI katısı
        crystalType: "solid_precipitate",
        settleSpeed: 0.8,
        finalAmount: 0.8
      },
      vapor: null,
      evidenceSummary: "Açık sarı / krem renkli katı çökelti oluşumu"
    },
    pedagogy: {
      expectedKeyEvidence: ["açık sarı", "krem", "çökelti", "katı", "çökelek"],
      supportingEvidence: ["sıcaklık değişmedi"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz"],
          feedback: "Herhangi bir gaz çıkışı gerçekleşmemiştir; sıvının rengini ve dibe çöken krem/sarı katıyı inceleyin."
        }
      },
      correctFeedback: "Karışım sonrasında açık sarı / krem renkli bir katı çökelti oluştuğu gözlendi.",
      guidancePrompt: "Oluşan katı parçacıkların rengine ve çökme hareketine dikkat edin."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Ag⁺", count: 1 },
        { type: "ion", symbol: "NO₃⁻", count: 1 },
        { type: "ion", symbol: "K⁺", count: 1 },
        { type: "ion", symbol: "I⁻", count: 1 }
      ],
      products: [
        { type: "crystal", symbol: "AgI(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "K⁺", state: "suda", count: 1 },
        { type: "ion", symbol: "NO₃⁻", state: "suda", count: 1 }
      ],
      equation: "AgNO₃(suda) + KI(suda) → AgI(k) + KNO₃(suda)"
    }
  },

  cuno32_na2co3: {
    id: "cuno32_na2co3",
    title: "Bakır(II) nitrat + Sodyum karbonat",
    description: "Bakır(II) nitrat ile sodyum karbonat çözeltilerinin çökelme tepkimesi",
    fixedVessel: {
      name: "Bakır(II) nitrat çözeltisi",
      state: "Sulu çözelti (Açık Mavi)",
      volume: 100,
      color: 0x38bdf8,
      liquidOpacity: 0.65,
      hasPrecipitate: false,
      initialTemp: 22.0
    },
    addedVessel: {
      name: "Sodyum karbonat çözeltisi",
      state: "Sulu çözelti (Renksiz)",
      volume: 60,
      color: 0xf8fafc,
      liquidOpacity: 0.4
    },
    result: {
      primaryType: "precipitate",
      targetTemp: 22.5,
      finalColor: 0x2dd4bf,
      finalOpacity: 0.85,
      bubbles: null,
      precipitate: {
        action: "form",
        color: 0x0d9488, // Turkuaz CuCO3 katısı
        crystalType: "solid_precipitate",
        settleSpeed: 0.7,
        finalAmount: 0.8
      },
      vapor: null,
      evidenceSummary: "Turkuaz / açık yeşil-mavi renkli katı çökelti oluşumu"
    },
    pedagogy: {
      expectedKeyEvidence: ["turkuaz", "mavi-yeşil", "yeşil", "çökelti", "katı", "çökelek"],
      supportingEvidence: ["sıcaklık"],
      misconceptions: {
        gas: {
          keywords: ["kabarcık", "gaz"],
          feedback: "Gaz çıkışı gerçekleşmedi; çözelti içinde oluşan turkuaz renkli katı partiküllere odaklanın."
        }
      },
      correctFeedback: "Açık mavi çözelti ile renksiz çözelti karıştığında turkuaz renkli bir katı çökelti oluştu.",
      guidancePrompt: "Reaktiflerin temasında beliren turkuaz renkli çökeltiye dikkat ediniz."
    },
    microscopic: {
      reactants: [
        { type: "ion", symbol: "Cu²⁺", count: 1 },
        { type: "ion", symbol: "2 NO₃⁻", count: 2 },
        { type: "ion", symbol: "2 Na⁺", count: 2 },
        { type: "ion", symbol: "CO₃²⁻", count: 1 }
      ],
      products: [
        { type: "crystal", symbol: "CuCO₃(k)", state: "katı çökelti", count: 1 },
        { type: "ion", symbol: "2 Na⁺", state: "suda", count: 2 },
        { type: "ion", symbol: "2 NO₃⁻", state: "suda", count: 2 }
      ],
      equation: "Cu(NO₃)₂(suda) + Na₂CO₃(suda) → CuCO₃(k) + 2NaNO₃(suda)"
    }
  }
};

// Global dışa aktarma (Vanilla stack uyumlu)
if (typeof window !== "undefined") {
  window.REACTIONS_DATA = REACTIONS_DATA;
}

