# Tepkimenin Üç Yüzü — Sıcak sınıf laboratuvarı

`index.html` veya `baslat.cmd` dosyasını açın. Yerel JavaScript kütüphaneleri kullanılır; sunucu veya paket kurulumu gerekmez. Etkinlik Gözlem ve Modelle aşamalarını içerir.

## Kullanım

1. Soldaki karttan mevcut 12 tepkimeden birini seçin.
2. Doldurma tamamlandığında sağdaki **Beheri dök ve karıştır** düğmesini kullanın veya küçük beheri sola ve yukarı sürükleyin. Ağız çevresindeki altın halka göründüğünde bırakarak dökün.
3. Deneyi gözlemleyin, deney defterine gözleminizi yazın ve kontrol edin.
4. Doğru gözlemden sonra tanecik laboratuvarına geçin.
5. Yeniden denemek için **Baştan başlat / tekrar dök** düğmesini kullanın.

Dar ekranlarda **Tepkimeler** ve **Deney defteri** düğmeleri ilgili paneli açar. Masa, Yakın ve Oda seçenekleri kamerayı değiştirir; sürükleme ve tekerlek kamera kontrolü sağlar. Masa rengi sağ alttan seçilir.

## Tasarım ve içerik

- Oda geometrisi `sicak-sinif-laboratuvari` referansına dayanır.
- Beher gövdesi Tepkime Arenası'ndaki iç/dış cam profilinden uyarlanmıştır. İki kapta 67:92 çap/yükseklik oranı korunur; 80 mL kap, 250 mL kaba göre `Math.cbrt(80 / 250)` doğrusal çarpanıyla ölçeklenir. Gösterim boyutu fiziksel ürün ölçüsü değildir.
- Tepkime Arenası'ndan eğitim içeriği veya tepkime verisi alınmamıştır. `js/data/reactions-data.js`, mevcut tanecik türleri ve değerlendirme kuralları bu projenindir.
- Hacim göstergesi ve mL ölçeği mevcut tepkime verilerindeki hacimlerle eşleşir. Sıvı geometrisi ve aktarım animasyonu görsel bir modeldir.

## Dosyalar

- `js/scene3d/warm-room.js`: sıcak oda, masa ve dolaplar.
- `js/scene3d/glassware.js`: kap ölçüleri, cam, taksimat, hacim ve dökme.
- `js/scene3d/lab-scene.js`: kamera, ışık, masa yüzeyindeki bilgi etiketleri ve sahne etkileşimleri.
- `css/warm-lab.css`: yeni düzen ve ekran boyutlarına göre stiller.
- `js/app.js`: mevcut tepkime kartları, kap bilgileri ve mobil panel kontrolü.

## Kontroller

Proje klasöründe:

```powershell
node scratch/verify-warm-lab.cjs
node scratch/test-stage1-2.js
```

İlk kontrol 12 tepkimede 108 dökme noktası için hacim korunumu, geometri, kap oranı ve parçacık sıfırlamasını doğrular. İkinci kontrol mevcut gözlem ve tanecik mantığını sınar. Bu kontroller GPU görüntüsünü doğrulamaz; ayrıca gerçek tarayıcıda sonuçlar, gözlem kilitleri ve farklı ekran boyutları incelenmiştir.

Dökme yolu ayrıca 101 konumda iki beherin duvarlarının kesişmemesi için örneklenir. Görsel kontroller masaüstü, 768×1024 tablet, 900×430 yatay ve 390×844 dikey telefon görünümlerini kapsadı. Tanecik modelinde örnek çökelti tepkimesinin atom/kütle korunumu kontrolü tarayıcıda başarıyla tamamlandı.

`ekran-goruntuleri/` klasöründe oda, masa ve tanecik modelleme ekranlarının kaydedilmiş görüntüleri bulunur.

## Son arayüz ve etkileşim düzenlemeleri

- Açılışta oda geneli gösterilir; 1,1 saniye sonra kamera 2,5 saniyede masaya yaklaşır. Kamera etkileşimi turu durdurur. Hareket azaltma tercihinde masa doğrudan gösterilir.
- Madde bilgileri masa üzerinde perspektifi izleyen kâğıt etiketlerdir; hacimleri aktarım boyunca güncellenir.
- Seçim kartı boşken vurgulanır. Seçim özeti görünür tutulur, liste kalan yüksekliğe göre kayar; kısa yatay ekranlarda yan tarafta açılır.
- Seçili maddeye veya etiketine odaklanma kısa tanecik hareketi gösterir. Bu animasyon tepkime sonucunu tetiklemez.
- Dolum 1,1 saniyede tabandan yükselir. Dökme 5 saniyedir; akış, damlalar ve yüzey halkaları görselleştirilir.
- Küçük beheri sola/yukarı sürüklemek kaldırır ve eğer; altın ağız halkası uygun konumu bildirir. Bu konumda bırakma aktarımı tamamlar, erken bırakma beheri geri yerleştirir. Sağdaki otomatik dökme düğmesi de kullanılabilir.

## Modelle ve Atomun izini sür

Modelle tek bir 3B sahnedir: solda havuz, sağda modelleme alanı vardır. Tanecikler havuzda yatay eksen etrafında döner; fare üzerlerine geldiğinde durur ve %25 büyür. Sol taneciği sağa sürükleyip bırakın. Modelde seçili olmayan taneciği sürüklemek yalnızca onu döndürür; seçili taneciği sürüklemek taşır. Boş alanda sürükleme sahneyi döndürmez; yalnızca atom ve madde modelleri kendi merkezinde döndürülür. Tür adları arka plansız olarak sahnenin iç altına sabitlenmiştir; seçili tür arka plan eklenmeden renk ve alt çizgiyle belirginleşir. Atom örnekleri havuzun altındadır ve ek atom oluşturmaz.

Üç modelleme sekmesi sırayla doğrulanır. Son korunma kartı atom sayılarını ve ürünleri kontrol eder. Model tamamlanınca 3. aşama açılır. Önceki modeli değiştirmek sonraki modelleme adımlarını ve 3. aşamayı yeniden kilitler.

Atomun izini sür aşamasında öğrenci önce ürün eşleştirmesini ve gerekçesini kendisi seçer. Doğru eşleştirmeden sonra yönlendirmeli iz sürme açılır. İşaretli atomun kimliği, öğrencinin doğruladığı önce/sonra modellerinden aynen aktarılır. Karbon varsa karbon, yoksa tepkimede bulunan uygun başka bir atom kullanılır. Hareket gerçek bir mikroskobik yörüngeyi değil, aynı atomun yeniden kullanılmasını temsil eder. İki etkinlik de tamamlanınca aşama doğrulanır. Aşamalar arasında gidip gelirken modeller korunur; tepkime değişiminde sıfırlanır.

Dosyalar: js/stages/student-modeling.js, js/stages/student-atom-trace.js ve ilgili CSS dosyaları. Tarayıcı kontrolü: node scratch/check-unified-and-trace.cjs. Önceki gözlem ve oda kontrolleri de uygulanır.
