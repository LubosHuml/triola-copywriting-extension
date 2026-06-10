# Triola Copywriting AI - Chrome Extension

Chrome rozsireni pro generovani HTML popisku produktu primo v administraci e-shopu pomoci AI.

## Prehled

Rozsireni umoznuje bra-stylistce generovat HTML popisky primo v administraci Shoptet nebo ERP, aniz by musela otevri
rat hlavni webove rozhrani Triola Copywriting AI.

## Struktura souboru

```
triola-copywriting-extension/
├── manifest.json          # Konfigurace rozsireni (Manifest V3)
├── popup.html             # Hlavni okno rozsireni
├── popup.js               # Logika hlavniho okna
├── options.html           # Stranka nastaveni
├── options.js             # Logika nastaveni
├── content.js             # Content script (detekce kodu, vlozeni HTML)
├── background.js          # Service Worker
└── icons/
    ├── icon16.png         # Ikona 16x16 px
    ├── icon48.png         # Ikona 48x48 px
    └── icon128.png        # Ikona 128x128 px
```

## Pozadavky

- Google Chrome verze 88+ (Manifest V3)
- Triola Copywriting AI backend nasazeny na Render.com

## Instalace

### 1. Stahni nebo klonuj repozitar

```bash
git clone https://github.com/LubosHuml/triola-copywriting-extension.git
```

### 2. Pridej ikony

Do slozky `icons/` pridej PNG ikony ve velikostech:
- `icon16.png` (16x16 px)
- `icon48.png` (48x48 px)  
- `icon128.png` (128x128 px)

Pouzij logo Trioly nebo jednoduche 'T' na vínové pozadi (#8C1D31).

### 3. Nacti rozsireni do Chrome

1. Otevri Chrome a jdi na `chrome://extensions/`
2. Zapni **Rezim pro vyvojare** (Developer mode) vpravo nahore
3. Klikni **Nahrat rozbalene rozsireni** (Load unpacked)
4. Vyber slozku s rozsirenim

## Nastaveni

Po instalaci klikni na ikonu rozsireni a pote na ⚙️ pro otevreni nastaveni:

| Polozka | Popis | Vychozi hodnota |
|---------|-------|-----------------|
| API URL | Adresa backendu na Render.com | `https://triola-copywriter.onrender.com` |
| AI Model | Claude/GPT model pro generovani | `claude-sonnet-4-6` |
| Ton textu | Styl psani popisku | `empaticky` |
| Delka textu | Preferovana delka | `stredni` |

## Pouziti

1. **Otevri administraci e-shopu** (Shoptet, ERP, atd.)
2. **Klikni na ikonu rozsireni** v Chrome toolbaru
3. **Zadej kod produktu** (fazony), napr. `22859/88` nebo klikni "Detekovat" pro automaticke doplneni
4. **Zvol format**: Kratky popis (HTML) nebo Dlouhy popis (HTML)
5. **Zadej klic. slova** (nepovinne)
6. **Klikni "Generovat popis"** - rozsireni posle request na API
7. **Zkontroluj vysledek** v HTML/Nahled tabech
8. **Klikni "Kopirovat HTML"** nebo **"Vlozit do adminu"** pro vlozeni do editoru na strance

## API Integrace

Rozsireni komunikuje s backendem pres POST request na `/api/generate`:

```json
{
  "product_code": "22859",
  "format_type": "kratky_popis_html",
  "model_key": "claude-sonnet-4-6",
  "tone_key": "empaticky",
  "length_key": "stredni",
  "keywords": "krajka, elasticky obvod",
  "custom_instructions": "",
  "use_simulation": false
}
```

API klic neni v rozsireni - backend na Renderu ho ma bezpecne ulozeny v environment variables.

## Podporovane editory

Content script automaticky detekuje a pracuje s:
- **CKEditor 4 a 5** (nejcasteji Shoptet)
- **TinyMCE**
- **Quill**
- Standardni **`<textarea>`** pole (`#description`, `#popis`, atd.)
- **contenteditable** divy (rich text editory)
- Editory v **iFrame**

## Barvy Trioly

| Barva | Hex |
|-------|-----|
| Burgund. vínová | `#8C1D31` |
| Tmavá vínová | `#6B1524` |
| Zlatá/krémová | `#C9A96E` |
| Pozadí | `#f5f4f0` |

## Verze

**v1.0.0** - Pocatecni vydani
- Generovani kratkeho a dlouheho HTML popisku
- Automaticka detekce kodu produktu
- Podpora CKEditor, TinyMCE, Quill a standardnich textarea
- Nastaveni API URL, modelu, tonu a delky
- Testovani pripojeni k API
- Burgundske barevne schema Trioly

---

*Triola Copywriting AI Chrome Extension | Triola s.r.o.*
