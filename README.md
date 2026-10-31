# 🚀 NovaPage — AI-Powered Mobile Landing Page Builder

**NovaPage** è una piattaforma moderna e AI-native che permette a piccole attività commerciali, reseller e creator di creare e gestire landing page per dispositivi mobili interagendo semplicemente con un assistente virtuale tramite chat.

Invece di utilizzare complicati editor grafici "drag-and-drop", gli utenti possono scrivere o dettare le modifiche in linguaggio naturale (es. *"Aggiungi un pulsante per WhatsApp e imposta lo sfondo scuro con dettagli viola"*). L'IA interpreta la richiesta e aggiorna lo stato visivo della landing page in tempo reale.

---

## ✨ Caratteristiche Principali

- 💬 **Gestione Conversazionale (Chat-Driven):** Modifica layout, contenuti, colori e sezioni chattando in italiano con l'assistente IA.
- 📱 **Mobile-First & Ultrastiloso:** Layout moderno, reattivo, ottimizzato per gli schermi degli smartphone, con supporto nativo alla Dark Mode e stile Glassmorphism.
- ⚡ **Aggiornamenti Live Senza Ricaricamento:** Preview in tempo reale powered da React State e JSON Data-Driven Renderer.
- 🛍️ **Sezioni & Blocchi Pronti:**
  - **Header / Hero:** Foto profilo, titolo, biografia e status badge (es. *"Aperto ora"*).
  - **Pulsanti Link:** Pulsanti per social, WhatsApp, indicazioni stradali e siti esterni.
  - **Vetrina Prodotti / Catalogo:** Griglia o carosello con immagini, prezzi e stato (es. *"Disponibile"* / *"Sold Out"*).
  - **Modulo Contatti:** Form rapido per raccogliere richieste e contatti.
  - **Banner Annunci:** Avvisi promozionali o comunicazioni in evidenza.
- 🔐 **Autenticazione & Database in Tempo Reale:** Gestione utenti e dati salvati in modo sicuro su Supabase.

---

## 🛠️ Stack Tecnologico

- **Frontend / Framework:** Next.js (App Router) / React
- **Styling:** Tailwind CSS + Framer Motion
- **Database & Auth:** Supabase (PostgreSQL + Realtime Auth)
- **AI Engine:** Google Gemini API (con Function Calling / Structured JSON Output)
- **Deployment:** Vercel

---

## 📐 Architettura del Sistema

NovaPage non genera codice HTML/React grezzo a ogni richiesta (operazione lenta e soggetta a errori). Utilizza invece un **Data-Driven Render System**:

1. L'utente invia un messaggio nella Chat Admin (es. *"Metti in evidenza il cappello nero a 30€"*).
2. L'**API di Gemini** interpreta l'intento tramite **Function Calling** e restituisce un payload JSON aggiornato.
3. Lo **State Manager (Zustand / React Context)** aggiorna lo stato dell'app.
4. L'interfaccia **React** renderizza istantaneamente i componenti Tailwind corrispondenti.
5. Il nuovo layout JSON viene salvato in tempo reale su **Supabase**.

---

## 🚀 Come Iniziare (Sviluppo Locale)

### 1. Clona la repository
```bash
git clone [https://github.com/Danda-py/NovaPage.git](https://github.com/Danda-py/NovaPage.git)
cd novapage
