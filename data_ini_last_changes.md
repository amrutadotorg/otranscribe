# data.ini — Recent Changes for Translation Review

**Date**: July 2026
**Reviewer**: Please verify all translations below across the 28 supported languages.

---

## Overview of Changes

7 keys were added or modified in `public/data.ini`:

| Key | Type | Purpose |
|-----|------|---------|
| `saveBackup` | NEW | Label for the configurable save backup shortcut (replaces hardcoded Ctrl+S) |
| `shortcut-listen` | NEW | "Listen" button in ShortcutInput component for interactive key capture |
| `minutes` | NEW | Unit suffix next to backup interval numeric input |
| `autosave-recovery-message` | NEW | Banner message when unsaved session is detected on startup |
| `autosave-restore` | NEW | Button label to restore autosaved session |
| `autosave-discard` | NEW | Button label to discard autosaved session |
| `shortcuts-instrux.innerHTML` | UPDATED | Added mention of `shift` and `alt` modifiers |

---

## Context / Usage in UI

### `saveBackup`
Used in `KeyboardShortcuts` settings section. The setting allows users to customize the save shortcut (previously hardcoded Ctrl+S). Displayed as a shortcut label next to a ShortcutInput component.
**Example en-US**: "Save backup"

### `shortcut-listen`
Used in `ShortcutInput.tsx` — a button the user clicks to start listening for the next key combination. When clicked, it captures the next keypress and records it as the new shortcut.
**Example en-US**: "Listen"

### `minutes`
Displayed as a suffix next to the backup interval numeric input in Settings. The input shows a number (e.g., "5") and this key provides the unit (e.g., "min").
**Example en-US**: "min"

### `autosave-recovery-message`
Shown on the StartView when a non-empty autosave is detected in localStorage on app startup. Asks the user if they want to restore it.
**Example en-US**: "An unsaved session was detected. Would you like to restore it?"

### `autosave-restore`
Button label on the autosave recovery banner. Restores the autosaved session.
**Example en-US**: "Restore"

### `autosave-discard`
Button label on the autosave recovery banner. Discards the autosaved session.
**Example en-US**: "Discard"

### `shortcuts-instrux.innerHTML`
Instruction text below the "Keyboard shortcuts" heading in Settings. Tells the user how to enter shortcuts with modifiers. Contains HTML (`<code>` tags).
**Example en-US**: "Separate multiple keys with commas. Use <code>mod</code> for Cmd/Ctrl, <code>shift</code> and <code>alt</code> for modifiers."

---

## All Translations by Language

### [en-US]
```
saveBackup = Save backup
shortcut-listen = Listen
minutes = min
autosave-recovery-message = An unsaved session was detected. Would you like to restore it?
autosave-restore          = Restore
autosave-discard          = Discard
shortcuts-instrux.innerHTML = Separate multiple keys with commas. Use <code>mod</code> for Cmd/Ctrl, <code>shift</code> and <code>alt</code> for modifiers.
```

### [ar]
```
saveBackup = حفظ نسخة احتياطية
shortcut-listen = استماع
minutes = دقيقة
autosave-recovery-message = تم اكتشاف جلسة غير محفوظة. هل ترغب في استعادتها؟
autosave-restore          = استعادة
autosave-discard          = تجاهل
shortcuts-instrux.innerHTML = فصل المفاتيح المتعددة بفواصل. استخدم <code>mod</code> لـ Cmd/Ctrl، و<code>shift</code> و<code>alt</code> للمعدّلات.
```

### [ca]
```
saveBackup = Desa còpia de seguretat
shortcut-listen = Escolta
minutes = min
autosave-recovery-message = S'ha detectat una sessió no desada. Voleu restaurar-la?
autosave-restore          = Restaura
autosave-discard          = Descarta
shortcuts-instrux.innerHTML = Separeu les tecles amb comes. Utilitzeu <code>mod</code> per a Cmd/Ctrl, <code>shift</code> i <code>alt</code> per a modificadors.
```

### [zh-CN]
```
saveBackup = 保存备份
shortcut-listen = 监听
minutes = 分钟
autosave-recovery-message = 检测到未保存的会话。是否要恢复？
autosave-restore          = 恢复
autosave-discard          = 丢弃
shortcuts-instrux.innerHTML = 用逗号分隔多个按键。使用 <code>mod</code> 表示 Cmd/Ctrl，<code>shift</code> 和 <code>alt</code> 表示修饰键。
```

