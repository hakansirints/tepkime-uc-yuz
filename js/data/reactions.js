/* 12 tepkime — makroskobik görünüm, tanecik modeli ve sembolik gösterim verisi.
   1. aşamada yalnızca madde ADLARI kullanılır; formüller 5. aşamada açılır. */
(function (T) {
  'use strict';

  const R = {};
  const list = [];
  function def(o) { R[o.id] = o; list.push(o); o.no = list.length; }

  // Ortak yanılgı seçenekleri (havuzda yer alan çeldiriciler)
  const ACID_DISTRACT = ['HCl', 'H2'];

  /* ---------------- GAZ ÇIKIŞI ---------------- */
  def({
    id: 'nahco3_hcl',
    name: 'Sodyum hidrojen karbonat + Hidroklorik asit',
    fixed: { name: 'Sodyum hidrojen karbonat çözeltisi', state: 'sulu çözelti', vol: 110, color: 0xeef6fb, opacity: 0.2 },
    added: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'gas', gas: { rate: 1.0, foam: 0.35, dur: 11 }, temp: 19.6 },
    evidence: { need: ['GAS'], support: ['COOL'], wrong: ['PRECIP', 'SMOKE'] },
    okText: 'Gaz oluşumuna işaret eden kabarcıklar gözlendi. Termometredeki küçük sıcaklık düşüşü de bir değişim olduğunu destekler.',
    before: { 'Na+': 1, 'HCO3-': 1, 'H+': 1, 'Cl-': 1 },
    after: { 'Na+': 1, 'Cl-': 1, 'H2O': 1, 'CO2': 1 },
    distractors: ['NaCl(k)', 'HCl', 'H2', 'O2', 'CO3 2-'],
    afterHint: 'Gözleminde kabarcıklar gördün; demek ki bir gaz molekülü oluştu. Hidrojen karbonat iyonundaki atomlar yeniden düzenlenerek hangi gazı ve hangi sıvıyı oluşturabilir?',
    eq: {
      r: [{ c: 1, f: 'NaHCO₃', s: 'suda', sp: ['Na+', 'HCO3-'], m: 'fixed' }, { c: 1, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 1, f: 'NaCl', s: 'suda', sp: ['Na+', 'Cl-'], m: 'solution' }, { c: 1, f: 'H₂O', s: 's', sp: ['H2O'], m: 'solution' }, { c: 1, f: 'CO₂', s: 'g', sp: ['CO2'], m: 'gas' }]
    },
    track: [{ el: 'C', from: 'HCO3-', name: 'karbon' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Kapta gördüğün kabarcıkları hangi tanecikler oluşturur?', ans: 'CO2' }
  });

  def({
    id: 'caco3_hcl',
    name: 'Kalsiyum karbonat + Hidroklorik asit',
    fixed: { name: 'Kalsiyum karbonat (mermer parçaları)', state: 'katı', vol: 0, solid: { color: 0xf3f1ea, kind: 'marble' } },
    added: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 70, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'gas', gas: { rate: 0.85, foam: 0.25, dur: 14, fromSolid: true }, temp: 23.4, dissolveSolid: 0.55 },
    evidence: { need: ['GAS'], support: ['SOLID_SHRINK', 'WARM'], wrong: ['SMOKE'],
      custom: [{ keys: ['çökelti oluştu', 'katı oluştu', 'çöktü'], fb: 'Dikkatli incele: yeni bir katı mı oluştu, yoksa kabın dibindeki katı parçaların yüzeyinden bir şeyler mi çıkıyor?' }] },
    okText: 'Mermer parçalarının yüzeyinden gaz kabarcıkları çıktığı ve katının zamanla küçüldüğü gözlendi.',
    before: { 'CaCO3(k)': 1, 'H+': 2, 'Cl-': 2 },
    after: { 'Ca2+': 1, 'Cl-': 2, 'H2O': 1, 'CO2': 1 },
    distractors: ['CaCl2(k)', 'HCl', 'H2', 'CO3 2-'],
    afterHint: 'Katı küçülürken kabarcıklar çıktı. Katıdaki kalsiyum iyonları suya geçer. Karbonat iyonu, hidrojen iyonlarıyla birlikte hangi gazı ve hangi sıvıyı oluşturabilir?',
    eq: {
      r: [{ c: 1, f: 'CaCO₃', s: 'k', sp: ['CaCO3(k)'], m: 'fixedSolid' }, { c: 2, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 1, f: 'CaCl₂', s: 'suda', sp: ['Ca2+', 'Cl-'], m: 'solution' }, { c: 1, f: 'H₂O', s: 's', sp: ['H2O'], m: 'solution' }, { c: 1, f: 'CO₂', s: 'g', sp: ['CO2'], m: 'gas' }]
    },
    track: [{ el: 'C', from: 'CaCO3(k)', name: 'karbon' }, { el: 'Cl', from: 'Cl-', name: 'klor', spectator: true }],
    quiz: { q: 'Mermer yüzeyinden çıkan kabarcıkları hangi tanecikler oluşturur?', ans: 'CO2' }
  });

  def({
    id: 'na2co3_hcl',
    name: 'Sodyum karbonat + Hidroklorik asit',
    fixed: { name: 'Sodyum karbonat çözeltisi', state: 'sulu çözelti', vol: 110, color: 0xeef6fb, opacity: 0.2 },
    added: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 60, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'gas', gas: { rate: 0.95, foam: 0.3, dur: 11 }, temp: 23.2 },
    evidence: { need: ['GAS'], support: ['WARM'], wrong: ['PRECIP', 'SMOKE'] },
    okText: 'Karışımda yoğun gaz kabarcıkları oluştu. Bu, yeni bir maddenin (bir gazın) oluştuğunu gösterir.',
    before: { 'Na+': 2, 'CO3 2-': 1, 'H+': 2, 'Cl-': 2 },
    after: { 'Na+': 2, 'Cl-': 2, 'H2O': 1, 'CO2': 1 },
    distractors: ['NaCl(k)', 'HCl', 'H2', 'HCO3-'],
    afterHint: 'Kabarcıklar bir gaz oluştuğunu gösterir. Karbonat iyonu ile hidrojen iyonları hangi gaz ve sıvıyı oluşturur? Sodyum ve klorür iyonları ne olur?',
    eq: {
      r: [{ c: 1, f: 'Na₂CO₃', s: 'suda', sp: ['Na+', 'CO3 2-'], m: 'fixed' }, { c: 2, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 2, f: 'NaCl', s: 'suda', sp: ['Na+', 'Cl-'], m: 'solution' }, { c: 1, f: 'H₂O', s: 's', sp: ['H2O'], m: 'solution' }, { c: 1, f: 'CO₂', s: 'g', sp: ['CO2'], m: 'gas' }]
    },
    track: [{ el: 'C', from: 'CO3 2-', name: 'karbon' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Kapta gördüğün kabarcıkları hangi tanecikler oluşturur?', ans: 'CO2' }
  });

  def({
    id: 'h2o2_ki',
    name: 'Hidrojen peroksit + Potasyum iyodür',
    fixed: { name: 'Hidrojen peroksit çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f9f4, opacity: 0.18 },
    added: { name: 'Potasyum iyodür çözeltisi', state: 'sulu çözelti', vol: 35, color: 0xf6f4ea, opacity: 0.2 },
    obs: { type: 'gas', gas: { rate: 1.0, foam: 1.0, dur: 13 }, temp: 31.5, tint: { color: 0xe7c46a, opacity: 0.42 } },
    evidence: { need: ['GAS'], support: ['WARM', 'FOAM', 'COLOR'], wrong: ['PRECIP', 'SMOKE'] },
    okText: 'Yoğun gaz kabarcıkları ve köpük oluştu, karışım ısındı. Potasyum iyodür tepkimeyi hızlandırır ama kendisi harcanmaz.',
    before: { 'H2O2': 2, 'K+': 1, 'I-': 1 },
    after: { 'H2O': 2, 'O2': 1, 'K+': 1, 'I-': 1 },
    distractors: ['H2', 'KNO3(k)', 'CO2', 'O2'],
    catalyst: 'KI',
    afterHint: 'Köpük ve kabarcıklar bir gaz oluştuğunu gösterir. Hidrojen peroksit moleküllerindeki atomlar hangi gazı ve hangi sıvıyı oluşturabilir? Potasyum ve iyodür iyonları tepkimede harcanmaz.',
    eq: {
      cat: { f: 'KI', sp: ['K+', 'I-'], m: 'added' },
      r: [{ c: 2, f: 'H₂O₂', s: 'suda', sp: ['H2O2'], m: 'fixed' }],
      p: [{ c: 2, f: 'H₂O', s: 's', sp: ['H2O'], m: 'solution' }, { c: 1, f: 'O₂', s: 'g', sp: ['O2'], m: 'gas' }]
    },
    track: [{ el: 'H', from: 'H2O2', name: 'hidrojen' }, { el: 'K', from: 'K+', name: 'potasyum', spectator: true }],
    quiz: { q: 'Köpüğün içindeki gaz kabarcıklarını hangi tanecikler oluşturur?', ans: 'O2' }
  });

  /* ---------------- ISI DEĞİŞİMİ / DUMAN ---------------- */
  def({
    id: 'hcl_naoh',
    name: 'Hidroklorik asit + Sodyum hidroksit',
    fixed: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 90, color: 0xf2f8fc, opacity: 0.18 },
    added: { name: 'Sodyum hidroksit çözeltisi', state: 'sulu çözelti', vol: 70, color: 0xf3f6f8, opacity: 0.18 },
    obs: { type: 'heat', temp: 29.8 },
    evidence: { need: ['WARM'], support: ['CLEAR'], wrong: ['GAS', 'PRECIP', 'SMOKE'],
      custom: [{ keys: ['hiçbir şey olmadı', 'değişim olmadı', 'bir şey olmadı', 'değişmedi', 'olmadı'], fb: 'Gözle görülen bir değişim olmayabilir. Ölçüm aracına, yani termometreye bak: karıştırmadan önce ve sonra ne gösteriyor?' }] },
    okText: 'Karışım berrak kaldı ama sıcaklık belirgin biçimde arttı. Isı açığa çıkması da kimyasal değişimin bir kanıtıdır.',
    before: { 'H+': 1, 'Cl-': 1, 'Na+': 1, 'OH-': 1 },
    after: { 'Na+': 1, 'Cl-': 1, 'H2O': 1 },
    distractors: ['NaCl(k)', 'HCl', 'H2', 'O2'],
    afterHint: 'Gözle görülen gaz ya da katı oluşmadı ama sıcaklık arttı. Hidrojen iyonu ile hidroksit iyonu birleşirse hangi molekül oluşur? Sodyum ve klorür iyonları ne olur?',
    eq: {
      r: [{ c: 1, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'fixed' }, { c: 1, f: 'NaOH', s: 'suda', sp: ['Na+', 'OH-'], m: 'added' }],
      p: [{ c: 1, f: 'NaCl', s: 'suda', sp: ['Na+', 'Cl-'], m: 'solution' }, { c: 1, f: 'H₂O', s: 's', sp: ['H2O'], m: 'heat' }]
    },
    track: [{ el: 'O', from: 'OH-', name: 'oksijen' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Sıcaklık artışına yol açan değişimde hangi tanecik oluşur?', ans: 'H2O' }
  });

  def({
    id: 'nh3_hcl',
    name: 'Amonyak + Hidroklorik asit',
    fixed: { name: 'Amonyak çözeltisi', state: 'sulu çözelti', vol: 90, color: 0xf3f6f8, opacity: 0.18 },
    added: { name: 'Hidroklorik asit çözeltisi (derişik)', state: 'sulu çözelti', vol: 50, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'smoke', smoke: { amount: 1.0, dur: 10 }, temp: 28.4 },
    evidence: { need: ['SMOKE|WARM'], support: ['WARM', 'SMOKE'], wrong: ['PRECIP', 'GAS'] },
    okText: 'Kabın ağzında beyaz bir duman oluştu ve karışım ısındı. Bu beyaz duman, havada oluşan çok küçük katı tanecikler (amonyum klorür) içerir.',
    before: { 'NH3': 1, 'H+': 1, 'Cl-': 1 },
    after: { 'NH4+': 1, 'Cl-': 1 },
    distractors: ['NH4Cl(k)', 'HCl', 'H2', 'H2O'],
    afterHint: 'Amonyak molekülü bir hidrojen iyonu alabilir. Yeni oluşan iyon hangisidir? Klorür iyonu çözeltide ne olur?',
    eq: {
      r: [{ c: 1, f: 'NH₃', s: 'suda', sp: ['NH3'], m: 'fixed' }, { c: 1, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 1, f: 'NH₄Cl', s: 'suda', sp: ['NH4+', 'Cl-'], m: 'solution' }]
    },
    track: [{ el: 'H', from: 'H+', name: 'hidrojen (H⁺ iyonundaki)' }, { el: 'Cl', from: 'Cl-', name: 'klor', spectator: true }],
    quiz: { q: 'Bu tepkimede oluşan yeni iyon hangisidir?', ans: 'NH4+' }
  });

  /* ---------------- ÇÖKELTİ ---------------- */
  def({
    id: 'pbno32_ki',
    name: 'Kurşun(II) nitrat + Potasyum iyodür',
    fixed: { name: 'Kurşun(II) nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Potasyum iyodür çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xf3f6f8, opacity: 0.17 },
    obs: { type: 'precipitate', precip: { color: 0xf7c518, amount: 1.0, style: 'fine' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'İki renksiz çözelti karışınca parlak sarı bir katı (çökelti) oluştu ve kabın dibine çöktü.',
    before: { 'Pb2+': 1, 'NO3-': 2, 'K+': 2, 'I-': 2 },
    after: { 'PbI2(k)': 1, 'K+': 2, 'NO3-': 2 },
    distractors: ['KNO3(k)', 'Pb2+', 'I-', 'H2O'],
    afterHint: 'Sarı renkli bir katı oluştu. Hangi iki iyon bir araya gelip katı (kristal) oluşturmuş olabilir? Diğer iyonlar çözeltide ne olur?',
    eq: {
      r: [{ c: 1, f: 'Pb(NO₃)₂', s: 'suda', sp: ['Pb2+', 'NO3-'], m: 'fixed' }, { c: 2, f: 'KI', s: 'suda', sp: ['K+', 'I-'], m: 'added' }],
      p: [{ c: 1, f: 'PbI₂', s: 'k', sp: ['PbI2(k)'], m: 'solid' }, { c: 2, f: 'KNO₃', s: 'suda', sp: ['K+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'Pb', from: 'Pb2+', name: 'kurşun' }, { el: 'K', from: 'K+', name: 'potasyum', spectator: true }],
    quiz: { q: 'Kabın dibinde biriken sarı katıyı hangi tanecik oluşturur?', ans: 'PbI2(k)' }
  });

  def({
    id: 'agno3_hcl',
    name: 'Gümüş nitrat + Hidroklorik asit',
    fixed: { name: 'Gümüş nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 50, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'precipitate', precip: { color: 0xf4f4f0, amount: 0.9, style: 'curdy' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'Karışımda süt beyazı bir katı (çökelti) oluştu ve sıvı bulanıklaştı.',
    before: { 'Ag+': 1, 'NO3-': 1, 'H+': 1, 'Cl-': 1 },
    after: { 'AgCl(k)': 1, 'H+': 1, 'NO3-': 1 },
    distractors: ['HCl', 'H2', 'Ag+', 'Cl-'],
    afterHint: 'Beyaz bir katı oluştu. Hangi iki iyon birleşip katı oluşturmuş olabilir? Geriye kalan iyonlar nerede bulunur?',
    eq: {
      r: [{ c: 1, f: 'AgNO₃', s: 'suda', sp: ['Ag+', 'NO3-'], m: 'fixed' }, { c: 1, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 1, f: 'AgCl', s: 'k', sp: ['AgCl(k)'], m: 'solid' }, { c: 1, f: 'HNO₃', s: 'suda', sp: ['H+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'Ag', from: 'Ag+', name: 'gümüş' }, { el: 'N', from: 'NO3-', name: 'azot', spectator: true }],
    quiz: { q: 'Beyaz katıyı (çökeltiyi) hangi tanecik oluşturur?', ans: 'AgCl(k)' }
  });

  def({
    id: 'cuno32_naoh',
    name: 'Bakır(II) nitrat + Sodyum hidroksit',
    fixed: { name: 'Bakır(II) nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0x3aa0e0, opacity: 0.42 },
    added: { name: 'Sodyum hidroksit çözeltisi', state: 'sulu çözelti', vol: 60, color: 0xf3f6f8, opacity: 0.17 },
    obs: { type: 'precipitate', precip: { color: 0x3b8fd6, amount: 1.0, style: 'gel' }, temp: 23.0, tint: { color: 0xcfe6f2, opacity: 0.22 } },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'Mavi çözeltide jel kıvamında mavi bir katı (çökelti) oluştu ve dibe çöktü; üstteki sıvının rengi açıldı.',
    before: { 'Cu2+': 1, 'NO3-': 2, 'Na+': 2, 'OH-': 2 },
    after: { 'Cu(OH)2(k)': 1, 'Na+': 2, 'NO3-': 2 },
    distractors: ['NaNO3(k)', 'H2O', 'Cu2+', 'OH-'],
    afterHint: 'Mavi renkli bir katı oluştu. Bakır(II) iyonu hangi iyonlarla bir araya gelip katı oluşturmuş olabilir?',
    eq: {
      r: [{ c: 1, f: 'Cu(NO₃)₂', s: 'suda', sp: ['Cu2+', 'NO3-'], m: 'fixed' }, { c: 2, f: 'NaOH', s: 'suda', sp: ['Na+', 'OH-'], m: 'added' }],
      p: [{ c: 1, f: 'Cu(OH)₂', s: 'k', sp: ['Cu(OH)2(k)'], m: 'solid' }, { c: 2, f: 'NaNO₃', s: 'suda', sp: ['Na+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'Cu', from: 'Cu2+', name: 'bakır' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Dipte biriken mavi katıyı hangi tanecik oluşturur?', ans: 'Cu(OH)2(k)' }
  });

  def({
    id: 'cacl2_na2co3',
    name: 'Kalsiyum klorür + Sodyum karbonat',
    fixed: { name: 'Kalsiyum klorür çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Sodyum karbonat çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xeef6fb, opacity: 0.18 },
    obs: { type: 'precipitate', precip: { color: 0xf6f6f2, amount: 0.95, style: 'fine' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'İki berrak çözelti karışınca beyaz bir katı (çökelti) oluştu; sıvı bulanıklaştı ve katı dibe çöktü.',
    before: { 'Ca2+': 1, 'Cl-': 2, 'Na+': 2, 'CO3 2-': 1 },
    after: { 'CaCO3(k)': 1, 'Na+': 2, 'Cl-': 2 },
    distractors: ['NaCl(k)', 'CO2', 'H2O', 'Ca2+'],
    afterHint: 'Beyaz bir katı oluştu. Kalsiyum iyonu hangi iyonla birleşip katı oluşturmuş olabilir? Sodyum ve klorür iyonları nerede kalır?',
    eq: {
      r: [{ c: 1, f: 'CaCl₂', s: 'suda', sp: ['Ca2+', 'Cl-'], m: 'fixed' }, { c: 1, f: 'Na₂CO₃', s: 'suda', sp: ['Na+', 'CO3 2-'], m: 'added' }],
      p: [{ c: 1, f: 'CaCO₃', s: 'k', sp: ['CaCO3(k)'], m: 'solid' }, { c: 2, f: 'NaCl', s: 'suda', sp: ['Na+', 'Cl-'], m: 'solution' }]
    },
    track: [{ el: 'Ca', from: 'Ca2+', name: 'kalsiyum' }, { el: 'Cl', from: 'Cl-', name: 'klor', spectator: true }],
    quiz: { q: 'Beyaz katıyı (çökeltiyi) hangi tanecik oluşturur?', ans: 'CaCO3(k)' }
  });

  def({
    id: 'agno3_ki',
    name: 'Gümüş nitrat + Potasyum iyodür',
    fixed: { name: 'Gümüş nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Potasyum iyodür çözeltisi', state: 'sulu çözelti', vol: 50, color: 0xf3f6f8, opacity: 0.17 },
    obs: { type: 'precipitate', precip: { color: 0xf1e3a0, amount: 0.9, style: 'curdy' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'Karışımda açık sarı (krem) renkli bir katı (çökelti) oluştu.',
    before: { 'Ag+': 1, 'NO3-': 1, 'K+': 1, 'I-': 1 },
    after: { 'AgI(k)': 1, 'K+': 1, 'NO3-': 1 },
    distractors: ['KNO3(k)', 'Ag+', 'I-', 'H2O'],
    afterHint: 'Açık sarı bir katı oluştu. Hangi iki iyon birleşmiş olabilir? Potasyum ve nitrat iyonları nerede kalır?',
    eq: {
      r: [{ c: 1, f: 'AgNO₃', s: 'suda', sp: ['Ag+', 'NO3-'], m: 'fixed' }, { c: 1, f: 'KI', s: 'suda', sp: ['K+', 'I-'], m: 'added' }],
      p: [{ c: 1, f: 'AgI', s: 'k', sp: ['AgI(k)'], m: 'solid' }, { c: 1, f: 'KNO₃', s: 'suda', sp: ['K+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'I', from: 'I-', name: 'iyot' }, { el: 'K', from: 'K+', name: 'potasyum', spectator: true }],
    quiz: { q: 'Açık sarı katıyı (çökeltiyi) hangi tanecik oluşturur?', ans: 'AgI(k)' }
  });

  def({
    id: 'cuno32_na2co3',
    name: 'Bakır(II) nitrat + Sodyum karbonat',
    fixed: { name: 'Bakır(II) nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0x3aa0e0, opacity: 0.42 },
    added: { name: 'Sodyum karbonat çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xeef6fb, opacity: 0.18 },
    obs: { type: 'precipitate', precip: { color: 0x3fb3a3, amount: 1.0, style: 'fine' }, temp: 22.4, tint: { color: 0xc9e7ee, opacity: 0.22 } },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['SMOKE'] },
    okText: 'Mavi çözeltide turkuaz (mavi-yeşil) renkli bir katı (çökelti) oluştu ve dibe çöktü.',
    before: { 'Cu2+': 1, 'NO3-': 2, 'Na+': 2, 'CO3 2-': 1 },
    after: { 'CuCO3(k)': 1, 'Na+': 2, 'NO3-': 2 },
    distractors: ['NaNO3(k)', 'CO2', 'Cu2+', 'H2O'],
    afterHint: 'Turkuaz renkli bir katı oluştu. Bakır(II) iyonu hangi iyonla birleşip katı oluşturmuş olabilir?',
    eq: {
      r: [{ c: 1, f: 'Cu(NO₃)₂', s: 'suda', sp: ['Cu2+', 'NO3-'], m: 'fixed' }, { c: 1, f: 'Na₂CO₃', s: 'suda', sp: ['Na+', 'CO3 2-'], m: 'added' }],
      p: [{ c: 1, f: 'CuCO₃', s: 'k', sp: ['CuCO3(k)'], m: 'solid' }, { c: 2, f: 'NaNO₃', s: 'suda', sp: ['Na+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'Cu', from: 'Cu2+', name: 'bakır' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Turkuaz katıyı (çökeltiyi) hangi tanecik oluşturur?', ans: 'CuCO3(k)' }
  });

  /* ---------------- ÖĞRETİCİ TEPKİMELERİ ----------------
     Yalnızca öğreticide kullanılır; tepkime listesinde ve öğrenci görevlerinde yer almaz,
     böylece öğretici gerçek etkinliğin cevaplarını vermez. */
  const tutList = [];
  function defTut(o) { R[o.id] = o; tutList.push(o); o.no = 90 + tutList.length; o.tutorial = true; }

  defTut({
    id: 'tut_agno3_nacl',
    name: 'Gümüş nitrat + Sodyum klorür',
    fixed: { name: 'Gümüş nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Sodyum klorür çözeltisi (tuzlu su)', state: 'sulu çözelti', vol: 50, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'precipitate', precip: { color: 0xf6f6f2, amount: 1.0, style: 'curdy' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'İki berrak çözelti karışınca beyaz bir katı (çökelti) oluştu ve kabın dibine çöktü.',
    precipName: 'beyaz',
    before: { 'Ag+': 1, 'NO3-': 1, 'Na+': 1, 'Cl-': 1 },
    after: { 'AgCl(k)': 1, 'Na+': 1, 'NO3-': 1 },
    distractors: ['NaCl(k)', 'NaNO3(k)', 'Ag+', 'H2O'],
    afterHint: 'Beyaz bir katı oluştu. Hangi iki iyon birleşip katı oluşturmuş olabilir? Sodyum ve nitrat iyonları nerede kalır?',
    eq: {
      r: [{ c: 1, f: 'AgNO₃', s: 'suda', sp: ['Ag+', 'NO3-'], m: 'fixed' }, { c: 1, f: 'NaCl', s: 'suda', sp: ['Na+', 'Cl-'], m: 'added' }],
      p: [{ c: 1, f: 'AgCl', s: 'k', sp: ['AgCl(k)'], m: 'solid' }, { c: 1, f: 'NaNO₃', s: 'suda', sp: ['Na+', 'NO3-'], m: 'solution' }]
    },
    track: [{ el: 'Ag', from: 'Ag+', name: 'gümüş' }, { el: 'Na', from: 'Na+', name: 'sodyum', spectator: true }],
    quiz: { q: 'Kabın dibinde biriken beyaz katıyı hangi tanecik oluşturur?', ans: 'AgCl(k)' }
  });

  // Öğretici · 6. aşama Görev 1 (tanecik modeli)
  defTut({
    id: 'tut_cacl2_agno3',
    name: 'Kalsiyum klorür + Gümüş nitrat',
    fixed: { name: 'Kalsiyum klorür çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Gümüş nitrat çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xf3f6f8, opacity: 0.17 },
    obs: { type: 'precipitate', precip: { color: 0xf6f6f2, amount: 1.0, style: 'curdy' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'Karışımda beyaz bir katı (çökelti) oluştu.',
    precipName: 'beyaz',
    before: { 'Ca2+': 1, 'Cl-': 2, 'Ag+': 2, 'NO3-': 2 },
    after: { 'AgCl(k)': 2, 'Ca2+': 1, 'NO3-': 2 },
    distractors: ['CaCl2(k)', 'Ag+', 'Cl-', 'H2O'],
    afterHint: 'Beyaz bir katı oluştu. Hangi iyonlar birleşip katı oluşturmuş olabilir? Kaç tane?',
    eq: {
      r: [{ c: 1, f: 'CaCl₂', s: 'suda', sp: ['Ca2+', 'Cl-'], m: 'fixed' }, { c: 2, f: 'AgNO₃', s: 'suda', sp: ['Ag+', 'NO3-'], m: 'added' }],
      p: [{ c: 2, f: 'AgCl', s: 'k', sp: ['AgCl(k)'], m: 'solid' }, { c: 1, f: 'Ca(NO₃)₂', s: 'suda', sp: ['Ca2+', 'NO3-'], m: 'solution' }]
    },
    track: [], quiz: null
  });

  // Öğretici · 6. aşama Görev 2 (gözlem tahmini)
  defTut({
    id: 'tut_cano32_k2co3',
    name: 'Kalsiyum nitrat + Potasyum karbonat',
    fixed: { name: 'Kalsiyum nitrat çözeltisi', state: 'sulu çözelti', vol: 100, color: 0xf3f6f8, opacity: 0.17 },
    added: { name: 'Potasyum karbonat çözeltisi', state: 'sulu çözelti', vol: 55, color: 0xeef6fb, opacity: 0.18 },
    obs: { type: 'precipitate', precip: { color: 0xf6f6f2, amount: 0.95, style: 'fine' }, temp: 22.0 },
    evidence: { need: ['PRECIP'], support: ['COLOR'], wrong: ['GAS', 'SMOKE'] },
    okText: 'Karışımda beyaz bir katı (çökelti) oluştu.',
    precipName: 'beyaz',
    before: { 'Ca2+': 1, 'NO3-': 2, 'K+': 2, 'CO3 2-': 1 },
    after: { 'CaCO3(k)': 1, 'K+': 2, 'NO3-': 2 },
    distractors: ['KNO3(k)', 'CO2', 'H2O'],
    afterHint: '',
    eq: {
      r: [{ c: 1, f: 'Ca(NO₃)₂', s: 'suda', sp: ['Ca2+', 'NO3-'], m: 'fixed' }, { c: 1, f: 'K₂CO₃', s: 'suda', sp: ['K+', 'CO3 2-'], m: 'added' }],
      p: [{ c: 1, f: 'CaCO₃', s: 'k', sp: ['CaCO3(k)'], m: 'solid' }, { c: 2, f: 'KNO₃', s: 'suda', sp: ['K+', 'NO3-'], m: 'solution' }]
    },
    track: [], quiz: null
  });

  // Öğretici · 6. aşama Görev 3 (denklem)
  defTut({
    id: 'tut_k2co3_hcl',
    name: 'Potasyum karbonat + Hidroklorik asit',
    fixed: { name: 'Potasyum karbonat çözeltisi', state: 'sulu çözelti', vol: 110, color: 0xeef6fb, opacity: 0.2 },
    added: { name: 'Hidroklorik asit çözeltisi', state: 'sulu çözelti', vol: 60, color: 0xf2f8fc, opacity: 0.18 },
    obs: { type: 'gas', gas: { rate: 0.95, foam: 0.3, dur: 11 }, temp: 23.0 },
    evidence: { need: ['GAS'], support: ['WARM'], wrong: ['PRECIP', 'SMOKE'] },
    okText: 'Karışımda gaz kabarcıkları oluştu.',
    before: { 'K+': 2, 'CO3 2-': 1, 'H+': 2, 'Cl-': 2 },
    after: { 'K+': 2, 'Cl-': 2, 'H2O': 1, 'CO2': 1 },
    distractors: ['HCl', 'H2'],
    afterHint: '',
    eq: {
      r: [{ c: 1, f: 'K₂CO₃', s: 'suda', sp: ['K+', 'CO3 2-'], m: 'fixed' }, { c: 2, f: 'HCl', s: 'suda', sp: ['H+', 'Cl-'], m: 'added' }],
      p: [{ c: 2, f: 'KCl', s: 'suda', sp: ['K+', 'Cl-'], m: 'solution' }, { c: 1, f: 'H₂O', s: 's', sp: ['H2O'], m: 'solution' }, { c: 1, f: 'CO₂', s: 'g', sp: ['CO2'], m: 'gas' }]
    },
    track: [], quiz: null
  });

  /* Öğretici akışı için seçimler */
  T.TUTORIAL = {
    reaction: 'tut_agno3_nacl',
    tasks6: ['tut_cacl2_agno3', 'tut_cano32_k2co3', 'tut_k2co3_hcl'],
    broken: {
      reaction: 'tut_agno3_nacl',
      before: { 'Ag+': 1, 'NO3-': 1, 'NaCl(k)': 1 },
      after: { 'AgCl(k)': 1, 'NaNO3(k)': 1 },
      story: 'Bir öğrenci <b>gümüş nitrat + sodyum klorür</b> tepkimesi için bu modeli kurmuş. Deneyde iki berrak çözelti karışınca beyaz bir çökelti oluşmuştu.'
    }
  };

  /* Tür → tepkimedeki madde adı eşleşmesi (2. düzey ipucu için) */
  list.concat(tutList).forEach((r) => {
    r.pool = Array.from(new Set([...Object.keys(r.before), ...Object.keys(r.after), ...r.distractors]));
  });

  /* Aşama 6 ve 7 için görev seçimi (ana tepkimeden farklı tepkimeler) */
  T.pickOther = function (preferred, mainId) {
    for (const id of preferred) if (id !== mainId) return R[id];
    return R[preferred[0]];
  };

  /* Aşama 7: bozuk modeller */
  T.BROKEN = {
    caco3_hcl: {
      reaction: 'caco3_hcl',
      before: { 'CaCO3(k)': 1, 'HCl': 1 },
      after: { 'CaCl2(k)': 1, 'H2O': 1, 'CO2': 1 },
      story: 'Bir öğrenci <b>kalsiyum karbonat (mermer) + hidroklorik asit</b> tepkimesi için bu modeli kurmuş. Deneyde mermerden kabarcıklar çıkmış ve katı küçülmüştü.'
    },
    cacl2_na2co3: {
      reaction: 'cacl2_na2co3',
      before: { 'CaCl2(k)': 1, 'Na+': 1, 'CO3 2-': 1 },
      after: { 'CaCO3(k)': 1, 'NaCl(k)': 1 },
      story: 'Bir öğrenci <b>kalsiyum klorür + sodyum karbonat</b> tepkimesi için bu modeli kurmuş. Deneyde iki çözelti karışınca beyaz bir çökelti oluşmuştu.'
    }
  };

  T.REACTIONS = R;
  T.REACTION_LIST = list;
})(window.TUY);
