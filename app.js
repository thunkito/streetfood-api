const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const compression = require("compression");
const cors = require("cors");
// const hpp = require('hpp');

const controller = require("./controllers");
const routes = require("./routes");
const { AppError } = require("./utils");
const { CODE } = require("./constants");

const app = express();

// Trust heroku so that it's able to set
// the x-forwarded-proto header
app.enable("trust proxy");

// Set up view engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// 1) MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
app.options("*", cors());

// Set security headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many request from this IP. Please try again in an hour.",
});
app.use("/api", limiter);

// Body parser, sets req.body with data from body of request
app.use(express.json({ limit: "10kb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevents parameter pollution
// app.use(
//   hpp({
//     whitelist: WHITELIST.PARAMS,
//   })
// );

app.use(compression());

// 3) ROUTES
app.get("/", (req, res) => {
  // res.render(path.join(__dirname, "public", "index.html"));
  // res.sendFile(path.join(__dirname, "public", "index.html"));
  res.status(CODE.OK).render("base");
});

app.use("/api/v1/user", routes.user);
app.use("/api/v1/stand", routes.stand);

app.all("*", (req, res, next) => {
  const err = new AppError(
    `${req.originalUrl} is not a valid endpoint`,
    CODE.NOT_FOUND
  );
  next(err);
});

app.use(controller.error.errorHandler);

module.exports = app;