### [zh-TW]
```
saveBackup = 儲存備份
shortcut-listen = 聆聽
minutes = 分鐘
autosave-recovery-message = 偵測到未儲存的作業階段。是否要還原？
autosave-restore          = 還原
autosave-discard          = 捨棄
shortcuts-instrux.innerHTML = 用逗號分隔多個按鍵。使用 <code>mod</code> 表示 Cmd/Ctrl，<code>shift</code> 和 <code>alt</code> 表示修飾鍵。
```

### [da]
```
saveBackup = Gem backup
shortcut-listen = Lyt
minutes = min
autosave-recovery-message = Der blev fundet en ikke-gemt session. Vil du gendanne den?
autosave-restore          = Gendan
autosave-discard          = Kassér
shortcuts-instrux.innerHTML = Adskil flere taster med kommaer. Brug <code>mod</code> til Cmd/Ctrl, <code>shift</code> og <code>alt</code> til modifikationer.
```

### [nl]
```
saveBackup = Back-up opslaan
shortcut-listen = Luisteren
minutes = min
autosave-recovery-message = Er is een niet-opgeslagen sessie gedetecteerd. Wilt u deze herstellen?
autosave-restore          = Herstellen
autosave-discard          = Verwerpen
shortcuts-instrux.innerHTML = Scheid meerdere toetsen met komma's. Gebruik <code>mod</code> voor Cmd/Ctrl, <code>shift</code> en <code>alt</code> voor modificators.
```

### [fil]
```
saveBackup = I-save ang backup
shortcut-listen = Makinig
minutes = min
autosave-recovery-message = May nakitang hindi nai-save na session. Gusto mo bang ibalik ito?
autosave-restore          = Ibalik
autosave-discard          = I-discard
shortcuts-instrux.innerHTML = Ihiwalay ang maraming susi gamit ang kuwit. Gamitin ang <code>mod</code> para sa Cmd/Ctrl, <code>shift</code> at <code>alt</code> para sa mga modifier.
```

### [fr]
```
saveBackup = Enregistrer la sauvegarde
shortcut-listen = Écouter
minutes = min
autosave-recovery-message = Une session non enregistrée a été détectée. Voulez-vous la restaurer ?
autosave-restore          = Restaurer
autosave-discard          = Ignorer
shortcuts-instrux.innerHTML = Séparez plusieurs touches avec des virgules. Utilisez <code>mod</code> pour Cmd/Ctrl, <code>shift</code> et <code>alt</code> pour les modificateurs.
```

### [de]
```
saveBackup = Sicherung speichern
shortcut-listen = Lauschen
minutes = Min
autosave-recovery-message = Eine nicht gespeicherte Sitzung wurde erkannt. Möchten Sie diese wiederherstellen?
autosave-restore          = Wiederherstellen
autosave-discard          = Verwerfen
shortcuts-instrux.innerHTML = Trennen Sie mehrere Tasten mit Kommas. Verwenden Sie <code>mod</code> für Cmd/Ctrl, <code>shift</code> und <code>alt</code> für Modifikatoren.
```

### [el]
```
saveBackup = Αποθήκευση αντιγράφου ασφαλείας
shortcut-listen = Ακούστε
minutes = λεπ
autosave-recovery-message = Εντοπίστηκε μη αποθηκευμένη συνεδρία. Θέλετε να την επαναφέρετε;
autosave-restore          = Επαναφορά
autosave-discard          = Απόρριψη
shortcuts-instrux.innerHTML = Χωρίστε πολλαπλά πλήκτρα με κόμματα. Χρησιμοποιήστε <code>mod</code> για Cmd/Ctrl, <code>shift</code> και <code>alt</code> για τροποποιητές.
```

### [hi]
```
saveBackup = बैकअप सहेजें
shortcut-listen = सुनें
minutes = मिनट
autosave-recovery-message = एक बिना सहेजा गया सत्र मिला है। क्या आप इसे पुनर्स्थापित करना चाहते हैं?
autosave-restore          = पुनर्स्थापित करें
autosave-discard          = खारिज करें
shortcuts-instrux.innerHTML = कई कुंजियों को अल्पविराम से अलग करें। Cmd/Ctrl के लिए <code>mod</code>, मॉडिफायर के लिए <code>shift</code> और <code>alt</code> का उपयोग करें।
```

### [id]
```
saveBackup = Simpan cadangan
shortcut-listen = Dengarkan
minutes = menit
autosave-recovery-message = Sesi yang belum disimpan terdeteksi. Apakah Anda ingin memulihkannya?
autosave-restore          = Pulihkan
autosave-discard          = Buang
shortcuts-instrux.innerHTML = Pisahkan beberapa tombol dengan koma. Gunakan <code>mod</code> untuk Cmd/Ctrl, <code>shift</code> dan <code>alt</code> untuk modifier.
```

