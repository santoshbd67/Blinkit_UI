const express = require('express'),
cookieParser = require('cookie-parser'),
morgan = require('morgan'),
bodyParser = require('body-parser'),
port = 8081

const createAppServer = () => {
    const app = express();

    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        next();
    })

    app.use(bodyParser.json({
        limit: '1mb'
    }));
    app.use(morgan("combined"));
    app.use(express.json());

    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(cookieParser());

    require('./fixtures/routes')(app);
    module.exports = app;

    return app;
}
const app = createAppServer();
app.listen(port, () => console.log(`tapp services is running in test env on port ${port} with ${process.pid} pid`));