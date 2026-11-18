# Tepkimenin Üç Yüzü — Sanal Kimya Laboratuvarı

Lise öğrencileri için 7 aşamalı, three.js tabanlı bir tepkime modelleme stüdyosu. Öğrenci gerçekçi bir okul laboratuvarında deney yapar. Sonra tepkimeyi tanecik düzeyinde modeller, modeli test eder ve tepkimeyi üç gösterimle (makroskobik, tanecik, sembolik) ilişkilendirir.

## Çalıştırma

Kurulum gerekmez. Proje klasöründe basit bir sunucu başlatıp tarayıcıda açın:

```bash
python -m http.server 8765
```

Ardından tarayıcıda `http://localhost:8765` adresini açın. `index.html` dosyasına çift tıklayarak da açılabilir. three.js CDN'den yüklendiği için ilk açılışta internet bağlantısı gerekir.

İlerleme tarayıcıda (localStorage) saklanır. Sağ üstteki ↺ düğmesi ilerlemeyi sıfırlar.

Arayüz Apple'ın "Liquid Glass" tasarım dilinden esinlenir: yarı saydam, bulanık cam yüzeyler ve hap biçimli denetimler. Açık ve koyu tema vardır. İlk açılışta sistem tercihi uygulanır, sağ üstteki ☀️ / 🌙 düğmesiyle değiştirilebilir.

## 7 aşama

| # | Aşama | Öğrenci ne yapar? |
|---|-------|-------------------|
| 1 | **Gözlem** | 12 tepkimeden birini seçer, beheri sürükleyerek döker. Kabarcık, çökelti, ısı ve duman gibi değişimleri izler, termometreyi okur. Gözlemini kendi cümleleriyle yazar. Bu aşamada formül yoktur, yalnızca madde adları kullanılır. Geri bildirim cevabı söylemez, yönlendirir. |
| 2 | **Modelini kur** | Tanecik havuzundan *Tepkime öncesi* ve *Tepkime sonrası* bölümlerine tanecik yerleştirir. Ortadaki *Tanecikler etkileşirken* bölümünde atomların yeniden düzenlenmesini izler. Canlı atom sayacı ve üç düzeyli destek vardır: yönlendirme, tanecik ipucu ve formül ipucu. |
| 3 | **Atom takibi** | İzlenecek atomu içeren taneciğe dokunur, işaretli atomu animasyonda takip eder ve sonunda atomun hangi tanecikte olduğunu seçer. Ayrıca seyirci iyonu izler. |
| 4 | **Test et** | Modeli çalıştırır. Yok olan ya da yoktan ortaya çıkan atomlar kırmızı görünür. Model dört ölçüte göre test edilir: atom türü, atom sayısı, iyon/kristal gösterimi ve türler. Geri bildirim cevabı vermez (örneğin “oksijen atomlarını yeniden say…”). |
| 5 | **Üç gösterim** | Makroskobik kap, tanecik modeli ve denklem yan yana durur. Birinde bir öğe seçilince diğer ikisinde karşılığı vurgulanır. Hâl sembolleri (k, s, g, suda), katsayılar ve katalizör açıklanır. Aşama bir bağlantı sorusuyla biter. |
| 6 | **Temsil değiştir** | Üç görevde iki gösterim verilir, eksik olanı öğrenci oluşturur: makro + denklem → tanecik modeli, model + denklem → gözlem tahmini, makro + model → katsayı ve hâl. |
| 7 | **Bozuk model** | Başka bir öğrencinin hatalı modeli verilir; hatalar baştan söylenmez. Öğrenci modeli çalıştırır, düzeltir ve düzeltmesini açık uçlu bir metinle gerekçelendirir. Sonunda öğrenme özeti gösterilir. |

## Öğretici

Üst bardaki **🎓 Öğretici** bağlantısı (ya da `index.html#ogretici` adresi) rehberli bir tur başlatır. Tur, listede olmayan örnek bir tepkimeyle (**gümüş nitrat + sodyum klorür → AgCl çökeltisi**) 7 aşamanın hepsini 49 adımda yaptırır.

- Her adımda ilgili öğe vurgulanır. Öğrenci işlemi kendisi yapar ya da **🪄 Benim yerime yap** ile işlemi izler.
- 6. ve 7. aşamada yalnızca öğreticiye ayrılmış tepkimeler ve bozuk model kullanılır, böylece öğretici gerçek görevlerin cevabını vermez.
- Öğrencinin ilerlemesi yedeklenir, öğretici boyunca kaydedilmez ve çıkışta aynen geri yüklenir.
- Kod `js/tutorial.js` dosyasında. Öğretici tepkimeleri `js/data/reactions.js` dosyasındaki `T.TUTORIAL` bölümünde.

## Kazanımlar

- Kimyasal tepkimeyi gözlenebilir kanıtlarla tanır: gaz çıkışı, çökelti, ısı değişimi, renk değişimi, duman.
- Tepkimede atomların türünün ve sayısının korunduğunu, atomların yeniden düzenlendiğini açıklar.
- Sulu çözeltideki maddeleri ayrı iyonlar, katı çökeltileri kristal yapı olarak modeller.
- Bir tepkimeyi makroskobik, tanecik ve sembolik düzeyde gösterir, gösterimler arasında geçiş yapar.
- Fiziksel hâl sembollerini ve katsayıları tanecik modeliyle ilişkilendirir.
- Bir modeli ölçütlere göre eleştirir, düzeltir ve gerekçelendirir.

## Tepkimeler

**Gaz çıkışı:**
- NaHCO₃ + HCl
- CaCO₃ (mermer) + HCl
- Na₂CO₃ + HCl
- H₂O₂ (KI katalizörlü)

**Isı ve duman:**
- HCl + NaOH
- NH₃ + HCl

**Çökelti:**
- Pb(NO₃)₂ + KI
- AgNO₃ + HCl
- Cu(NO₃)₂ + NaOH
- CaCl₂ + Na₂CO₃
- AgNO₃ + KI
- Cu(NO₃)₂ + Na₂CO₃

## Dosya yapısı

```
index.html            Arayüz iskeleti
css/style.css         Tema ve yerleşim
js/core/              Yardımcılar, ilerleme durumu, değerlendirici, ses
js/data/              Tanecik (tür) verisi ve 12 tepkime
js/lab/               3B laboratuvar: oda, cam malzemeler, sıvı ve efektler (kabarcık, köpük, çökelti, duman, akış)
js/models/            Tanecik modelleri, çok panelli görüntüleyici, yeniden düzenlenme animasyonu, model kurucu, makro mini sahne
js/stages/stage1-7.js Her aşamanın akışı
js/app.js             Aşama geçişleri, üst menü
```
