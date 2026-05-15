// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — SİSTEM ARAÇLARI: TANIMLAMALAR
// ══════════════════════════════════════════════════════════════

const TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'komut_calistir',
            description: 'Windows komut satırında (PowerShell) komut çalıştırır. Program açma, dosya işlemleri, sistem bilgisi alma vb.',
            parameters: {
                type: 'object',
                properties: {
                    komut: { type: 'string', description: 'Çalıştırılacak PowerShell komutu' },
                    cwd: { type: 'string', description: 'Çalışma dizini (opsiyonel)' }
                },
                required: ['komut']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'dosya_oku',
            description: 'Belirtilen dosyanın içeriğini okur. Metin dosyaları, kod dosyaları, konfigürasyon dosyaları vb.',
            parameters: {
                type: 'object',
                properties: {
                    yol: { type: 'string', description: 'Dosyanın tam yolu (örn: C:\\Users\\Esisya\\Desktop\\dosya.txt)' }
                },
                required: ['yol']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'dosya_yaz',
            description: 'Belirtilen yola dosya yazar veya mevcut dosyayı günceller.',
            parameters: {
                type: 'object',
                properties: {
                    yol: { type: 'string', description: 'Dosyanın tam yolu' },
                    icerik: { type: 'string', description: 'Dosyaya yazılacak içerik' }
                },
                required: ['yol', 'icerik']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'klasor_listele',
            description: 'Belirtilen klasördeki dosya ve alt klasörleri listeler.',
            parameters: {
                type: 'object',
                properties: {
                    yol: { type: 'string', description: 'Klasör yolu (örn: C:\\Users\\Esisya\\Desktop)' }
                },
                required: ['yol']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'program_ac',
            description: 'Masaüstü programı veya dosya açar. Notepad, Chrome, VS Code, Excel, herhangi bir .exe vb.',
            parameters: {
                type: 'object',
                properties: {
                    program: { type: 'string', description: 'Program adı veya tam yolu (örn: notepad, chrome, code, excel)' },
                    arguman: { type: 'string', description: 'Programa gönderilecek argüman (opsiyonel, örn: açılacak dosya yolu)' }
                },
                required: ['program']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'web_icerik_cek',
            description: 'Bir web sayfasının içeriğini çeker. Haber okuma, bilgi araştırma, API çağrısı yapma vb.',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Çekilecek web sayfası URL adresi' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'web_arama',
            description: 'İnternette arama yapar ve sonuçları döndürür.',
            parameters: {
                type: 'object',
                properties: {
                    sorgu: { type: 'string', description: 'Aranacak terim veya soru' }
                },
                required: ['sorgu']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'ekran_goruntusu',
            description: 'Masaüstünün ekran görüntüsünü alır.',
            parameters: {
                type: 'object',
                properties: {
                    dosya_adi: { type: 'string', description: 'Kaydedilecek dosya adı (opsiyonel)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'process_listele',
            description: 'Çalışan processları listeler.',
            parameters: {
                type: 'object',
                properties: {
                    filtre: { type: 'string', description: 'İsme göre filtreleme (opsiyonel)' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'sistem_bilgisi',
            description: 'Bilgisayar hakkında sistem bilgisi döndürür: CPU, RAM, disk, GPU, IP adresi vb.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'ekran_analiz_et',
            description: 'Ekrana bakar ve ekranda ne olduğunu analiz eder. Kullanıcı "ekranıma bak", "ne görüyorsun", "ekranda ne var", "şunu bul" dediğinde kullan.',
            parameters: {
                type: 'object',
                properties: {
                    soru: { type: 'string', description: 'Ekran hakkında sorulacak soru (opsiyonel, örn: "hangi program açık?", "bu hata ne?")' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fare_tikla',
            description: 'Ekrandaki belirtilen koordinata fare ile tıklar. Ekranı önce ekran_analiz_et ile gör, sonra tıklanacak noktayı belirle.',
            parameters: {
                type: 'object',
                properties: {
                    x: { type: 'number', description: 'X koordinatı (piksel)' },
                    y: { type: 'number', description: 'Y koordinatı (piksel)' },
                    tur: { type: 'string', description: 'Tıklama türü: "tek", "cift", "sag" (varsayılan: tek)' }
                },
                required: ['x', 'y']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'klavye_yaz',
            description: 'Klavyeden metin yazar (aktif pencereye). Türkçe karakter destekler.',
            parameters: {
                type: 'object',
                properties: {
                    metin: { type: 'string', description: 'Yazılacak metin' }
                },
                required: ['metin']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'klavye_tus',
            description: 'Klavyede tek bir tuşa basar: enter, tab, escape, backspace, delete, up, down, left, right, f1-f12, space vb.',
            parameters: {
                type: 'object',
                properties: {
                    tus: { type: 'string', description: 'Basılacak tuş adı (enter, tab, escape, backspace, delete, up, down, left, right, f1, space vb.)' }
                },
                required: ['tus']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'klavye_kisayol',
            description: 'Klavye kısayolu çalıştırır (Ctrl+C, Ctrl+V, Alt+Tab, Ctrl+S, Win+D vb.)',
            parameters: {
                type: 'object',
                properties: {
                    tuslar: { type: 'string', description: 'Kısayol tuşları, + ile ayrılmış (örn: "ctrl+c", "alt+tab", "ctrl+shift+s", "win+d")' }
                },
                required: ['tuslar']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'fare_surukle',
            description: 'Fareyi bir noktadan diğerine sürükler (drag and drop).',
            parameters: {
                type: 'object',
                properties: {
                    x1: { type: 'number', description: 'Başlangıç X' },
                    y1: { type: 'number', description: 'Başlangıç Y' },
                    x2: { type: 'number', description: 'Hedef X' },
                    y2: { type: 'number', description: 'Hedef Y' }
                },
                required: ['x1', 'y1', 'x2', 'y2']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'pencere_listele',
            description: 'Açık olan tüm pencereleri listeler (program adı ve başlık). Hangi programların açık olduğunu öğrenmek için kullan.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'pencere_odakla',
            description: 'Belirtilen pencereyi öne getirir (odaklar). Başlık içindeki bir kelimeyi yaz yeter (örn: "Chrome", "Notepad", "Code").',
            parameters: {
                type: 'object',
                properties: {
                    baslik: { type: 'string', description: 'Pencere başlığındaki arama kelimesi' }
                },
                required: ['baslik']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'clipboard_oku',
            description: 'Panodaki (clipboard) metni okur. Kullanıcı bir şey kopyaladıysa içeriğini görmek için kullan.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'clipboard_yaz',
            description: 'Panoya (clipboard) metin yazar. Sonra yapıştırmak için kullanılabilir.',
            parameters: {
                type: 'object',
                properties: {
                    metin: { type: 'string', description: 'Panoya yazılacak metin' }
                },
                required: ['metin']
            }
        }
    }
];

export { TOOL_DEFINITIONS };

export {};
