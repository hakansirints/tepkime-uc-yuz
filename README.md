# Tepkimenin Üç Yüzü

Türkçe sanal kimya laboratuvarı. Öğrenci 12 tepkimeyi gözlemler, tanecik modellerini kurar ve atomların izini sürer.

## Çalıştırma

`index.html` dosyasını tarayıcıda açın. Windows'ta `baslat.cmd` kullanılabilir. Derleme veya paket kurulumu gerekmez; Three.js dosyaları `js/vendor` klasöründedir.

Site dosyaları `index.html`, `css/`, `js/` ve `assets/` klasörlerindedir. Ayrıntılı etkinlik ve kullanım açıklamaları [README-LAB.md](README-LAB.md) dosyasındadır. Bu belgedeki tasarım referansları, ekran görüntüleri ve ek tarayıcı kontrolleri yerel geliştirme klasörüne aittir; depoya dahil değildir.

## Mantık kontrolleri

Node.js kuruluysa proje klasöründe çalıştırın:

```sh
node scratch/verify-warm-lab.cjs
node scratch/test-stage1-2.js
```

Bu kontroller tepkime, hacim ve modelleme mantığını sınar. Görsel tarayıcı kontrolünün yerini almaz.