### [it]
```
saveBackup = Salva backup
shortcut-listen = Ascolta
minutes = min
autosave-recovery-message = È stata rilevata una sessione non salvata. Vuoi ripristinarla?
autosave-restore          = Ripristina
autosave-discard          = Scarta
shortcuts-instrux.innerHTML = Separa più tasti con le virgole. Usa <code>mod</code> per Cmd/Ctrl, <code>shift</code> e <code>alt</code> per i modificatori.
```

### [ja]
```
saveBackup = バックアップを保存
shortcut-listen = リッスン
minutes = 分
autosave-recovery-message = 未保存のセッションが見つかりました。復元しますか？
autosave-restore          = 復元
autosave-discard          = 破棄
shortcuts-instrux.innerHTML = 複数のキーをカンマで区切ります。Cmd/Ctrlには<code>mod</code>、修飾キーには<code>shift</code>と<code>alt</code>を使用してください。
```

### [mr]
```
saveBackup = बॅकअप जतन करा
shortcut-listen = ऐका
minutes = मिनिटे
autosave-recovery-message = एक न जतन केलेले सत्र आढळले. आपण ते पुनर्स्थापित करू इच्छिता?
autosave-restore          = पुनर्स्थापित करा
autosave-discard          = वगळा
shortcuts-instrux.innerHTML = अनेक कीजना स्वल्पविरामाने वेगळ्या करा. Cmd/Ctrl साठी <code>mod</code>, मॉडिफायरसाठी <code>shift</code> आणि <code>alt</code> वापरा.
```

### [no]
```
saveBackup = Lagre sikkerhetskopi
shortcut-listen = Lytt
minutes = min
autosave-recovery-message = En ulagret økt ble oppdaget. Vil du gjenopprette den?
autosave-restore          = Gjenopprett
autosave-discard          = Forkast
shortcuts-instrux.innerHTML = Skill flere taster med kommaer. Bruk <code>mod</code> for Cmd/Ctrl, <code>shift</code> og <code>alt</code> for modifikatorer.
```

### [pl]
```
saveBackup = Zapisz kopię zapasową
shortcut-listen = Nasłuchuj
minutes = min
autosave-recovery-message = Wykryto niezapisane dane sesji. Czy chcesz je przywrócić?
autosave-restore          = Przywróć
autosave-discard          = Odrzuć
shortcuts-instrux.innerHTML = Oddziel wiele klawiszy przecinkami. Użyj <code>mod</code> dla Cmd/Ctrl, <code>shift</code> i <code>alt</code> dla modyfikatorów.
```

### [pt-BR]
```
saveBackup = Salvar backup
shortcut-listen = Ouvir
minutes = min
autosave-recovery-message = Uma sessão não salva foi detectada. Deseja restaurá-la?
autosave-restore          = Restaurar
autosave-discard          = Descartar
shortcuts-instrux.innerHTML = Separe várias teclas com vírgulas. Use <code>mod</code> para Cmd/Ctrl, <code>shift</code> e <code>alt</code> para modificadores.
```

### [pt]
```
saveBackup = Guardar cópia de segurança
shortcut-listen = Ouvir
minutes = min
autosave-recovery-message = Foi detetada uma sessão não guardada. Pretende restaurá-la?
autosave-restore          = Restaurar
autosave-discard          = Descartar
shortcuts-instrux.innerHTML = Separe várias teclas com vírgulas. Use <code>mod</code> para Cmd/Ctrl, <code>shift</code> e <code>alt</code> para modificadores.
```

### [ro]
```
saveBackup = Salvează copia de siguranță
shortcut-listen = Ascultă
minutes = min
autosave-recovery-message = A fost detectată o sesiune nesalvată. Doriți să o restaurați?
autosave-restore          = Restaurează
autosave-discard          = Renunță
shortcuts-instrux.innerHTML = Separă taste cu virgule. Folosește <code>mod</code> pentru Cmd/Ctrl, <code>shift</code> și <code>alt</code> pentru modificatori.
```

### [ru]
```
saveBackup = Сохранить резервную копию
shortcut-listen = Прослушать
minutes = мин
autosave-recovery-message = Обнаружен несохранённый сеанс. Восстановить его?
autosave-restore          = Восстановить
autosave-discard          = Сбросить
shortcuts-instrux.innerHTML = Разделяйте клавиши запятыми. Используйте <code>mod</code> для Cmd/Ctrl, <code>shift</code> и <code>alt</code> для модификаторов.
```

