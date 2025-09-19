const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- CORS ----------
app.use(
  cors({
    origin: [
      "https://sandipnanavati.com",
      "https://www.sandipnanavati.com",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Ensure uploads folder exists ----------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ---------- Multer setup for career form ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ---------- Nodemailer transporter ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // important for some hosts
  },
});

// ---------- Validate receiver email ----------
const RECEIVER_EMAIL = process.env.RECEIVER_EMAIL || process.env.SMTP_USER;
if (!RECEIVER_EMAIL) {
  console.error("❌ ERROR: RECEIVER_EMAIL not defined in .env");
  process.exit(1);
}

// ---------- Career form endpoint ----------
app.post("/backend/apply", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, position, message } = req.body;
    const resumeFile = req.file;

    if (!resumeFile)
      return res
        .status(400)
        .json({ success: false, message: "Resume file is required." });

    await transporter.sendMail({
      from: `"Job Application" <${process.env.SMTP_USER}>`,
      to: RECEIVER_EMAIL,
      subject: `New Job Application from ${name}`,
      text: `Full Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nPosition: ${position}\nMessage: ${message}`,
      attachments: [{ filename: resumeFile.originalname, path: resumeFile.path }],
    });

    // Delete uploaded file after sending
    fs.unlinkSync(resumeFile.path);

    res.json({ success: true, message: "Application submitted successfully!" });
  } catch (err) {
    console.error("Career form error:", err.response || err);
    res
      .status(500)
      .json({ success: false, message: "Error submitting application." });
  }
});

// ---------- Contact form endpoint ----------
app.post("/backend/contact", multer().none(), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });

    await transporter.sendMail({
      from: `"Website Contact" <${process.env.SMTP_USER}>`,
      to: RECEIVER_EMAIL,
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
    });

    res.json({ success: true, message: "Message sent successfully!" });
  } catch (err) {
    console.error("Contact form error:", err.response || err);
    res
      .status(500)
      .json({ success: false, message: "Error sending your message." });
  }
});

// ---------- Start Server ----------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
