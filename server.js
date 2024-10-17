const express = require('express'),
    multer = require('multer'),
    cluster = require('express-cluster'),
    cookieParser = require('cookie-parser'),
    http = require('http'),
    https = require('https'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    fs = require("fs");
port = 8085,
    httpsPort = 443,
    threads = 1,
    dotenv = require('dotenv'),
    compression = require('compression'),

    dotenv.config();

const dbutil = require("./util/db");
const config = require('./config'),

    localBlobStorage = config.localBlobStorage,
    // localSubFoldersAllowed = config.localSubFoldersAllowed.split(','),
    localSubFolders = JSON.parse(config.localSubFoldersAllowed),
    localSubFoldersAllowed = Object.keys(localSubFolders),
    staticHostURL = config.localStaticPath;

const createAppServer = () => {
    const app = express();

    var options = {
        dotfiles: 'ignore',
        etag: false,
        extensions: ['htm', 'html'],
        index: false,
        maxAge: '1d',
        redirect: false,
        setHeaders: function (res, path, stat) {
            res.set('x-timestamp', Date.now())
        }
    }

    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        next();
    })

    app.use(bodyParser.json({
        limit: '50mb'
    }));
    app.use(morgan("combined"));
    app.use(express.json());

    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(cookieParser());

    localSubFoldersAllowed.forEach(subFolder => {
        if (subFolder === 'preprocessor') { }
        app.use(staticHostURL + '/' + subFolder, express.static(localBlobStorage + localSubFolders[subFolder], options));
    })

    //compresses the angular bundle size further by using gzipped encoding for faster loading
    app.use(compression());
    require('./routes')(app);
    module.exports = app;
    return app;
}

const app = createAppServer();
var server = app.listen(port, () => console.log(`pAIges.ai services is running on port ${port} with ${process.pid} pid`));
server.setTimeout(30000);