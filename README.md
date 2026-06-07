# 📸 Photobooth · AcampaDentro EMRE

Aplicação de photobooth profissional para eventos.

---

## 🚀 Deploy Rápido

### Opção 1 — Railway / Render / Fly.io
```bash
npm install
npm run build
npm start
```

### Opção 2 — Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Variáveis de Ambiente
```env
PORT=3000
NODE_ENV=production
```

---

## 📱 Uso

### Booth (PC do evento)
Abre: `http://localhost:3000/booth`

### Telemóvel (participantes)
Lê o QR Code mostrado no ecrã do Booth.
Ou abre: `http://<IP-DO-PC>:3000/phone/<SESSION-ID>`

**⚠️ Para acesso em rede local:** o PC e os telemóveis precisam estar na mesma rede Wi-Fi.

---

## 🔐 Código Secreto

O código **`143`** desbloqueia a categoria secreta SKZ.

---

## 📂 Personalizar Assets

Troca os ficheiros em `/public` sem alterar código:

```
public/
  frames/
    default/    → Molduras visíveis a todos
    skz/        → Molduras desbloqueadas com código 143
  audio/
    shutter.mp3 → Som da captura
    confirm.mp3 → Som de confirmação/seleção
    select.mp3  → Som de seleção de moldura
```

---

## 🛠️ Desenvolvimento

```bash
npm install
npm run dev   # Porta 3000
```

---

## ✨ Features

- 📸 3 fotos automáticas com countdown
- ⚡ Flash visual no momento da captura
- 🖼️ Strip final em PNG de alta qualidade
- 📱 Interface mobile-first para telemóveis
- 🔴 Tempo real via Socket.IO
- 🔐 Categoria secreta SKZ (código: 143)
- ⬇️ Download direto da fotografia
- 🎨 Molduras aplicadas automaticamente
