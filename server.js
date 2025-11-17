const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const http = require("http");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const port = process.env.PORT || 4005;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const { connect } = require("./src/config/dbConnection");
connect();

//routes
const indexRoutes = require('./src/routes/index')
app.use("/", indexRoutes);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running.... for admin-service ",
  });
});

// Error handling for aborted requests (must be after routes)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || (err.message && err.message.includes('aborted'))) {
    return res.status(400).json({
      success: false,
      message: "Request parsing failed or request was aborted",
      data: null
    });
  }
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null
  });
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT} for admin-service`
  );
});

