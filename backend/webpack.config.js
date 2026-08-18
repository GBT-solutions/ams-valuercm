const nodeExternals = require("webpack-node-externals");
const path = require("path");

module.exports = {
    target: "node",
    mode: "production",
    entry: "./index.js",
    output: {
        path: path.resolve(__dirname),
        filename: "[name].bundle.js",
    },
    externals: [nodeExternals()],
    optimization: {
        splitChunks: {
            chunks: "all",
        },
    },
};
