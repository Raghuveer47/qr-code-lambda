
const express = require("express");
const path = require("path");
const { handler } = require("./index");

const app = express();

app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/generate-qr", async (req, res) => {
  const result = await handler({
    body: req.body
  });

  res.status(result.statusCode).json(JSON.parse(result.body));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`QR Code Generator running at http://localhost:${PORT}`);
});
