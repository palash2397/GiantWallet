import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(path.join("D:/blockchain/node/GiantWallet/backend/public/profile", "1756902664925-Screenshot (8).png"));

const deleteOldImages = (folder, file) => {
  if (!file) return;
  const p = path.join(__dirname, "..", folder, file);
  fs.existsSync(p)
    ? (fs.unlinkSync(p), console.log("Deleted:", p))
    : console.log("No file:", p);
};


deleteOldImages("profile", "1756902664925-Screenshot (8).png")