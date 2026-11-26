/* ÖĞRETİCİ — örnek bir tepkimeyle (gümüş nitrat + sodyum klorür) 7 aşamanın tamamını adım adım gösterir.
   Öğrencinin kendi ilerlemesi yedeklenir ve öğretici boyunca kaydedilmez (sandbox);
   öğretici bitince ya da çıkılınca kaldığı yere geri döner.
   Her adımda öğrenci işlemi kendisi yapar ya da “Benim yerime yap” ile işlemi izler. */
(function (T) {
  'use strict';
  const U = T.U, h = U.h, S = T.State;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, timeout) {
    const t0 = performance.now();
    while (!safe(fn)) { if (performance.now() - t0 > (timeout || 20000)) return false; await wait(120); }
    return true;
  }
  function safe(fn) { try { return !!fn(); } catch (e) { return false; } }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const byText = (sel, re, root) => Array.from((root || document).querySelectorAll(sel)).find((e) => re.test(e.textContent));
  const R = () => T.REACTIONS[T.TUTORIAL.reaction];
  const sameMS = (a, b) => {
    const ka = Object.keys(a).filter((k) => a[k] > 0), kb = Object.keys(b).filter((k) => b[k] > 0);
    return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
  };
  const setMS = (target, src) => { Object.keys(target).forEach((k) => delete target[k]); Object.assign(target, src); };
  const cur = () => T.App.current;
  const S1 = () => T.Stage1, S2 = () => T.Stage2, S3 = () => T.Stage3, S4 = () => T.Stage4, S5 = () => T.Stage5, S6 = () => T.Stage6, S7 = () => T.Stage7;
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

  const OBS_EXAMPLE = 'İki berrak çözelti karışınca beyaz bir katı oluştu ve kabın dibine çöktü. Termometre 22 °C gösterdi.';
  const JUST_EXAMPLE = 'Modelinde sodyum klorür ve sodyum nitrat katı kristal olarak gösterilmişti. Bu tuzlar suda çözündüğü için ayrı iyonlar olarak gösterilmeli. Gümüş klorür ise suda çözünmeyen katı bir çökelti olduğu için kristal kalır. Atom türleri ve sayıları korunur; atomlar yok olmaz, yeniden düzenlenir.';

  /* ---------------------------------------------------------------
     ADIMLAR
     stage: adımın aşaması · target(): vurgulanacak öğe · check(): adım tamam mı?
     auto(): “Benim yerime yap” · autoNext: tamamlanınca kendiliğinden ilerle
     --------------------------------------------------------------- */
  const STEPS = [
    /* ===== AŞAMA 1 — GÖZLEM ===== */
    { stage: 1, center: true, title: '🎓 Öğreticiye hoş geldin!',
      text: `Bu sitede bir kimyasal tepkimeyi <b>üç düzeyde</b> inceleyeceksin: gözle görülen (makroskobik), tanecikler ve semboller (formül, denklem).
        <br><br>Bu öğretici, örnek bir tepkimeyle <b>7 aşamanın hepsini</b> birlikte yapmanı sağlar:
        <div class="tut-pair"><span>🧪 Gümüş nitrat çözeltisi</span><b>+</b><span>🧂 Sodyum klorür çözeltisi</span></div>
        Bu tepkime listede yoktur; yalnızca öğrenmek içindir. <b>Kendi ilerlemen etkilenmez.</b> Öğretici bitince kaldığın yere dönersin.
        <br><br>Her adımda işlemi kendin yap. Takılırsan <b>🪄 Benim yerime yap</b> düğmesine bas ve izle.` },
    { stage: 1, title: '7 aşamalı yol haritası', target: () => $('#stepper'),
      text: 'Üstteki çubukta 7 aşama var. Her aşamayı tamamlayınca bir sonraki açılır. Bulunduğun aşama mavi, tamamladıkların yeşil ✓ ile görünür.' },
    { stage: 1, title: 'Aşama 1 · Tepkime seçimi', target: () => $('#reaction-panel'),
      text: 'Gerçek etkinlikte işe bu karttan bir tepkime seçerek başlarsın. Başta yalnızca maddelerin <b>adlarını</b> görürsün; formüller 5. aşamada açılır. Seçim yapınca kart yukarı toplanır ve <b>seçilen maddeler</b> görünür; başka bir tepkime için <b>Değiştir</b>’e basarsın.<br><br>Öğreticide örnek tepkime <b>hazır seçildi</b>: sabit kapta gümüş nitrat, küçük beherde sodyum klorür çözeltisi.<br><span class="muted">Kamerayı döndürmek için boş alanda sürükle; yakınlaştırmak için tekerleği ya da iki parmağını kullan.</span>' },
    { stage: 1, title: 'Çözeltileri karıştır', target: () => $('#btn-pour'),
      text: 'Sağdaki küçük beheri fareyle tutup büyük kabın üzerine <b>sürükle</b> ya da <b>⤵ Otomatik dök ve karıştır</b> düğmesine bas.',
      check: () => ['pouring', 'reacting', 'done'].includes(T.Lab.state),
      auto: async () => { if (!T.Lab.safetyWorn()) T.Lab.wearSafety(); T.Lab.pour(); } },
    { stage: 1, title: 'Dikkatle izle 👀', target: () => null, at: 'left',
      text: 'Kabın içine ve termometreye bak. İki berrak çözelti karışınca ne oluyor? Sıvının görünüşü değişiyor mu, kabın dibinde bir şey birikiyor mu?<br><span class="muted">Üstteki ince bar gözlem süresini gösterir; süre dolunca “İleri” açılır.</span>',
      check: () => T.Lab.state === 'done' || !!S.data.done[1] },
    { stage: 1, title: 'Gözlemini yaz', target: () => $('#obs-text'),
      text: `Gördüğünü <b>kendi cümlelerinle</b> deftere yaz (en az 4 kelime). Formül ya da tanecik adı kullanmana gerek yok; yalnızca gözünle gördüğünü anlat.
        <div class="tut-example">Örnek: “${OBS_EXAMPLE}”</div>`,
      check: () => U.wordCount($('#obs-text').value) >= 4 || !!S.data.done[1],
      auto: async () => { const ta = $('#obs-text'); ta.value = OBS_EXAMPLE; fire(ta, 'input'); } },
    { stage: 1, title: 'Gözlemini kontrol ettir', target: () => $('#btn-check-obs'),
      text: '<b>Gözlemi kontrol et</b> düğmesine bas. Sistem gözleminde doğru <b>kanıtı</b> (gaz, çökelti, ısınma…) arar. Eksik ya da yanlışsa cevabı söylemez, sana ipucu verir; gözlemini düzeltip yeniden denersin.',
      check: () => !!S.data.done[1],
      auto: async () => { const ta = $('#obs-text'); if (U.wordCount(ta.value) < 4) { ta.value = OBS_EXAMPLE; fire(ta, 'input'); } $('#btn-check-obs').click(); } },
    { stage: 1, title: 'Tanecik düzeyine geç', target: () => $('#btn-check-obs'),
      text: 'Gözlemin onaylandı! Yeşil <b>Tanecik düzeyine geç →</b> düğmesine bas.',
      check: () => cur() === 2, autoNext: true,
      auto: async () => { T.App.go(2); } },

    /* ===== AŞAMA 2 — MODELLE ===== */
    { stage: 2, title: 'Aşama 2 · Modelini kur', target: () => $('.grid-build'),
      text: 'Bu aşamada tepkimenin <b>tanecik modelini</b> sen kuruyorsun:<br>• <b>Solda</b> tanecik havuzu,<br>• <b>Ortada</b> iki bölüm: <span class="sn r-before">1</span>tepkime öncesi → <span class="sn r-after">2</span>tepkime sonrası,<br>• <b>Sağda</b> korunma kontrolü ve atom sayacı.' },
    { stage: 2, title: 'Hangi bölüme ekleyeceksin?', target: () => S2().builder && S2().builder.switchEl,
      text: '<b><span class="sn r-before">1</span>Öncesine</b> seçiliyken tıkladığın kartlar “Tepkime öncesi” bölümüne eklenir. <b><span class="sn r-after">2</span>Sonrasına</b> seçiliyse “Tepkime sonrası” bölümüne.' },
    { stage: 2, title: 'Tepkime öncesini kur', target: () => S2().builder && S2().builder.gridEl,
      text: `Kaplarda gümüş nitrat ve sodyum klorür <b>çözeltileri</b> vardı. Suda çözünen tuzlar suda <b>iyonlarına ayrılır</b>.
        <br><br>Havuzda şu kartlara <b>birer kez</b> tıkla: <b>Ag⁺</b>, <b>NO₃⁻</b>, <b>Na⁺</b>, <b>Cl⁻</b>.
        <br><span class="muted">Yanlış eklediğin taneciği 3B bölümde üzerine tıklayarak geri alabilirsin.</span>`,
      check: () => sameMS(S.data.model.before, R().before),
      auto: async () => { const b = S2().builder; b.setTarget('before'); setMS(b.model.before, R().before); b.refresh(); b.o.onChange(b.model); } },
    { stage: 2, title: 'Takılırsan: destek düğmeleri', target: () => S2().builder && S2().builder.hintEl,
      text: 'Ne koyacağından emin değilsen <b>💡 Destek</b> düğmelerini sırayla kullan. Her düğme biraz daha fazla ipucu verir. Önce kendin düşünmeyi dene!' },
    { stage: 2, title: 'Şimdi tepkime sonrası', target: () => S2().builder && S2().builder.switchEl,
      text: '<b><span class="sn r-after">2</span>Sonrasına</b> düğmesine bas.',
      check: () => S2().builder && S2().builder.target === 'after',
      auto: async () => { S2().builder.setTarget('after'); } },
    { stage: 2, title: 'Tepkime sonrasını kur', target: () => S2().builder && S2().builder.gridEl,
      text: `Deneyde <b>beyaz bir katı</b> oluştu. Gümüş iyonu (Ag⁺) ile klorür iyonu (Cl⁻) birleşip <b>AgCl(k)</b> kristalini oluşturur. Sodyum (Na⁺) ve nitrat (NO₃⁻) iyonları çözeltide <b>değişmeden</b> kalır.
        <br><br>Havuzdan <b>AgCl(k)</b>, <b>Na⁺</b> ve <b>NO₃⁻</b> kartlarına tıkla.`,
      check: () => sameMS(S.data.model.after, R().after),
      auto: async () => { const b = S2().builder; b.setTarget('after'); setMS(b.model.after, R().after); b.refresh(); b.o.onChange(b.model); } },
    { stage: 2, title: 'Atom sayacını oku', target: () => S2().builder && S2().builder.counterEl,
      text: 'Atom sayacı her atomu <b>önce</b> ve <b>sonra</b> sayar. Her satırda iki sayı eşitse ✓ görünür: atomlar <b>korunmuş</b> demektir.' },
    { stage: 2, title: 'Modelini canlandır', target: () => S2().builder && S2().builder.playBtn,
      text: '<b><span class="sn r-before">1</span>Tepkime öncesi</b> kartındaki <b>▶ Canlandır</b> düğmesine bas ve atomların <b>yeniden düzenlenmesini</b> izle. Bitince kart başlangıç hâline döner; kaydırıcıyla da ileri geri sarabilirsin.',
      check: () => S2().builder && (!!S2().builder.rearr || S2().builder.played),
      auto: async () => { S2().builder.playMid(); } },
    { stage: 2, title: 'Bölümleri büyüt ya da gizle', target: () => S2().builder && S2().builder.regEl.before.querySelector('.pctl'),
      text: 'Bir bölümün köşesindeki <b>⤢</b> düğmesi o bölümü büyütür, <b>−</b> düğmesi gizler. Gizlenen bölüm ince bir şeride dönüşür; şeride tıklayınca geri gelir.' },
    { stage: 2, title: 'Modeli kaydet', target: () => S2().nextBtn,
      text: '<b>Modeli kaydet, atom takibine geç →</b> düğmesine bas.',
      check: () => cur() === 3, autoNext: true,
      auto: async () => { S2().nextBtn.click(); } },

    /* ===== AŞAMA 3 — ATOM TAKİBİ ===== */
    { stage: 3, title: 'Aşama 3 · Atomun izini sür', target: () => $('.track-main'),
      text: 'Burada tek bir atomu seçip tepkime boyunca nereye gittiğini izleyeceksin. Solda <b>görev kartı</b> ve adımlar, sağda <b>1 Önce → 2 Sonra</b> kartları var. Canlandırma Önce kartında oynar. Çalışacağın kart vurgulanır.' },
    { stage: 3, title: 'Gümüş atomunu seç', target: () => S3().pBefore,
      text: '<b>Önce</b> panelinde gümüş (Ag) atomu içeren taneciğe, yani <b>Ag⁺</b> iyonuna dokun. Atom sarı halkayla işaretlenir. <span class="muted">Renk anahtarı görev kartının altında.</span>',
      check: () => S3().ti > 0 || S3().step >= 2,
      auto: async () => { const st = S3(), el = st.tasks[st.ti].el; const g = st.bGroups.find((x) => T.SPECIES[x.userData.sid].atoms.some((a) => a.el === el)); st.pickBefore({ group: g }); } },
    { stage: 3, title: 'Atomu izle', target: () => S3().playBtn,
      text: 'Önce kartında beliren <b>▶ Oynat</b> düğmesine bas ve sarı halkalı atomu gözünle takip et. Kaydırıcıyla ileri geri sarabilirsin. Bitince kart başlangıç hâline döner.',
      check: () => S3().ti > 0 || S3().step >= 3,
      auto: async () => { S3().play(); await until(() => S3().step >= 3, 15000); } },
    { stage: 3, title: 'Atom şimdi nerede?', target: () => S3().pAfter,
      text: '<b><span class="sn r-after">2</span>Sonra</b> kartında gümüş atomunun bulunduğu taneciğe dokun. İpucu: beyaz katının içinde.',
      check: () => S3().ti > 0 || S3().step >= 4,
      auto: async () => { const st = S3(); const i = st.mapInfo.afterIndex; const g = st.aGroups.find((x) => x.userData.index === i) || st.aGroups[i]; st.pickAfter({ group: g }); } },
    { stage: 3, title: 'İkinci görev: sodyum iyonu', target: () => S3().side,
      text: 'Doğru! Gümüş atomu yok olmadı, <b>AgCl(k)</b> kristaline geçti. Üstteki yeşil şeritte (telefonda Görev sekmesinde) <b>Sonraki görev →</b> düğmesine bas.',
      check: () => S3().ti > 0 || !!S.data.done[3],
      auto: async () => { S3().finishTask(true); } },
    { stage: 3, title: 'Sodyumu sen izle', target: () => S3().side,
      text: 'Aynı üç adımı <b>sodyum (Na)</b> için yap: <span class="sn r-before">1</span>Önce kartında <b>Na⁺</b>’ya dokun → <b>▶ Oynat</b> → <span class="sn r-after">2</span>Sonra kartında sodyumu bul.<br><br>Sodyum iyonu tepkimede <b>hiç değişmez</b>; çözeltide serbest kalır.',
      check: () => !!S.data.done[3],
      auto: async () => {
        const st = S3();
        if (st.step < 2) { const g = st.bGroups.find((x) => x.userData.sid === 'Na+'); st.pickBefore({ group: g }); await wait(500); }
        if (st.step < 3) { st.play(); await until(() => st.step >= 3, 15000); }
        if (st.step < 4) { const i = st.mapInfo.afterIndex; const g = st.aGroups.find((x) => x.userData.index === i) || st.aGroups[i]; st.pickAfter({ group: g }); await wait(600); }
        st.finishTask(true);
      } },
    { stage: 3, title: 'Modelini test etmeye geç', target: () => Array.from(document.querySelectorAll('#ws-task button, #ws-body button')).find((e) => /Modelimi test et/.test(e.textContent) && e.offsetParent),
      text: 'Atomların yok olmadığını, <b>yeniden düzenlendiğini</b> gördün. <b>Modelimi test et →</b> düğmesine bas.',
      check: () => cur() === 4, autoNext: true,
      auto: async () => { T.App.go(4); } },

    /* ===== AŞAMA 4 — TEST ET ===== */
    { stage: 4, title: 'Aşama 4 · Test ölçütleri', target: () => S4().critEl,
      text: 'Modelin bu <b>dört ölçüte</b> göre test edilir. Sistem doğru cevabı söylemez; hatanın hangi atomda ya da tanecikte olduğunu görünür kılar.' },
    { stage: 4, title: 'Modeli çalıştır', target: () => S4().runBtn,
      text: '<b>▶ Modeli çalıştır ve test et</b> düğmesine bas ve canlandırmayı izle. Yok olan ya da yoktan ortaya çıkan bir atom olsaydı <b>kırmızı bir halkayla</b> işaretlenirdi.',
      check: () => !!S.data.done[4],
      auto: async () => { S4().run(); await until(() => !!S.data.done[4], 15000); } },
    { stage: 4, title: 'Sonucu oku', target: () => S4().countEl,
      text: 'Bütün ölçütler ✓ ve atom sayıları eşit: modelin <b>doğru</b>.<br><br>Model yanlış olsaydı ✗ işaretleri ve <b>✎ Modeli düzenle</b> düğmesi çıkardı; modelini düzeltip yeniden test ederdin.' },
    { stage: 4, title: 'Üç gösterime geç', target: () => byText('#ws-body button', /Üç gösterime geç/),
      text: '<b>Üç gösterime geç →</b> düğmesine bas.',
      check: () => cur() === 5, autoNext: true,
      auto: async () => { T.App.go(5); } },

    /* ===== AŞAMA 5 — ÜÇ GÖSTERİM ===== */
    { stage: 5, title: 'Aşama 5 · Tepkimenin üç yüzü', target: () => $('.grid-three'),
      text: 'Aynı tepkime üç şekilde gösterilir:<br>👁 <b>Makroskobik</b>: kapta gözle görülen,<br>⚛ <b>Tanecik</b>: atomlar, iyonlar, moleküller,<br>✎ <b>Sembolik</b>: kimyasal denklem.<br>Formüller ilk kez burada açılır.' },
    { stage: 5, title: 'Önce ve sonra', target: () => S5().macroBtns,
      text: 'Bu düğmelerle kabın <b>karıştırmadan önceki</b> ve <b>sonraki</b> hâli arasında geçiş yapabilirsin.' },
    { stage: 5, title: 'Gösterimleri bağla', target: () => S5().eqEl,
      text: 'Denklemdeki <b>her terime</b> dokun. Dokunduğun terimin karşılığı kapta ve tanecik modelinde aynı anda parlar.<br><br>Örneğin <b>AgCl(k)</b>’ye dokun: kaptaki beyaz katı ve modeldeki kristal vurgulanır. Dört terimin hepsine dokun.',
      check: () => S5().termEls && Object.keys(S5().termEls).every((k) => S5().seen.has(k)),
      auto: async () => { for (const k of Object.keys(S5().termEls)) { S5().termEls[k].click(); await wait(900); } } },
    { stage: 5, title: 'Soruyu cevapla', target: () => S5().quizEl,
      text: 'Üç gösterimi birleştir: <b>beyaz katıyı hangi tanecik oluşturur?</b> Doğru seçeneğe tıkla.',
      check: () => !!S.data.done[5],
      auto: async () => { const b = byText('.opt', new RegExp('^' + T.speciesLabel('AgCl(k)').replace(/[()]/g, '\\$&')), S5().quizEl); if (b) b.click(); } },
    { stage: 5, title: 'Temsil değiştirmeye geç', target: () => byText('#ws-body button', /Temsil değiştirmeye geç/),
      text: '<b>Temsil değiştirmeye geç →</b> düğmesine bas.',
      check: () => cur() === 6, autoNext: true,
      auto: async () => { T.App.go(6); } },

    /* ===== AŞAMA 6 — TEMSİL DEĞİŞTİR ===== */
    { stage: 6, title: 'Aşama 6 · Eksik gösterimi üret', target: () => S6().tabsEl,
      text: 'Burada <b>üç görev</b> var. Her görevde iki gösterim verilir, <b>eksik olan üçüncüsünü</b> sen üretirsin. Görevler farklı tepkimelerle gelir.<br><span class="muted">Öğreticideki görevler gerçek etkinliktekilerden farklıdır.</span>' },
    { stage: 6, title: 'Görev 1 · Tanecik modelini kur', target: () => S6().area,
      text: `Kalsiyum klorür + gümüş nitrat: deneyin sonucu ve denklem verildi; <b>öncesi</b> hazır. Denklemde <b>2 AgCl(k)</b> var, demek ki iki tane AgCl kristali oluşur.
        <br><br><b><span class="sn r-after">3</span>Tepkime sonrası</b> bölümüne <b>2 × AgCl(k)</b>, <b>1 × Ca²⁺</b>, <b>2 × NO₃⁻</b> ekle ve <b>✓ Modelimi kontrol et</b>’e bas.`,
      check: () => S.data.tasks6.micro && S.data.tasks6.micro.ok,
      auto: async () => {
        if (S6().idx !== 0) { S6().show(0); await wait(300); }
        const b = S6().builder; setMS(b.model.after, S6().r.after); b.refresh(); b.o.onChange(b.model); await wait(500);
        byText('button', /Modelimi kontrol et/, b.rightSlot).click();
      } },
    { stage: 6, title: 'Görev 2 · Gözlemi tahmin et', target: () => (S6().idx === 1 ? S6().area : byText('#ws-body button', /Sıradaki göreve geç/) || S6().tabsEl),
      text: `<b>Sıradaki göreve geç →</b> düğmesine bas.<br><br>Kalsiyum nitrat + potasyum karbonat: bu kez <b>tanecik modeli ve denklem</b> verildi. Kapta ne gözlenir?
        <br><br>İpucu: Modelde ve denklemde <b>(k)</b> ile gösterilen bir ürün var → kapta <b>katı</b> görürsün. Doğru cümleyi seç.`,
      check: () => S.data.tasks6.macro && S.data.tasks6.macro.ok,
      auto: async () => {
        if (S6().idx !== 1) { S6().show(1); await wait(400); }
        const want = T.macroSentence(S6().r);
        const b = Array.from(S6().area.querySelectorAll('.opt')).find((x) => x.textContent === want);
        if (b) b.click();
      } },
    { stage: 6, title: 'Görev 3 · Denklemi tamamla', target: () => (S6().idx === 2 ? S6().area : byText('#ws-body button', /Sıradaki göreve geç/) || S6().tabsEl),
      text: `<b>Sıradaki göreve geç →</b> düğmesine bas.<br><br>Potasyum karbonat + hidroklorik asit: deney ve model verildi. Her terimin <b>katsayısını</b> ve <b>hâlini</b> seç:
        <br>• Katsayı = modeldeki tanecik sayısı (ör. 2 HCl),<br>• Kabarcık olarak çıkan gaz <b>(g)</b>, su <b>(s)</b>, suda çözünmüş madde <b>(suda)</b>.
        <br>Sonra <b>✓ Denklemi kontrol et</b>.`,
      check: () => S.data.tasks6.sym && S.data.tasks6.sym.ok,
      auto: async () => {
        if (S6().idx !== 2) { S6().show(2); await wait(400); }
        const terms = T.eqTerms(S6().r).filter((t) => !t.cat);
        const els = S6().area.querySelectorAll('.eq-fill .term');
        terms.forEach((t, i) => {
          const c = els[i].querySelector('select.coef'), st = els[i].querySelector('select.state');
          c.value = String(t.c); fire(c, 'change'); st.value = t.s; fire(st, 'change');
        });
        await wait(500);
        byText('button', /Denklemi kontrol et/, S6().area).click();
      } },
    { stage: 6, title: 'Son aşamaya geç', target: () => byText('#ws-body button', /Son aşama/),
      text: 'Üç görevi de tamamladın! <b>Son aşama: Bozuk modeli onar →</b> düğmesine bas.',
      check: () => cur() === 7, autoNext: true,
      auto: async () => { T.App.go(7); } },

    /* ===== AŞAMA 7 — BOZUK MODEL ===== */
    { stage: 7, title: 'Aşama 7 · Bozuk modeli onar', target: () => $('#ws-task'),
      text: 'Bir arkadaşının kurduğu <b>hatalı</b> model sana verilir. Hataların ne olduğu söylenmez; onları sen bulacaksın.' },
    { stage: 7, title: 'Önce modeli çalıştır', target: () => S7().builder && byText('button', /çalıştır/, S7().builder.rightSlot),
      text: '<b>▶ Modeli çalıştır ve test et</b> düğmesine bas, canlandırmayı izle ve hangi ölçütlerin ✗ olduğuna bak.',
      check: () => (S7().runs || 0) >= 1 || (S.data.s7 && S.data.s7.fixed),
      auto: async () => { byText('button', /çalıştır/, S7().builder.rightSlot).click(); await until(() => (S7().runs || 0) >= 1, 15000); } },
    { stage: 7, title: 'Hataları bul ve düzelt', target: () => S7().builder && S7().builder.regionsEl,
      text: `“Sulu iyonlar ayrı” ölçütü ✗. Arkadaşın <b>NaCl(k)</b> ve <b>NaNO₃(k)</b>’yı katı kristal olarak koymuş. Ama bu tuzlar <b>suda çözünür</b>, iyonlarına ayrılır.
        <br><br>• Öncesinde: NaCl(k)’ye tıklayıp çıkar, havuzdan <b>Na⁺</b> ve <b>Cl⁻</b> ekle.<br>• Sonrasında: NaNO₃(k)’yi çıkar, <b>Na⁺</b> ve <b>NO₃⁻</b> ekle.
        <br><span class="muted">Hangi bölüme ekleyeceğini havuzdaki <span class="sn r-before">1</span>/ <span class="sn r-after">3</span>düğmeleriyle seç.</span>`,
      check: () => S7().builder && T.Eval.checkModel(S7().builder.model, { before: R().before, after: R().after }).pass,
      auto: async () => { const b = S7().builder; setMS(b.model.before, R().before); setMS(b.model.after, R().after); b.refresh(); b.o.onChange(b.model); } },
    { stage: 7, title: 'Düzelttiğin modeli test et', target: () => S7().builder && byText('button', /çalıştır/, S7().builder.rightSlot),
      text: '<b>▶ Yeniden çalıştır</b> düğmesine bas. Bütün ölçütler sağlanırsa model onarılmış olur.',
      check: () => S.data.s7 && S.data.s7.fixed,
      auto: async () => { byText('button', /çalıştır/, S7().builder.rightSlot).click(); await until(() => S.data.s7 && S.data.s7.fixed, 15000); } },
    { stage: 7, title: 'Gerekçelendirmeye geç', target: () => byText('#ws-body button', /gerekçelendir/i),
      text: '<b>Düzeltmeni gerekçelendir →</b> düğmesine bas.',
      check: () => !!$('.justify-box'), autoNext: true,
      auto: async () => { S7().showJustify(); } },
    { stage: 7, title: 'Arkadaşına not yaz', target: () => $('.justify-box'),
      text: `Neyi <b>neden</b> değiştirdiğini bilimsel bir gerekçeyle yaz (en az 12 kelime). Altta hangi bilimsel fikirleri kullandığın işaretlenir.
        <div class="tut-example">Örnek: “${JUST_EXAMPLE}”</div>`,
      check: () => { const ev = T.Eval.evaluateJustification($('.justify-box').value); return ev.words >= 12 && ev.hits.length >= 2; },
      auto: async () => { const ta = $('.justify-box'); ta.value = JUST_EXAMPLE; fire(ta, 'input'); } },
    { stage: 7, title: 'Gerekçeni değerlendir', target: () => byText('#ws-body button', /Gerekçemi değerlendir/),
      text: '<b>Gerekçemi değerlendir</b> düğmesine bas.',
      check: () => S.data.s7 && S.data.s7.justified,
      auto: async () => { byText('#ws-body button', /Gerekçemi değerlendir/).click(); } },
    { stage: 7, title: 'Öğrenme özeti', target: () => byText('#ws-body button', /Öğrenme özetini gör/) || $('.summary-wrap'),
      text: '<b>Öğrenme özetini gör →</b> düğmesine bas. Özet, yaptıklarını ve kazanımlarını gösterir.',
      check: () => !!$('.summary-wrap'),
      auto: async () => { S7().showSummary(); } },
    { stage: 7, center: true, final: true, title: '🎉 Öğreticiyi tamamladın!',
      text: `Bir tepkimenin üç yüzünü adım adım keşfettin:
        <ol class="tut-recap"><li>Deneyi yapıp <b>gözlemini</b> yazdın.</li><li>Tanecik <b>modelini</b> kurdun.</li><li><b>Atomların izini</b> sürdün.</li><li>Modelini <b>test ettin</b>.</li><li><b>Üç gösterimi</b> ilişkilendirdin.</li><li>Eksik <b>gösterimleri ürettin</b>.</li><li><b>Bozuk bir modeli</b> onarıp gerekçelendirdin.</li></ol>
        Şimdi sıra sende: öğreticiden çıkınca kendi tepkimeni seç ve aynı adımları kendin yap. Öğreticiye üst bardaki <b>🎓 Öğretici</b> bağlantısından her zaman dönebilirsin.` }
  ];

  const STAGE_NAMES = ['', 'Gözlem', 'Modelle', 'Atom Takibi', 'Test Et', 'Üç Gösterim', 'Temsil Değiştir', 'Bozuk Model'];

  const Tutorial = {
    active: false,
    i: 0,
    busy: false,

    start() {
      if (this.active) return;
      U.closeModal();
      T.App.peekLab(false);
      // öğrencinin ilerlemesini yedekle; öğretici boyunca hiçbir şey kaydedilmez
      this.backup = JSON.stringify(S.data);
      S.sandbox = true;
      S.reset();
      S.data.reaction = T.TUTORIAL.reaction;
      this.active = true;
      document.body.classList.add('tut-on');
      this.paintLink();
      T.Stage1.passed = false; T.Stage1.tries = 0;
      $('#obs-feedback').classList.add('hidden');
      $('#obs-text').value = '';
      T.Lab.setReaction(R());
      T.Lab.setView('close');
      T.Stage1.panelOpen = false;
      T.App.renderStepper();
      T.App.go(1, true);
      this.build();
      this.show(0);
      this.loop();
    },

    confirmStop() {
      const last = this.i >= STEPS.length - 1;
      if (last) { this.stop(); return; }
      const close = U.modal(h('div', null,
        h('h2', { text: 'Öğreticiden çıkılsın mı?' }),
        h('p', { text: 'Öğretici yarıda kalır. Kendi çalışmana kaldığın yerden dönersin; ilerlemen değişmedi. Öğreticiyi istediğin zaman yeniden başlatabilirsin.' }),
        h('div.modal-actions', null,
          h('button.btn.ghost', { text: 'Öğreticiye devam', onclick: () => close() }),
          h('button.btn.primary', { text: 'Çık', onclick: () => { close(); this.stop(); } }))));
    },

    stop() {
      if (!this.active) return;
      this.active = false;
      cancelAnimationFrame(this.raf);
      clearInterval(this.tickTimer);
      if (this.card) this.card.remove();
      if (this.ring) this.ring.remove();
      this.card = this.ring = null;
      document.body.classList.remove('tut-on');
      // öğrencinin ilerlemesini geri yükle
      S.data = JSON.parse(this.backup);
      S.sandbox = false;
      const d = S.data;
      T.Stage1.passed = !!d.done[1]; T.Stage1.tries = 0;
      $('#obs-feedback').classList.add('hidden');
      T.Lab.setReaction(d.reaction ? T.REACTIONS[d.reaction] : null);
      T.Lab.setView(d.reaction ? 'close' : 'bench');
      T.Stage1.panelOpen = !d.reaction;
      const sum = $('#rp-summary'); if (sum) delete sum.dataset.id; // özet yeniden çizilsin
      T.App.renderStepper();
      T.App.go(Math.min(d.stage || 1, d.maxStage || 1), true);
      this.paintLink();
      if (/^#(ogretici|öğretici)$/i.test(decodeURIComponent(location.hash))) history.replaceState(null, '', location.pathname + location.search);
      U.toast('Öğreticiden çıktın. Kendi çalışmana kaldığın yerden devam edebilirsin.');
    },

    paintLink() {
      const a = $('#btn-tutorial');
      if (!a) return;
      a.classList.toggle('on', this.active);
      a.innerHTML = this.active ? '✕ <span>Öğreticiden çık</span>' : '🎓 <span>Öğretici</span>';
      a.title = this.active ? 'Öğreticiyi kapat ve kendi çalışmana dön' : 'Siteyi örnek bir tepkimeyle adım adım öğren';
    },

    build() {
      this.ring = h('div#tut-ring');
      this.card = h('div#tut-card', { role: 'dialog', 'aria-live': 'polite', 'aria-label': 'Öğretici' });
      document.body.appendChild(this.ring);
      document.body.appendChild(this.card);
    },

    show(i) {
      this.i = Math.max(0, Math.min(STEPS.length - 1, i));
      const st = STEPS[this.i];
      if (cur() !== st.stage) T.App.go(st.stage, true);
      this.passedShown = null;
      const c = this.card;
      c.innerHTML = '';
      const prog = Math.round(((this.i + 1) / STEPS.length) * 100);
      this.closeBtn = h('button.tut-x', { title: 'Öğreticiden çık', 'aria-label': 'Öğreticiden çık', text: '✕', onclick: () => this.confirmStop() });
      c.appendChild(h('div.tut-arrow'));
      c.appendChild(h('div.tut-top', null,
        h('span.tut-badge', { text: '🧭 Rehber' }),
        h('span.tut-kicker', { text: `Aşama ${st.stage}/7 · ${STAGE_NAMES[st.stage]}` }),
        h('span.tut-count', { text: `${this.i + 1}/${STEPS.length}` }),
        this.closeBtn));
      c.appendChild(h('div.tut-prog', null, h('i', { style: { width: prog + '%' } })));
      c.appendChild(h('h3', { text: st.title }));
      c.appendChild(h('div.tut-text', { html: st.text }));
      this.statusEl = h('div.tut-status');
      c.appendChild(this.statusEl);
      this.backBtn = h('button.btn.ghost.sm', { text: '← Geri', onclick: () => this.show(this.i - 1) });
      this.backBtn.disabled = this.i === 0;
      this.autoBtn = h('button.btn.sm.tut-auto', { text: '🪄 Benim yerime yap', onclick: () => this.runAuto() });
      this.nextBtn = h('button.btn.primary.sm', { text: st.final ? 'Öğreticiyi bitir ✓' : (this.i === 0 ? 'Başlayalım →' : 'İleri →'), onclick: () => (st.final ? this.stop() : this.show(this.i + 1)) });
      if (!st.auto) this.autoBtn.style.display = 'none';
      c.appendChild(h('div.tut-actions', null, this.backBtn, h('span.grow'), this.autoBtn, this.nextBtn));
      c.classList.toggle('center', !!st.center);
      this.tick();
      this.place(true);
    },

    async runAuto() {
      const st = STEPS[this.i];
      if (!st.auto || this.busy) return;
      this.busy = true;
      this.autoBtn.disabled = true;
      this.autoBtn.textContent = '⏳ Yapılıyor…';
      try { await st.auto(); } catch (e) { console.error(e); }
      await wait(250);
      this.busy = false;
      if (this.autoBtn) { this.autoBtn.disabled = false; this.autoBtn.textContent = '🪄 Benim yerime yap'; }
      this.tick();
    },

    /** Adım durumunu güncelle: tamamlandı mı, doğru aşamada mıyız? */
    tick() {
      if (!this.active || !this.card) return;
      const st = STEPS[this.i];
      const s = this.statusEl;
      // geçiş adımları (ör. “Tanecik düzeyine geç”): öğrenci sonraki aşamaya geçince adım tamamdır,
      // “bu adım şu aşamada” uyarısına takılmadan doğrudan sonraki adıma ilerle
      if (st.autoNext && st.check && safe(st.check)) {
        if (!this.advancing) {
          this.advancing = true;
          setTimeout(() => { this.advancing = false; if (this.active && STEPS[this.i] === st) this.show(this.i + 1); }, 350);
        }
        return;
      }
      // öğrenci uygulamadaki düğmeyle ileri bir aşamaya geçtiyse geri gönderme; o aşamanın ilk adımına atla
      if (cur() > st.stage && !this.advancing) {
        const j = STEPS.findIndex((x) => x.stage === cur());
        if (j > this.i) { this.advancing = true; setTimeout(() => { this.advancing = false; if (this.active) this.show(j); }, 250); return; }
      }
      if (cur() !== st.stage) {
        s.className = 'tut-status warn';
        s.innerHTML = '';
        s.appendChild(h('span', { html: `Bu adım <b>${st.stage}. aşamada</b>. ` }));
        s.appendChild(h('button.btn.sm.ghost', { text: 'Aşamaya dön', onclick: () => T.App.go(st.stage, true) }));
        this.nextBtn.disabled = !!st.check;
        this.passedShown = null;
        return;
      }
      if (!st.check) { s.className = 'tut-status'; s.innerHTML = ''; this.nextBtn.disabled = false; return; }
      const ok = safe(st.check);
      if (ok === this.passedShown) return;
      this.passedShown = ok;
      this.nextBtn.disabled = !ok;
      this.nextBtn.classList.toggle('pulse', ok);
      this.autoBtn.style.display = !ok && st.auto ? '' : 'none';
      s.className = 'tut-status ' + (ok ? 'ok' : 'todo');
      s.innerHTML = ok ? '✓ Harika, bu adım tamam!' + (st.autoNext ? '' : ' <b>İleri</b> düğmesine bas.') : '👉 Sıra sende.' + (st.auto ? ' Takılırsan <b>🪄 Benim yerime yap</b>.' : '');
      if (ok) T.Audio.click();
    },

    loop() {
      clearInterval(this.tickTimer);
      this.tickTimer = setInterval(() => this.tick(), 250);
      const f = () => { if (!this.active) return; this.place(false); this.raf = requestAnimationFrame(f); };
      this.raf = requestAnimationFrame(f);
    },

    /** Vurgu halkasını hedefe oturt; kartı hedefi kapatmayacak bir yere yerleştir */
    place(instant) {
      const st = STEPS[this.i], card = this.card, ring = this.ring;
      if (!card) return;
      let el = null;
      if (st.target && cur() === st.stage) el = (() => { try { return st.target(); } catch (e) { return null; } })();
      let r = el && el.isConnected ? el.getBoundingClientRect() : null;
      if (r && (r.width < 2 || r.height < 2)) r = null;
      // çentik / dinamik ada payları: kart ekranın güvenli bölgesinde kalsın
      const sa = window.TUY_SA || { l: 0, r: 0, t: 0, b: 0 };
      const m = 12, mL = m + sa.l, mR = m + sa.r, mB = m + sa.b, top0 = 80 + sa.t;
      const W = innerWidth, H = innerHeight;
      const cw = card.offsetWidth, ch = card.offsetHeight;
      if (r) {
        const p = 6;
        ring.style.display = 'block';
        ring.style.left = (r.left - p) + 'px'; ring.style.top = (r.top - p) + 'px';
        ring.style.width = (r.width + 2 * p) + 'px'; ring.style.height = (r.height + 2 * p) + 'px';
      } else ring.style.display = 'none';
      let x, y, side = '';
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      if (!r) {
        x = (W - cw) / 2;
        // 'left': kabı kapatmamak için soldaki tepkime panelinin üzerine yerleş
        if (st.at === 'left') { x = mL + 8; y = top0 + 8; } else y = clamp((H - ch) / 2, top0, H - ch - mB);
      } else {
        const g = 18;
        const cands = [
          [r.right + g, clamp(r.top, top0, H - ch - mB)],
          [r.left - g - cw, clamp(r.top, top0, H - ch - mB)],
          [clamp(r.left + r.width / 2 - cw / 2, mL, W - cw - mR), r.bottom + g],
          [clamp(r.left + r.width / 2 - cw / 2, mL, W - cw - mR), r.top - g - ch]
        ];
        const fits = ([cx, cy]) => cx >= mL && cx + cw <= W - mR && cy >= m + sa.t && cy + ch <= H - mB;
        const sides = ['left', 'right', 'top', 'bottom']; // okun kartın hangi kenarında olacağı
        const bi = cands.findIndex(fits);
        let best = bi >= 0 ? cands[bi] : null;
        if (best) side = sides[bi];
        if (!best) {
          // hedef çok büyük: köşelerden hedefle en az örtüşeni seç
          const corners = [[W - cw - mR, H - ch - mB], [mL, H - ch - mB], [W - cw - mR, top0], [mL, top0]];
          const ov = ([cx, cy]) => Math.max(0, Math.min(cx + cw, r.right) - Math.max(cx, r.left)) * Math.max(0, Math.min(cy + ch, r.bottom) - Math.max(cy, r.top));
          best = corners.reduce((a, b) => (ov(b) < ov(a) ? b : a));
        }
        [x, y] = best;
      }
      card.style.transition = instant ? 'none' : '';
      card.style.left = Math.round(x) + 'px';
      card.style.top = Math.round(y) + 'px';
      // ok ucu hedefin ortasına doğru baksın
      if (card.dataset.side !== side) card.dataset.side = side;
      if (side === 'left' || side === 'right') card.style.setProperty('--arrow', clamp(r.top + r.height / 2 - y, 26, ch - 26) + 'px');
      else if (side) card.style.setProperty('--arrow', clamp(r.left + r.width / 2 - x, 26, cw - 26) + 'px');
    }
  };

  T.Tutorial = Tutorial;
  T.TUTORIAL_STEPS = STEPS;
})(window.TUY);