### [es]
```
saveBackup = Guardar copia de seguridad
shortcut-listen = Escuchar
minutes = min
autosave-recovery-message = Se detectó una sesión no guardada. ¿Desea restaurarla?
autosave-restore          = Restaurar
autosave-discard          = Descartar
shortcuts-instrux.innerHTML = Separa varias teclas con comas. Usa <code>mod</code> para Cmd/Ctrl, <code>shift</code> y <code>alt</code> para modificadores.
```

### [sv]
```
saveBackup = Säkerhetskopiera
shortcut-listen = Lyssna
minutes = min
autosave-recovery-message = En osparad session har upptäckts. Vill du återställa den?
autosave-restore          = Återställ
autosave-discard          = Avfärda
shortcuts-instrux.innerHTML = Separera flera tangenter med komman. Använd <code>mod</code> för Cmd/Ctrl, <code>shift</code> och <code>alt</code> för modifikatorer.
```

### [bo] (Tibetan)
```
saveBackup = ཉར་ཚགས།
shortcut-listen = ཉན།
minutes = སྐར་མ།
autosave-recovery-message = ཉར་མ་ཚགས་པའི་ལས་ཐེངས་ཤིག་རྙེད་སོང་། དེ་སྐྱར་གསོ་བྱེད་འདོད་དམ།
autosave-restore          = སྐྱར་གསོ།
autosave-discard          = དོར་བ།
shortcuts-instrux.innerHTML = ལྡེ་མིག་མང་པོ་ཙིར་གྱིས་ཁ་ཕྱེ། <code>mod</code> བེད་སྤྱོད་བྱེད་ནས་ Cmd/Ctrl། <code>shift</code> དང་ <code>alt</code> བེད་སྤྱོད་བྱེད་ནས་ བཟོ་བཅོས།
```

### [tr]
```
saveBackup = Yedekle
shortcut-listen = Dinle
minutes = dk
autosave-recovery-message = Kaydedilmemiş bir oturum algılandı. Geri yüklemek ister misiniz?
autosave-restore          = Geri yükle
autosave-discard          = Yoksay
shortcuts-instrux.innerHTML = Birden fazla tuşu virgülle ayırın. Cmd/Ctrl için <code>mod</code>, değiştiriciler için <code>shift</code> ve <code>alt</code> kullanın.
```

### [uk]
```
saveBackup = Зберегти резервну копію
shortcut-listen = Слухати
minutes = хв
autosave-recovery-message = Виявлено незбережений сеанс. Бажаєте його відновити?
autosave-restore          = Відновити
autosave-discard          = Відкинути
shortcuts-instrux.innerHTML = Відділяйте клавіші комами. Використовуйте <code>mod</code> для Cmd/Ctrl, <code>shift</code> та <code>alt</code> для модифікаторів.
```

### [vi]
```
saveBackup = Lưu bản sao lưu
shortcut-listen = Lắng nghe
minutes = phút
autosave-recovery-message = Phát hiện phiên chưa được lưu. Bạn có muốn khôi phục không?
autosave-restore          = Khôi phục
autosave-discard          = Bỏ qua
shortcuts-instrux.innerHTML = Phân tách nhiều phím bằng dấu phẩy. Sử dụng <code>mod</code> cho Cmd/Ctrl, <code>shift</code> và <code>alt</code> cho phím sửa đổi.
```

---

## Notes for Reviewer

1. **`minutes`** — Short abbreviation displayed next to a number input (e.g. "5 min"). Most languages use "min". Exceptions: zh-CN/TW "分钟/分鐘", ar "دقيقة", el "λεπ", hi "मिनट", id "menit", ja "分", mr "मिनिटे", bo "སྐར་མ།", tr "dk", uk "хв", vi "phút".

2. **`shortcut-listen`** — Short button label. Most languages have a direct equivalent.

3. **`saveBackup`** — Verb + noun phrase for saving a backup.

4. **`autosave-recovery-message`** — Full sentence asking user about restoring unsaved session.

5. **`shortcuts-instrux.innerHTML`** — Contains `<code>mod</code>`, `<code>shift</code>`, `<code>alt</code>` HTML tags that must NOT be translated — only surrounding text should be translated.

6. **No keys were removed** from `data.ini` in this session. Dead shortcuts (bold, italic, underline, addTimestamp, addTimestampMilliseconds) were removed from TypeScript only.
