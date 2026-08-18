const express = require("express");
const app = express();
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

dotenv.config({ path: "./.env", quiet: true });

// middlewares
app.use(
    cors({
        origin: true,
        credentials: true,
        exposedHeaders: ["Content-Disposition"],
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// routes
const userRoutes = require("./routes/users.routes");
const employeeRoutes = require("./routes/employee.routes");
const assetRoutes = require("./routes/asset.routes");
const taggingRoutes = require("./routes/tagging.routes");
const configRoutes = require("./routes/config.routes");
const backupRoutes = require("./routes/backup.routes");

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/assets", assetRoutes);
app.use("/api/v1/taggings", taggingRoutes);
app.use("/api/v1/config", configRoutes);
app.use("/api/v1/backups", backupRoutes);

// serve static files
app.use(express.static(path.join(__dirname, "build")));

app.get("/api/helth", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to the Asset Monitoring System API",
    });
});
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});

const { initScheduler } = require("./utils/scheduler");

initScheduler();

const { getLocalIPv4 } = require("./utils/helperFunctions");
app.listen(process.env.PORT || 7777, () => {
    console.log(
        `Server is running on http://${getLocalIPv4()}:${process.env.PORT || 7777}`
    );
});
