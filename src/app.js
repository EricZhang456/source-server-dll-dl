import dotenv from "dotenv";
import createError from "http-errors";
import express, { json, urlencoded } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import cookieParser from "cookie-parser";
import logger from "morgan";
import schedule from "node-schedule";
import { Liquid } from "liquidjs";

import routes from "./routes/routes.js";
import dllDownloadTask from "./utils/dlldownloadtask.js";

dotenv.config();

const app = express();
const liquid = new Liquid();
const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "../");

dllDownloadTask().then();
schedule.scheduleJob("0 0 * * 0", async() => await dllDownloadTask());

const dllDownloadDir = path.join(__dirname, process.env.DLL_DOWNLOAD_LOCATION);
app.locals.dllDownloadDir = dllDownloadDir;
if (!fs.existsSync(dllDownloadDir)) {
    fs.mkdirSync(dllDownloadDir);
}

// view engine setup
app.engine("liquid", liquid.express());
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "liquid");

app.use(logger("dev"));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

routes.forEach((value, key) => app.use(value, key));

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

export default app;
