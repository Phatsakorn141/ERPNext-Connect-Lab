# web/Dockerfile — สูตรสร้างกล่อง web (ใช้เฉพาะ: docker compose --profile web up)
# ตอน dev บน Windows แนะนำ "npm run dev" ในเครื่องแทน

# เริ่มจาก image ที่มี Node.js 22 (alpine = ขนาดเล็ก)
FROM node:22-alpine

WORKDIR /app

# ติดตั้งแพ็กเกจก่อน (cache ได้)
COPY package.json package-lock.json ./
RUN npm ci

# ก๊อปโค้ดเข้ากล่อง
COPY . .

EXPOSE 3000

# โหมด dev: เปิดรับจากนอกกล่องด้วย 0.0.0.0
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
