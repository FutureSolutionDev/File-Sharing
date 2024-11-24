const express = require("express");
const MimeTypes = require("mime-types");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;
const App_URL = "http://localhost:3000";
const uploadFolder = "./uploads";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) =>
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });
const db = new sqlite3.Database("./files.db", (err) => {
  if (err) console.error(err.message);
  else console.log("Connected to SQLite database.");
});
db.run(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT,
    uuid_name TEXT,
    extension TEXT,
    size INTEGER,
    upload_date TEXT
  )
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use((req, res, next) => {
  res.set({
    "X-Powered-By": "Sabry Dawood",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
  });
  next();
});
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file)
    return res.status(400).send({
      message: "No file uploaded.",
    });
  const uuidName = file.filename;
  const originalName = file.originalname;
  const extension = MimeTypes.lookup(originalName);
  const size = file.size;
  const uploadDate = new Date().toISOString();
  db.run(
    `
    INSERT INTO files (original_name, uuid_name, extension, size, upload_date)
    VALUES (?, ?, ?, ?, ?)`,
    [originalName, uuidName, extension, size, uploadDate],
    function (err) {
      if (err)
        return res.status(500).send({
          message: "Error uploading file.",
        });
      const fileId = this.lastID;
      res.send({
        message: "File uploaded successfully.",
        original_name: originalName,
        link: `${App_URL}/file/${EncryptId(fileId)}`,
      });
    }
  );
});
app.get("/file/:id", (req, res) => {
  let fileId = req.params.id;
  let HtmFile = fs.readFileSync("public/Error.html", {
    encoding: "utf8",
  });
  if (!fileId) {
    HtmFile = HtmFile.replaceAll("{{$Message}}", "File Not Found");
    HtmFile = HtmFile.replaceAll("{{$Code}}", "404");
    return res.status(404).send(HtmFile);
  }
  fileId = DecryptId(fileId);
  console.log({
    fileId
  })
  db.get(`SELECT * FROM files WHERE id = ?`, [fileId], (err, file) => {
    HtmFile = HtmFile.replaceAll("{{$Message}}", "File Not Found");
    if (err || !file) {
      if (err) HtmFile = HtmFile.replaceAll("{{$Code}}", "500");
      if (!file) HtmFile = HtmFile.replaceAll("{{$Code}}", "404");
      return res.send(HtmFile);
    }
    HtmFile = fs.readFileSync("public/view.html", {
      encoding: "utf-8",
    });
    HtmFile = HtmFile.replaceAll("{{$FileName}}", file.original_name)
      .replaceAll(
        "{{$FileSize}}",
        `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      )
      .replaceAll("{{FileId}}", fileId)
      .replaceAll("{{$FileExt}}", MimeTypes.extension(file.extension))
      .replace("{{$UploadDate}}", HandleDate(file.upload_date))
      .replaceAll("{{$DownloadLink}}", `/download/${file.uuid_name}`);
    res.send(HtmFile);
  });
});
app.get("/download/:uuid", (req, res) => {
  try {
    const uuid = req.params.uuid;
    db.get(`SELECT * FROM files WHERE uuid_name = ?`, [uuid], (err, file) => {
      console.log({
        file,
      });
      if (err)
        return res.status(500).send({
          message: "Database error",
          code: 500,
        });
      if (!file)
        return res.status(404).send({
          message: "File not found",
          code: 404,
        });
      const filePath = path.join(uploadFolder, file.uuid_name);
      if (!fs.existsSync(filePath))
        return res.status(404).send({
          message: "File not found",
          code: 404,
        });
      const File = fs.readFileSync(filePath);
      res.json({
        message: "File downloaded successfully",
        File: `data:${file.extension};base64,${File.toString("base64")}`,
      });
      fs.unlinkSync(filePath);
      db.run(`DELETE FROM files WHERE uuid_name = ?`, [file.uuid_name]);
    });
  } catch (error) {
    console.error(error);
  }
});
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);

function HandleDate(date) {
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}
const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const CryptoSecret =
  "3924cd46230433b7e20a6c00492ca080c3cbeedba1f202b2b84d120f5e72113f";
const key = Buffer.from(CryptoSecret, "hex");
function EncryptId(id) {
  id = id?.toString();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(id, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + encrypted;
}

function DecryptId(encryptedId) {
  const iv = Buffer.from(encryptedId.slice(0, 32), "hex");
  const encryptedData = encryptedId.slice(32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
